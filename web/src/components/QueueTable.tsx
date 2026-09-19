"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { QueueRow } from "@/contract";
import { DecisionChip, IntervalBar, IssueTag, money } from "./bits";

type Key = "rank" | "insured" | "line" | "state" | "score" | "delta" | "value";
const mid = (r: QueueRow) => (r.decision.kind === "routed" ? -1 : (r.score.lo + r.score.hi) / 2);

const COLS: { key: Key; label: string; align?: "right" }[] = [
  { key: "rank", label: "#" },
  { key: "insured", label: "Insured" },
  { key: "line", label: "Line" },
  { key: "state", label: "State" },
  { key: "score", label: "Score interval" },
  { key: "delta", label: "Enrich Δ", align: "right" },
  { key: "value", label: "At stake", align: "right" },
];

export function QueueTable({ rows }: { rows: QueueRow[] }) {
  const ranked = useMemo(
    () =>
      [...rows]
        .sort((a, b) => mid(b) - mid(a) || b.valueAtStake - a.valueAtStake)
        .map((r, i) => ({ ...r, rank: i + 1 })),
    [rows],
  );
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "rank", dir: 1 });
  const sorted = useMemo(() => {
    const val = (r: (typeof ranked)[number]): string | number =>
      ({ rank: r.rank, insured: r.insured, line: r.line, state: r.state, score: mid(r), delta: r.enrichmentDelta, value: r.valueAtStake })[
        sort.key
      ];
    return [...ranked].sort((a, b) => {
      const x = val(a), y = val(b);
      return (typeof x === "string" ? x.localeCompare(y as string) : x - (y as number)) * sort.dir;
    });
  }, [ranked, sort]);

  const toggle = (key: Key) =>
    setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "rank" || key === "insured" || key === "line" || key === "state" ? 1 : -1 }));

  if (!rows.length)
    return <p className="mt-10 text-dim">No submissions match. Switch to All to see decided and bound cases.</p>;

  return (
    <table className="mt-6 w-full border-collapse text-[12.5px]">
      <caption className="sr-only">Submission queue. Column headers are buttons that sort the table.</caption>
      <thead>
        <tr className="border-b border-ink">
          {COLS.map((c) => (
            <th
              key={c.key}
              scope="col"
              aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
              className={`py-1.5 pr-4 font-normal ${c.align === "right" ? "text-right" : "text-left"} ${c.key === "score" ? "w-[260px]" : ""}`}
            >
              <button onClick={() => toggle(c.key)} className="kicker rounded-sm hover:text-ink">
                {c.label}
                <span aria-hidden className="ml-1 inline-block w-2 font-mono">
                  {sort.key === c.key ? (sort.dir === 1 ? "↑" : "↓") : ""}
                </span>
              </button>
            </th>
          ))}
          <th scope="col" className="kicker py-1.5 pr-4 text-left font-normal">Decision</th>
          <th scope="col" className="kicker py-1.5 text-left font-normal">Issues</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => (
          <tr key={r.caseId} className="group border-b border-rule transition-colors duration-150 hover:bg-land">
            <td className="num py-2 pr-4 text-dim">{String(r.rank).padStart(2, "0")}</td>
            <td className="py-2 pr-4">
              <Link href={`/cases/${r.caseId}`} className="font-medium underline-offset-2 hover:underline">
                {r.insured}
              </Link>
              <span className="num ml-2 text-[11px] text-dim">#{r.caseId}</span>
              {r.deepDived && (
                <span title="The desk ran a deep dive on this case" className="ml-2 font-mono text-[10px] text-ochre">
                  deep dive
                </span>
              )}
            </td>
            <td className="py-2 pr-4">{r.line.length <= 3 ? r.line.toUpperCase() : r.line[0].toUpperCase() + r.line.slice(1)}</td>
            <td className="num py-2 pr-4">{r.state}</td>
            <td className="py-2 pr-4">
              {r.decision.kind === "routed" ? (
                <span className="text-[11.5px] text-dim">routed, {r.decision.because}</span>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1"><IntervalBar score={r.score} compact /></div>
                  <span className="num w-[42px] text-[11.5px]">{r.score.lo}–{r.score.hi}</span>
                </div>
              )}
            </td>
            <td className={`num py-2 pr-4 text-right ${r.enrichmentDelta ? "" : "text-dim"}`}>
              {r.enrichmentDelta > 0 ? "+" : r.enrichmentDelta < 0 ? "−" : "±"}
              {Math.abs(r.enrichmentDelta)}
            </td>
            <td className="num py-2 pr-4 text-right">{money(r.valueAtStake)}</td>
            <td className="py-2 pr-4">
              <DecisionChip decision={r.decision} />
              {r.decision.kind === "open" &&
                r.decision.flippers.map((f) => (
                  <span
                    key={f.fact}
                    title={`${f.fact} could flip the decision; ask the ${f.resolver}`}
                    className="ml-1.5 font-mono text-[10.5px]"
                  >
                    <span aria-hidden>⇅</span> {f.fact} <span className="text-dim">← {f.resolver}</span>
                  </span>
                ))}
            </td>
            <td className="py-2">
              <span className="flex flex-wrap gap-1">
                {r.issues.map((i) => <IssueTag key={i.kind} {...i} />)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
