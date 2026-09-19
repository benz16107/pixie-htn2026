"use client";
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
const GEO = new Set(["hazard", "portfolio"]);
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
 * The case walks the desk: one station per agent, each holding what it produced, the case token
 * parked at whoever is working. Cards land as their events arrive.
 */
export function StationLine({ events, caseTitle }: { events: DeskEvent[]; caseTitle: string }) {
  const loud = events.filter((e) => !QUIET.has(e.kind));
  const present = ORDER.filter((a) => loud.some((e) => e.actor === a));
  const stations = present.length ? present : ORDER.slice(0, 6);
  const latest = loud.at(-1);
  const at = stations.indexOf((latest?.actor ?? "system") as Actor);
  const step = 100 / (stations.length + 1);
  // Seven stations do not fit seven cards. Show the four that spoke most recently.
  const recent = new Set(
    [...stations]
      .map((a) => ({ a, t: loud.filter((e) => e.actor === a).at(-1)?.tMs ?? -1 }))
      .sort((x, y) => y.t - x.t)
      .slice(0, 4)
      .map((x) => x.a),
  );

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-x-0 top-[56%] h-[2px] bg-rule">
        <div
          className="absolute left-0 top-0 h-[2px] bg-ink transition-[width] duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{ width: `${(at + 1) * step}%` }}
        />

        {stations.map((a, i) => {
          const mine = loud.filter((e) => e.actor === a);
          const last = mine.at(-1);
          const live = i === at;
          const x = (i + 1) * step;
          // Alternate the cards that are actually shown, so neighbours never sit at the same height.
          const up = [...recent].sort((m, n) => stations.indexOf(m) - stations.indexOf(n)).indexOf(a) % 2 === 0;
          const h = last ? headline(last) : null;
          return (
            <div key={a}>
              <span
                className={`absolute -top-[9px] -ml-[10px] size-5 rounded-full border-2 bg-paper ${
                  live ? "border-rust shadow-[0_0_0_6px_rgba(162,73,47,0.14)]" : mine.length ? "border-ink bg-ink" : "border-rule"
                }`}
                style={{ left: `${x}%` }}
              />
              <span
                className={`absolute top-[26px] -translate-x-1/2 whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[0.1em] ${live ? "text-rust" : "text-dim"}`}
                style={{ left: `${x}%` }}
              >
                {NAME[a]}
                {mine.length > 1 && <span className="ml-1 font-mono text-[9.5px] font-normal opacity-70">{mine.length}</span>}
              </span>
              {h && !recent.has(a) && (
                <span className="absolute top-[44px] -translate-x-1/2 whitespace-nowrap font-mono text-[9.5px] text-dim" style={{ left: `${x}%` }}>
                  {mine.length} step{mine.length > 1 ? "s" : ""}
                </span>
              )}
              {h && recent.has(a) && (
                <div
                  className={`lane-card pointer-events-auto absolute w-[198px] rounded-sm border px-2.5 py-2 text-[11.5px] leading-snug ${
                    up ? "bottom-[30px]" : "top-[48px]"
                  } ${live ? "border-[1.5px] border-rust bg-paper" : GEO.has(a) ? "border-ochre bg-ochre-soft/95" : "border-rule bg-paper/96"}`}
                  style={{ left: `clamp(8px, calc(${x}% - 99px), calc(100% - 206px))` }}
                >
                  <b className="mb-0.5 line-clamp-2 block font-semibold">{h.title}</b>
                  <span className="line-clamp-3 block">{h.detail}</span>
                  <span className="mt-1 block font-mono text-[9.5px] text-dim">
                    t+{(last!.tMs / 1000).toFixed(0)}s{mine.length > 1 ? ` · ${mine.length} steps here` : ""}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        <div
          className="absolute -top-[17px] -ml-[58px] w-[116px] rounded-sm bg-ink px-2.5 py-1.5 text-paper transition-[left] duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{ left: `${(at + 1) * step}%`, zIndex: 3 }}
        >
          <b className="block text-[12px] font-medium">{caseTitle}</b>
          <span className="font-mono text-[9.5px] opacity-75">{loud.length} steps so far</span>
        </div>
      </div>
    </div>
  );
}
