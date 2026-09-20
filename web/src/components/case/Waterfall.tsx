import { signed, type Explain, type PriceStep, type Step } from "@/lib/explain";

/**
 * How the score was built, printed. Ink bars while the score is one number, two thin bars once a
 * missing fact opens an interval; a cap is hatched, a deduction is red. Hairline gridlines only.
 */
export function Waterfall({ x }: { x: Explain }) {
  const steps = x.steps.filter((s) => Math.abs(s.pointsLo) > 0.01 || Math.abs(s.pointsHi) > 0.01 || s.kind === "cap");
  const top = Math.max(100, ...steps.map((s) => s.runningHi));
  const y = (v: number) => `${(v / top) * 100}%`;
  const W = 100 / Math.max(steps.length, 1);

  return (
    <figure className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1 border-b border-l border-ink" style={{ marginLeft: 30, marginBottom: 50 }}>
        {[0, 25, 50, 75, 100].map((g) => (
          <div key={g} className="absolute inset-x-0 border-t border-faint" style={{ bottom: y(g) }}>
            <span className="num absolute -left-7 -top-[7px] text-[10.5px] text-dim">{g}</span>
          </div>
        ))}
        {[
          { at: x.thresholds.decline, label: `refer from ${x.thresholds.decline}` },
          { at: x.thresholds.accept, label: `accept from ${x.thresholds.accept}` },
        ].map((t) => (
          <div key={t.at} className="absolute inset-x-0 border-t border-red" style={{ bottom: y(t.at) }}>
            <span className="num absolute -top-[14px] right-1 text-[10.5px] text-red">{t.label}</span>
          </div>
        ))}

        {steps.map((s, i) => (
          <Bar key={s.key} s={s} prev={steps[i - 1]} left={i * W} width={W} y={y} />
        ))}
      </div>
      <figcaption className="sr-only">
        Score waterfall for case {x.caseId} under {x.rulesId}. Final interval {x.score ? `${x.score.lo} to ${x.score.hi}` : "none"}.
      </figcaption>
    </figure>
  );
}

function Bar({ s, prev, left, width, y }: { s: Step; prev?: Step; left: number; width: number; y: (v: number) => string }) {
  const fromLo = prev?.runningLo ?? 0;
  const fromHi = prev?.runningHi ?? 0;
  const split = Math.abs(s.runningHi - s.runningLo) > 0.01;
  const wasSplit = Math.abs(fromHi - fromLo) > 0.01;
  const tone = s.kind === "cap" ? "hatch border border-ink" : s.pointsHi < 0 ? "bg-red" : s.kind === "hazard" || s.kind === "portfolio" ? "bg-dim" : "bg-ink";
  const pts = Math.abs(s.pointsHi - s.pointsLo) > 0.01 ? `${signed(s.pointsLo)} to ${signed(s.pointsHi)}` : signed(s.pointsHi);

  // One bar while the score is a number; two thin bars once an interval is open.
  const seg = (a: number, b: number, thin: boolean) => (
    <span
      className={`absolute ${tone}`}
      style={{
        bottom: y(Math.min(a, b)),
        height: `calc(${y(Math.abs(b - a))} + ${thin ? 2 : 0}px)`,
        left: thin ? "32%" : "24%",
        width: thin ? "36%" : "52%",
        minHeight: 2,
      }}
    />
  );

  return (
    <div className="group absolute inset-y-0" style={{ left: `${left}%`, width: `${width}%` }}>
      {s.kind === "cap" && split ? (
        <span className={`absolute left-[14%] w-[72%] ${tone}`} style={{ bottom: y(s.runningLo), height: y(s.runningHi - s.runningLo) }} />
      ) : wasSplit ? (
        <>
          {seg(fromHi, s.runningHi, true)}
          {seg(fromLo, s.runningLo, true)}
        </>
      ) : (
        seg(fromHi, s.runningHi, false)
      )}

      <span className="num absolute inset-x-0 text-center text-[11px]" style={{ bottom: y(Math.max(s.runningHi, fromHi)), transform: "translateY(-16px)" }}>
        {pts}
      </span>
      <span className="absolute inset-x-[-6px] bottom-[-40px] text-center text-[11px] leading-[1.25] text-dim">{s.label}</span>

      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 w-[250px] -translate-x-1/2 translate-y-1 bg-ink px-3 py-2.5 text-[12px] leading-[1.45] text-paper opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover:translate-y-0 group-hover:opacity-100">
        <b className="block font-medium">
          {s.label}: {pts} points
        </b>
        {s.value && <span className="block">{s.value}</span>}
        {s.rule && <span className="mt-1 block text-paper/75">{s.rule}</span>}
        {s.source && <span className="num mt-1 block text-[11px] text-paper/65">{s.source}</span>}
        {s.capped && <span className="mt-1 block text-[11px]">capped by the rules file</span>}
      </span>
    </div>
  );
}

