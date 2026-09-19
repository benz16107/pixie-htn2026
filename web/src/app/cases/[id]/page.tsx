import Link from "next/link";
import { notFound } from "next/navigation";
import type { Band, CaseView } from "@/contract";
import { api } from "@/lib/api";
import { Actions } from "@/components/Actions";
import { HexMap } from "@/components/HexMap";
import { Swimlanes } from "@/components/Swimlanes";
import { DecisionChip, IntervalBar, IssueTag, ProvenanceBadge, money } from "@/components/bits";

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
  const [c, events] = await Promise.all([api.case(id), api.events(id)]);
  if (!c) notFound();
  const flippers = c.decision.kind === "open" ? c.decision.flippers : [];
  const place = c.facts.find((f) => f.id === "state")?.display;
  const delta = (c.score.lo + c.score.hi - c.scoreWithoutEnrichment.lo - c.scoreWithoutEnrichment.hi) / 2;

  return (
    <main>
      <div className="grid grid-cols-[640px_1fr] border-b border-rule">
        <div className="relative overflow-hidden border-r border-rule">
          <HexMap c={c} />
          {c.portfolio && (
            <p className="absolute left-[330px] top-[64px] w-[290px] rounded-sm border border-ink bg-paper/95 px-3 py-2 text-[12.5px]">
              <b className="float-right ml-2.5 font-mono text-[20px] font-medium text-rust">{c.portfolio.points}</b>
              {c.portfolio.line}.{" "}
              <span className="text-dim">Threshold <span className="num">{money(c.portfolio.threshold)}</span>.</span>
            </p>
          )}
          <section aria-labelledby="hz" className="absolute bottom-[18px] left-5 w-[360px] rounded-sm border border-rule bg-paper/95 px-3.5 py-2.5">
            <Kicker right={<>total <span className="num text-ink">×{c.risk.total.toFixed(2)}</span>{c.risk.totalCapped && " capped"}</>}>
              <span id="hz">Hazard at site</span>
            </Kicker>
            <ul className="grid grid-cols-[52px_1fr] items-baseline gap-y-1">
              {c.risk.factors.map((f) => (
                <li key={f.peril} className="contents">
                  <span className={`font-mono text-[15px] font-medium ${f.applied > 1.1 ? "text-rust" : ""}`}>×{f.applied.toFixed(2)}</span>
                  <span className="text-[12px]">
                    {f.line}{f.capped && <span className="ml-1 font-mono text-[10px]">[capped]</span>}{" "}
                    <a href={f.citation.startsWith("http") ? f.citation : undefined} className="text-[11px] text-dim underline-offset-2 hover:underline" target="_blank" rel="noreferrer" title={f.citation}>
                      {f.source}
                    </a>
                  </span>
                </li>
              ))}
              {c.risk.skipped.map(([peril, why]) => (
                <li key={peril} className="contents text-dim">
                  <span className="font-mono text-[12px]">skip</span>
                  <span className="text-[11.5px]">{why}</span>
                </li>
              ))}
            </ul>
          </section>
          <p className="absolute bottom-[18px] right-5 text-right font-mono text-[10px] text-dim">
            static preview, live map in W5<br />{c.site.lat.toFixed(3)}° N, {Math.abs(c.site.lng).toFixed(3)}° W
          </p>
        </div>

        <div className="px-8 pb-4 pt-4">
          <p className="font-mono text-[11px] text-dim">
            <Link href="/queue" className="hover:text-ink hover:underline">QUEUE</Link> / CASE #{c.caseId} · {c.kind.toUpperCase()}{place ? ` · ${place}` : ""}
          </p>
          <div className="flex items-center justify-between gap-4">
            <h1 className="mt-0.5 font-serif text-[32px] font-semibold leading-[1.1] text-balance">
              {c.title} <span className="align-[6px]"><DecisionChip decision={c.decision} large /></span>
            </h1>
            <Actions caseId={c.caseId} flippers={flippers.map((f) => f.fact)} />
          </div>

          <div className="my-3">
            <Kicker right="refer band 45–70">
              Score interval <span className="num text-ink">{c.score.lo}–{c.score.hi}</span>
              <span className="ml-3 normal-case tracking-normal" title={`Without external layers: ${c.scoreWithoutEnrichment.lo}–${c.scoreWithoutEnrichment.hi}`}>
                enrichment <span className="num text-ink">{delta > 0 ? "+" : delta < 0 ? "−" : "±"}{Math.abs(delta)}</span>
              </span>
            </Kicker>
            <IntervalBar score={c.score} />
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

      <Swimlanes events={events} initialScore={c.scoreWithoutEnrichment} />

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
                    {f.fact.replaceAll("_", " ")} <span className="font-mono text-[11px] text-dim">{f.valueText}</span>
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
              <dt className="font-mono text-[10.5px] text-moss">+ for</dt><dd>{x.good.join("; ")}</dd>
              <dt className="font-mono text-[10.5px] text-rust">− against</dt><dd>{x.bad.join("; ")}</dd>
              <dt className="font-mono text-[10.5px] text-dim">? resolve</dt><dd>{x.resolve.join("; ")}</dd>
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
            <p className="text-[12.5px]">
              {c.portfolio.line}. Neighbourhood holds <span className="num">{money(c.portfolio.neighbourhoodTiv)}</span> against a{" "}
              <span className="num">{money(c.portfolio.threshold)}</span> limit, so the score takes{" "}
              <span className="num font-semibold text-rust">{c.portfolio.points}</span>.
            </p>
          ) : (
            <p className="text-dim">No portfolio check ran for this case.</p>
          )}
          <div className="mt-3"><Kicker>Actions log</Kicker></div>
          {c.actions.length ? (
            <ul className="text-[12px]">{c.actions.map((a) => <li key={a.key} className="num">{a.at} {a.channel} {a.status}</li>)}</ul>
          ) : (
            <p className="text-[12px] text-dim">Nothing sent yet. Request from broker emails only the facts that could flip the decision.</p>
          )}
        </section>
      </div>
    </main>
  );
}
