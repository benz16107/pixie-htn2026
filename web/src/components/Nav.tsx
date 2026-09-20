"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/queue", label: "Queue" },
  { href: "/map", label: "Map" },
  { href: "/ask", label: "Ask" },
  { href: "/backtest", label: "Backtest" },
];

const SURFACE = ["/queue", "/cases", "/live", "/map"];

export function Nav() {
  const path = usePathname();
  // The continuous surface (queue, a case, the map, the live desk) carries its own HUD in
  // Shell.tsx; the classic top bar is for the pages that still swap.
  if (SURFACE.some((p) => path.startsWith(p))) return null;
  return (
    <header className="contours flex h-12 items-center gap-10 border-b border-rule bg-land px-8">
      <Link href="/queue" className="text-[12px] font-semibold tracking-[0.16em]">
        PIXIE<span className="ml-2.5 font-normal tracking-[0.04em] text-dim">underwriting desk</span>
      </Link>
      <nav aria-label="Main">
        <ul className="flex gap-1">
          {LINKS.map((l) => {
            const on = path.startsWith(l.href) || (l.href === "/queue" && path.startsWith("/cases"));
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={on ? "page" : undefined}
                  className={`block rounded-sm px-3 py-1 text-[13px] transition-colors duration-150 hover:bg-paper ${
                    on ? "bg-paper font-semibold underline decoration-rust decoration-2 underline-offset-[6px]" : "text-dim"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <span className="ml-auto font-mono text-[11px] text-dim">Federato snapshot · 158 submissions</span>
      <span className="flex gap-3 text-[11.5px] text-dim">
        <Link href="/privacy" className="hover:text-ink hover:underline">Privacy</Link>
        <Link href="/terms" className="hover:text-ink hover:underline">Terms</Link>
      </span>
    </header>
  );
}