/** The renter price, built the same way: a base, then each capped multiplier as its own dollars. */
export function PriceWaterfall({ steps, annual, label }: { steps: PriceStep[]; annual: number; label?: string }) {
  const top = Math.max(annual, ...steps.map((s) => s.runningDollars)) * 1.15;
  const y = (v: number) => `${(v / top) * 100}%`;
  const W = 100 / Math.max(steps.length, 1);
  const cents = steps.reduce((n, s) => n + Math.round(s.dollars * 100), 0);
  const exact = cents === Math.round(annual * 100);

  return (
    <figure className="flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1 border-b border-l border-ink" style={{ marginLeft: 40, marginBottom: 50 }}>
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-faint" style={{ bottom: `${f * 100}%` }}>
            <span className="num absolute -left-10 -top-[7px] text-[10.5px] text-dim">${Math.round(top * f)}</span>
          </div>
        ))}
        {steps.map((s, i) => {
          const from = (steps[i - 1]?.runningDollars ?? 0) as number;
          const up = s.dollars >= 0;
          return (
            <div key={s.key} className="group absolute inset-y-0" style={{ left: `${i * W}%`, width: `${W}%` }}>
              <span
                className={`absolute left-[24%] w-[52%] ${s.kind === "base" ? "bg-ink" : up ? "bg-dim" : "bg-red"}`}
                style={{ bottom: y(Math.min(from, s.runningDollars)), height: `calc(${y(Math.abs(s.dollars))} + 2px)`, minHeight: 2 }}
              />
              <span className="num absolute inset-x-0 text-center text-[11px]" style={{ bottom: y(Math.max(from, s.runningDollars)), transform: "translateY(-16px)" }}>
                {s.kind === "base" ? `$${s.dollars.toFixed(0)}` : `${s.dollars >= 0 ? "+" : "−"}$${Math.abs(s.dollars).toFixed(2)}`}
              </span>
              <span className="absolute inset-x-[-6px] bottom-[-40px] text-center text-[11px] leading-[1.25] text-dim">
                {s.label}
                {s.capped && <span className="block text-ink">capped</span>}
              </span>
              <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 w-[240px] -translate-x-1/2 translate-y-1 bg-ink px-3 py-2.5 text-[12px] leading-[1.45] text-paper opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                <b className="block font-medium">
                  {s.label}
                  {s.multiplier ? ` ×${s.multiplier.toFixed(2)}` : ""}
                </b>
                {s.source && <span className="num mt-1 block text-[11px] text-paper/70">{s.source}</span>}
                {s.percentile !== undefined && <span className="mt-1 block text-paper/75">percentile {Math.round(s.percentile)} of Toronto cells</span>}
              </span>
            </div>
          );
        })}
      </div>
      <figcaption className="flex items-baseline gap-4 text-[12.5px] text-dim">
        <span className={exact ? "text-ink" : "text-red"}>{exact ? "✓ lines sum exactly to the annual price" : "× lines do not sum to the annual price"}</span>
        {label && <span>{label}</span>}
      </figcaption>
    </figure>
  );
}
