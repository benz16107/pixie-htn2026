import Link from "next/link";
import { notFound } from "next/navigation";
import type { Band } from "@/contract";
import type { CaseWithReceipt as CaseView } from "@/lib/api";
import { api } from "@/lib/api";
import { Actions } from "@/components/Actions";
import { CaseMap } from "@/components/LiveMap";
import { HazardCard, PortfolioCallout, portfolioSentence } from "@/components/CaseParts";
import { PrecedentPanel, PercentileLine } from "@/components/BookInsights";
import { bandPhrase, factorValue, whenLabel } from "@/lib/format";
import { Receipt } from "@/components/Receipt";
import { Swimlanes } from "@/components/Swimlanes";
import { DecisionChip, IntervalBar, IssueTag, ProvenanceBadge } from "@/components/bits";

const BANDS: { band: Band; label: string }[] = [
  { band: "target", label: "target" },
  { band: "acceptable", label: "accept." },
  { band: "not_acceptable", label: "not acc." },
];

function Kicker({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <h2 className="kicker mb-1.5 flex justify-between">
      <span>{children}</span>
      {right && <span>{right}</span>}
    </h2>
  );
}

function Facts({ c }: { c: CaseView }) {
  return (
    <table className="mb-3 w-full border-collapse">
      <tbody>
        {c.facts.map((f) => (
          <tr key={f.id} className="border-t border-rule align-top" title={f.source}>
            <th scope="row" className="w-[124px] py-[3px] text-left text-[12.5px] font-normal text-dim">{f.label}</th>
            <td className={`w-[190px] py-[3px] font-mono text-[12.5px] ${f.provenance === "missing" ? "text-rust" : ""}`}>{f.display}</td>
            <td className="py-[3px] text-[11.5px] text-dim">
              <span className="flex gap-1.5">
                <ProvenanceBadge p={f.provenance} />
                <span>{f.resolver ? `resolver: ${f.resolver} · ` : ""}{f.source}</span>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function CasePage({ params }: PageProps<"/cases/[id]">) {
  const { id } = await params;
  const [c, events, hexes, pins, precedent, percentile] = await Promise.all([
    api.case(id), api.events(id), api.mapBook("all"), api.mapPins(), api.precedent(id), api.percentile(id),
  ]);
  if (!c) notFound();
  const pin = pins.find((p) => p.caseId === c.caseId);
  const flippers = c.decision.kind === "open" ? c.decision.flippers : [];
  const place = c.facts.find((f) => f.id === "state")?.display;
  const delta =
    c.score && c.scoreWithoutEnrichment
      ? (c.score.lo + c.score.hi - c.scoreWithoutEnrichment.lo - c.scoreWithoutEnrichment.hi) / 2
      : null;

  return (
    <main>
      <div className="grid grid-cols-[640px_1fr] border-b border-rule">
        <div className="relative h-[550px] overflow-hidden border-r border-rule">
          <CaseMap site={c.site} zoom={c.kind === "tenant" ? 13.5 : 8.2} hexes={hexes} home={pin?.ring} />
          <div aria-hidden className="contours pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply" />
          {c.portfolio && <PortfolioCallout p={c.portfolio} />}
          <HazardCard risk={c.risk} />
        </div>

        <div className="px-8 pb-4 pt-4">
          <p className="font-mono text-[11px] text-dim">
            <Link href="/queue" className="hover:text-ink hover:underline">QUEUE</Link> / CASE #{c.caseId} · {c.kind.toUpperCase()}{place ? ` · ${place}` : ""}
          </p>
          <div className="flex items-center justify-between gap-4">
            <h1 className="mt-0.5 font-serif text-[32px] font-semibold leading-[1.1] text-balance">
              {c.title} <span className="align-[6px]"><DecisionChip decision={c.decision} large /></span>
            </h1>
            {c.kind === "commercial" && (
              <Actions
                caseId={c.caseId}
                facts={flippers.map((f) => f.fact)}
                proposed={c.actions.find((a) => a.key === "request_broker_info")?.status}
              />
            )}
          </div>

          <div className="my-3">
            <Kicker right="refer band 45–70">
              Score interval <span className="num text-ink">{c.score ? `${c.score.lo}–${c.score.hi}` : "—"}</span>
              {delta !== null && (
                <span className="ml-3 normal-case tracking-normal" title={`Without external layers: ${c.scoreWithoutEnrichment!.lo}–${c.scoreWithoutEnrichment!.hi}`}>
                  enrichment <span className="num text-ink">{delta > 0 ? "+" : delta < 0 ? "−" : "±"}{Math.abs(delta)}</span>
                </span>
              )}
              {percentile && <PercentileLine p={percentile} />}
            </Kicker>
            {c.score ? (
              <IntervalBar score={c.score} />
            ) : (
              <p className="text-[12px] text-dim">
                No interval:{" "}
                <span className="text-ink">
                  {c.decision.kind === "routed" ? c.decision.because : "no guideline scores this case; the decision comes from its own rules"}
                </span>
              </p>
            )}
            {flippers.length > 0 && (
              <p className="mt-1 text-[12px]">
                <span aria-hidden>⇅ </span>Straddles {c.decision.kind === "open" && c.decision.straddles}. Could flip on{" "}
                {flippers.map((f) => <b key={f.fact} className="font-semibold">{f.fact} (ask the {f.resolver})</b>)}.
              </p>
            )}
          </div>

          <Kicker right="provenance">Facts</Kicker>
          <Facts c={c} />

          <Kicker>
            Explanation{" "}
            {c.explanationVerified ? (
              <span className="text-moss" title="Every number in this text appears in the computed facts">✓ verified</span>
            ) : (
              <span className="text-rust">unverified, template shown</span>
            )}
          </Kicker>
          <p className="max-w-[68ch] font-serif text-[15px] leading-[1.45]">{c.explanation}</p>
        </div>
      </div>

      {c.receipt && (
        <div className="border-b border-rule px-10 py-5">
          <Receipt r={c.receipt} />
        </div>
      )}
      {events.length ? (
        <Swimlanes events={events} initialScore={c.scoreWithoutEnrichment ?? c.score} />
      ) : (
        <p className="px-10 py-4 text-[12.5px] text-dim">
          {c.kind === "tenant"
            ? "No desk run. Tenant quotes are decided in code in under a second; the desk only reviews referrals."
            : "The desk has not run on this case yet."}
        </p>
      )}

      {precedent && precedent.hits.length > 0 && (
        <div className="border-t border-rule px-10 py-6">
          <PrecedentPanel p={precedent} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-10 border-t border-rule px-10 py-6">
        <section aria-labelledby="fb">
          <Kicker><span id="fb">Factor bands</span></Kicker>
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="sr-only">Factor</th>
                {BANDS.map((b) => <th key={b.band} scope="col" className="w-[64px] pb-1 text-center font-mono text-[10px] font-normal text-dim">{b.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {c.factors.map((f) => (
                <tr key={f.fact} className="border-t border-rule">
                  <th scope="row" className="py-1 text-left font-normal">
                    {f.fact.replaceAll("_", " ")} <span className="font-mono text-[11px] text-dim">{factorValue(f.fact, f.valueText)}</span>
                  </th>
                  {BANDS.map((b) => {
                    const on = f.possible.includes(b.band);
                    return (
                      <td key={b.band} className="text-center">
                        <span aria-label={on ? "possible" : "ruled out"} className={`inline-block h-3 w-8 rounded-sm border ${on ? (b.band === "not_acceptable" ? "border-rust bg-rust" : b.band === "target" ? "border-moss bg-moss" : "border-ochre bg-ochre") : "border-rule"}`} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-[11px] text-dim">A filled cell is a band the fact can still land in. Missing facts keep all three.</p>
        </section>

        <section aria-labelledby="ct">
          <Kicker><span id="ct">Contradictions</span></Kicker>
          {c.contradictions.length === 0 && <p className="text-dim">None found.</p>}
          {c.contradictions.map((x, i) => (
            <dl key={i} className="grid grid-cols-[64px_1fr] gap-y-0.5 border-t border-rule py-1.5 text-[12px]">
              <dt className="font-mono text-[10.5px] text-moss">+ for</dt><dd>{x.good.map(bandPhrase).join("; ")}</dd>
              <dt className="font-mono text-[10.5px] text-rust">− against</dt><dd>{x.bad.map(bandPhrase).join("; ")}</dd>
              {x.resolve.length > 0 && (<><dt className="font-mono text-[10.5px] text-dim">? resolve</dt><dd>{x.resolve.map(bandPhrase).join("; ")}</dd></>)}
            </dl>
          ))}
          {c.issues.length > 0 && (
            <>
              <div className="mt-3"><Kicker>Data issues</Kicker></div>
              <ul className="space-y-1">
                {c.issues.map((i) => (
                  <li key={i.kind} className="flex items-baseline gap-2 text-[12px]"><IssueTag {...i} /> {i.text}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section aria-labelledby="pf">
          <Kicker><span id="pf">Portfolio</span></Kicker>
          {c.portfolio ? (
            <p className="text-[12.5px]">{portfolioSentence(c.portfolio)}</p>
          ) : (
            <p className="text-dim">No portfolio check ran for this case.</p>
          )}
          <div className="mt-3"><Kicker>Actions log</Kicker></div>
          {c.actions.length ? (
            <ul className="space-y-0.5 text-[12px]">
              {c.actions.map((a) => (
                <li key={a.key}>
                  {a.key.replaceAll("_", " ")} by {a.channel}: <b className="font-semibold">{a.status}</b>{" "}
                  <span className="num text-[11px] text-dim">{whenLabel(a.at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-dim">Nothing sent yet. Request from broker emails only the facts that could flip the decision.</p>
          )}
        </section>
      </div>
    </main>
  );
}
