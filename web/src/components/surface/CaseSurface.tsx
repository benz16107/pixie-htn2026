"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Pin } from "@/components/BookMap";
import { PercentileLine } from "@/components/BookInsights";
import { Actions } from "@/components/Actions";
import { HazardCard, PortfolioCallout } from "@/components/CaseParts";
import { Receipt } from "@/components/Receipt";
import { Swimlanes } from "@/components/Swimlanes";
import { Briefing } from "@/components/case/Briefing";
import { Challenger, PrecedentPanel } from "@/components/case/Sidebar";
import { Views } from "@/components/case/Views";
import { PriceWaterfall, Waterfall } from "@/components/case/Waterfall";
import { DecisionChip, IntervalBar, IssueTag, ProvenanceBadge } from "@/components/bits";
import { Fold } from "@/components/surface/Fold";
import type { Band, DeskEvent, Hex } from "@/contract";
import type { CaseWithReceipt, Percentile } from "@/lib/api";
import { bandPhrase, factorValue, whenLabel } from "@/lib/format";
import { isTenantExplain, type Challenge, type Explain, type PriceStep, type Precedent, type Sensitivity, type Surface } from "@/lib/explain";
import { useSurface } from "@/lib/surface/context";
import { hexLayer, pinLayer } from "@/lib/surface/layers";

const BANDS: { band: Band; label: string }[] = [
  { band: "target", label: "target" },
  { band: "acceptable", label: "accept." },
  { band: "not_acceptable", label: "not acc." },
];

const DOSSIER_W = 860;

type View = CaseWithReceipt & { challenge?: Challenge; deskVerdict?: string };

/**
 * A case is a place, not a page. The map flies there and holds the pin in the open half of the
 * screen; the reasoning (score, facts, the Challenger, precedent) unfolds beside it in a dossier
 * that arrived the same way the camera did.
 */
