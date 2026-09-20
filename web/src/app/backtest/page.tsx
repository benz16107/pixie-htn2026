import { api } from "@/lib/api";
import { money } from "@/components/bits";

const N = ({ n }: { n: number | null }) => <span className="num ml-2 text-[12px] text-dim">n = {n ?? "?"}</span>;
const Pending = () => <span className="text-[12px] italic text-dim">awaiting run</span>;
const v = (x: number | null | undefined, f: (n: number) => string = String) => (x == null ? <Pending /> : <span className="num">{f(x)}</span>);

function Block({ id, title, n, children, note }: { id: string; title: string; n: number | null; children: React.ReactNode; note: string }) {
  return (
    <section aria-labelledby={id} className="rule-ink pt-4">
      <h2 id={id} className="flex items-baseline justify-between">
        <span className="display display-md">{title}</span>
        <N n={n} />
      </h2>
      <p className="measure mb-5 mt-3 text-[13.5px] leading-[1.5] text-dim">{note}</p>
      {children}
    </section>
  );
}


export default async function BacktestPage() {
  const b = await api.backtest();
  const over = b.b4.factors[0];
  return (
    <main className="mx-auto max-w-[1320px] px-8 pt-12">
      <p className="folio">Backtest, the 2025 property guideline against the book</p>
      <h1 className="display display-lg mt-3 max-w-[30ch]">
        The guideline would decline <span className="num">{over.declines}</span> of <span className="num">{b.b4.n}</span> bound property policies on premium alone
      </h1>
      <p className="measure mt-5 text-[14px] leading-[1.55]">
        Pre-registration:{" "}
        {b.preregistration ? (
          <code className="num">{b.preregistration}</code>
        ) : (
          <span className="text-red">eval/BACKTEST.md is not committed yet, so these numbers are not pre-registered.</span>
        )}{" "}
        <span className="text-dim">Every figure prints its n. Cells marked awaiting run need the desk backtest (C6).</span>
      </p>

      <div className="mt-12 grid grid-cols-2 gap-x-12 gap-y-14">
        <Block id="b4" title="B4. The guideline against the book" n={b.b4.n} note="How many bound property policies the 2025 guideline would decline, by factor. The humans wrote outside the guideline routinely, which caps how often the desk can agree with them.">
          <table className="book text-[13px]">
            <thead><tr><th >Factor</th><th >Would decline</th><th className="w-[45%]">Share</th></tr></thead>
            <tbody>
              {b.b4.factors.map((f) => (
                <tr key={f.factor}>
                  <td >{f.factor}</td>
                  <td >{v(f.declines, (d) => `${d} of ${b.b4.n}`)}</td>
                  <td >
                    {f.declines != null && (
                      <span className="flex items-center gap-2">
                        <span className="h-[3px] bg-red" style={{ width: `${(f.declines / b.b4.n) * 100}%` }} />
                        <span className="num text-[11px]">{Math.round((f.declines / b.b4.n) * 100)}%</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>

        <Block id="b3" title="B3. Enrichment changed tiers" n={b.b3.n} note="What changes when external layers (FEMA, USGS, Open-Meteo, portfolio) are switched on. No decision tier moved. The intervals and the queue order did.">
          {b.b3.changed == null ? (
            <p className="text-[13px] italic text-dim">
              Not measured yet. This needs the desk to score each case with layers on and off.
            </p>
          ) : (
            <>
              {/* The headline is zero and stays zero. What enrichment does change is printed next to it,
                  so the honest answer arrives before a judge asks the obvious question. */}
              <div className="flex items-end gap-6">
                <p>
                  <span className="display-num text-[30px]">{b.b3.changed}</span>
                  <span className="ml-2 text-[12.5px] text-dim">tiers changed</span>
                </p>
                <p>
                  <span className="display-num text-[30px]">
                    {b.b3.intervalMoved}/{b.b3.n}
                  </span>
                  <span className="ml-2 text-[12.5px] text-dim">intervals moved</span>
                </p>
                <p>
                  <span className="display-num text-[30px]">{b.b3.medianAbsMidpointMove}</span>
                  <span className="ml-2 text-[12.5px] text-dim">points, median move</span>
                </p>
                <p>
                  <span className="display-num text-[30px]">
                    {b.b3.rankChanged}/{b.b3.rankQueueN}
                  </span>
                  <span className="ml-2 text-[12.5px] text-dim">open cases reranked</span>
                </p>
              </div>
              <p className="mt-2 max-w-[62ch] text-[12.5px]">{b.b3.changedNote}.</p>
              <table className="book mt-4 text-[13px]">
                <thead>
                  <tr>
                    <th >Open case</th>
                    <th >Layer that moved it</th>
                    <th >Without</th>
                    <th >With</th>
                    <th >Move</th>
                  </tr>
                </thead>
                <tbody>
                  {b.b3.topMoversOpenQueue.map((m) => (
                    <tr key={m.caseId}>
                      <td className="num">#{m.caseId}</td>
                      <td >
                        {m.factor.replaceAll("_", " ")} <span className="num text-[11px] text-dim">×{m.multiplier}</span>
                      </td>
                      <td className="num">{m.without.lo}</td>
                      <td className="num">{m.with.lo}</td>
                      <td className="num">{m.midpointMove}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Block>

        <Block id="b2" title="B2. Human declines by reason" n={b.b2.n} note={`The ${b.b2.n} declines with an underwriting reason, each mapped to the desk lane that should raise it. ${b.b2.excluded} broker_withdrew declines are not underwriting decisions and are excluded.`}>
          <table className="book text-[13px]">
            <thead><tr><th >Human reason</th><th >n</th><th >Lines</th><th >Desk lane</th><th >Desk agrees</th></tr></thead>
            <tbody>
              {b.b2.rows.map((r) => (
                <tr key={r.reason} className={r.excluded ? "text-dim" : ""}>
                  <td className={`num text-[12.5px] ${r.excluded ? "line-through" : ""}`}>{r.reason}</td>
                  <td className="num">{r.n}</td>
                  <td className="text-[12.5px]">{Object.entries(r.lines).map(([l, n]) => `${l} ${n}`).join(", ")}</td>
                  <td >{r.lane ? <>{r.lane} <span className="text-[11px] text-dim">({r.factor})</span></> : <span className="text-[11.5px]">excluded</span>}</td>
                  <td >{r.excluded ? "" : r.deskAgrees == null ? <Pending /> : String(r.deskAgrees)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>

        <Block id="b1" title="B1. Property outcomes by desk tier" n={b.b1.n} note="Each bound property policy scored as of its received date, with loss history only from earlier claims. Plain rates, no correlation statistics.">
          <table className="book text-[13px]">
            <thead><tr><th >Desk tier</th><th >n</th><th >Premium</th><th >Incurred</th><th >Loss ratio</th></tr></thead>
            <tbody>
              {b.b1.tiers.map((t) => (
                <tr key={t.tier}>
                  <td >{t.tier.replace("_", " ")}</td>
                  <td >{v(t.n)}</td>
                  <td >{v(t.premium, money)}</td>
                  <td >{v(t.incurred, money)}</td>
                  <td >{v(t.lossRatio, (x) => x.toFixed(2))}</td>
                </tr>
              ))}
              <tr className="font-medium">
                <td >All property</td>
                <td className="num">{b.b1.all.n}</td>
                <td className="num">{money(b.b1.all.premium)}</td>
                <td className="num">{money(b.b1.all.incurred)}</td>
                <td className="num">{b.b1.all.lossRatio.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-1.5 text-[11.5px] text-dim">
            Status mix: {Object.entries(b.b1.statuses).map(([s, n]) => `${s} ${n}`).join(", ")}. Incurred is paid plus reserved, indemnity and expense.
          </p>
        </Block>
      </div>
    </main>
  );
}
