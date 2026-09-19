import { signed, type Explain, type Step } from "@/lib/explain";

/**
 * How the score was built. Solid bars while the score is one number, a hatched band once a
 * missing fact opens an interval, then the later steps move both ends of it.
 */
export function Waterfall({ x }: { x: Explain }) {
  const steps = x.steps.filter((s) => Math.abs(s.pointsLo) > 0.01 || Math.abs(s.pointsHi) > 0.01 || s.kind === "cap");
  const top = Math.max(100, ...steps.map((s) => s.runningHi));
  const y = (v: number) => `${(v / top) * 100}%`;
  const W = 100 / Math.max(steps.length, 1);

  return (
    <figure className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1 border-b border-l border-ink" style={{ marginLeft: 30, marginBottom: 46 }}>
        {[0, 25, 50, 75, 100].map((g) => (
          <div key={g} className="absolute inset-x-0 border-t border-dotted border-rule" style={{ bottom: y(g) }}>
            <span className="num absolute -left-7 -top-[7px] text-[10px] text-dim">{g}</span>
          </div>
        ))}
        {[
          { at: x.thresholds.decline, label: `refer at ${x.thresholds.decline}` },
          { at: x.thresholds.accept, label: `accept at ${x.thresholds.accept}` },
        ].map((t) => (
          <div key={t.at} className="absolute inset-x-0 border-t border-rust" style={{ bottom: y(t.at) }}>
            <span className="num absolute -top-[14px] right-1 text-[10px] text-rust">{t.label}</span>
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
  const tone =
    s.kind === "cap"
      ? "border border-dashed border-ochre bg-[repeating-linear-gradient(45deg,var(--color-ochre-soft)_0_5px,transparent_5px_10px)]"
      : s.pointsHi < 0
        ? "bg-rust"
        : s.kind === "hazard" || s.kind === "portfolio"
          ? "bg-ochre"
          : "bg-moss";
  const pts = Math.abs(s.pointsHi - s.pointsLo) > 0.01 ? `${signed(s.pointsLo)} to ${signed(s.pointsHi)}` : signed(s.pointsHi);

  // One bar while the score is a number; two thin bars once an interval is open.
  const seg = (a: number, b: number, thin: boolean) => (
    <span
      className={`absolute rounded-[2px] ${tone}`}
      style={{
        bottom: y(Math.min(a, b)),
        height: `calc(${y(Math.abs(b - a))} + ${thin ? 2 : 0}px)`,
        left: thin ? "30%" : "22%",
        width: thin ? "40%" : "56%",
        minHeight: 2,
      }}
    />
  );

  return (
    <div className="group absolute inset-y-0" style={{ left: `${left}%`, width: `${width}%` }}>
      {s.kind === "cap" && split ? (
        <span
          className={`absolute left-[12%] w-[76%] rounded-[2px] ${tone}`}
          style={{ bottom: y(s.runningLo), height: y(s.runningHi - s.runningLo) }}
        />
      ) : wasSplit ? (
        <>
          {seg(fromHi, s.runningHi, true)}
          {seg(fromLo, s.runningLo, true)}
        </>
      ) : (
        seg(fromHi, s.runningHi, false)
      )}

      <span className="num absolute inset-x-0 text-center text-[10.5px]" style={{ bottom: y(Math.max(s.runningHi, fromHi)), transform: "translateY(-15px)" }}>
        {s.kind === "cap" ? <span className="text-ochre">{pts}</span> : pts}
      </span>
      <span className="absolute inset-x-[-8px] bottom-[-34px] text-center font-mono text-[9.5px] leading-tight text-dim">{s.label}</span>

      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 w-[240px] -translate-x-1/2 translate-y-1 rounded-sm bg-ink px-2.5 py-2 text-[11px] leading-snug text-paper opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover:translate-y-0 group-hover:opacity-100">
        <b className="block font-semibold">{s.label}: {pts} points</b>
        {s.value && <span className="block">{s.value}</span>}
        {s.rule && <span className="mt-1 block text-land/80">{s.rule}</span>}
        {s.source && <span className="mt-1 block font-mono text-[10px] text-land/70">{s.source}</span>}
        {s.capped && <span className="mt-1 block font-mono text-[10px] text-land">capped by the rules file</span>}
      </span>
    </div>
  );
}