export function CaseSurface({
  view,
  events,
  hexes,
  pin,
  flippers,
  place,
  explain,
  sens,
  precedent,
  surface,
  percentile,
  whatIf,
  verdict,
}: {
  view: View;
  events: DeskEvent[];
  hexes: Hex[];
  pin?: Pin;
  flippers: { fact: string; resolver: string }[];
  place?: string;
  explain: Explain | null;
  sens: Sensitivity | null;
  precedent: Precedent | null;
  surface: Surface | null;
  percentile?: Percentile;
  whatIf: { fact: string; label: string; start: number } | null;
  verdict?: string;
}) {
  const router = useRouter();
  const { flyTo, setLayers } = useSurface();
  // The slide-in is `motion-reduce:transition-none` in the className below, so under reduced
  // motion this still flips to `entered` a frame later, it just does it without animating: a real
  // static fallback (renders in place) rather than one that's merely fast.
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const zoom = view.kind === "tenant" ? 13.5 : 8.2;
    flyTo({ center: [view.site.lng, view.site.lat], zoom, padding: { right: DOSSIER_W + 32, top: 64, bottom: 16, left: 16 } });
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
    // one flight per case; panning afterward is the user's own
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.caseId]);

  useEffect(() => {
    setLayers(
      [hexLayer(hexes, { highlight: pin?.cell }), pinLayer(pin ? [{ ...pin, decision: view.decision.kind }] : [], { id: "case-pin" })],
      () => null,
    );
  }, [hexes, pin, view.decision.kind, setLayers]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/queue");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const openSideW = `calc(100vw - ${DOSSIER_W + 48}px)`;

  return (
    <>
      {/* the risk context stays on the map, next to the pin it describes, not inside the dossier */}
      <div className="pointer-events-none fixed left-4 top-[64px] z-10 bottom-4" style={{ width: openSideW }}>
        <div className="relative h-full w-full">
          {view.portfolio && (
            <div className="pointer-events-auto">
              <PortfolioCallout p={view.portfolio} />
            </div>
          )}
          <div className="pointer-events-auto">
            <HazardCard risk={view.risk} />
          </div>
        </div>
      </div>

      <section
        aria-label={`Case ${view.caseId}`}
        className={`pointer-events-auto fixed right-4 top-[64px] z-20 flex flex-col rounded-sm border border-ink bg-paper/98 shadow-[0_10px_36px_rgba(47,42,34,0.22)] transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
          entered ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"
        }`}
        style={{ width: DOSSIER_W, bottom: 16 }}
      >
        <header className="shrink-0 border-b border-ink bg-land px-4 py-2.5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] text-dim">
                <Link href="/queue" className="hover:text-ink hover:underline">
                  QUEUE
                </Link>{" "}
                / CASE #{view.caseId} · {view.kind.toUpperCase()}
                {place ? ` · ${place}` : ""}
              </p>
              <h1 className="truncate font-serif text-[21px] font-semibold leading-tight">{view.title}</h1>
            </div>
            <button
              onClick={() => router.push("/queue")}
              aria-label="Back to the book (Escape)"
              className="shrink-0 rounded-sm border border-rule px-2 py-1 font-mono text-[11px] text-dim transition-colors duration-150 hover:border-ink hover:text-ink"
            >
              {"✕"} esc
            </button>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <DecisionChip decision={view.decision} large />
            {verdict && verdict !== view.decision.kind && (
              <span className="rounded-sm border border-ochre bg-ochre-soft px-2 py-0.5 text-[11px]">
                desk said <b className="font-semibold">{verdict}</b>
              </span>
            )}
            <Briefing caseId={view.caseId} />
            {view.kind === "commercial" && (
              <span data-brief="action" className="ml-auto">
                <Actions caseId={view.caseId} facts={flippers.map((f) => f.fact)} proposed={view.actions.find((a) => a.key === "request_broker_info")?.status} />
              </span>
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {/* the result, first: the interval, the explanation, and what it's still unsettled by */}
          <div className="flex items-baseline gap-3">
            <span className="kicker shrink-0">
              Interval <span className="num text-ink">{view.score ? `${view.score.lo}-${view.score.hi}` : "—"}</span>
            </span>
            {percentile && <PercentileLine p={percentile} />}
          </div>
          <div className={`mt-1 w-full ${view.decision.kind === "open" ? "unsettled" : ""}`}>
            <IntervalBar score={view.score} compact />
          </div>
          <p className="mt-1.5 font-serif text-[14px] leading-snug">
            {view.explanation}
            {view.explanationVerified && <span className="ml-1.5 font-sans text-[11px] text-moss">{"✓"} every number checked against the facts</span>}
          </p>
          {view.contradictions[0] && (
            <p className="mt-1 text-[11px] leading-snug text-dim">
              <b className="font-semibold text-ink">Contradiction.</b> {view.contradictions[0].good.map(bandPhrase).slice(0, 2).join("; ")} against{" "}
              {view.contradictions[0].bad.map(bandPhrase).join("; ")}.
            </p>
          )}

          {/* how it was built */}
          <div className="mt-3 flex min-h-[360px] flex-col border-t border-rule pt-2">
            {isTenantExplain(explain) ? (
              <PriceWaterfall steps={explain.steps as unknown as PriceStep[]} annual={explain.annual} label={explain.label} />
            ) : explain && explain.steps.length > 0 ? (
              <Views
                caseId={view.caseId}
                surface={surface}
                sensitivity={sens}
                before={{ score: explain.score, decision: explain.decision.kind }}
                whatIf={whatIf}
                waterfall={<Waterfall x={explain} />}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center text-[12.5px] text-dim">
                {view.decision.kind === "routed" ? view.decision.because : "No scored steps for this case."}
              </div>
            )}
          </div>

          {view.receipt && (
            <div className="mt-3 border-t border-rule pt-3">
              <Receipt r={view.receipt} />
            </div>
          )}

          {/* the record, foldable so the result stays the thing you see first */}
          <div className="mt-3 border-t border-ink">
            <Fold
              brief="facts"
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
              <div className="h-[240px]">
                {events.length ? (
                  <Swimlanes events={events} initialScore={view.scoreWithoutEnrichment ?? view.score} laneH={28} controls={false} pad="px-0 pb-0 pt-0" heading="" />
                ) : (
                  <p className="text-[12px] text-dim">
                    {view.kind === "tenant" ? "Tenant quotes are priced in code in under a second; the desk only reviews referrals." : "The desk has not run on this case."}
                  </p>
                )}
              </div>
            </Fold>
          </div>

          {view.challenge ? (
            <div className="mt-3 border-t border-ink">
              <Challenger c={view.challenge} deskVerdict={view.deskVerdict} rulesDecision={view.decision.kind} />
            </div>
          ) : (
            <section className="mt-3 border-t border-ink pt-2.5">
              <h2 className="font-serif text-[16px] font-semibold">The case against</h2>
              <p className="mt-1 text-[11.5px] text-dim">The Challenger has not run on this case. It runs on every deep dive.</p>
            </section>
          )}
          {precedent && (
            <div className="border-t border-rule">
              <PrecedentPanel p={precedent} />
            </div>
          )}

          {view.issues.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-rule pt-2">
              {view.issues.map((i) => (
                <li key={i.kind} className="flex items-baseline gap-2 text-[11.5px]">
                  <IssueTag {...i} /> {i.text}
                </li>
              ))}
            </ul>
          )}
          {view.actions.length > 0 && (
            <p className="mt-2 border-t border-rule pt-2 text-[11.5px] text-dim">
              {view.actions.map((a) => `${a.key.replaceAll("_", " ")} by ${a.channel}: ${a.status} ${whenLabel(a.at)}`).join(" · ")}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
