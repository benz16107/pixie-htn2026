"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useKeys } from "./keys";
import { Kbd } from "./Kbd";

const DESTS = [
  { key: "q", href: "/queue", label: "blotter" },
  { key: "r", href: "/guideline", label: "rules" },
  { key: "m", href: "/map", label: "book" },
  { key: "a", href: "/ask", label: "ask" },
  { key: "b", href: "/backtest", label: "proof" },
  { key: "l", href: "/live", label: "live" },
];

const GLOBAL_KEYS: [string, string][] = [
  ["g then q / r / m / a / b / l", "go to blotter, rules, book, ask, proof, live"],
  ["?", "this sheet"],
  ["Esc", "close anything open"],
];

const PAGE_KEYS: Record<string, [string, string][]> = {
  "/queue": [
    ["j / k", "move the cursor down and up the blotter"],
    ["Enter", "open the case under the cursor"],
    ["o / A", "open submissions only / everything"],
    ["gg / G", "jump to the first or the last row"],
  ],
  "/guideline": [
    ["1 – 5", "load a scenario into the document"],
    ["a", "apply the pending edits and re-score all 158"],
    ["d", "discard the pending edits"],
    ["r", "restore the guideline as filed on disk"],
  ],
  "/cases": [
    ["w / s", "waterfall / decision space"],
    ["o", "adjust the score, bounded and with a reason"],
    ["1 2 3 4", "facts, bands, lanes, site in the bottom deck"],
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
  const [help, setHelp] = useState(false);
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

  // Rendered after mount only: a server-rendered clock would hydrate to a different second.
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-CA", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useKeys(
    (e, leader) => {
      if (e.key === "?") return setHelp((h) => !h), true;
      if (e.key === "Escape" && help) return setHelp(false), true;
      if (leader === "g") {
        const d = DESTS.find((x) => x.key === e.key);
        if (d) return router.push(d.href), true;
      }
      return false;
    },
    [help, router],
  );

  if (path.startsWith("/live")) return null; // the live desk owns its whole screen

  const section = path.startsWith("/cases") ? "/cases" : path;
  const keys = [...(PAGE_KEYS[section] ?? []), ...GLOBAL_KEYS];

  return (
    <>
      <header className="flex h-[30px] items-stretch border-b border-edge bg-land text-[11px]">
        <span className="flex items-center gap-2 border-r border-edge px-3 font-semibold tracking-[0.18em] text-ink">
          PIXIE
          <span className="hidden font-normal tracking-[0.06em] text-faint xl:inline">UNDERWRITING DESK</span>
        </span>
        <nav aria-label="Main" className="flex">
          {DESTS.map((d) => {
            const on = path.startsWith(d.href) || (d.href === "/queue" && path.startsWith("/cases"));
            return (
              <Link
                key={d.href}
                href={d.href}
                aria-current={on ? "page" : undefined}
                className={`flex items-center gap-1.5 border-r border-rule px-3 uppercase tracking-[0.1em] transition-colors duration-150 ${
                  on ? "bg-raise text-ochre shadow-[inset_0_-2px_0_var(--color-ochre)]" : "text-dim hover:bg-raise hover:text-ink"
                }`}
              >
                {d.label}
                <kbd aria-hidden className={`key ${on ? "key-on" : ""}`}>
                  {d.key}
                </kbd>
              </Link>
            );
          })}
        </nav>
        <span className="ml-auto flex items-center gap-4 pr-3 text-[10px] text-dim">
          <span className="hidden tracking-[0.1em] lg:inline">FEDERATO SNAPSHOT · 158 SUBMISSIONS</span>
          <button onClick={() => setHelp(true)} className="hover:text-ink" aria-haspopup="dialog">
            keys <kbd className="key">?</kbd>
          </button>
          <span className="flex items-center gap-1.5" title={`API at localhost:8000 is ${api}`}>
            <span
              aria-hidden
              className={`size-[6px] rounded-full ${api === "up" ? "bg-moss" : api === "down" ? "bg-rust" : "bg-faint"}`}
            />
            API {api}
          </span>
          <span className="num w-[58px] text-right tabular-nums text-faint">{clock || "--:--:--"}</span>
          <Link href="/privacy" className="hover:text-ink">
            privacy
          </Link>
          <Link href="/terms" className="hover:text-ink">
            terms
          </Link>
        </span>
      </header>

      {help && (
        <div className="fixed inset-0 z-50 bg-paper/88 p-6" role="presentation" onClick={() => setHelp(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            onClick={(e) => e.stopPropagation()}
            className="sheet mx-auto mt-[10vh] w-[560px] border border-edge bg-land shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
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
        </div>
      )}
    </>
  );
}
