// A3/Elastic lane: precedent search + declines significant_terms + TIV percentile, all read
// straight from pixie-precedent (docs/ELASTIC.md). Every number here is API-sourced, never guessed.
import type { DeclinesInsight, Percentile, PrecedentResult } from "@/lib/api";
import { money } from "./bits";

function BackendTag({ backend }: { backend: "elastic" | "memory" }) {
  return <span className="ml-1.5 font-mono text-[10px] text-dim">[{backend}]</span>;
}

export function PrecedentPanel({ p }: { p: PrecedentResult }) {
  if (!p.hits.length) return null;
  return (
    <section aria-labelledby="pc">
      <h2 className="kicker mb-1.5 flex justify-between">
        <span id="pc">Precedent</span>
        <BackendTag backend={p.backend} />
      </h2>
      <p className="mb-1.5 text-[12px] text-dim">
        {p.hits.length} nearest of {p.n} past risks in the book. {p.nLossMaking} of {p.hits.length} produced losses.
      </p>
      <ul className="space-y-1.5">
        {p.hits.map((h) => (
          <li key={h.case_id} className="border-t border-rule pt-1.5 text-[12px]">
            <b className="font-semibold">{h.insured}</b>{" "}
            <span className={h.decision === "declined" ? "text-rust" : "text-moss"}>{h.decision}</span>
            {" — "}
            {h.outcome}
          </li>
        ))}
      </ul>
    </section>
  );
}

const FIELD_LABEL: Record<string, string> = { perils: "peril", state: "state", construction: "construction", broker: "broker" };

function TermList({ terms }: { terms: DeclinesInsight["declined"] }) {
  if (!terms.length) return <p className="text-[12px] text-dim">Nothing over-represented at this sample size.</p>;
  return (
    <ul className="space-y-1">
      {terms.slice(0, 5).map((t) => (
        <li key={`${t.field}:${t.value}`} className="flex items-baseline justify-between gap-2 text-[12px]">
          <span>
            <span className="font-mono text-[10px] text-dim">{FIELD_LABEL[t.field] ?? t.field}</span> {t.value}
          </span>
          <span className="num text-[11px] text-dim">
            {t.doc_count}/{t.background_count} · score {t.score.toFixed(2)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** "What the book teaches" -- significant_terms over declines and loss-making bound policies vs. the whole book. */
export function DeclinesPanel({ d }: { d: DeclinesInsight }) {
  return (
    <section aria-labelledby="dc" className="border border-rule px-4 py-3">
      <h2 className="kicker mb-1.5 flex justify-between">
        <span id="dc">What the book teaches</span>
        <BackendTag backend={d.backend} />
      </h2>
      <p className="mb-2 text-[12px] text-dim">
        significant_terms over {d.nDeclined} declined and {d.nLossMaking} loss-making of {d.nBook} book docs --
        over-represented, not just frequent.
      </p>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="kicker mb-1 text-[10px]">Declines</p>
          <TermList terms={d.declined} />
        </div>
        <div>
          <p className="kicker mb-1 text-[10px]">Loss-making</p>
          <TermList terms={d.lossMaking} />
        </div>
      </div>
    </section>
  );
}

/** "TIV is in the 38th percentile of what we write" -- percentile_ranks against the bound book. */
export function PercentileLine({ p }: { p: Percentile }) {
  return (
    <span className="ml-3 normal-case tracking-normal">
      TIV <span className="num text-ink">{money(p.tiv)}</span> is the{" "}
      <span className="num text-ink">{Math.round(p.tivPercentile)}th</span> percentile of what we write
      {p.premiumPercentile !== undefined && (
        <>
          {" "}
          (premium <span className="num text-ink">{Math.round(p.premiumPercentile)}th</span>)
        </>
      )}
      <BackendTag backend={p.backend} />
    </span>
  );
}
