import PageShell from "@/components/layout/PageShell";
import BotChainGate from "@/components/botchain/BotChainGate";
import ClaimForm from "@/components/handle/ClaimForm";
import { NAV } from "@/lib/nav";

export default function Home() {
  return (
    <PageShell
      nav={NAV}
      title="Claim a .bot name"
      description="A short name that points at your address. First come, first served, and permanent."
    >
      <BotChainGate>
        <ClaimForm />
      </BotChainGate>
    </PageShell>
  );
}
