"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectButton from "@/components/ui/ConnectButton";
import NetworkBadge from "@/components/botchain/NetworkBadge";
import { app } from "@/lib/app-config";

export type NavItem = { href: string; label: string };

interface PageShellProps {
  children: React.ReactNode;
  nav?: NavItem[];
  title?: string;
  description?: string;
}

/**
 * Card shell: one soft card, vertically centred on an empty ground.
 *
 * Handle is a single question — is this name free — so the page is built to hold one thing. The
 * content is centred in the viewport rather than pinned to the top, navigation is a pill rather
 * than a bar, and there is no header rule at all. It should feel closer to a sign-in screen than
 * to a dashboard.
 */
export default function PageShell({ children, nav = [], title, description }: PageShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
      <header className="flex items-center justify-between gap-3 px-5 md:px-8 py-5 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <svg aria-hidden="true" viewBox="0 0 100 100" style={{ width: "23px", height: "23px" }}>
            <circle cx="50" cy="50" r="38" fill="none" stroke="var(--accent)" strokeWidth="4" opacity="0.45" />
            <circle cx="50" cy="50" r="26" fill="var(--accent)" />
          </svg>
          <span className="text-[17px] font-semibold tracking-[-0.02em]">{app.name}</span>
        </Link>

        <div className="flex items-center gap-3">
          <NetworkBadge />
          <div style={{ width: "160px" }}>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Centred in whatever height is left, not stacked from the top. */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-8">
        <div className="w-full" style={{ maxWidth: "520px" }}>
          {(title || description) && (
            <div className="text-center mb-7">
              {title && (
                <h1 className="text-[38px] md:text-[44px]" style={{ color: "var(--text-primary)" }}>
                  {title}
                </h1>
              )}
              {description && (
                <p className="mt-3 text-[15px] mx-auto" style={{ color: "var(--text-secondary)", maxWidth: "42ch" }}>
                  {description}
                </p>
              )}
            </div>
          )}

          {children}

          {nav.length > 0 && (
            <nav className="mt-7 flex items-center justify-center gap-1">
              {nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="nav-link px-4 py-2 text-[13px] no-underline"
                    style={{
                      borderRadius: "999px",
                      background: active ? "var(--bg-elevated)" : "transparent",
                      color: active ? "var(--text-primary)" : "var(--text-tertiary)",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </main>

      <footer className="flex-shrink-0 px-5 md:px-8 py-6 text-center">
        <p className="text-[13px] mb-2" style={{ color: "var(--text-tertiary)" }}>
          {app.tagline}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px]">
          <span style={{ color: "var(--text-secondary)" }}>Built on BOT Chain</span>
          <a href="https://botchain.ai" target="_blank" rel="noreferrer" style={{ color: "var(--text-tertiary)" }}>
            botchain.ai
          </a>
          <a href="https://scan.botchain.ai" target="_blank" rel="noreferrer" style={{ color: "var(--text-tertiary)" }}>
            BOT Chain Explorer
          </a>
        </div>
      </footer>
    </div>
  );
}
