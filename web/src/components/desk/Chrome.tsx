"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useKeys } from "./keys";
import { ResetDemo } from "./ResetDemo";
import { Kbd } from "./Kbd";

const FEDERATO_DESTS = [
  { key: "q", href: "/queue", label: "queue" },
  { key: "r", href: "/guideline", label: "guideline" },
  { key: "m", href: "/map", label: "portfolio" },
  { key: "a", href: "/ask", label: "ask" },
  { key: "b", href: "/backtest", label: "backtest" },
  { key: "l", href: "/live", label: "demo" },
];

const INTACT_DESTS = [
  { href: "/intact", label: "overview" },
  { href: "/intact/quotes", label: "renter quotes" },
];

const GLOBAL_KEYS: [string, string][] = [
  ["g then q / r / m / a / b / l", "go to queue, guideline, portfolio, ask, backtest, demo"],
  ["?", "this sheet"],
  ["Esc", "close anything open"],
];

const PAGE_KEYS: Record<string, [string, string][]> = {
  "/queue": [
    ["j / k", "move the cursor down and up the blotter"],
    ["Enter", "open the case under the cursor"],
    ["/", "filter the blotter"],
    ["o / A", "open submissions only / everything"],
    ["gg / G", "jump to the first or the last row"],
  ],
  "/guideline": [
    ["1 – 5", "load a scenario into the document"],
    ["a", "apply the pending edits and re-score the book"],
    ["d", "discard the pending edits"],
    ["r", "restore the guideline as filed on disk"],
  ],
  "/cases": [
    ["w / s", "how the score was built / every possible score"],
    ["o", "adjust the score, bounded and with a reason"],
    ["f", "jump to the what-if slider"],
    ["1 2 3 4", "the panels along the bottom"],
    ["← / →", "drag the what-if by one step"],
    ["u", "back to the blotter"],
  ],
  "/live": [
    ["1 – 6", "jump to a demo beat"],
    ["Space / d", "run the whole demo"],
    ["[ / ]", "scrub the run 5s"],
    ["e", "skip to the end of the run"],
  ],
};

/** The desk frame: one command strip, the key router under it, and the help sheet. */
export function Chrome() {
  const path = usePathname();
  const router = useRouter();
  const intact = path.startsWith("/intact");
  const [help, setHelp] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (help) dialog.current?.showModal(); else dialog.current?.close(); }, [help]);
  const [api, setApi] = useState<"…" | "up" | "down">("…");
  const [clock, setClock] = useState("");

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

  // Rendered after mount only: a server-rendered clock would hydrate to a different second.
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-CA", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useKeys(
    (e, leader) => {
      if (intact) return false;
      if (e.key === "?") return setHelp((h) => !h), true;
      if (e.key === "Escape" && help) return setHelp(false), true;
      if (leader === "g") {
        const d = FEDERATO_DESTS.find((x) => x.key === e.key);
        if (d) return router.push(d.href), true;
      }
      return false;
    },
    [help, intact, router],
  );

  if (path.startsWith("/live")) return null; // the live desk owns its whole screen

  const section = path.startsWith("/cases") ? "/cases" : path;
  const keys = intact ? [] : [...(PAGE_KEYS[section] ?? []), ...GLOBAL_KEYS];

  return (
    <>
      <header className={`desk-chrome product-chrome flex h-[30px] items-stretch border-b border-edge bg-land text-[11px] ${intact ? "intact-chrome" : ""}`}>
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
          {!intact && (
            <button onClick={() => setHelp(true)} className="hover:text-ink" aria-haspopup="dialog">
              keys <kbd className="key">?</kbd>
            </button>
          )}
          <span className="flex items-center gap-1.5" title={`API at localhost:8000 is ${api}`}>
            <span
              aria-hidden
              className={`size-[6px] rounded-full ${api === "up" ? "bg-moss" : api === "down" ? "bg-rust" : "bg-faint"}`}
            />
            API {api}
          </span>
          <span className="num hidden xl:inline w-[58px] text-right tabular-nums text-faint">{clock || "--:--:--"}</span>
          <Link href="/privacy" className="hover:text-ink">
            privacy
          </Link>
          <Link href="/terms" className="hover:text-ink">
            terms
          </Link>
        </span>
      </header>

      <dialog ref={dialog} onKeyDown={(e) => { if (e.key === "Tab") { e.preventDefault(); dialog.current?.querySelector<HTMLButtonElement>("button")?.focus(); } }} onCancel={() => setHelp(false)} onClick={(e) => { if (e.target === e.currentTarget) setHelp(false); }} className="fixed inset-0 z-50 m-auto max-h-[85dvh] w-[min(560px,calc(100vw-32px))] overflow-auto border border-edge bg-land p-0 text-ink backdrop:bg-paper/85" aria-label="Keyboard shortcuts">
          <div
            onClick={(e) => e.stopPropagation()}
            className="sheet"
          >
            <p className="flex items-center justify-between border-b border-edge px-4 py-2">
              <span className="kicker">Keyboard</span>
              <button onClick={() => setHelp(false)} className="text-[10px] text-dim hover:text-ink">
                close <kbd className="key">Esc</kbd>
              </button>
            </p>
            <dl className="px-4 py-2">
              {keys.map(([k, what]) => (
                <div key={k} className="flex items-baseline gap-3 border-b border-rule py-1.5 last:border-0">
                  <dt className="w-[168px] shrink-0">
                    <Kbd combo={k} />
                  </dt>
                  <dd className="cond text-[12px] text-dim">{what}</dd>
                </div>
              ))}
            </dl>
          </div>
        </dialog>
    </>
  );
}
