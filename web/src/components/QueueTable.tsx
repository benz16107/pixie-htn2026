"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DecisionChip, IntervalBar, IssueTag, money, THRESHOLDS, type Thresholds } from "./bits";
import { useKeys } from "./desk/keys";
import type { Row } from "@/lib/live";

type Key = "rank" | "insured" | "score" | "value";
const GROUP: Record<string, number> = { open: 0, refer: 1, accept: 1, approve: 1, decline: 2, routed: 3 };
/** Consumer referrals sit under the desk's own book, the way they arrive. */
const group = (r: Row) => (r.region === "toronto" ? 10 : 0) + (GROUP[r.decision.kind] ?? 3);
const scored = (r: Row) => !!r.score && r.decision.kind !== "routed" && (r.score.lo !== 0 || r.score.hi !== 0);
const mid = (r: Row) => (scored(r) ? (r.score!.lo + r.score!.hi) / 2 : -1);

type Extras = { deskVerdict?: string; challengeRisks?: number };
export type Ranked = Row & Extras & { rank: number };

const COLS: { key?: Key; label: string; w: string; align?: "right" }[] = [
  { key: "rank", label: "#", w: "w-[34px]" },
  { label: "case", w: "w-[58px]" },
  { key: "insured", label: "insured", w: "w-[216px]" },
  { label: "line", w: "w-[74px]" },
  { label: "st", w: "w-[30px]" },
  { key: "value", label: "at stake", w: "w-[76px]", align: "right" },
  { key: "score", label: "score 0–100", w: "w-[186px]" },
  { label: "call", w: "w-[164px]" },
  { label: "flags", w: "w-[102px]" },
  { label: "what it turns on", w: "" },
];

/** The desk's own verdict, short enough to sit beside the rules' call without moving the grid. */
const VERDICT_SHORT: Record<string, string> = {
  request_info: "ask broker",
  refer_with_subjectivity: "refer+subj",
  decline_with_invitation: "decline+invite",
  refer: "refer",
  decline: "decline",
  accept: "accept",
  approve: "approve",
  route: "route",
  routed: "route",
};

/**
 * The blotter. One row per submission, ten columns, a cursor you drive with j and k, and a
 * preview that follows the cursor so the whole book reads without a single click.
 */
