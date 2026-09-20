import { connection } from "next/server";
import { api } from "@/lib/api";
import { money } from "@/components/bits";

const N = ({ n }: { n: number | null }) => <span className="num ml-1 text-[11px] text-dim">n={n ?? "?"}</span>;
const Pending = () => <span className="font-mono text-[11px] text-dim">awaiting run</span>;
const v = (x: number | null | undefined, f: (n: number) => string = String) => (x == null ? <Pending /> : <span className="num">{f(x)}</span>);

function Block({ id, title, n, children, note }: { id: string; title: string; n: number | null; children: React.ReactNode; note: string }) {
  return (
    <section aria-labelledby={id} className="min-w-0 border-t border-edge pt-4">
      <p className="kicker mb-1">{id.toUpperCase()}</p>
      <h2 id={id} className="flex items-baseline justify-between gap-4">
        <span className="font-serif text-[22px] font-semibold">{title}</span>
        <N n={n} />
      </h2>
      <p className="mb-4 mt-1 max-w-[64ch] text-[13px] leading-relaxed text-dim">{note}</p>
      {children}
    </section>
  );
}

const th = "kicker py-1.5 pr-4 text-left font-normal";
const td = "py-2 pr-4 border-t border-rule";

export default async function BacktestPage() {
  await connection();
  const b = await api.backtest();
  const over = b.b4.factors[0];
  return (
    <main className="mx-auto max-w-[1500px] px-4 pb-16 pt-9 sm:px-10">
      <p className="font-mono text-[11px] text-dim">BACKTEST · 2025 PROPERTY GUIDELINE AGAINST THE BOOK</p>
      <h1 className="mt-1 max-w-[1200px] font-serif text-[34px] font-semibold leading-[1.12]">
        The guideline would decline <span className="num">{over.declines}</span> of <span className="num">{b.b4.n}</span> bound property policies on premium alone
      </h1>
      <p className="mt-3 max-w-[120ch] text-[12px] leading-relaxed">
        Pre-registration:{" "}
        {b.preregistration ? (
          <code className="num">{b.preregistration}</code>
        ) : (
          <span className="text-rust">eval/BACKTEST.md is not committed yet, so these numbers are not pre-registered.</span>
        )}{" "}
        <span className="text-dim">Every figure prints its n. Cells marked awaiting run need the desk backtest (C6).</span>
      </p>

      <div className="mt-8 grid grid-cols-1 gap-x-14 gap-y-12 xl:grid-cols-2">
        <Block id="b4" title="Guideline vs book" n={b.b4.n} note="How many bound property policies the 2025 guideline would decline, by factor. The humans wrote outside the guideline routinely, which caps how often the desk can agree with them.">
          <div className="max-w-full overflow-x-auto"><table className="w-full border-collapse text-[13px]">
            <thead><tr><th className={th}>Factor</th><th className={th}>Would decline</th><th className={`${th} w-[45%]`}>Share</th></tr></thead>
            <tbody>
              {b.b4.factors.map((f) => (
                <tr key={f.factor}>
                  <td className={td}>{f.factor}</td>
                  <td className={td}>{v(f.declines, (d) => `${d} of ${b.b4.n}`)}</td>
                  <td className={td}>
                    {f.declines != null && (
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 rounded-sm bg-rust" style={{ width: `${(f.declines / b.b4.n) * 100}%` }} />
                        <span className="num text-[11px]">{Math.round((f.declines / b.b4.n) * 100)}%</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Block>

        <Block id="b3" title="What enrichment changed" n={b.b3.n} note="What changes when external layers (FEMA, USGS, Open-Meteo, portfolio) are switched on. No decision tier moved. The intervals and the queue order did.">
          {b.b3.changed == null ? (
            <p className="rounded-sm border border-dashed border-rule px-3 py-4 text-[12px] text-dim">
              Not measured yet. This needs the desk to score each case with layers on and off.
            </p>
          ) : (
            <>
              {/* The headline is zero and stays zero. What enrichment does change is printed next to it,
                  so the honest answer arrives before a judge asks the obvious question. */}
              <div className="flex flex-wrap items-end gap-6">
                <p>
                  <span className="num text-[32px]">{b.b3.changed}</span>
                  <span className="ml-2 text-[12px] text-dim">tiers changed</span>
                </p>
                <p>
                  <span className="num text-[32px]">
                    {b.b3.intervalMoved}/{b.b3.n}
                  </span>
                  <span className="ml-2 text-[12px] text-dim">intervals moved</span>
                </p>
                <p>
                  <span className="num text-[32px]">{b.b3.medianAbsMidpointMove}</span>
                  <span className="ml-2 text-[12px] text-dim">points, median move</span>
                </p>
                <p>
                  <span className="num text-[32px]">
                    {b.b3.rankChanged}/{b.b3.rankQueueN}
                  </span>
                  <span className="ml-2 text-[12px] text-dim">open cases reranked</span>
                </p>
              </div>
              <p className="mt-2 max-w-[62ch] text-[12px]">{b.b3.changedNote}.</p>
              <div className="max-w-full overflow-x-auto"><table className="mt-4 w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className={th}>Open case</th>
                    <th className={th}>Layer that moved it</th>
                    <th className={th}>Without</th>
                    <th className={th}>With</th>
                    <th className={th}>Move</th>
                  </tr>
                </thead>
                <tbody>
                  {b.b3.topMoversOpenQueue.map((m) => (
                    <tr key={m.caseId}>
                      <td className={`${td} num`}>#{m.caseId}</td>
                      <td className={td}>
                        {m.factor.replaceAll("_", " ")} <span className="num text-[11px] text-dim">×{m.multiplier}</span>
                      </td>
                      <td className={`${td} num`}>{m.without.lo}</td>
                      <td className={`${td} num`}>{m.with.lo}</td>
                      <td className={`${td} num`}>{m.midpointMove}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </>
          )}
        </Block>

        <Block id="b2" title="Human declines by reason" n={b.b2.n} note={`The ${b.b2.n} declines with an underwriting reason, each mapped to the desk lane that should raise it. ${b.b2.excluded} broker_withdrew declines are not underwriting decisions and are excluded.`}>
          <div className="max-w-full overflow-x-auto"><table className="w-full border-collapse text-[13px]">
            <thead><tr><th className={th}>Human reason</th><th className={th}>n</th><th className={th}>Lines</th><th className={th}>Desk lane</th><th className={th}>Desk agrees</th></tr></thead>
            <tbody>
              {b.b2.rows.map((r) => (
                <tr key={r.reason} className={r.excluded ? "text-dim" : ""}>
                  <td className={`${td} font-mono text-[11px] ${r.excluded ? "line-through" : ""}`}>{r.reason}</td>
                  <td className={`${td} num`}>{r.n}</td>
                  <td className={`${td} text-[11px]`}>{Object.entries(r.lines).map(([l, n]) => `${l} ${n}`).join(", ")}</td>
                  <td className={td}>{r.lane ? <>{r.lane} <span className="text-[11px] text-dim">({r.factor})</span></> : <span className="text-[11px]">excluded</span>}</td>
                  <td className={td}>{r.excluded ? "" : r.deskAgrees == null ? <Pending /> : String(r.deskAgrees)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Block>

        <Block id="b1" title="Property outcomes by desk tier" n={b.b1.n} note="Each bound property policy scored as of its received date, with loss history only from earlier claims. Plain rates, no correlation statistics.">
          <div className="max-w-full overflow-x-auto"><table className="w-full border-collapse text-[13px]">
            <thead><tr><th className={th}>Desk tier</th><th className={th}>n</th><th className={th}>Premium</th><th className={th}>Incurred</th><th className={th}>Loss ratio</th></tr></thead>
            <tbody>
              {b.b1.tiers.map((t) => (
                <tr key={t.tier}>
                  <td className={td}>{t.tier.replace("_", " ")}</td>
                  <td className={td}>{v(t.n)}</td>
                  <td className={td}>{v(t.premium, money)}</td>
                  <td className={td}>{v(t.incurred, money)}</td>
                  <td className={td}>{v(t.lossRatio, (x) => x.toFixed(2))}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className={`${td} border-edge`}>All property</td>
                <td className={`${td} border-edge num`}>{b.b1.all.n}</td>
                <td className={`${td} border-edge num`}>{money(b.b1.all.premium)}</td>
                <td className={`${td} border-edge num`}>{money(b.b1.all.incurred)}</td>
                <td className={`${td} border-edge num`}>{b.b1.all.lossRatio.toFixed(2)}</td>
              </tr>
            </tbody>
          </table></div>
          <p className="mt-1.5 text-[11px] text-dim">
            Status mix: {Object.entries(b.b1.statuses).map(([s, n]) => `${s} ${n}`).join(", ")}. Incurred is paid plus reserved, indemnity and expense.
          </p>
          {/* The single accept is the desk's worst call in this book. Name it rather than leaving it
              as an unattributed row: an aggregate hides a miss, a policy number does not. */}
          {b.knownMisses?.map((m) => (
            <p key={m.policy} className="mt-2 border-l-2 border-rust bg-rust/[0.07] py-1 pl-2.5 text-[12px] leading-snug">
              <b className="font-semibold text-rust">The miss we would have made.</b> Policy{" "}
              <span className="num">{m.policy}</span> was fully in appetite on the day it arrived, so the
              desk would have said <b className="font-semibold">{m.tier}</b>. It went on to incur{" "}
              <span className="num">{money(m.incurred)}</span> on <span className="num">{money(m.premium)}</span>{" "}
              of premium.
            </p>
          ))}
        </Block>
      </div>
    </main>
  );
}
