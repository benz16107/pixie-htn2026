import type { DecisionView, Interval, Provenance } from "@/contract";

export const THRESHOLDS = [45, 70] as const;

/**
 * The score as a band ruler. The three guideline zones are painted faintly behind it, so a
 * glance says not only where the interval sits but how much of it is still on the wrong side.
 */
export function IntervalBar({ score, compact = false }: { score: Interval | null; compact?: boolean }) {
  if (!score) return <span className="num text-faint">—</span>;
  const h = compact ? 14 : 22;
  const barH = compact ? 8 : 12;
  const straddles = score.lo < 45 !== score.hi < 45 || score.lo < 70 !== score.hi < 70;
  const tone = straddles ? "bg-ochre" : score.hi < 45 ? "bg-rust" : score.lo >= 70 ? "bg-moss" : "bg-ochre";
  return (
    <div
      role="img"
      aria-label={`Score ${score.lo} to ${score.hi}; decline under 45, refer 45 to 70, accept over 70`}
      className="relative w-full border border-rule bg-paper"
      style={{ height: h }}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 bg-rust/10" style={{ width: "45%" }} />
      <span aria-hidden className="absolute inset-y-0 bg-ochre/10" style={{ left: "45%", width: "25%" }} />
      <span aria-hidden className="absolute inset-y-0 right-0 bg-moss/10" style={{ width: "30%" }} />
      {THRESHOLDS.map((t) => (
        <span key={t} aria-hidden className="absolute inset-y-0 w-px bg-edge" style={{ left: `${t}%` }} />
      ))}
      <div
        className={`iv absolute origin-left ${tone}`}
        style={{
          transform: `translateX(${score.lo}%) scaleX(${Math.max(score.hi - score.lo, 1.2) / 100})`,
          top: (h - barH) / 2 - 1,
          height: barH,
          left: 0,
          right: 0,
        }}
      />
      {/* the two ends of the interval, drawn hard so a wide interval reads as uncertainty */}
      {[score.lo, score.hi].map((v, i) => (
        <span key={i} aria-hidden className="absolute inset-y-0 w-[1.5px] bg-ink" style={{ left: `calc(${v}% - ${i}px)` }} />
      ))}
    </div>
  );
}

const DECISION_LABEL: Record<DecisionView["kind"], string> = {
  accept: "ACCEPT",
  approve: "APPROVE",
  refer: "REFER",
  decline: "DECLINE",
  open: "OPEN",
  routed: "ROUTED",
};

// Shape carries the meaning as well as colour: open is outlined, decided is filled, routed is dashed.
export function DecisionChip({ decision, large = false }: { decision: DecisionView; large?: boolean }) {
  const k = decision.kind;
  const style =
    k === "open"
      ? "border-ochre text-ochre"
      : k === "routed"
        ? "border-dashed border-faint text-faint"
        : k === "decline"
          ? "border-rust bg-rust text-paper"
          : k === "refer"
            ? "border-ochre bg-ochre text-paper"
            : "border-moss bg-moss text-paper";
  return (
    <span
      className={`inline-block rounded-sm border font-mono font-medium tracking-[0.12em] ${style} ${
        large ? "px-2 py-px text-[11px]" : "px-1.5 text-[9px] leading-[15px]"
      }`}
    >
      {DECISION_LABEL[k]}
    </span>
  );
}

const PV: Record<Provenance, string> = {
  known: "text-moss border-moss/50 bg-moss/10",
  estimated: "text-ochre border-ochre/50 bg-ochre/10",
  missing: "text-rust border-rust/60 bg-rust/10",
};
const PV_SHORT: Record<Provenance, string> = { known: "KNOWN", estimated: "EST", missing: "MISSING" };

/** Every fact carries this. It is the honesty signal, so it is never hidden behind a hover. */
export function ProvenanceBadge({ p, short = false }: { p: Provenance; short?: boolean }) {
  return (
    <span
      title={`provenance: ${p}`}
      className={`inline-block shrink-0 rounded-sm border px-1 text-center font-mono text-[9px] font-medium uppercase leading-[13px] tracking-[0.06em] ${PV[p]} ${
        short ? "w-[50px]" : "w-[62px]"
      }`}
    >
      {short ? PV_SHORT[p] : p}
    </span>
  );
}

export const ISSUE_LABEL: Record<string, string> = {
  duplicate_account: "DUP",
  broker_conflict: "BRKR",
  stale_submission: "STALE",
  limit_vs_tiv: "LIMIT",
  premium_missing: "PREM?",
  missing_roof_year: "ROOF?",
};

const SEVERITY: Record<string, string> = {
  block: "bg-rust/20 text-rust border-rust/60",
  warn: "border-ochre/60 text-ochre",
  info: "border-dashed border-edge text-dim",
};

export function IssueTag({ kind, severity, text, count = 1 }: { kind: string; severity: string; text?: string; count?: number }) {
  const label = (ISSUE_LABEL[kind] ?? kind.slice(0, 5).toUpperCase()) + (count > 1 ? `×${count}` : "");
  const title = `${kind.replaceAll("_", " ")}${count > 1 ? `, ${count} times` : ""} (${severity})${text ? `: ${text}` : ""}`;
  return (
    <span title={title} className={`inline-block rounded-sm border px-1 font-mono text-[9px] leading-[13px] ${SEVERITY[severity] ?? SEVERITY.info}`}>
      {label}
      <span className="sr-only"> {title}</span>
    </span>
  );
}

export const money = (n: number) =>
  n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`;
