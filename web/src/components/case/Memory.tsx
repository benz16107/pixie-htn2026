import type { DeskMemory } from "@/lib/api";

/**
 * What the desk remembered before it worked this case (GET /cases/{id}/memory).
 *
 * Two kinds of number live here and they never share a style. The recalled cases are the desk's own
 * record, so they read like the rest of the page. A model judgement is a probability from Backboard's
 * System One: it is fenced off in its own block, in plain ink, labelled as the model's, because it may
 * never become a score, a price or a decision.
 */

const FROM: Record<string, { label: string; title: string }> = {
  desk: { label: "Pixie recall", title: "Pixie's own cross-case recall, written by the desk and read back from disk" },
  backboard: { label: "Backboard", title: "Backboard assistant memory, one assistant per underwriter" },
};

const pct = (n: number | null) => (typeof n === "number" ? `${Math.round(n * 100)}%` : "—");

export function Memory({ m }: { m: DeskMemory }) {
  const sources = Object.values(m.sources ?? {}).filter((s) => s.lines > 0 || s.live);
  return (
    <section aria-labelledby="mem-h" className="grid grid-cols-[minmax(0,1fr)_248px] gap-x-4 px-3 py-2">
      <h2 id="mem-h" className="sr-only">
        What the desk remembered
      </h2>

      <div className="min-w-0">
        <p className="cond text-[13px] leading-snug text-ink" style={{ textWrap: "pretty" }}>
          {m.summary}
        </p>
        {m.recalled.length > 0 && (
          <ul className="mt-1.5 border-t border-rule">
            {m.recalled.map((r) => (
              <li key={r.line} className="flex flex-wrap items-baseline gap-x-2 border-b border-rule py-1 text-[11px] last:border-b-0">
                <a href={`/cases/${r.caseId}`} className="num w-[38px] shrink-0 text-dim underline-offset-2 hover:text-ochre hover:underline">
                  #{r.caseId}
                </a>
                <b className="cond text-[12px] font-medium text-ink">{r.insured}</b>
                <span className="min-w-0 flex-1 text-dim">{r.why}</span>
                <span
                  title={FROM[r.from]?.title}
                  className={`shrink-0 rounded-sm border px-1 text-[9px] uppercase leading-[13px] tracking-[0.06em] ${
                    r.from === "backboard" ? "border-ochre/50 bg-ochre/10 text-ochre" : "border-moss/50 bg-moss/10 text-moss"
                  }`}
                >
                  {FROM[r.from]?.label ?? r.from}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="min-w-0">
        {m.judgements.length > 0 && (
          <div className="mb-2 border border-dashed border-edge px-2 py-1.5">
            <p className="kicker text-ink">Model judgements, not engine numbers</p>
            <ul className="mt-0.5">
              {m.judgements.flatMap((j) =>
                j.answers.map((a) => (
                  <li key={`${j.source}${a.question}`} className="flex flex-wrap items-baseline gap-x-2 text-[11px] text-ink">
                    <span className="text-dim">{a.question}</span>
                    <b className="font-medium">{a.answer}</b>
                    <span className="num text-[10px] text-dim">
                      p {pct(a.probability)} · confidence {pct(a.confidence)}
                    </span>
                    <span className="num text-[10px] text-faint">{j.source}</span>
                  </li>
                )),
              )}
            </ul>
            <p className="mt-1 text-[10px] leading-snug text-faint">{m.judgementBoundary}</p>
          </div>
        )}

        {sources.length > 0 && (
          <ul className="text-[10px] leading-snug text-faint">
            {sources.map((s) => (
              <li key={s.id} className="mb-1" title={s.store}>
                <b className="font-medium text-dim">{s.name}</b>: {s.lines} line{s.lines === 1 ? "" : "s"},{" "}
                {s.needsNetwork ? "needs the network" : "works with the Wi-Fi off"}
              </li>
            ))}
          </ul>
        )}

        <p className="border-t border-rule pt-1 text-[10px] leading-snug text-faint">{m.boundary}</p>
      </div>
    </section>
  );
}
