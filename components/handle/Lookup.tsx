"use client";

import { useMemo, useState } from "react";
import { isAddress, type Address } from "viem";
import { useChainId, useReadContract } from "wagmi";
import Panel from "@/components/ui/Panel";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import { addressUrl, isBotChainId } from "@/lib/botchain/chain";
import { getDeployment, isDeployed } from "@/lib/botchain/deployment";
import { handleRegistryAbi } from "@/lib/botchain/abi";
import { normalise, problemWith } from "@/lib/name";

const ZERO = "0x0000000000000000000000000000000000000000";

/**
 * Both directions of the registry, from one box.
 *
 * Which lookup to run is decided by what was typed rather than by a mode switch: an address is
 * unmistakable, and anything else is a name. A toggle would be one more thing to get wrong for a
 * question the input already answers.
 *
 * No wallet needed — resolving a name is a read, and the people most likely to do it are the ones
 * who were sent a name by someone else.
 */
export default function Lookup() {
  const chainId = useChainId();
  const [typed, setTyped] = useState("");

  const deployment = isBotChainId(chainId) ? getDeployment(chainId) : null;
  const ready = isBotChainId(chainId) && isDeployed(chainId);

  const query = useMemo(() => {
    const trimmed = typed.trim();
    if (trimmed === "") return null;
    if (isAddress(trimmed)) return { kind: "address" as const, value: trimmed as Address };

    const name = normalise(trimmed);
    if (problemWith(name) !== null) return { kind: "invalid" as const, value: name };
    return { kind: "name" as const, value: name };
  }, [typed]);

  const forward = useReadContract({
    address: deployment?.address,
    abi: handleRegistryAbi,
    functionName: "resolve",
    args: query?.kind === "name" ? [query.value] : undefined,
    query: { enabled: Boolean(ready && query?.kind === "name") },
  });

  const reverse = useReadContract({
    address: deployment?.address,
    abi: handleRegistryAbi,
    functionName: "nameOf",
    args: query?.kind === "address" ? [query.value] : undefined,
    query: { enabled: Boolean(ready && query?.kind === "address") },
  });

  const active = query?.kind === "address" ? reverse : forward;

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <Input
          label="Name or address"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="alice.bot  or  0x…"
          mono
          hint="No wallet needed to look something up."
        />
      </Panel>

      {!ready && query && (
        <Panel>
          <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
            No registry is configured for this network, so there is nothing to look up.
          </p>
        </Panel>
      )}

      {ready && query?.kind === "invalid" && (
        <Panel>
          <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
            That is neither an address nor a name this registry could hold.
          </p>
        </Panel>
      )}

      {ready && query && query.kind !== "invalid" && active.isLoading && (
        <Panel>
          <Spinner label="Reading the chain" />
        </Panel>
      )}

      {/* A failed read is not an empty result. Saying "unregistered" when the node did not answer
          is the one wrong answer this screen can give. */}
      {ready && query && query.kind !== "invalid" && active.isError && (
        <Panel>
          <p className="text-[12px]" style={{ color: "var(--warning)" }}>
            Could not reach the chain. This is unknown, not unregistered — try again.
          </p>
        </Panel>
      )}

      {ready && query?.kind === "name" && forward.isSuccess && (
        <Panel>
          {forward.data === ZERO ? (
            <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              <span className="font-mono">{query.value}.bot</span> is not registered.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              <span
                className="text-[10px] uppercase tracking-[0.06em]"
                style={{ color: "var(--text-secondary)" }}
              >
                {query.value}.bot resolves to
              </span>
              <a
                href={addressUrl(chainId, forward.data as Address)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[12px] break-all underline"
                style={{ color: "var(--accent)" }}
              >
                {forward.data as string}
              </a>
            </div>
          )}
        </Panel>
      )}

      {ready && query?.kind === "address" && reverse.isSuccess && (
        <Panel>
          {(reverse.data as string) === "" ? (
            <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              That address has no name.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              <span
                className="text-[10px] uppercase tracking-[0.06em]"
                style={{ color: "var(--text-secondary)" }}
              >
                Known as
              </span>
              <span className="font-mono text-[14px]" style={{ color: "var(--accent)" }}>
                {reverse.data as string}.bot
              </span>
              <p className="mt-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                This is the name the address chose as its primary. It may hold others.
              </p>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
