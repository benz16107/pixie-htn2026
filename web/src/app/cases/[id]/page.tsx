import Link from "next/link";
import { notFound } from "next/navigation";
import type { Band } from "@/contract";
import { api, type CaseWithReceipt } from "@/lib/api";
import { explainCase, isTenantExplain, precedentFor, sensitivityOf, type Challenge, type PriceStep } from "@/lib/explain";
import { bandPhrase, factorValue, whenLabel } from "@/lib/format";
import { Actions } from "@/components/Actions";
import { CaseMap } from "@/components/LiveMap";
import { HazardCard, PortfolioCallout, portfolioSentence } from "@/components/CaseParts";
import { Receipt } from "@/components/Receipt";
import { Swimlanes } from "@/components/Swimlanes";
import { PriceWaterfall, Waterfall } from "@/components/case/Waterfall";
import { WhatIf } from "@/components/case/WhatIf";
import { Challenger, PrecedentPanel } from "@/components/case/Sidebar";
import { DecisionChip, IntervalBar, IssueTag, ProvenanceBadge } from "@/components/bits";
import { PercentileLine } from "@/components/BookInsights";

const BANDS: { band: Band; label: string }[] = [
  { band: "target", label: "target" },
  { band: "acceptable", label: "accept." },
  { band: "not_acceptable", label: "not acc." },
];

/** A collapsed summary that opens in place. Native details, so it works without JavaScript. */
function Fold({ title, count, summary, children }: { title: string; count?: string; summary: string; children?: React.ReactNode }) {
  return (
    <details className="group min-w-0 border-r border-rule px-5 py-2.5 last:border-r-0 open:col-span-4 open:border-r-0 open:bg-land/40">
      <summary className="flex cursor-pointer list-none items-baseline gap-2 [&::-webkit-details-marker]:hidden">
        <span className="kicker">{title}</span>
        {count && <span className="num text-[11px] text-dim">{count}</span>}
        <span aria-hidden className="ml-auto font-mono text-[11px] text-dim transition-transform duration-150 group-open:rotate-90">
          ›
        </span>
      </summary>
      <p className="mt-1 text-[11.5px] leading-snug text-dim group-open:hidden">{summary}</p>
      <div className="mt-2 hidden max-h-[300px] overflow-auto group-open:block">{children}</div>
    </details>
  );
}