export function QueueTable({
  rows,
  view,
  onCursor,
  filter,
  setFilter,
  t = THRESHOLDS,
}: {
  rows: (Row & Extras)[];
  view: "open" | "all" | "consumer";
  onCursor: (r: Ranked | null) => void;
  filter: string;
  setFilter: (s: string) => void;
  t?: Thresholds;
}) {
  const router = useRouter();
  const ranked = useMemo<Ranked[]>(
    () =>
      [...rows]
        .sort((a, b) => group(a) - group(b) || mid(b) - mid(a) || b.valueAtStake - a.valueAtStake)
        .map((r, i) => ({ ...r, rank: i + 1 })),
    [rows],
  );
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "rank", dir: 1 });
  const [cursor, setCursor] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  const sorted = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const hit = (r: Ranked) => !q || `${r.insured} ${r.caseId} ${r.line} ${r.state} ${r.decision.kind}`.toLowerCase().includes(q);
    const val = (r: Ranked): string | number => ({ rank: r.rank, insured: r.insured, score: mid(r), value: r.valueAtStake })[sort.key];
    return ranked.filter(hit).sort((a, b) => {
      const x = val(a),
        y = val(b);
      return (typeof x === "string" ? x.localeCompare(y as string) : x - (y as number)) * sort.dir;
    });
  }, [ranked, sort, filter]);

  const at = Math.min(cursor, Math.max(sorted.length - 1, 0));
  const here = sorted[at] ?? null;
  useEffect(() => onCursor(here), [here, onCursor]);

  // Keep the cursor row in view without hijacking the page: only the blotter scrolls.
  useEffect(() => {
    box.current?.querySelector<HTMLElement>('tr[data-on="1"]')?.scrollIntoView({ block: "nearest" });
  }, [at, sorted.length]);

  useKeys(
    (e, leader) => {
      if (e.key === "/") return e.preventDefault(), search.current?.focus(), true;
      if (e.key === "j" || e.key === "ArrowDown") return setCursor((c) => Math.min(c + 1, sorted.length - 1)), e.preventDefault(), true;
      if (e.key === "k" || e.key === "ArrowUp") return setCursor((c) => Math.max(c - 1, 0)), e.preventDefault(), true;
      if (leader === "g" && e.key === "g") return setCursor(0), true;
      if (e.key === "G") return setCursor(sorted.length - 1), true;
      if (e.key === "Enter" && here) return router.push(`/cases/${here.caseId}`), true;
      return false;
    },
    [sorted.length, here, router],
  );

  const toggle = (key: Key) =>
    setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "rank" || key === "insured" ? 1 : -1 }));

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex h-[26px] shrink-0 items-center gap-2 border-b border-rule px-2 text-[11px]">
        <span aria-hidden className="text-faint">
          /
        </span>
        <input
          ref={search}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setFilter("");
              e.currentTarget.blur();
            }
          }}
          placeholder="filter by insured, case, line, state or call"
          aria-label="Filter the blotter"
          className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-faint focus:outline-none"
        />
        <span className="num shrink-0 text-faint">
          {sorted.length}/{ranked.length} rows
        </span>
      </div>

      <div ref={box} className="relative min-h-0 flex-1 overflow-auto">
        <table className="w-full table-fixed border-collapse text-[11px]">
          <caption className="sr-only">
            Submission blotter, ranked by score interval. Column headers sort. Press j and k to move the cursor, Enter to open a case.
          </caption>
          <thead className="sticky top-0 z-10 bg-paper">
            <tr className="border-b border-edge">
              {COLS.map((c) => (
                <th
                  key={c.label}
                  scope="col"
                  aria-sort={c.key && sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                  className={`h-[24px] whitespace-nowrap px-2 font-normal ${c.align === "right" ? "text-right" : "text-left"} ${c.w}`}
                >
                  {c.key ? (
                    <button onClick={() => toggle(c.key!)} className="kicker rounded-sm hover:text-ochre">
                      {c.label}
                      <span aria-hidden className="ml-1 inline-block w-2">
                        {sort.key === c.key ? (sort.dir === 1 ? "↑" : "↓") : ""}
                      </span>
                    </button>
                  ) : (
                    <span className="kicker">{c.label}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <BlotterRow key={r.caseId} r={r} on={i === at} t={t} onPick={() => setCursor(i)} onOpen={() => router.push(`/cases/${r.caseId}`)} />
            ))}
            {!!sorted.length && (
              <tr>
                <td colSpan={COLS.length} className="px-2 pt-2 text-[10px] text-faint">
                  — end of the {view === "open" ? "open" : "full"} book, {sorted.length} rows
                </td>
              </tr>
            )}
            {!sorted.length && (
              <tr>
                <td colSpan={COLS.length} className="px-2 py-6 text-center text-dim">
                  Nothing matches “{filter}”. Esc clears it.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** "route" and "routed" are the same call; only show the desk's verdict when it really differs. */
const same = (a: string, b: string) => a.replace(/d$/, "") === b.replace(/d$/, "");

export function whyLine(r: Ranked | (Row & Extras)): string {
  const reasons = "because" in r.decision ? (Array.isArray(r.decision.because) ? r.decision.because : [r.decision.because]) : [];
  if (reasons.length) return reasons.slice(0, 2).map((b) => b.replace(/:/g, " ").replaceAll("_", " ")).join("; ");
  if (r.decision.kind === "open")
    return `waiting on ${r.decision.flippers.map((f) => f.fact).join(", ") || "the broker"}`;
  return "";
}

function BlotterRow({ r, on, t, onPick, onOpen }: { r: Ranked; on: boolean; t: Thresholds; onPick: () => void; onOpen: () => void }) {
  const has = scored(r);
  const moved = !!r.deskVerdict && !same(r.deskVerdict, r.decision.kind);
  // A routed row's reason is the same sentence 16 times over. Its destination is the news.
  const why = r.decision.kind === "routed" ? `→ ${r.decision.to}` : whyLine(r);
  const whyTitle = r.decision.kind === "routed" ? r.decision.because : why;
  const issues = Object.values(
    r.issues.reduce<Record<string, { kind: string; severity: string; n: number }>>((m, i) => {
      m[i.kind] = { ...i, n: (m[i.kind]?.n ?? 0) + 1 };
      return m;
    }, {}),
  );

  return (
    <tr
      data-on={on ? "1" : "0"}
      tabIndex={on ? 0 : -1}
      onFocus={onPick}
      onClick={onPick}
      onDoubleClick={onOpen}
      className={`h-[25px] cursor-default border-b border-rule/70 ${on ? "cursor-row" : "hover:bg-land"}`}
    >
      <td className="num px-2 text-faint">{String(r.rank).padStart(2, "0")}</td>
      <td className="num truncate px-2 text-dim">{r.caseId}</td>
      <td className="truncate px-2">
        <Link href={`/cases/${r.caseId}`} className="cond text-[13px] font-medium text-ink underline-offset-2 hover:text-ochre hover:underline">
          {r.insured}
        </Link>
        {r.deepDived && (
          <span title="the desk ran a deep dive on this case" className="ml-1.5 text-[9px] uppercase tracking-[0.08em] text-ochre">
            deep
          </span>
        )}
      </td>
      <td className="truncate px-2 text-dim">{r.line}</td>
      <td className="px-2 text-dim">{r.state}</td>
      <td className="num px-2 text-right">{money(r.valueAtStake)}</td>
      <td className="px-2">
        {has ? (
          <span className="flex items-center gap-2">
            <span className="flex-1">
              <IntervalBar score={r.score} compact t={t} />
            </span>
            <span className="num w-[40px] shrink-0 text-right text-[11px]">
              {r.score!.lo}–{r.score!.hi}
            </span>
          </span>
        ) : (
          // Held to one line on purpose: a blotter row that grows breaks the reading rhythm.
          <span className="flex items-center gap-2" title="no 2025 property guideline scores this line, so it has no interval">
            <span aria-hidden className="h-px flex-1 bg-rule" />
            <span className="w-[76px] shrink-0 whitespace-nowrap text-right text-[10px] text-faint">not scored</span>
          </span>
        )}
      </td>
      <td className="truncate px-2">
        <DecisionChip decision={r.decision} />
        {moved && (
          <span title={`the rules said ${r.decision.kind}; the desk went with ${r.deskVerdict!.replaceAll("_", " ")}`} className="ml-1.5 text-[9px] text-ochre">
            desk {VERDICT_SHORT[r.deskVerdict!] ?? r.deskVerdict!.replaceAll("_", " ")}
          </span>
        )}
      </td>
      <td className="overflow-hidden px-2">
        <span className="flex gap-1 whitespace-nowrap">
          {r.override && (
            <span
              title={`${r.override.by} moved the engine's interval by ${r.override.points} points: ${r.override.reason}`}
              className="rounded-sm border border-ink px-1 text-[9px] leading-[13px] text-ink"
            >
              UW{r.override.points > 0 ? "+" : "−"}
              {Math.abs(r.override.points)}
            </span>
          )}
          {!!r.challengeRisks && (
            <span title={`${r.challengeRisks} risks raised by the Challenger`} className="rounded-sm border border-rust/60 px-1 text-[9px] leading-[13px] text-rust">
              {r.challengeRisks}R
            </span>
          )}
          {issues.map((i) => (
            <IssueTag key={i.kind} kind={i.kind} severity={i.severity} count={i.n} />
          ))}
        </span>
      </td>
      <td className={`truncate px-2 text-[11px] ${r.decision.kind === "routed" ? "text-faint" : "text-dim"}`} title={whyTitle}>
        {why}
      </td>
    </tr>
  );
}
