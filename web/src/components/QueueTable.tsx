"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DecisionChip, IntervalBar, IssueTag, money } from "./bits";
import type { Row } from "@/lib/live";

type Key = "rank" | "insured" | "score" | "value";
const GROUP: Record<string, number> = { open: 0, refer: 1, accept: 1, approve: 1, decline: 2, routed: 3 };
const group = (r: Row) => GROUP[r.decision.kind] ?? 3;
const scored = (r: Row) => !!r.score && r.decision.kind !== "routed" && (r.score.lo !== 0 || r.score.hi !== 0);
const mid = (r: Row) => (scored(r) ? (r.score!.lo + r.score!.hi) / 2 : -1);

type Extras = { deskVerdict?: string; challengeRisks?: number };
type Ranked = Row & Extras & { rank: number };

const COLS: { key: Key; label: string; align?: "right"; w?: string }[] = [
  { key: "rank", label: "No.", w: "w-[44px]" },
  { key: "insured", label: "Insured", w: "w-[300px]" },
  { key: "score", label: "Score interval", w: "w-[250px]" },
  { key: "value", label: "At stake", align: "right", w: "w-[100px]" },
];

/** One row per submission, set like a table in a book: who, where it landed, and why. */
export function QueueTable({ rows }: { rows: (Row & Extras)[] }) {
  const ranked = useMemo<Ranked[]>(
    () =>
      [...rows]
        .sort((a, b) => group(a) - group(b) || mid(b) - mid(a) || b.valueAtStake - a.valueAtStake)
        .map((r, i) => ({ ...r, rank: i + 1 })),
    [rows],
  );
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "rank", dir: 1 });
  const sorted = useMemo(() => {
    const val = (r: Ranked): string | number => ({ rank: r.rank, insured: r.insured, score: mid(r), value: r.valueAtStake })[sort.key];
    return [...ranked].sort((a, b) => {
      const x = val(a),
        y = val(b);
      return (typeof x === "string" ? x.localeCompare(y as string) : x - (y as number)) * sort.dir;
    });
  }, [ranked, sort]);

  const toggle = (key: Key) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "rank" || key === "insured" ? 1 : -1 }));

  if (!rows.length) return <p className="mt-10 text-dim">No submissions match. Switch to All to see decided and bound cases.</p>;

  const desk = sorted.filter((r) => r.region !== "toronto");
  const consumer = sorted.filter((r) => r.region === "toronto");

  return (
    <table className="book mt-8 text-[13.5px]">
      <caption className="sr-only">Submission queue, ranked by score interval. Column headers sort the table.</caption>
      <thead>
        <tr>
          {COLS.map((c) => (
            <th key={c.key} scope="col" aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={`${c.align === "right" ? "r" : ""} ${c.w ?? ""}`}>
              <button onClick={() => toggle(c.key)} className="sc text-dim transition-colors duration-150 hover:text-ink">
                {c.label}
                <span aria-hidden className="ml-1 inline-block w-2 normal-case">
                  {sort.key === c.key ? (sort.dir === 1 ? "↑" : "↓") : ""}
                </span>
              </button>
            </th>
          ))}
          <th scope="col" className="w-[190px] !pl-6">Decision</th>
          <th scope="col">Why</th>
        </tr>
      </thead>
      <tbody>
        {desk.map((r) => (
          <QueueRowView key={r.caseId} r={r} />
        ))}
        {consumer.length > 0 && (
          <tr className="!border-t-0">
            <td colSpan={6} className="pb-2 pt-9">
              <span className="display display-sm">Consumer referrals</span>
              <span className="ml-3 text-[12.5px] text-dim">Toronto renters the same engine priced and sent here.</span>
            </td>
          </tr>
        )}
        {consumer.map((r) => (
          <QueueRowView key={r.caseId} r={r} />
        ))}
      </tbody>
    </table>
  );
}

function QueueRowView({ r }: { r: Ranked }) {
  const has = scored(r);
  // "route" and "routed" are the same call; only show the desk's verdict when it really differs.
  const same = (a: string, b: string) => a.replace(/d$/, "") === b.replace(/d$/, "");
  const moved = !!r.deskVerdict && !same(r.deskVerdict, r.decision.kind);
  const reasons = "because" in r.decision ? (Array.isArray(r.decision.because) ? r.decision.because : [r.decision.because]) : [];
  const why = reasons.length
    ? reasons.slice(0, 2).map((b) => b.replace(/:/g, " ").replaceAll("_", " ")).join("; ")
    : r.decision.kind === "open"
      ? `waiting on ${r.decision.flippers.map((f) => f.fact).join(", ") || "the broker"}`
      : "";
  const issues = Object.values(
    r.issues.reduce<Record<string, { kind: string; severity: string; n: number }>>((m, i) => {
      m[i.kind] = { ...i, n: (m[i.kind]?.n ?? 0) + 1 };
      return m;
    }, {}),
  );

  return (
    <tr className="transition-colors duration-150 hover:bg-faint/60">
      <td className="num text-dim">{r.rank}</td>
      <td>
        <Link href={`/cases/${r.caseId}`} className="link block truncate decoration-transparent hover:decoration-ink">
          {r.insured}
        </Link>
        <span className="block whitespace-nowrap text-[12px] text-dim">
          <span className="num">{r.caseId}</span>, {r.line}, {r.state}
          {r.deepDived && (
            <span title="The desk ran a deep dive on this case" className="sc ml-2.5">
              deep dive
            </span>
          )}
        </span>
      </td>
      <td>
        {has ? (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <IntervalBar score={r.score} compact />
            </div>
            <span className="num w-[44px] text-[12.5px]">
              {r.score!.lo}–{r.score!.hi}
            </span>
          </div>
        ) : (
          <span className="text-[12.5px] text-dim">not scored</span>
        )}
      </td>
      <td className="r num">{money(r.valueAtStake)}</td>
      <td className="!pl-6">
        <DecisionChip decision={r.decision} />
        {moved && <span className="block text-[12px] italic text-dim">desk: {r.deskVerdict!.replaceAll("_", " ")}</span>}
      </td>
      <td className="min-w-0">
        <span className="flex items-baseline gap-3">
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-dim" title={why}>
            {why}
          </span>
          {!!r.challengeRisks && (
            <span title={`${r.challengeRisks} risks raised by the Challenger`} className="sc shrink-0">
              {r.challengeRisks} risks
            </span>
          )}
          {issues.map((i) => (
            <IssueTag key={i.kind} kind={i.kind} severity={i.severity} count={i.n} />
          ))}
        </span>
      </td>
    </tr>
  );
}
