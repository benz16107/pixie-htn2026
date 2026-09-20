// A3/Elastic lane: precedent search + declines significant_terms + TIV percentile, all read
// straight from pixie-precedent (docs/ELASTIC.md). Every number here is API-sourced, never guessed.
import type { DeclinesInsight, Percentile, PrecedentResult } from "@/lib/api";
import { money } from "./bits";

/** Which backend answered: the honesty mark that stays on every Elastic-fed figure. */
export function BackendTag({ backend }: { backend: "elastic" | "memory" }) {
  return <span className="num ml-1.5 text-[11px] text-dim">[{backend}]</span>;
}

export function PrecedentPanel({ p }: { p: PrecedentResult }) {
  if (!p.hits.length) return null;
  return (
    <section aria-labelledby="pc">
      <h2 className="folio mb-1.5 flex justify-between">
        <span id="pc">Precedent</span>
        <BackendTag backend={p.backend} />
      </h2>
      <p className="mb-1.5 text-[13px] text-dim">
        {p.hits.length} nearest of {p.n} past risks in the book. {p.nLossMaking} of {p.hits.length} produced losses.
      </p>
      <ul>
        {p.hits.map((h) => (
          <li key={h.case_id} className="rule-faint py-1.5 text-[13px]">
            <b className="font-medium">{h.insured}</b>{" "}
            <span className={h.decision === "declined" ? "text-red" : ""}>{h.decision}</span>, {h.outcome}
          </li>
        ))}
      </ul>
    </section>
  );
}

const FIELD_LABEL: Record<string, string> = { perils: "peril", state: "state", construction: "construction", broker: "broker" };

function TermList({ terms }: { terms: DeclinesInsight["declined"] }) {
  if (!terms.length) return <p className="text-[13px] text-dim">Nothing over-represented at this sample size.</p>;
  return (
    <table className="book text-[13px]">
      <tbody>
        {terms.slice(0, 5).map((t) => (
          <tr key={`${t.field}:${t.value}`}>
            <td className="w-[96px] text-dim">{FIELD_LABEL[t.field] ?? t.field}</td>
            <td>{t.value}</td>
            <td className="r num text-dim">
              {t.doc_count} of {t.background_count}
            </td>
            <td className="r num w-[70px]">{t.score.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** What the book teaches: significant_terms over declines and loss-making bound policies, against the whole book. */
export function DeclinesPanel({ d }: { d: DeclinesInsight }) {
  return (
    <section aria-labelledby="dc" className="rule-ink pt-4">
      <div className="grid grid-cols-12 gap-x-8">
        <div className="col-span-4">
          <h2 id="dc" className="display display-md">
            What the book teaches
            <BackendTag backend={d.backend} />
          </h2>
          <p className="measure mt-3 text-[13.5px] leading-[1.5] text-dim">
            Terms over-represented, not merely frequent, among the {d.nDeclined} declined and the {d.nLossMaking} loss-making of {d.nBook} policies in
            the book. Each row gives the count in that group against the count in the book, and Elastic&apos;s significance score.
          </p>
        </div>
        <div className="col-span-4">
          <p className="folio mb-2">Among declines</p>
          <TermList terms={d.declined} />
        </div>
        <div className="col-span-4">
          <p className="folio mb-2">Among loss-making policies</p>
          <TermList terms={d.lossMaking} />
        </div>
      </div>
    </section>
  );
}

/** "TIV is in the 25th percentile of what we write", from percentile_ranks against the bound book. */
export function PercentileLine({ p }: { p: Percentile }) {
  return (
    <span>
      A TIV of <span className="num text-ink">{money(p.tiv)}</span> sits at the <span className="num text-ink">{ordinal(Math.round(p.tivPercentile))}</span> percentile of
      what the desk writes
      {p.premiumPercentile !== undefined && (
        <>
          {" "}
          (the premium at the <span className="num text-ink">{ordinal(Math.round(p.premiumPercentile))}</span>)
        </>
      )}
      .<BackendTag backend={p.backend} />
    </span>
  );
}

export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};
