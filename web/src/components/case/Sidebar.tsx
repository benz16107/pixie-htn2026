import { money } from "@/components/bits";
import type { Challenge, Precedent } from "@/lib/explain";

/** The Challenger's case against the decision, set as a written argument: sized risks, a remedy each, and what would change its mind. */
export function Challenger({ c, deskVerdict, rulesDecision }: { c: Challenge; deskVerdict?: string; rulesDecision: string }) {
  const moved = deskVerdict && deskVerdict !== rulesDecision;
  return (
    <div className="min-w-0">
      <p className="measure text-[15px] leading-[1.6]">
        {c.argument}
        {c.verified && (
          <span className="ml-2 whitespace-nowrap text-[12px] text-dim" title="Every number in the argument was checked against the facts">
            ✓ numbers verified
          </span>
        )}
      </p>
      {moved && (
        <p className="measure mt-3 text-[13.5px] leading-[1.5] text-dim">
          The rules say <span className="text-ink">{rulesDecision}</span>. After the challenge the desk went with <span className="text-ink">{deskVerdict.replaceAll("_", " ")}</span>.
        </p>
      )}

      <ol className="mt-6">
        {c.risks.map((r, i) => (
          <li key={r.risk} className="rule-faint grid grid-cols-[36px_minmax(0,1fr)] gap-x-2 py-3.5">
            <span className="display-num text-[20px] leading-none text-dim">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-[14px] font-medium leading-[1.4]">
                {r.risk}
                {r.grounded && <span className="sc ml-2 text-dim">grounded</span>}
              </p>
              <p className="measure mt-1.5 text-[13.5px] leading-[1.5]">{r.size}</p>
              {r.likelihood && <p className="measure mt-1 text-[13px] italic leading-[1.5] text-dim">{r.likelihood}</p>}
              <p className="measure mt-1.5 text-[13.5px] leading-[1.5]">
                <span className="text-dim">Remedy. </span>
                {r.remedy}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {c.changeMyMind.length > 0 && (
        <div className="rule-ink mt-2 pt-3">
          <p className="folio mb-2">What would change its mind</p>
          <ul className="measure space-y-1 text-[13.5px] leading-[1.5]">
            {c.changeMyMind.map((m) => (
              <li key={m} className="grid grid-cols-[36px_minmax(0,1fr)]">
                <span className="text-dim">·</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
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
    <div>
      <p className="text-[13px] leading-[1.5] text-dim">{p.basisExplained.charAt(0).toUpperCase() + p.basisExplained.slice(1)}.</p>
      <table className="book mt-3 text-[13px]">
        <thead>
          <tr>
            <th>Insured</th>
            <th className="w-[40px]">State</th>
            <th className="r w-[70px]">TIV</th>
            <th className="r w-[80px]">Premium</th>
            <th className="r w-[70px]">Loss ratio</th>
          </tr>
        </thead>
        <tbody>
          {p.hits.map((h) => (
            <tr key={h.policyNumber ?? h.insured} title={h.outcome}>
              <td className="min-w-0">
                <span className="block truncate">{h.insured}</span>
              </td>
              <td className="num text-dim">{h.state}</td>
              <td className="r num">{money(h.tiv)}</td>
              <td className="r num">{typeof h.premium === "number" ? money(h.premium) : <span className="text-red">declined</span>}</td>
              <td className={`r num ${typeof h.lossRatio === "number" && h.lossRatio >= 1 ? "text-red" : ""}`}>
                {typeof h.lossRatio === "number" ? h.lossRatio.toFixed(2) : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="measure mt-3 text-[13.5px] leading-[1.5]">
        {worst ? (
          <>
            The worst of them, {worst.insured}, ran a loss ratio of <span className="num font-medium">{worst.lossRatio.toFixed(2)}</span> on {money(worst.premium)} of premium.
          </>
        ) : (
          "Every one of them was declined, so none of them ran a loss."
        )}
      </p>
    </div>
  );
}
