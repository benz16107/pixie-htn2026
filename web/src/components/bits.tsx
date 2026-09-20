import type { DecisionView, Interval, Provenance } from "@/contract";

export const THRESHOLDS = [45, 70] as const;

/**
 * The score as a printed number line: a hairline from 0 to 100, the interval drawn in ink over it,
 * and the two guideline thresholds marked in red, because a threshold is a limit.
 */
export function IntervalBar({ score, compact = false }: { score: Interval | null; compact?: boolean }) {
  if (!score) return <span className="num text-dim">no interval</span>;
  const h = compact ? 14 : 24;
  const mid = compact ? 7 : 15;
  return (
    <div role="img" aria-label={`Score ${score.lo} to ${score.hi}; refer band 45 to 70`} className="relative w-full" style={{ height: h }}>
      <div className="absolute inset-x-0 bg-rule" style={{ top: mid, height: 1 }} />
      <div
        className="iv absolute inset-x-0 origin-left bg-ink"
        style={{ transform: `translateX(${score.lo}%) scaleX(${Math.max(score.hi - score.lo, 1) / 100})`, top: mid - 2, height: 5 }}
      />
      {THRESHOLDS.map((t) => (
        <div key={t} className="absolute bg-red" style={{ left: `${t}%`, top: mid - (compact ? 4 : 5), height: compact ? 9 : 11, width: 1 }}>
          {!compact && <span className="num absolute -top-[13px] left-1 text-[10px] leading-none text-red">{t}</span>}
        </div>
      ))}
    </div>
  );
}

const WORD: Record<DecisionView["kind"], string> = {
  accept: "Accept",
  approve: "Approve",
  refer: "Refer",
  decline: "Decline",
  open: "Open",
  routed: "Routed",
};

/**
 * The decision as a printed word. Decided calls are set in small capitals; an open case is set in
 * italic, because it is still being written; a routed case is grey, because it belongs to another
 * desk; a decline is red, because red means a line was crossed.
 */
export function DecisionChip({ decision, large = false }: { decision: DecisionView; large?: boolean }) {
  const k = decision.kind;
  if (k === "open")
    return <span className={`font-serif italic ${large ? "text-[17px]" : "text-[13px]"}`}>{WORD[k]}</span>;
  const tone = k === "decline" ? "text-red" : k === "routed" ? "text-dim" : "text-ink";
  return (
    <span className={`sc ${tone} ${large ? "text-[12px]" : ""}`}>
      {WORD[k]}
    </span>
  );
}

const PV: Record<Provenance, { text: string; tone: string }> = {
  known: { text: "known", tone: "sc text-ink" },
  estimated: { text: "est.", tone: "text-[12px] italic text-dim" },
  missing: { text: "missing", tone: "sc text-red" },
};

/** Where a fact came from, as a mark in the margin: known in ink, estimated in italic, missing in red. */
export function ProvenanceBadge({ p }: { p: Provenance }) {
  return (
    <span className={`inline-block w-[52px] shrink-0 ${PV[p].tone}`} title={p}>
      {PV[p].text}
      {p === "estimated" && <span className="sr-only">imated</span>}
    </span>
  );
}

export const ISSUE_LABEL: Record<string, string> = {
  duplicate_account: "dup.",
  broker_conflict: "broker",
  stale_submission: "stale",
  limit_vs_tiv: "limit",
  premium_missing: "prem.?",
  missing_roof_year: "roof?",
};

const SEVERITY: Record<string, string> = {
  block: "text-red",
  warn: "text-ink",
  info: "text-dim",
};

/** A data issue, as a footnote mark: block in red, warn in ink, info in grey. */
export function IssueTag({ kind, severity, text, count = 1 }: { kind: string; severity: string; text?: string; count?: number }) {
  const label = (ISSUE_LABEL[kind] ?? kind.replaceAll("_", " ").slice(0, 8)) + (count > 1 ? ` ×${count}` : "");
  const title = `${kind.replaceAll("_", " ")}${count > 1 ? `, ${count} times` : ""} (${severity})${text ? `: ${text}` : ""}`;
  return (
    <span title={title} className={`sc whitespace-nowrap ${SEVERITY[severity] ?? SEVERITY.info}`}>
      {label}
      <span className="sr-only"> {title}</span>
    </span>
  );
}

export const money = (n: number) =>
  n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`;
