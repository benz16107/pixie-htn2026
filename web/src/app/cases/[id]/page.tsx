import { notFound } from "next/navigation";
import { api, type CaseWithReceipt } from "@/lib/api";
import { explainCase, isTenantExplain, precedentFor, sensitivityOf, surfaceOf, type Challenge, type PriceStep } from "@/lib/explain";
import { bandPhrase, factorValue, whenLabel } from "@/lib/format";
import { Actions } from "@/components/Actions";
import { CaseMap } from "@/components/LiveMap";
import { HazardCard, PortfolioCallout, portfolioSentence } from "@/components/CaseParts";
import { Receipt } from "@/components/Receipt";
import { Swimlanes } from "@/components/Swimlanes";
import { PriceWaterfall, Waterfall } from "@/components/case/Waterfall";
import { Views } from "@/components/case/Views";
import { Challenger, PrecedentPanel } from "@/components/case/Sidebar";
import { Briefing } from "@/components/case/Briefing";
import { CaseNav } from "@/components/case/CaseNav";
import { Deck } from "@/components/case/Deck";
import { Override } from "@/components/case/Override";
import { BrokerReply } from "@/components/case/BrokerReply";
import { Memory } from "@/components/case/Memory";
import { BandScale, bandTone, DecisionChip, IntervalBar, IssueTag, ProvenanceBadge, THRESHOLDS } from "@/components/bits";
import { PercentileLine } from "@/components/BookInsights";
import { StatusBar } from "@/components/desk/Kbd";

/** The guideline's own reading of a fact, shown only when it differs from the fact as displayed. */
function reads(display: string, asRead?: string) {
  if (!asRead) return "";
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9.]/g, "");
  return norm(asRead) === norm(display) || norm(display).includes(norm(asRead)) ? "" : ` · the guideline reads this as ${asRead}`;
}

function Rail({ title, note, children }: { title: string; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-b border-rule px-3 py-2 last:border-b-0">
      <h2 className="kicker mb-1 flex items-baseline justify-between gap-2">
        <span>{title}</span>
        {note && <span className="normal-case tracking-normal text-faint">{note}</span>}
      </h2>
      {children}
    </section>
  );
}

