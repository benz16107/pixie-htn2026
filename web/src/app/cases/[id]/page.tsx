import Link from "next/link";
import { notFound } from "next/navigation";
import type { Band, DecisionView } from "@/contract";
import { api, type CaseWithReceipt } from "@/lib/api";
import { explainCase, isTenantExplain, precedentFor, sensitivityOf, surfaceOf, type Challenge, type PriceStep } from "@/lib/explain";
import { bandPhrase, factorValue, prettyBands, whenLabel } from "@/lib/format";
import { Actions } from "@/components/Actions";
import { CaseMap } from "@/components/LiveMap";
import { HazardTable, PortfolioNote } from "@/components/CaseParts";
import { Receipt } from "@/components/Receipt";
import { Swimlanes } from "@/components/Swimlanes";
import { PriceWaterfall, Waterfall } from "@/components/case/Waterfall";
import { Views } from "@/components/case/Views";
import { Challenger, PrecedentPanel } from "@/components/case/Sidebar";
import { Briefing } from "@/components/case/Briefing";
import { IntervalBar, IssueTag, ProvenanceBadge } from "@/components/bits";
import { PercentileLine } from "@/components/BookInsights";

const BANDS: { band: Band; label: string }[] = [
  { band: "target", label: "target" },
  { band: "acceptable", label: "acceptable" },
  { band: "not_acceptable", label: "not acceptable" },
];

/** The decision as one printed sentence a person could sign. Reasons come from the engine's strings. */
function decisionLine(d: DecisionView): { word: string; rest: string; red: boolean } {
  // Band reasons read "premium, not acceptable"; sentence reasons lose their capital after "because".
  const because = (b: string[]) => b.map((r) => (r.includes(":") ? bandPhrase(r) : r.charAt(0).toLowerCase() + r.slice(1))).join("; ");
  switch (d.kind) {
    case "open":
      return { word: "Open.", rest: `The score straddles ${d.straddles}${d.flippers.length ? `; ${d.flippers.map((f) => `${f.fact.replaceAll("_", " ")} (${f.resolver})`).join(", ")} could settle it` : ""}.`, red: false };
    case "routed":
      return { word: "Routed.", rest: `${d.because.replace(/\.$/, "")}.`, red: false };
    case "decline":
      return { word: "Decline,", rest: `because ${because(d.because)}.`, red: true };
    case "refer":
      return { word: "Refer,", rest: `because ${because(d.because)}.`, red: false };
    case "accept":
    case "approve":
      return { word: `${d.kind === "accept" ? "Accept" : "Approve"},`, rest: `because ${because(d.because)}.`, red: false };
  }
}

