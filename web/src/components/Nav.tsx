"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/queue", label: "Queue" },
  { href: "/map", label: "Map" },
  { href: "/ask", label: "Ask" },
  { href: "/backtest", label: "Backtest" },
];

/** The running head of every page: wordmark, section, and the edition the report is printed from. */
export function Nav() {
  const path = usePathname();
  if (path.startsWith("/live")) return null; // the live desk is its own full-screen surface
  return (
    <header className="mx-auto flex max-w-[1320px] items-baseline gap-10 border-b border-ink px-8 pb-3 pt-5">
      <Link href="/queue" className="display text-[22px] leading-none tracking-[0.02em]">
        Pixie
      </Link>
      <nav aria-label="Main" className="flex gap-7 text-[13px]">
        {LINKS.map((l) => {
          const on = path.startsWith(l.href) || (l.href === "/queue" && path.startsWith("/cases"));
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={on ? "page" : undefined}
              className={`underline-offset-[7px] decoration-1 transition-colors duration-150 ${on ? "underline" : "text-dim hover:text-ink"}`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <span className="folio ml-auto">Underwriting desk</span>
      <span className="folio">Federato snapshot, 158 submissions</span>
    </header>
  );
}

/** The foot of every page: what this is, and the two documents a form collects a name under. */
export function Colophon() {
  const path = usePathname();
  if (path.startsWith("/live")) return null;
  return (
    <footer className="mx-auto mt-16 flex max-w-[1320px] items-baseline gap-6 border-t border-rule px-8 pb-10 pt-4 text-[12px] text-dim">
      <span>Pixie, an underwriting desk built at Hack the North 2026. The data is Federato&apos;s synthetic snapshot, not real customers.</span>
      <span className="ml-auto flex gap-5">
        <Link href="/privacy" className="link">Privacy</Link>
        <Link href="/terms" className="link">Terms</Link>
      </span>
    </footer>
  );
}
