"use client";
import { useEffect, useRef, useState } from "react";
import type { CaseView, DeskEvent, QueueRow } from "@/contract";
import { DecisionChip, IntervalBar, money } from "../bits";
import { chatLine, type CaseState, type Chat } from "@/lib/live";
import { prettyBands } from "@/lib/format";
import { C_ROW_H } from "./layout";

const str = (v: unknown) => (typeof v === "string" ? v : "");

/* ---------------------------------- queue rail --------------------------------- */

export function QueueRail({
  rows,
  cases,
  selected,
  onPick,
}: {
  rows: QueueRow[];
  cases: Record<string, CaseState>;
  selected: string | null;
  onPick: (id: string) => void;
}) {
  // Open cases first, then declines, then routed; inside a group, by the interval that has settled.
  const GROUP: Record<string, number> = { open: 0, refer: 1, accept: 1, approve: 1, decline: 2, routed: 3 };
  const ranked = [...rows]
    .map((r) => {
      const c = cases[r.caseId];
      const score = c?.score ?? r.score;
      const scored = !!score && (score.lo !== 0 || score.hi !== 0) && r.decision.kind !== "routed";
      return { r, c, scored, group: GROUP[r.decision.kind] ?? 3, mid: scored ? (score.lo + score.hi) / 2 : -1, score };
    })
    .sort((a, b) => a.group - b.group || b.mid - a.mid || b.r.valueAtStake - a.r.valueAtStake);

  return (
    <div className="relative" style={{ height: ranked.length * C_ROW_H }}>
      {ranked.map(({ r, c, score, scored }, i) => {
        const on = selected === r.caseId;
        const status = c?.status ?? "waiting";
        return (
          <button
            key={r.caseId}
            onClick={() => onPick(r.caseId)}
            aria-current={on ? "true" : undefined}
            className={`absolute inset-x-0 flex items-center gap-2 rounded-sm border px-2 text-left transition-[transform,background-color,border-color] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
              on ? "border-ink bg-land" : "border-transparent hover:border-rule hover:bg-land/60"
            }`}
            style={{ transform: `translateY(${i * C_ROW_H}px)`, height: C_ROW_H - 3 }}
          >
            <span
              aria-hidden
              className={`size-2 shrink-0 rounded-full ${
                status === "working" ? "animate-pulse bg-ochre motion-reduce:animate-none" : status === "settled" ? "bg-ink" : "bg-rule"
              }`}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium leading-tight">{r.insured}</span>
              <span className="num text-[10px] text-dim">
                #{r.caseId} · {r.state} · {money(r.valueAtStake)}
              </span>
            </span>
            {status === "settled" ? (
              <DecisionChip decision={r.decision} />
            ) : status === "working" ? (
              <span className="num text-[10px] text-ochre">{scored ? `${score.lo}–${score.hi}` : "—"}</span>
            ) : (
              <span className="num text-[10px] text-dim">queued</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------- case panel --------------------------------- */

const FACT_STATE = { missing: "text-rust", estimated: "text-ochre", known: "text-moss" } as const;

export function CasePanel({ c, state, typed }: { c: CaseView | null; state?: CaseState; typed: boolean }) {
  const events = state?.events ?? [];
  const score = state?.score ?? c?.score;
  const decided = events.find((e) => e.kind === "decision");
  const conflicts = events.filter((e) => e.kind === "conflict");
  const resolutions = events.filter((e) => e.kind === "resolution");
  const seen = new Set(events.filter((e) => e.kind === "finding" || e.kind === "estimate").map((e) => str(e.body.fact)));
  const explanation = decided ? prettyBands(str(decided.body.text)) : "";

  if (!c) return <p className="p-4 text-[12.5px] text-dim">Pick a case from the rail or a pin on the map.</p>;
  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-y-auto px-4 py-3">
      <div>
        <p className="num text-[10.5px] text-dim">CASE #{c.caseId}</p>
        <h2 className="font-serif text-[21px] font-semibold leading-tight text-balance">{c.title}</h2>
      </div>
      {score && (score.lo !== 0 || score.hi !== 0) ? (
        <div>
          <p className="kicker mb-0.5 flex justify-between">
            <span>Interval <span className="num text-ink">{score.lo}–{score.hi}</span></span>
            <span>refer band 45–70</span>
          </p>
          <IntervalBar score={score} />
        </div>
      ) : (
        <p className="text-[12px] text-dim">
          No interval: <span className="text-ink">{c.decision.kind === "routed" ? c.decision.because : "not scored by this guideline"}</span>
        </p>
      )}
      <div>
        <p className="kicker mb-1">Facts</p>
        <ul className="space-y-1">
          {c.facts.map((f) => {
            const live = seen.has(f.id) || state?.status === "settled";
            const pv = state && !live && f.provenance !== "known" ? "missing" : f.provenance;
            return (
              <li key={f.id} className="flex items-baseline gap-2 text-[11.5px]">
                <span className="w-[86px] shrink-0 truncate text-dim">{f.label}</span>
                <span className={`num min-w-0 flex-1 truncate transition-colors duration-300 ${FACT_STATE[pv]}`} title={f.source}>
                  {state && !live && f.provenance !== "known" ? "waiting" : f.display}
                </span>
                <span className={`shrink-0 font-mono text-[9px] uppercase ${FACT_STATE[pv]}`}>{pv}</span>
              </li>
            );
          })}
        </ul>
      </div>
      {explanation && (
        <div>
          <p className="kicker mb-1">
            Lead&apos;s decision {c.explanationVerified && <span className="text-moss">✓ verified</span>}
          </p>
          <Typed key={explanation} text={explanation} on={typed} />
        </div>
      )}
      {conflicts.length > 0 && (
        <div>
          <p className="kicker mb-1">Conflicts</p>
          {conflicts.map((e) => {
            const fix = resolutions.find((r) => r.body.conflict_id === e.body.conflict_id);
            return (
              <div key={e.id} className="lane-card mb-1 rounded-sm border border-rust px-2 py-1 text-[11.5px]">
                {prettyBands(str(e.body.text))}
                {fix && <span className="mt-0.5 block text-[11px] text-moss">→ {prettyBands(str(fix.body.text)).replace(/^[a-z_:]+\s*->\s*/i, "")}</span>}
              </div>
            );
          })}
        </div>
      )}
      {!explanation && state?.status === "working" && <p className="text-[11.5px] text-dim">The desk is still working this case…</p>}
    </div>
  );
}

/** Reveals the explanation at reading speed; reduced motion shows it whole. */
function Typed({ text, on }: { text: string; on: boolean }) {
  const [n, setN] = useState(on ? 0 : text.length);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setN((k) => (k >= text.length ? (clearInterval(id), k) : k + 3)), 16);
    return () => clearInterval(id);
  }, [text.length, on]);
  return (
    <p className="font-serif text-[13.5px] leading-snug">
      {text.slice(0, n)}
      {n < text.length && <span className="animate-pulse">▍</span>}
    </p>
  );
}

/* ----------------------------------- chatter ----------------------------------- */

export function Chatter({ events, onPick, active }: { events: DeskEvent[]; onPick: (id: string) => void; active: string | null }) {
  const box = useRef<HTMLUListElement>(null);
  const lines = events.map(chatLine).filter(Boolean) as Chat[];
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [lines.length]);
  const tone: Record<Chat["tone"], string> = {
    plain: "",
    ask: "border-l-ink",
    answer: "border-l-moss",
    conflict: "border-l-rust",
    decision: "border-l-ink bg-land",
  };
  return (
    <ul ref={box} className="h-full overflow-y-auto pr-1 text-[11.5px] leading-snug" aria-live="polite" aria-label="Agent chatter">
      {lines.length === 0 && <li className="text-dim">The agents talk here once a run starts.</li>}
      {lines.map((l) => (
        <li key={l.id}>
          <button
            onClick={() => onPick(l.id)}
            className={`lane-card w-full border-l-2 border-transparent py-[3px] pl-2 text-left hover:bg-land ${tone[l.tone]} ${active === l.id ? "bg-land" : ""}`}
          >
            <b className="font-semibold">{l.who}</b> {l.line}
          </button>
        </li>
      ))}
    </ul>
  );
}
