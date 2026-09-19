import type { DecisionView, Interval, Provenance } from "@/contract";

export const THRESHOLDS = [45, 70] as const;

export function IntervalBar({ score, compact = false }: { score: Interval; compact?: boolean }) {
  const h = compact ? 18 : 26;
  return (
    <div
      role="img"
      aria-label={`Score ${score.lo} to ${score.hi}; refer band 45 to 70`}
      className="relative w-full"
      style={{ height: h }}
    >
      <div className="absolute inset-x-0 rounded-sm border border-rule bg-land" style={{ top: h / 2 - 3, height: 6 }} />
      <div
        className="absolute rounded-sm bg-moss transition-[left,width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ left: `${score.lo}%`, width: `${Math.max(score.hi - score.lo, 1)}%`, top: h / 2 - 7, height: 14 }}
      />
      {THRESHOLDS.map((t) => (
        <div key={t} className="absolute top-0 border-l-[1.5px] border-rust" style={{ left: `${t}%`, height: h }}>
          {!compact && <span className="absolute -top-[3px] left-1 font-mono text-[10px] text-rust">{t}</span>}
        </div>
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
      ? "border-ink text-ink"
      : k === "routed"
        ? "border-dashed border-dim text-dim"
        : k === "decline"
          ? "border-rust bg-rust text-paper"
          : k === "refer"
            ? "border-ochre bg-ochre-soft text-ink"
            : "border-moss bg-moss text-paper";
  return (
    <span
      className={`inline-block rounded-sm border font-mono font-medium tracking-[0.12em] ${style} ${
        large ? "px-2 py-px text-[11px]" : "px-1.5 text-[10px]"
      }`}
    >
      {DECISION_LABEL[k]}
    </span>
  );
}

const PV: Record<Provenance, string> = {
  known: "text-moss border-moss",
  estimated: "text-ochre border-ochre",
  missing: "text-rust border-rust",
};

export function ProvenanceBadge({ p }: { p: Provenance }) {
  return (
    <span
      className={`inline-block w-[68px] shrink-0 rounded-sm border px-1 text-center font-mono text-[9.5px] font-medium uppercase tracking-[0.05em] ${PV[p]}`}
    >
      {p}
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
  block: "bg-ink text-paper border-ink",
  warn: "border-ink text-ink",
  info: "border-dashed border-dim text-dim",
};

export function IssueTag({ kind, severity, text }: { kind: string; severity: string; text?: string }) {
  const label = ISSUE_LABEL[kind] ?? kind.slice(0, 5).toUpperCase();
  const title = `${kind.replaceAll("_", " ")} (${severity})${text ? `: ${text}` : ""}`;
  return (
    <span title={title} className={`inline-block rounded-sm border px-1 font-mono text-[9.5px] ${SEVERITY[severity] ?? SEVERITY.info}`}>
      {label}
      <span className="sr-only"> {title}</span>
    </span>
  );
}

export const money = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`;
