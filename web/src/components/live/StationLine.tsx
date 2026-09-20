"use client";
import type { ReactNode } from "react";
import type { Actor, DeskEvent } from "@/contract";
import { parseHazard, parseSkip, prettyBands } from "@/lib/format";

const ORDER: Actor[] = ["system", "lead", "intake", "appetite", "hazard", "portfolio", "challenger", "human"];
const NAME: Record<string, string> = {
  system: "Triage",
  lead: "Lead",
  intake: "Intake",
  appetite: "Appetite",
  hazard: "Hazard",
  portfolio: "Portfolio",
  challenger: "Challenger",
  human: "Underwriter",
};
const str = (v: unknown) => (typeof v === "string" ? v : "");
const QUIET = new Set(["tool_call", "run_stats", "query", "query_retry", "note"]);

/** The headline each agent produced, in plain words. */
function headline(e: DeskEvent): { title: string; detail: string } {
  const text = prettyBands(str(e.body.text));
  switch (e.kind) {
    case "plan":
      return { title: text.replace(/^Deep dive \((\w+)\):\s*/i, (_, d) => `Deep dive, ${d} depth. `).slice(0, 80), detail: text };
    case "ask":
      return { title: `Asks ${e.to}`, detail: str(e.body.question) || text };
    case "answer":
      return { title: `Answers ${e.to}`, detail: text };
    case "estimate":
      return { title: text.split(" from ")[0], detail: text };
    case "assessment":
      return { title: text, detail: `Interval now ${str((e.body.score as { lo?: number } | undefined)?.lo)}` };
    case "conflict":
      return { title: "Conflict", detail: text };
    case "resolution":
      return { title: "Resolved", detail: text.replace(/^[a-z_:]+\s*->\s*/i, "") };
    case "challenge":
      return { title: "Argues against the draft", detail: text };
    case "response":
      return { title: "Answers the challenge", detail: text };
    case "decision":
      return { title: text.split(":")[0], detail: text };
    case "action":
      return { title: text, detail: str(e.body.status) };
    case "finding": {
      if (e.body.skipped) {
        const s = parseSkip(str(e.body.skipped), text);
        return { title: `${s.peril} lookup skipped`, detail: s.reason };
      }
      if (/\(x[\d.]+,\s*[+-]?[\d.]+\s*pts\)/i.test(text)) {
        const h = parseHazard(text);
        return { title: `${h.peril}: ${h.sentence}`, detail: `×${h.multiplier?.toFixed(2)}, ${h.points} points` };
      }
      return { title: text, detail: str(e.body.source) };
    }
    default:
      return { title: text || e.kind.replaceAll("_", " "), detail: "" };
  }
}

/**
 * The case walks the desk. The rail is a printed row of stations, one column each, and the band
 * below it holds a single passage: what the desk is saying right now, or the broker email when
 * that moment comes. Everything earlier is in the chatter log, so nothing stacks.
 */
export function StationLine({ events, caseTitle, takeover }: { events: DeskEvent[]; caseTitle: string; takeover?: ReactNode }) {
  const loud = events.filter((e) => !QUIET.has(e.kind));
  const present = ORDER.filter((a) => loud.some((e) => e.actor === a));
  const stations = present.length ? present : ORDER.slice(0, 6);
  const latest = loud.at(-1);
  const at = Math.max(0, stations.indexOf((latest?.actor ?? "system") as Actor));
  const pct = ((at + 0.5) / stations.length) * 100;
  const here = latest ? loud.filter((e) => e.actor === latest.actor).length : 0;
  const h = latest ? headline(latest) : null;
  const conflict = latest?.kind === "conflict" || latest?.kind === "query_retry";

  return (
    <section className="relative z-10 shrink-0 border-t border-ink bg-paper px-5 pb-3 pt-2" aria-label="Where the case is on the desk">
      {/* the case marker, alone on its row, so it can travel without meeting anything */}
      <div className="relative h-[20px]">
        <div
          className="num absolute top-0 -translate-x-1/2 whitespace-nowrap bg-ink px-2 py-[2px] text-[10.5px] text-paper transition-[left] duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
          style={{ left: `clamp(66px, ${pct}%, calc(100% - 66px))` }}
        >
          {caseTitle}, {loud.length} steps
        </div>
      </div>

      <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${stations.length}, minmax(0, 1fr))` }}>
        <span aria-hidden className="absolute inset-x-0 top-[6px] h-px bg-rule" />
        <span
          aria-hidden
          className="absolute left-0 top-[6px] h-px bg-ink transition-[width] duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
        {stations.map((a, i) => {
          const mine = loud.filter((e) => e.actor === a);
          const live = i === at;
          return (
            <li key={a} className="relative flex flex-col items-center gap-[6px]">
              <span className={`size-[13px] rounded-full border bg-paper ${live ? "border-ink bg-ink" : mine.length ? "border-ink" : "border-rule"}`} />
              <span className={`sc truncate ${live ? "text-ink" : mine.length ? "text-ink" : "text-dim"}`}>{NAME[a]}</span>
              <span className="num text-[10px] text-dim">{mine.length ? `${mine.length} step${mine.length > 1 ? "s" : ""}` : ""}</span>
            </li>
          );
        })}
      </ol>

      {/* one passage: it swaps, it never stacks */}
      <div className="mt-2 h-[104px]">
        {takeover ??
          (h && latest ? (
            <article key={latest.id} className={`lane-card flex h-full flex-col overflow-hidden border-l pl-3 pr-2 py-1 text-[12.5px] leading-[1.4] ${conflict ? "border-red" : "border-ink"}`}>
              <p className="folio mb-0.5">{NAME[latest.actor] ?? latest.actor}</p>
              <b className="block truncate font-medium" title={h.title}>
                {h.title}
              </b>
              {h.detail && (
                <span className="mt-0.5 line-clamp-2 text-dim" title={h.detail}>
                  {h.detail}
                </span>
              )}
              <span className="num mt-auto pt-1 text-[10.5px] text-dim">
                t+{(latest.tMs / 1000).toFixed(0)}s{here > 1 ? `, ${here} steps here` : ""}. Earlier steps are in the chatter log.
              </span>
            </article>
          ) : (
            <p className="flex h-full items-center text-[12.5px] italic text-dim">The case has not reached a station yet.</p>
          ))}
      </div>
    </section>
  );
}
