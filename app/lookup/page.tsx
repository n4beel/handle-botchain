import PageShell from "@/components/layout/PageShell";
import Lookup from "@/components/handle/Lookup";
import { NAV } from "@/lib/nav";

export const metadata = {
  title: "Look up a name — Handle",
  description: "Resolve a .bot name to an address, or an address to its name. No wallet needed.",
};

export default function LookupPage() {
  return (
    <PageShell
      nav={NAV}
      title="Look up"
      description="A name, or an address. It works out which you meant."
    >
      <Lookup />
    </PageShell>
  );
}
