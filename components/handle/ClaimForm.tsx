"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BaseError, ContractFunctionRevertedError, type Address, type Hex } from "viem";
import { useAccount, useChainId, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import Panel from "@/components/ui/Panel";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import TxStatus, { type TxStage } from "@/components/ui/TxStatus";
import { useToast } from "@/components/ui/Toast";
import { addressUrl, isBotChainId } from "@/lib/botchain/chain";
import { getDeployment } from "@/lib/botchain/deployment";
import { handleRegistryAbi } from "@/lib/botchain/abi";
import { describeProblem, normalise, problemWith } from "@/lib/name";

/**
 * Claim a name.
 *
 * Availability is read from the chain, debounced, and only once the name is well-formed — a
 * contract read per keystroke on a malformed name is a request that can only ever answer "no".
 */
export default function ClaimForm() {
  const chainId = useChainId();
  const { address } = useAccount();
  const { toast } = useToast();
  const { writeContractAsync } = useWriteContract();

  const [typed, setTyped] = useState("");
  const [checking, setChecking] = useState("");
  const [stage, setStage] = useState<TxStage>("idle");
  const [hash, setHash] = useState<Hex | null>(null);
  const [takenBy, setTakenBy] = useState<Address | null>(null);

  const deployment = isBotChainId(chainId) ? getDeployment(chainId) : null;
  const name = useMemo(() => normalise(typed), [typed]);
  const problem = useMemo(() => (name === "" ? null : problemWith(name)), [name]);

  // Debounced, so the chain is not read on every keystroke.
  useEffect(() => {
    if (problem !== null || name === "") {
      setChecking("");
      return;
    }
    const timer = setTimeout(() => setChecking(name), 300);
    return () => clearTimeout(timer);
  }, [name, problem]);

  const availability = useReadContract({
    address: deployment?.address,
    abi: handleRegistryAbi,
    functionName: "resolve",
    args: checking ? [checking] : undefined,
    query: { enabled: Boolean(checking && deployment) },
  });

  const owner = availability.data as Address | undefined;
  const isFree = owner !== undefined && owner === "0x0000000000000000000000000000000000000000";
  const currentOwner = takenBy ?? (owner && !isFree ? owner : null);

  const receipt = useWaitForTransactionReceipt({
    hash: hash ?? undefined,
    query: { enabled: Boolean(hash) },
  });

  const settled = useRef<Hex | null>(null);
  const refetchAvailability = availability.refetch;

  useEffect(() => {
    if (!hash || settled.current === hash) return;
    if (!receipt.isSuccess && !receipt.isError) return;
    settled.current = hash;

    if (receipt.isSuccess) {
      setStage("confirmed");
      toast("success", "Name claimed", `${name}.bot now points at your address.`);
      void refetchAvailability();
    } else {
      setStage("failed");
      toast("error", "Registration failed", "The name was not claimed.");
    }
  }, [hash, receipt.isSuccess, receipt.isError, toast, name, refetchAvailability]);

  const handleRegister = useCallback(async () => {
    if (!deployment || !isBotChainId(chainId) || problem !== null || name === "") return;

    setStage("signing");
    setHash(null);
    setTakenBy(null);
    settled.current = null;

    try {
      const txHash = await writeContractAsync({
        address: deployment.address,
        abi: handleRegistryAbi,
        functionName: "register",
        args: [name],
        chainId,
      });
      setHash(txHash);
      setStage("pending");
    } catch (err) {
      setStage("idle");

      const reverted =
        err instanceof BaseError ? err.walk((e) => e instanceof ContractFunctionRevertedError) : null;
      if (reverted instanceof ContractFunctionRevertedError) {
        const error = reverted.data;
        if (error?.errorName === "NameTaken") {
          // Can genuinely happen after the availability check: two people claiming the same name
          // seconds apart. The revert carries who won, which is the useful answer.
          const [, who] = error.args as [string, Address];
          setTakenBy(who);
          toast("warning", "Just taken", "Someone claimed this name first.");
          return;
        }
        toast("error", "Refused", error?.errorName ?? "The contract did not say why.");
        return;
      }

      const message = err instanceof BaseError ? err.shortMessage : "Something went wrong.";
      if (/rejected|denied/i.test(message)) toast("info", "Cancelled", "Nothing was claimed.");
      else toast("error", "Could not register", message);
    }
  }, [deployment, chainId, name, problem, writeContractAsync, toast]);

  if (stage === "confirmed") {
    return (
      <Panel>
        <div className="flex flex-col gap-4">
          <TxStatus stage="confirmed" hash={hash} confirmedLabel={`${name}.bot is yours`} />
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            It resolves to your address, and it is now your primary name — anyone looking up your
            address gets {name}.bot back. There is no expiry and no renewal; it is yours until you
            transfer it.
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              setStage("idle");
              setHash(null);
              setTyped("");
            }}
          >
            Claim another
          </Button>
        </div>
      </Panel>
    );
  }

  const busy = stage === "signing" || stage === "pending";
  const showResult = checking !== "" && checking === name && !availability.isLoading;

  return (
    <Panel>
      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            setTakenBy(null);
          }}
          placeholder="alice"
          mono
          disabled={busy}
          error={problem ? describeProblem(problem) : undefined}
          hint={problem ? undefined : "Lowercase letters, digits and hyphens. The .bot is implied."}
          suffix={<span style={{ color: "var(--text-tertiary)" }}>.bot</span>}
        />

        {checking !== "" && availability.isLoading && <Spinner label="Checking the chain" size={18} />}

        {showResult && availability.isError && (
          <p className="text-[12px]" style={{ color: "var(--warning)" }}>
            Could not reach the chain, so this is unknown rather than available.
          </p>
        )}

        {showResult && !availability.isError && currentOwner && (
          <div className="flex flex-col gap-1">
            <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              <span className="font-mono">{checking}.bot</span> is taken
              {address && currentOwner.toLowerCase() === address.toLowerCase() ? " — by you." : "."}
            </span>
            <a
              href={addressUrl(chainId, currentOwner)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] break-all underline"
              style={{ color: "var(--text-tertiary)" }}
            >
              {currentOwner}
            </a>
          </div>
        )}

        {showResult && !availability.isError && isFree && !takenBy && (
          <p className="text-[12px]" style={{ color: "var(--success)" }}>
            <span className="font-mono">{checking}.bot</span> is available.
          </p>
        )}

        {stage === "idle" || stage === "failed" ? (
          <Button onClick={handleRegister} disabled={!isFree || Boolean(takenBy) || problem !== null}>
            Claim {name || "a name"}.bot
          </Button>
        ) : null}

        <TxStatus stage={stage} hash={hash} failedLabel="Registration failed — nothing was claimed." />

        <p
          className="text-[11px] leading-relaxed"
          style={{ color: "var(--text-tertiary)", borderTop: "1px solid var(--border-subtle)", paddingTop: "12px" }}
        >
          First come, first served, and permanent. There is no expiry, no renewal fee and no way to
          reclaim a name from someone else — which also means nobody can take yours.
        </p>
      </div>
    </Panel>
  );
}
