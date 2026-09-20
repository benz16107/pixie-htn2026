"use client";
import Link from "next/link";
import { useMemo, useRef } from "react";
import { DecisionChip, IntervalBar, IssueTag, money } from "@/components/bits";
import type { Row } from "@/lib/live";

/**
 * The book, read as a list: the same ranking as QueueTable, but built for a 420px-wide rail
 * instead of a full page. Every data point QueueTable shows still shows here, stacked in three
 * lines instead of six columns, so nothing gets clipped at the rail's edge. Real `<Link>`s per
 * row, so a keyboard user reaches every case a mouse can reach a pin for.
 */

type Extras = { deskVerdict?: string; challengeRisks?: number };
type Ranked = Row & Extras & { rank: number };

const GROUP: Record<string, number> = { open: 0, refer: 1, accept: 1, approve: 1, decline: 2, routed: 3 };
const group = (r: Row) => GROUP[r.decision.kind] ?? 3;
const scored = (r: Row) => !!r.score && r.decision.kind !== "routed" && (r.score.lo !== 0 || r.score.hi !== 0);
const mid = (r: Row) => (scored(r) ? (r.score!.lo + r.score!.hi) / 2 : -1);

export function QueueRail({ rows, active }: { rows: (Row & Extras)[]; active?: string }) {
  const ranked = useMemo<Ranked[]>(
    () =>
      [...rows]
        .sort((a, b) => group(a) - group(b) || mid(b) - mid(a) || b.valueAtStake - a.valueAtStake)
        .map((r, i) => ({ ...r, rank: i + 1 })),
    [rows],
  );
  const desk = ranked.filter((r) => r.region !== "toronto");
  const consumer = ranked.filter((r) => r.region === "toronto");
  const rootRef = useRef<HTMLUListElement>(null);

  // Once focus is on a row, the arrow keys the HUD promises actually move it: the rail is the
  // keyboard-reachable form of the same pins a mouse clicks on the map.
  const onKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const root = rootRef.current;
    if (!root) return;
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>("a[data-rail-link]"));
    const i = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (i === -1) return;
    e.preventDefault();
    const next = e.key === "ArrowDown" ? Math.min(i + 1, links.length - 1) : Math.max(i - 1, 0);
    links[next].focus();
    links[next].scrollIntoView({ block: "nearest" });
  };

  if (!rows.length) return <p className="py-6 text-[12px] text-dim">No submissions match. Switch to All to see decided and bound cases.</p>;

  return (
    <ul ref={rootRef} onKeyDown={onKeyDown}>
      {desk.map((r) => (
        <RailRow key={r.caseId} r={r} active={active === r.caseId} />
      ))}
      {consumer.length > 0 && (
        <li className="pb-1 pt-4">
          <span className="kicker">Consumer referrals</span>
          <span className="ml-2 text-[11px] text-dim">Toronto renters the same engine priced.</span>
        </li>
      )}
      {consumer.map((r) => (
        <RailRow key={r.caseId} r={r} active={active === r.caseId} />
      ))}
    </ul>
  );
}

function RailRow({ r, active }: { r: Ranked; active: boolean }) {
  const has = scored(r);
  const same = (a: string, b: string) => a.replace(/d$/, "") === b.replace(/d$/, "");
  const moved = !!r.deskVerdict && !same(r.deskVerdict, r.decision.kind);
  const reasons = "because" in r.decision ? (Array.isArray(r.decision.because) ? r.decision.because : [r.decision.because]) : [];
  const why = reasons.length
    ? reasons.slice(0, 2).map((b) => b.replace(/:/g, " ").replaceAll("_", " ")).join("; ")
    : r.decision.kind === "open"
      ? `waiting on ${r.decision.flippers.map((f) => f.fact).join(", ") || "the broker"}`
      : "";
  const issueGroups = Object.values(
    r.issues.reduce<Record<string, { kind: string; severity: string; n: number }>>((m, i) => {
      m[i.kind] = { ...i, n: (m[i.kind]?.n ?? 0) + 1 };
      return m;
    }, {}),
  );

  return (
    <li className={`border-t border-rule py-2 transition-colors duration-150 ${active ? "bg-ochre-soft/60" : "hover:bg-land"}`}>
      <Link href={`/cases/${r.caseId}`} data-rail-link className="block px-0.5">
        <div className="flex items-baseline gap-2">
          <span className="num shrink-0 text-[10.5px] text-dim">{String(r.rank).padStart(2, "0")}</span>
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium underline-offset-2 hover:underline">{r.insured}</span>
          <DecisionChip decision={r.decision} />
        </div>
        <p className="num ml-6 truncate text-[10.5px] text-dim">
          #{r.caseId} · {r.line} · {r.state}
          {r.deepDived && <span className="ml-1.5 font-mono text-ochre">deep dive</span>}
          {moved && <span className="ml-1.5 font-mono text-ochre">desk: {r.deskVerdict!.replaceAll("_", " ")}</span>}
        </p>
        <div className="ml-6 mt-1 flex items-center gap-2">
          {has ? (
            <>
              <div className="w-[110px] shrink-0">
                <IntervalBar score={r.score} compact />
              </div>
              <span className="num text-[10.5px]">
                {r.score!.lo}-{r.score!.hi}
              </span>
            </>
          ) : (
            <span className="num text-[10.5px] text-dim">not scored</span>
          )}
          <span className="num ml-auto shrink-0 text-[11px]">{money(r.valueAtStake)}</span>
        </div>
        {(why || issueGroups.length > 0 || !!r.challengeRisks) && (
          <p className="ml-6 mt-1 flex min-w-0 items-baseline gap-1.5 truncate text-[10.5px] text-dim">
            <span className="min-w-0 flex-1 truncate">{why}</span>
            {!!r.challengeRisks && (
              <span title={`${r.challengeRisks} risks raised by the Challenger`} className="shrink-0 rounded-sm border border-rust px-1 font-mono text-[9px] text-rust">
                {r.challengeRisks} risks
              </span>
            )}
            {issueGroups.map((i) => (
              <IssueTag key={i.kind} kind={i.kind} severity={i.severity} count={i.n} />
            ))}
          </p>
        )}
      </Link>
    </li>
  );
}