export default async function CasePage({ params }: PageProps<"/cases/[id]">) {
  const { id } = await params;
  const [c, events, hexes, pins, explain, sens, precedent, surface, memory] = await Promise.all([
    api.case(id),
    api.events(id),
    api.mapBook("all"),
    api.mapPins(),
    explainCase(id),
    sensitivityOf(id),
    precedentFor(id),
    surfaceOf(id),
    api.memory(id),
  ]);
  const percentile = await api.percentile(id);
  if (!c) notFound();
  const view = c as CaseWithReceipt & { challenge?: Challenge; deskVerdict?: string };
  const pin = pins.find((p) => p.caseId === view.caseId);
  const flippers = view.decision.kind === "open" ? view.decision.flippers : [];
  const place = view.facts.find((f) => f.id === "primary_admin" || f.id === "state")?.display;
  // The slider is denominated in dollars, so it may only ever be handed a money fact. Once the broker
  // answers on premium the mover can become something like business type, and a dollar slider under
  // "what if the submission type were" is nonsense: better to drop the slider than to mislabel it.
  const MONEY = new Set(["premium", "tiv", "loss_5yr"]);
  const premium =
    sens?.facts.find((f) => f.fact === "premium" && f.movesDecision) ?? sens?.facts.find((f) => f.movesDecision && MONEY.has(f.fact));
  // Start the slider where the case actually stands: the estimate the desk is working from.
  const dollars = (explain?.steps.find((s) => s.key === premium?.fact)?.value ?? "").match(/\$[\d,]+/g)?.map((d) => Number(d.replace(/[$,]/g, ""))) ?? [];
  const startAt = dollars.length ? Math.round(dollars.reduce((a, b) => a + b, 0) / dollars.length) : Math.round(((premium?.low.value ?? 0) + (premium?.high.value ?? 0)) / 2);
  const verdict = view.deskVerdict?.replaceAll("_", " ");
  const tenant = isTenantExplain(explain);
  // /guideline can move these two numbers, so the ruler reads the guideline this case was scored by.
  const bands = explain?.thresholds ?? THRESHOLDS;
  // Memory only has something to say on a case the desk has worked more than once.
  const remembered = memory && memory.recalled.length > 0 ? memory : null;
  const counts = {
    known: view.facts.filter((f) => f.provenance === "known").length,
    estimated: view.facts.filter((f) => f.provenance === "estimated").length,
    missing: view.facts.filter((f) => f.provenance === "missing").length,
  };

  return (
    <main className="grid h-[calc(100vh-30px)] grid-rows-[36px_minmax(0,1fr)_206px_26px] overflow-hidden">
      {/* ------------------------------- identity ------------------------------- */}
      <header className="flex items-center gap-3 overflow-hidden border-b border-edge bg-land px-3">
        <span className="shrink-0">
          <CaseNav caseId={view.caseId} kind={view.kind} place={place} />
        </span>
        <h1 className="cond min-w-0 truncate text-[17px] font-semibold leading-tight">{view.title}</h1>
        <span className="shrink-0">
          <DecisionChip decision={view.decision} large />
        </span>
        {verdict && verdict !== view.decision.kind && (
          <span className="shrink-0 whitespace-nowrap rounded-sm border border-ochre/60 bg-ochre-soft px-2 text-[10px] leading-[17px] text-ochre">
            desk went with {verdict}
          </span>
        )}
        <Briefing caseId={view.caseId} />
        <span className="ml-auto" />
        {view.kind === "commercial" && (
          <span data-brief="action" className="shrink-0 pr-1">
            <Actions caseId={view.caseId} facts={flippers.map((f) => f.fact)} proposed={view.actions.find((a) => a.key === "request_broker_info")?.status} />
          </span>
        )}
      </header>

      {/* ------------------- score, the book, the case against ------------------ */}
      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_312px_324px]">
        <section className="flex min-h-0 flex-col border-r border-edge px-4 pb-3 pt-2.5" aria-label="How the score was built">
          <div className="flex items-start gap-5">
            <div className="shrink-0">
              <p className="kicker">{tenant ? "Annual price" : view.override ? "Engine score (0–100)" : "Score range (0–100)"}</p>
              <p className={`num text-[32px] font-medium leading-[36px] ${bandTone(view.score, bands)}`}>
                {tenant ? `$${explain.annual.toFixed(2)}` : view.score ? `${view.score.lo}–${view.score.hi}` : "—"}
              </p>
            </div>
            {view.override && (
              <div className="shrink-0 border-l border-ink/40 pl-4">
                <p className="kicker text-ink">Underwriter&rsquo;s score</p>
                <p className="num text-[32px] font-medium leading-[36px] text-ink">
                  {view.override.score.lo}–{view.override.score.hi}
                </p>
              </div>
            )}
            {!tenant && (
              <div className="min-w-0 flex-1 pt-1">
                <IntervalBar score={view.score} t={bands} />
                <BandScale t={bands} className="mt-1" />
              </div>
            )}
            {tenant && <p className="cond min-w-0 flex-1 pt-2 text-[12px] leading-snug text-dim">{explain.label}</p>}
          </div>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[11px] text-dim">
            {explain?.reconciles && <span className="text-moss">✓ the steps add up to the score</span>}
            {percentile && <PercentileLine p={percentile} />}
          </p>
          {view.kind === "commercial" && view.score && (
            <Override caseId={view.caseId} current={view.override} bound={view.override?.bound ?? 5} />
          )}
          {view.kind === "commercial" && <BrokerReply caseId={view.caseId} />}

          {tenant ? (
            <>
              <div data-brief="score" className="mt-2 flex min-h-0 flex-1 flex-col">
                <PriceWaterfall steps={explain.steps as unknown as PriceStep[]} annual={explain.annual} label={explain.label} />
              </div>
              {view.receipt && (
                <div data-brief="facts" className="mt-2 max-h-[190px] overflow-auto border-t border-rule pt-2">
                  <Receipt r={view.receipt} />
                </div>
              )}
            </>
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
            <div className="flex flex-1 items-center justify-center text-center text-[12px] text-dim">
              {view.decision.kind === "routed" ? view.decision.because : "No scored steps for this case."}
            </div>
          )}
        </section>

        {/* THE FACTS. One row per fact: what it says, how sure the desk is, and where it came from. */}
        <aside className="min-h-0 overflow-y-auto border-r border-edge" aria-label="Facts on this case, with where each one came from">
          <Rail
            title="What we know"
            note={
              <>
                <span className="whitespace-nowrap text-moss">{counts.known} known</span> ·{" "}
                <span className="whitespace-nowrap text-ochre">{counts.estimated} est</span> ·{" "}
                <span className="whitespace-nowrap text-rust">{counts.missing} missing</span>
              </>
            }
          >
            <table data-brief="facts" className="w-full border-collapse">
              <caption className="sr-only">Every fact on this case, how sure the desk is of it, and the source it came from.</caption>
              <tbody>
                {view.facts.map((f) => {
                  const factor = view.factors.find((x) => x.fact === f.id);
                  return (
                    <tr key={f.id} className="border-t border-rule align-top first:border-t-0">
                      <th scope="row" className="w-[86px] py-1 pr-2 text-left text-[10px] font-normal leading-snug text-dim">
                        {f.label}
                      </th>
                      <td className="py-1">
                        <span className="flex items-baseline gap-1.5">
                          <span className={`num min-w-0 flex-1 text-[11px] leading-snug ${f.provenance === "missing" ? "text-rust" : "text-ink"}`}>
                            {f.display}
                          </span>
                          <ProvenanceBadge p={f.provenance} short />
                        </span>
                        <span className="mt-px block text-[9px] leading-[12px] text-faint">
                          {f.resolver ? `${f.resolver} resolves · ` : ""}
                          {f.source}
                          {reads(f.display, factor && factorValue(f.id, factor.valueText))}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Rail>
        </aside>

        <aside data-brief="challenge" className="min-h-0 overflow-y-auto" aria-label="Challenge and precedent">
          {view.challenge ? (
            <Challenger c={view.challenge} deskVerdict={view.deskVerdict} rulesDecision={view.decision.kind} />
          ) : (
            <Rail title="The case against">
              <p className="text-[11px] leading-snug text-dim">The Challenger has not run on this case. It runs on every deep dive.</p>
            </Rail>
          )}
          {precedent && <PrecedentPanel p={precedent} />}
        </aside>
      </div>

      {/* ------------------------- the call, and the deck ----------------------- */}
      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_780px] border-t border-edge">
        <section className="flex min-h-0 flex-col overflow-auto px-4 py-2" aria-labelledby="call-h">
          <h2 id="call-h" className="kicker flex items-baseline gap-2">
            <span>The call</span>
            {view.explanationVerified && <span className="normal-case tracking-normal text-moss">✓ every number checked against the facts</span>}
          </h2>
          <p className="cond mt-1 max-w-[72ch] text-[13px] leading-[1.5]" style={{ textWrap: "pretty" }}>
            {view.explanation}
          </p>
          {view.contradictions[0] && (
            <p className="mt-2 border-l-2 border-ochre bg-ochre-soft/50 py-1 pl-2.5 text-[11px] leading-snug text-dim">
              <b className="text-ochre">Contradiction the desk had to resolve.</b> {view.contradictions[0].good.map(bandPhrase).slice(0, 2).join("; ")} against{" "}
              {view.contradictions[0].bad.map(bandPhrase).join("; ")}.
            </p>
          )}
        </section>

        <div className="min-h-0 border-l border-edge">
          <Deck
            panels={[
              {
                id: "lanes",
                label: "agent lanes",
                count: `${events.length}`,
                node: (
                  <div className="h-[176px]">
                    {events.length ? (
                      <Swimlanes events={events} initialScore={view.scoreWithoutEnrichment ?? view.score} laneH={21} controls={false} pad="px-3 pb-0 pt-1" heading="" />
                    ) : (
                      <p className="px-3 py-3 text-[11px] text-dim">
                        {view.kind === "tenant"
                          ? "Tenant quotes are priced in code in under a second; the desk only reviews referrals."
                          : "The desk has not run on this case."}
                      </p>
                    )}
                  </div>
                ),
              },
              {
                id: "site",
                label: "site & hazard",
                count: place ?? "",
                node: (
                  <div className="relative h-[176px] overflow-hidden">
                    <CaseMap site={view.site} zoom={view.kind === "tenant" ? 13.5 : 8.2} hexes={hexes} home={pin?.ring} />
                    {view.portfolio && <PortfolioCallout p={view.portfolio} />}
                    <HazardCard risk={view.risk} />
                  </div>
                ),
              },
              {
                id: "trail",
                label: "issues & what we sent",
                count: `${view.issues.length + view.actions.length}`,
                node: (
                  <div className="px-3 py-2 text-[11px]">
                    {view.portfolio && <p className="mb-2 leading-snug text-dim">{portfolioSentence(view.portfolio)}</p>}
                    {view.issues.length > 0 ? (
                      <ul className="space-y-1">
                        {view.issues.map((i, n) => (
                          <li key={`${i.kind}${n}`} className="flex items-baseline gap-2 leading-snug">
                            <IssueTag {...i} />
                            <span className="text-dim">{i.text}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-dim">No data issues on this submission.</p>
                    )}
                    {view.actions.length > 0 ? (
                      <ul className="mt-2 space-y-0.5 border-t border-rule pt-2 text-[11px] text-dim">
                        {view.actions.map((a) => (
                          <li key={a.key}>
                            <span className="text-ink">{a.key.replaceAll("_", " ")}</span> by {a.channel}: {a.status} · {whenLabel(a.at)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 border-t border-rule pt-2 text-faint">Nothing has left the desk on this case yet.</p>
                    )}
                  </div>
                ),
              },
              // Only on a case the desk has worked before: an empty memory panel says nothing.
              ...(remembered
                ? [
                    {
                      id: "memory",
                      label: "what we remembered",
                      count: `${remembered.recalled.length}`,
                      node: <Memory m={remembered} />,
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </div>

      <StatusBar
        left={
          <>
            <span className="text-ochre">CASE #{view.caseId}</span>
            <span className="truncate">{view.title}</span>
            {explain?.rulesId && <span className="num text-faint">scored by {explain.rulesId}</span>}
          </>
        }
      />
    </main>
  );
}
