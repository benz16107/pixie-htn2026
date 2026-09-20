"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ResetDemo } from "./ResetDemo";

const FEDERATO_DESTS = [
  { href: "/queue", label: "submissions", title: "Cases that need an underwriting decision" },
  { href: "/map", label: "portfolio", title: "Geographic concentration and active insured value" },
  { href: "/guideline", label: "rulebook", title: "The active property guideline and proposed edits" },
  { href: "/backtest", label: "validation", title: "How the rulebook compares with historical outcomes" },
];

const INTACT_DESTS = [
  { href: "/intact", label: "overview", title: "Renter quote volume and advisor handoff" },
  { href: "/intact/quotes", label: "renter quotes", title: "Ready estimates and quotes that need advisor review" },
];

/** The desk frame and the product switch shared by both product modes. */
export function Chrome() {
  const path = usePathname();
  const intact = path.startsWith("/intact");
  const [api, setApi] = useState<"…" | "up" | "down">("…");

  useEffect(() => {
    let live = true;
    const ping = () =>
      fetch("/api/atlas/health", { cache: "no-store" })
        .then((r) => live && setApi(r.ok ? "up" : "down"))
        .catch(() => live && setApi("down"));
    ping();
    const id = setInterval(ping, 20_000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.product = intact ? "intact" : "federato";
    return () => {
      delete document.documentElement.dataset.product;
    };
  }, [intact]);

  if (path.startsWith("/live")) return null; // the live desk owns its whole screen

  return (
      <header className={`desk-chrome product-chrome flex h-[40px] items-stretch border-b border-edge bg-land text-[11px] ${intact ? "intact-chrome" : ""}`}>
        <span className="flex items-center border-r border-edge px-3 font-semibold tracking-[0.18em] text-ink">PIXIE</span>
        <div className="product-switch flex items-center gap-0.5 border-r border-edge px-1" role="group" aria-label="Product mode">
          <Link href="/queue" aria-current={!intact ? "page" : undefined} className={!intact ? "product-switch-on" : ""}>
            Federato
          </Link>
          <Link href="/intact" aria-current={intact ? "page" : undefined} className={intact ? "product-switch-on" : ""}>
            Intact
          </Link>
        </div>
        <nav aria-label="Main" className="flex shrink-0">
          {(intact ? INTACT_DESTS : FEDERATO_DESTS).map((d) => {
            const on = intact
              ? d.href === "/intact" ? path === "/intact" : path.startsWith(d.href)
              : path.startsWith(d.href) || (d.href === "/queue" && path.startsWith("/cases"));
            return (
              <Link
                key={d.href}
                href={d.href}
                title={d.title}
                aria-current={on ? "page" : undefined}
                className={`flex items-center border-r border-rule px-3.5 uppercase tracking-[0.1em] transition-colors duration-150 ${
                  on ? "bg-raise text-ochre shadow-[inset_0_-2px_0_var(--color-ochre)]" : "text-dim hover:bg-raise hover:text-ink"
                }`}
              >
                {d.label}
              </Link>
            );
          })}
        </nav>
        <span className="chrome-status ml-auto flex shrink-0 items-center gap-3 pr-3 text-[10px] text-dim">
          {!intact && <ResetDemo />}
          {process.env.NEXT_PUBLIC_FIXTURES === "1" && <span className="text-ochre">BUNDLED SAMPLES</span>}
          <span className="flex items-center gap-1.5" title={`API at localhost:8000 is ${api}`}>
            <span
              aria-hidden
              className={`size-[6px] rounded-full ${api === "up" ? "bg-moss" : api === "down" ? "bg-rust" : "bg-faint"}`}
            />
            API {api}
          </span>
          <Link href="/privacy" className="chrome-legal hover:text-ink">
            privacy
          </Link>
          <Link href="/terms" className="chrome-legal hover:text-ink">
            terms
          </Link>
        </span>
      </header>
  );
}