function Section({ title, aside, children, brief }: { title: string; aside?: React.ReactNode; children: React.ReactNode; brief?: string }) {
  return (
    <section data-brief={brief} className="rule-ink mt-14 pt-4">
      <div className="flex items-baseline justify-between gap-6">
        <h2 className="display display-md">{title}</h2>
        {aside && <div className="text-[12.5px] text-dim">{aside}</div>}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function CasePage({ params }: PageProps<"/cases/[id]">) {
  const { id } = await params;
  const [c, events, hexes, pins, explain, sens, precedent, surface] = await Promise.all([
    api.case(id),
    api.events(id),
    api.mapBook("all"),
    api.mapPins(),
    explainCase(id),
    sensitivityOf(id),
    precedentFor(id),
    surfaceOf(id),
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
  const line = decisionLine(view.decision);
  const known = view.facts.filter((f) => f.provenance === "known").length;
  const est = view.facts.filter((f) => f.provenance === "estimated").length;
  const missing = view.facts.filter((f) => f.provenance === "missing").length;
  const tenant = isTenantExplain(explain);

  return (
    <main className="mx-auto max-w-[1320px] px-8 pt-12">
      {/* ------------------------------- the head ------------------------------- */}
      <div className="flex items-baseline justify-between gap-6">
        <p className="folio">
          <Link href="/queue" className="hover:text-ink">
            Queue
          </Link>
          <span className="mx-2">/</span>
          Case {view.caseId}, {view.kind}
          {place ? `, ${place}` : ""}
        </p>
        <Briefing caseId={view.caseId} />
      </div>
      <h1 className="display display-lg mt-3 max-w-[22ch]">{view.title}</h1>
      <p data-brief="action" className={`display display-md mt-5 max-w-[60ch] italic ${line.red ? "text-red" : ""}`}>
        {line.word} <span className={line.red ? "text-ink" : ""}>{line.rest}</span>
      </p>
      {verdict && verdict !== view.decision.kind && (
        <p className="mt-2 text-[14px] text-dim">
          After the challenge the desk went with <b className="font-medium text-ink">{verdict}</b>.
        </p>
      )}

      <div className="mt-8 grid grid-cols-12 gap-x-8">
        <div className="col-span-7">
          <p className="measure text-[15.5px] leading-[1.6]">
            {prettyBands(view.explanation)}
            {view.explanationVerified && (
              <span className="ml-2 whitespace-nowrap text-[12px] text-dim" title="Every number in this explanation was checked against the facts before it was shown">
                ✓ every number checked against the facts
              </span>
            )}
          </p>
          {view.contradictions[0] && (
            <p className="measure mt-4 text-[13.5px] leading-[1.55] text-dim">
              <span className="text-ink">Contradiction.</span> {view.contradictions[0].good.map(bandPhrase).slice(0, 3).join("; ")} against{" "}
              <span className="text-red">{view.contradictions[0].bad.map(bandPhrase).join("; ")}</span>.
            </p>
          )}
        </div>
        <div className="col-span-5" data-brief="score">
          {view.score ? (<>
          <div className="flex items-baseline gap-4">
            <span className="display-num text-[40px] leading-none">{`${view.score.lo}–${view.score.hi}`}</span>
            <span className="text-[13px] text-dim">score interval{explain?.rulesId ? `, under ${explain.rulesId.replaceAll("_", " ")}` : ""}</span>
          </div>
          <div className="mt-4">
            <IntervalBar score={view.score} />
          </div>
          <p className="mt-1 flex justify-between text-[11px] text-dim">
            <span>0</span>
            <span>decline below 45, refer to 70, accept above</span>
            <span>100</span>
          </p>
          </>) : (
            <p className="text-[13px] text-dim">{tenant ? "No score interval: a renter is priced in dollars, below." : "No score interval: no guideline scores this line."}</p>
          )}
          {percentile && (
            <p className="mt-4 text-[13px] leading-[1.5] text-dim">
              <PercentileLine p={percentile} />
            </p>
          )}
        </div>
      </div>

      {/* ------------------------------- the facts ------------------------------- */}
      <Section brief="facts" title="The facts" aside={`${known} known, ${est} estimated, ${missing} missing. Every one carries where it came from.`}>
        <table className="book text-[13.5px]">
          <thead>
            <tr>
              <th className="w-[180px]">Fact</th>
              <th className="w-[240px]">Value</th>
              <th className="w-[90px]">Source</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {view.facts.map((f) => (
              <tr key={f.id}>
                <th scope="row" className="!py-[7px] !text-[13.5px] !font-normal !normal-case !tracking-normal !text-dim">
                  {f.label}
                </th>
                <td className={`num ${f.provenance === "missing" ? "text-red" : f.provenance === "estimated" ? "italic" : ""}`}>{f.display}</td>
                <td>
                  <ProvenanceBadge p={f.provenance} />
                </td>
                <td className="text-[12.5px] text-dim">
                  {f.resolver ? <span className="text-ink">Resolver: {f.resolver}. </span> : ""}
                  {f.source}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* --------------------------- how the score was built -------------------------- */}
      <Section
        title={tenant ? "How the price was built" : "How the score was built"}
        aside={
          tenant
            ? `Every line of the price, ending at $${explain.annual.toFixed(2)} a year.`
            : explain?.score
              ? `Every step under ${explain.rulesId.replaceAll("_", " ")}, ending at ${explain.score.lo}–${explain.score.hi}.${explain.reconciles ? " ✓ the steps reconcile with the score." : ""}`
              : "This line has no guideline, so there is no interval to build."
        }
      >
        {tenant ? (
          <div className="grid grid-cols-12 gap-x-8">
            <div data-brief="score" className="col-span-7 h-[380px]">
              <PriceWaterfall steps={explain.steps as unknown as PriceStep[]} annual={explain.annual} label={explain.label} />
            </div>
            {view.receipt && (
              <div data-brief="facts" className="col-span-5">
                <Receipt r={view.receipt} />
              </div>
            )}
          </div>
        ) : explain && explain.steps.length > 0 ? (
          <Views
            caseId={view.caseId}
            surface={surface}
            sensitivity={sens}
            before={{ score: explain.score, decision: explain.decision.kind }}
            whatIf={premium ? { fact: premium.fact, label: premium.label, start: startAt } : null}
            waterfall={<Waterfall x={explain} />}
          />
        ) : (
          <p className="measure text-[14px] text-dim">{view.decision.kind === "routed" ? view.decision.because : "No scored steps for this case."}</p>
        )}
      </Section>

      {/* -------------------------- the case against, precedent ------------------------- */}
      <div className="grid grid-cols-12 gap-x-8">
        <div className="col-span-7">
          <Section brief="challenge" title="The case against" aside="The Challenger agent argues against the draft. It runs on every deep dive.">
            {view.challenge ? (
              <Challenger c={view.challenge} deskVerdict={view.deskVerdict} rulesDecision={view.decision.kind} />
            ) : (
              <p className="measure text-[14px] text-dim">The Challenger has not run on this case.</p>
            )}
          </Section>
        </div>
        <div className="col-span-5">
          <Section title={precedent?.hits.length ? `We wrote ${precedent.hits.length} like this` : "Precedent"} aside={precedent ? <span className="num">[{precedent.backend}]</span> : undefined}>
            {precedent?.hits.length ? <PrecedentPanel p={precedent} /> : <p className="text-[14px] text-dim">No precedent search ran for this case.</p>}
          </Section>
        </div>
      </div>

      {/* ------------------------------ bands, site ------------------------------ */}
      <div className="grid grid-cols-12 gap-x-8">
        <div className="col-span-5">
          <Section title="Factor bands" aside="Which bands each fact can still land in.">
            <table className="book text-[13px]">
              <thead>
                <tr>
                  <th>Fact</th>
                  {BANDS.map((b) => (
                    <th key={b.band} className="w-[84px] text-center">
                      {b.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.factors.map((f) => (
                  <tr key={f.fact}>
                    <td>
                      {f.fact.replaceAll("_", " ")} <span className="num ml-1 text-[12px] text-dim">{factorValue(f.fact, f.valueText)}</span>
                    </td>
                    {BANDS.map((b) => {
                      const on = f.possible.includes(b.band);
                      return (
                        <td key={b.band} className="text-center">
                          <span aria-label={`${b.label}: ${on ? "possible" : "ruled out"}`} className={`text-[15px] ${on ? (b.band === "not_acceptable" ? "text-red" : "text-ink") : "text-rule"}`}>
                            {on ? "●" : "○"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[12px] text-dim">A missing fact keeps all three open. Only a not-acceptable band is marked in red.</p>
          </Section>
        </div>
        <div className="col-span-7">
          <Section title="Site and portfolio" aside={place ?? undefined}>
            <div className="relative h-[260px] overflow-hidden border border-rule grayscale">
              <CaseMap site={view.site} zoom={view.kind === "tenant" ? 13.5 : 8.2} hexes={hexes} home={pin?.ring} />
            </div>
            {view.portfolio ? <PortfolioNote p={view.portfolio} /> : <p className="mt-3 text-[13px] text-dim">No portfolio check ran for this case.</p>}
            <HazardTable risk={view.risk} />
          </Section>
        </div>
      </div>

      {/* -------------------------------- the record -------------------------------- */}
      <Section
        title="The record"
        aside={
          events.length
            ? `${events.length} events. ${view.contradictions.length ? `${view.contradictions.length} contradiction${view.contradictions.length > 1 ? "s" : ""} the desk had to resolve. ` : ""}${view.issues.length} data issue${view.issues.length === 1 ? "" : "s"}.`
            : view.kind === "tenant"
              ? "Tenant quotes are priced in code in under a second; the desk only reviews referrals."
              : "The desk has not run on this case."
        }
      >
        {events.length > 0 && (
          <div className="h-[400px]">
            <Swimlanes events={events} initialScore={view.scoreWithoutEnrichment ?? view.score} laneH={50} controls pad="" heading="Agent lanes" />
          </div>
        )}
        {(view.issues.length > 0 || view.actions.length > 0) && (
          <div className="mt-6 grid grid-cols-12 gap-x-8 text-[13px]">
            <div className="col-span-6">
              {view.issues.length > 0 && (
                <>
                  <p className="folio mb-2">Data issues</p>
                  <ul>
                    {view.issues.map((i) => (
                      <li key={i.kind} className="rule-faint flex items-baseline gap-3 py-1.5">
                        <IssueTag {...i} /> <span>{i.text}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="col-span-6">
              {view.actions.length > 0 && (
                <>
                  <p className="folio mb-2">Actions on file</p>
                  <ul>
                    {view.actions.map((a) => (
                      <li key={a.key + a.at} className="rule-faint flex justify-between gap-3 py-1.5">
                        <span>
                          {a.key.replaceAll("_", " ")} by {a.channel}, {a.status}
                        </span>
                        <span className="num text-dim">{whenLabel(a.at)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* --------------------------------- signature -------------------------------- */}
      {view.kind === "commercial" && (
        <section data-brief="action" className="rule-ink mt-14 flex items-end justify-between gap-8 pt-4">
          <div>
            <h2 className="display display-md">Signed at the desk</h2>
            <p className="measure mt-2 text-[13.5px] leading-[1.5] text-dim">
              {flippers.length
                ? `The broker can settle ${flippers.map((f) => f.fact.replaceAll("_", " ")).join(" and ")}. Sending asks for exactly that.`
                : "Requesting from the broker asks for what the desk proposed. The digest sends the top of the queue to the underwriter's phone."}
            </p>
          </div>
          <Actions caseId={view.caseId} facts={flippers.map((f) => f.fact)} proposed={view.actions.find((a) => a.key === "request_broker_info")?.status} />
        </section>
      )}
    </main>
  );
}