export default async function CasePage({ params }: PageProps<"/cases/[id]">) {
  const { id } = await params;
  const [c, events, hexes, pins, explain, sens, precedent] = await Promise.all([
    api.case(id),
    api.events(id),
    api.mapBook("all"),
    api.mapPins(),
    explainCase(id),
    sensitivityOf(id),
    precedentFor(id),
  ]);
  const percentile = await api.percentile(id);
  if (!c) notFound();
  const view = c as CaseWithReceipt & { challenge?: Challenge; deskVerdict?: string };
  const pin = pins.find((p) => p.caseId === view.caseId);
  const flippers = view.decision.kind === "open" ? view.decision.flippers : [];
  const place = view.facts.find((f) => f.id === "primary_admin" || f.id === "state")?.display;
  const premium = sens?.facts.find((f) => f.fact === "premium" && f.movesDecision) ?? sens?.facts.find((f) => f.movesDecision);
  // Start the slider where the case actually stands: the estimate the desk is working from.
  const dollars = (explain?.steps.find((s) => s.key === premium?.fact)?.value ?? "").match(/\$[\d,]+/g)?.map((d) => Number(d.replace(/[$,]/g, ""))) ?? [];
  const startAt = dollars.length ? Math.round(dollars.reduce((a, b) => a + b, 0) / dollars.length) : Math.round(((premium?.low.value ?? 0) + (premium?.high.value ?? 0)) / 2);
  const verdict = view.deskVerdict?.replaceAll("_", " ");

  return (
    <main className="grid h-[calc(100vh-48px)] grid-rows-[62px_minmax(0,1fr)_auto] overflow-hidden">
      {/* ------------------------------- header ------------------------------- */}
      <header className="flex items-center gap-4 border-b border-ink bg-land px-6">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-dim">
            <Link href="/queue" className="hover:text-ink hover:underline">
              QUEUE
            </Link>{" "}
            / CASE #{view.caseId} · {view.kind.toUpperCase()}
            {place ? ` · ${place}` : ""}
          </p>
          <h1 className="truncate font-serif text-[26px] font-semibold leading-tight">{view.title}</h1>
        </div>
        <span className="shrink-0">
          <DecisionChip decision={view.decision} large />
        </span>
        {verdict && verdict !== view.decision.kind && (
          <span className="shrink-0 rounded-sm border border-ochre bg-ochre-soft px-2 py-0.5 text-[11.5px]">
            desk said <b className="font-semibold">{verdict}</b>
          </span>
        )}
        <span className="ml-auto" />
        {view.kind === "commercial" && (
          <Actions caseId={view.caseId} facts={flippers.map((f) => f.fact)} proposed={view.actions.find((a) => a.key === "request_broker_info")?.status} />
        )}
      </header>

      {/* --------------------------- hero and sidebar -------------------------- */}
      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_356px]">
        <section className="flex min-h-0 flex-col border-r border-rule px-6 pb-4 pt-3" aria-label="How the score was built">
          <div className="flex items-baseline gap-3">
            <h2 className="font-serif text-[19px] font-semibold">{isTenantExplain(explain) ? "How the price was built" : "How the score was built"}</h2>
            <p className="min-w-0 flex-1 truncate text-[11.5px] text-dim">
              {isTenantExplain(explain)
                ? `Every line of the price, ending at $${explain.annual.toFixed(2)} a year. Hover a bar for its source.`
                : explain?.score
                  ? `Every step under ${explain.rulesId}, ending at ${explain.score.lo}-${explain.score.hi}. Hover a bar for its rule and source.`
                  : "This line has no guideline, so there is no interval to build."}
            </p>
            {explain?.reconciles && <span className="shrink-0 font-mono text-[10px] text-moss">✓ steps reconcile with the score</span>}
          </div>
          <div className="mt-0.5 text-[11.5px] text-dim">
            {percentile && <PercentileLine p={percentile} />}
          </div>

          {isTenantExplain(explain) ? (
            <PriceWaterfall steps={explain.steps as unknown as PriceStep[]} annual={explain.annual} label={explain.label} />
          ) : explain && explain.steps.length > 0 ? (
            <Waterfall x={explain} />
          ) : (
            <div className="flex flex-1 items-center justify-center text-[12.5px] text-dim">
              {view.decision.kind === "routed" ? view.decision.because : "No scored steps for this case."}
            </div>
          )}

          {premium && explain ? (
            <WhatIf
              caseId={view.caseId}
              fact={premium.fact}
              label={premium.label}
              start={startAt}
              sensitivity={sens}
              before={{ score: explain.score, decision: explain.decision.kind }}
            />
          ) : (
            view.receipt && (
              <div className="border-t border-rule pt-3">
                <Receipt r={view.receipt} />
              </div>
            )
          )}
        </section>

        <aside className="min-h-0 overflow-y-auto" aria-label="Challenge and precedent">
          {view.challenge ? (
            <Challenger c={view.challenge} deskVerdict={view.deskVerdict} rulesDecision={view.decision.kind} />
          ) : (
            <section className="border-b border-rule px-4 py-3">
              <h2 className="font-serif text-[18px] font-semibold">The case against</h2>
              <p className="mt-1 text-[12px] text-dim">The Challenger has not run on this case. It runs on every deep dive.</p>
            </section>
          )}
          {precedent && <PrecedentPanel p={precedent} />}
        </aside>
      </div>

      {/* --------------------------------- folds -------------------------------- */}
      <div className="grid auto-rows-min grid-cols-[repeat(4,minmax(0,1fr))] border-t border-ink">
        <Fold
          title="Facts"
          count={`${view.facts.length}`}
          summary={`${view.facts.filter((f) => f.provenance === "known").length} known, ${view.facts.filter((f) => f.provenance === "estimated").length} estimated, ${view.facts.filter((f) => f.provenance === "missing").length} missing. Every one carries where it came from.`}
        >
          <table className="w-full border-collapse">
            <tbody>
              {view.facts.map((f) => (
                <tr key={f.id} className="border-t border-rule align-top" title={f.source}>
                  <th scope="row" className="w-[120px] py-1 text-left text-[11.5px] font-normal text-dim">
                    {f.label}
                  </th>
                  <td className={`w-[150px] py-1 font-mono text-[11.5px] ${f.provenance === "missing" ? "text-rust" : ""}`}>{f.display}</td>
                  <td className="py-1 text-[11px] text-dim">
                    <span className="flex gap-1.5">
                      <ProvenanceBadge p={f.provenance} />
                      <span className="min-w-0">
                        {f.resolver ? `resolver: ${f.resolver} · ` : ""}
                        {f.source}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Fold>

        <Fold title="Factor bands" count={`${view.factors.length}`} summary="Which bands each fact can still land in. A missing fact keeps all three open.">
          <table className="w-full border-collapse text-[11.5px]">
            <tbody>
              {view.factors.map((f) => (
                <tr key={f.fact} className="border-t border-rule">
                  <th scope="row" className="py-1 text-left font-normal">
                    {f.fact.replaceAll("_", " ")} <span className="font-mono text-[10.5px] text-dim">{factorValue(f.fact, f.valueText)}</span>
                  </th>
                  {BANDS.map((b) => {
                    const on = f.possible.includes(b.band);
                    return (
                      <td key={b.band} className="w-[52px] text-center">
                        <span
                          aria-label={`${b.label}: ${on ? "possible" : "ruled out"}`}
                          className={`inline-block h-2.5 w-7 rounded-sm border ${
                            on ? (b.band === "not_acceptable" ? "border-rust bg-rust" : b.band === "target" ? "border-moss bg-moss" : "border-ochre bg-ochre") : "border-rule"
                          }`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Fold>

        <Fold
          title="Agent lanes"
          count={`${events.length} events`}
          summary={
            view.contradictions.length
              ? `${view.contradictions.length} contradiction${view.contradictions.length > 1 ? "s" : ""} the desk had to resolve. ${view.issues.length} data issues.`
              : "What each agent did, in order, with the tool calls they made."
          }
        >
          <div className="h-[220px]">
            {events.length ? (
              <Swimlanes events={events} initialScore={view.scoreWithoutEnrichment ?? view.score} laneH={28} controls={false} pad="px-0 pb-0 pt-0" heading="" />
            ) : (
              <p className="text-[12px] text-dim">
                {view.kind === "tenant" ? "Tenant quotes are priced in code in under a second; the desk only reviews referrals." : "The desk has not run on this case."}
              </p>
            )}
          </div>
        </Fold>

        <Fold
          title="Site and portfolio"
          count={place ?? ""}
          summary={view.portfolio ? portfolioSentence(view.portfolio) : "No portfolio check ran for this case."}
        >
          <div className="relative h-[220px] overflow-hidden rounded-sm border border-rule">
            <CaseMap site={view.site} zoom={view.kind === "tenant" ? 13.5 : 8.2} hexes={hexes} home={pin?.ring} />
            <div aria-hidden className="contours pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply" />
            {view.portfolio && <PortfolioCallout p={view.portfolio} />}
            <HazardCard risk={view.risk} />
          </div>
          {view.issues.length > 0 && (
            <ul className="mt-2 space-y-1">
              {view.issues.map((i) => (
                <li key={i.kind} className="flex items-baseline gap-2 text-[11.5px]">
                  <IssueTag {...i} /> {i.text}
                </li>
              ))}
            </ul>
          )}
          {view.actions.length > 0 && (
            <p className="mt-2 text-[11.5px] text-dim">
              {view.actions.map((a) => `${a.key.replaceAll("_", " ")} by ${a.channel}: ${a.status} ${whenLabel(a.at)}`).join(" · ")}
            </p>
          )}
        </Fold>
      </div>

      {/* the explanation and the interval stay visible under the fold row */}
      <div className="border-t border-rule bg-land px-6 py-2.5">
        <div className="flex items-baseline gap-4">
          <span className="kicker shrink-0">
            Interval <span className="num text-ink">{view.score ? `${view.score.lo}-${view.score.hi}` : "—"}</span>
          </span>
          <div className="w-[220px] shrink-0">
            <IntervalBar score={view.score} compact />
          </div>
          <p className="min-w-0 flex-1 font-serif text-[13.5px] leading-snug">
            {view.explanation}
            {view.explanationVerified && <span className="ml-1.5 font-sans text-[11px] text-moss">✓ every number checked against the facts</span>}
          </p>
          {view.contradictions[0] && (
            <p className="w-[280px] shrink-0 text-[11px] leading-snug text-dim">
              <b className="font-semibold text-ink">Contradiction.</b> {view.contradictions[0].good.map(bandPhrase).slice(0, 2).join("; ")} against{" "}
              {view.contradictions[0].bad.map(bandPhrase).join("; ")}.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
