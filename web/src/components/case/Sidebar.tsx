import { money } from "@/components/bits";
import type { Challenge, Precedent } from "@/lib/explain";

/** The Challenger's case against the decision: sized risks, a remedy each, and what would change its mind. */
export function Challenger({ c, deskVerdict, rulesDecision }: { c: Challenge; deskVerdict?: string; rulesDecision: string }) {
  const moved = deskVerdict && deskVerdict !== rulesDecision;
  return (
    <section aria-labelledby="ch-h" className="min-w-0 overflow-hidden border-b border-rule px-4 py-3">
      <div className="flex items-baseline gap-2">
        <h2 id="ch-h" className="font-serif text-[18px] font-semibold">
          The case against
        </h2>
        <span className="font-mono text-[10.5px] text-dim">Challenger agent</span>
        {c.verified && <span className="ml-auto font-mono text-[10px] text-moss">✓ numbers verified</span>}
      </div>

      {moved && (
        <p className="mt-2 rounded-sm border border-ochre bg-ochre-soft px-2 py-1.5 text-[11.5px] leading-snug">
          The rules say <b className="font-semibold">{rulesDecision}</b>. After the challenge the desk went with{" "}
          <b className="font-semibold">{deskVerdict.replaceAll("_", " ")}</b>.
        </p>
      )}

      <p className="mt-2 text-[12px] leading-snug">{c.argument}</p>

      <ul className="mt-2">
        {c.risks.map((r) => (
          <li key={r.risk} className="border-t border-rule py-2">
            <p className="flex items-baseline gap-2">
              <span aria-hidden className="mt-[3px] size-[6px] shrink-0 rounded-full bg-rust" />
              <b className="min-w-0 text-[12.5px] font-semibold">{r.risk}</b>
              {r.grounded && <span className="ml-auto shrink-0 font-mono text-[9.5px] text-moss">grounded</span>}
            </p>
            <p className="mt-1 text-[11.5px] leading-snug">{r.size}</p>
            {r.likelihood && <p className="mt-0.5 text-[11px] italic leading-snug text-dim">{r.likelihood}</p>}
            <p className="mt-1 text-[11.5px] leading-snug text-dim">Remedy: {r.remedy}</p>
          </li>
        ))}
      </ul>

      {c.changeMyMind.length > 0 && (
        <div className="mt-2 rounded-sm bg-land px-3 py-2">
          <p className="kicker mb-1">What would change my mind</p>
          <ul className="space-y-0.5">
            {c.changeMyMind.map((m) => (
              <li key={m} className="relative pl-3 text-[11.5px] leading-snug before:absolute before:left-0 before:top-[7px] before:size-[5px] before:rounded-full before:bg-ink">
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** What happened last time we wrote risks like this one. */
export function PrecedentPanel({ p }: { p: Precedent }) {
  if (!p.hits.length) return null;
  // A declined precedent never became a policy, so it has no premium, no incurred loss and no
  // loss ratio. Those hits still belong in the list: they say what the desk turned away.
  const written = p.hits.filter((h): h is typeof h & { lossRatio: number; premium: number } => typeof h.lossRatio === "number");
  const worst = written.length ? written.reduce((a, b) => (b.lossRatio > a.lossRatio ? b : a)) : null;
  return (
    <section aria-labelledby="pr-h" className="px-4 py-3">
      <div className="flex items-baseline gap-2">
        <h2 id="pr-h" className="font-serif text-[18px] font-semibold">
          We wrote {p.hits.length} like this
        </h2>
        <span className="font-mono text-[10.5px] text-dim">{p.backend}</span>
      </div>
      <p className="mt-1 text-[11.5px] leading-snug text-dim">{p.basisExplained}</p>
      <ul className="mt-2">
        {p.hits.map((h) => (
          <li key={h.policyNumber ?? h.insured} className="border-t border-rule py-1.5">
            <p className="flex items-baseline gap-2">
              <b className="min-w-0 flex-1 truncate text-[12px] font-medium">{h.insured}</b>
              <span className="num text-[11px] text-dim">{h.state}</span>
              {typeof h.lossRatio === "number" ? (
                <span className={`num text-[11.5px] ${h.lossRatio >= 1 ? "text-rust" : "text-moss"}`}>{h.lossRatio.toFixed(2)}</span>
              ) : (
                <span className="font-mono text-[10.5px] text-dim">declined</span>
              )}
            </p>
            <p className="num text-[10.5px] text-dim">
              {money(h.tiv)} TIV ·{" "}
              {typeof h.premium === "number"
                ? `premium ${money(h.premium)} · incurred ${money(h.incurred ?? 0)} · ${h.decision}`
                : h.outcome}
            </p>
          </li>
        ))}
      </ul>
      {worst ? (
        <p className="mt-1.5 text-[11.5px] leading-snug">
          The worst of them, {worst.insured}, ran a loss ratio of <b className="num font-semibold">{worst.lossRatio.toFixed(2)}</b> on{" "}
          {money(worst.premium)} of premium.
        </p>
      ) : (
        <p className="mt-1.5 text-[11.5px] leading-snug">Every one of them was declined, so none of them ran a loss.</p>
      )}
    </section>
  );
}
