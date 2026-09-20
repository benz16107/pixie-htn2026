"use client";
import { useEffect, useRef, useState } from "react";
import type { CaseView, DeskEvent, Interval } from "@/contract";
import { DecisionChip, IntervalBar, money } from "../bits";
import { chatLine, type CaseState, type Chat, type Row } from "@/lib/live";
import { prettyBands } from "@/lib/format";
import { C_ROW_H } from "./layout";

const str = (v: unknown) => (typeof v === "string" ? v : "");

/* ---------------------------------- queue rail --------------------------------- */

type Ranked = { r: Row; c?: CaseState; score: Interval | null; scored: boolean; group: number; mid: number };

function RailRows({ list, top, selected, flash, onPick }: { list: Ranked[]; top: number; selected: string | null; flash: string | null; onPick: (id: string) => void }) {
  return (
    <>
      {list.map(({ r, c, score, scored }, i) => {
        const on = selected === r.caseId;
        const status = c?.status ?? "waiting";
        return (
          <button
            key={r.caseId}
            onClick={() => onPick(r.caseId)}
            aria-current={on ? "true" : undefined}
            className={`absolute inset-x-0 flex items-center gap-2 border-b border-faint px-2 text-left transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
              flash === r.caseId ? "bg-faint" : on ? "bg-faint" : "hover:bg-faint/60"
            }`}
            style={{ transform: `translateY(${(top + i) * C_ROW_H}px)`, height: C_ROW_H - 1 }}
          >
            <span className="min-w-0 flex-1 overflow-hidden">
              <span className={`block truncate text-[12.5px] leading-tight ${status === "working" ? "italic" : ""}`}>{r.insured}</span>
              <span className="num block truncate text-[10.5px] text-dim">
                {r.caseId}, {r.state}, {money(r.valueAtStake)}
              </span>
            </span>
            {status === "settled" || ("by" in r.decision && r.decision.by === "human") ? (
              <span className="shrink-0">
                <DecisionChip decision={r.decision} />
              </span>
            ) : status === "working" ? (
              <span className="num shrink-0 text-[11px]">{scored ? `${score!.lo}–${score!.hi}` : "…"}</span>
            ) : (
              <span className="num shrink-0 text-[11px] text-dim">{scored ? "queued" : ""}</span>
            )}
          </button>
        );
      })}
    </>
  );
}

export function QueueRail({ rows, cases, selected, flash, onPick }: { rows: Row[]; cases: Record<string, CaseState>; selected: string | null; flash: string | null; onPick: (id: string) => void }) {
  // Commercial cases first, by the interval that has settled; consumer referrals last.
  const GROUP: Record<string, number> = { open: 0, refer: 1, accept: 1, approve: 1, decline: 2, routed: 3 };
  const rank = (r: Row) => {
    const c = cases[r.caseId];
    const score = c?.score ?? r.score ?? null;
    const scored = !!score && (score.lo !== 0 || score.hi !== 0);
    return { r, c, score, scored, group: GROUP[r.decision.kind] ?? 3, mid: scored ? (score!.lo + score!.hi) / 2 : -1 };
  };
  const sorted = (list: Row[]): Ranked[] => list.map(rank).sort((a, b) => a.group - b.group || b.mid - a.mid || b.r.valueAtStake - a.r.valueAtStake);
  const desk = sorted(rows.filter((r) => r.region !== "toronto"));
  const consumer = sorted(rows.filter((r) => r.region === "toronto"));

  return (
    <div className="relative" style={{ height: (desk.length + consumer.length + 2) * C_ROW_H }}>
      <p className="folio absolute inset-x-0 px-2" style={{ top: 6 }}>
        Open queue
      </p>
      <RailRows list={desk} top={0.6} selected={selected} flash={flash} onPick={onPick} />
      {consumer.length > 0 && (
        <>
          <p className="folio absolute inset-x-0 px-2" style={{ top: (desk.length + 0.75) * C_ROW_H }}>
            Consumer referrals
          </p>
          <RailRows list={consumer} top={desk.length + 1.3} selected={selected} flash={flash} onPick={onPick} />
        </>
      )}
    </div>
  );
}

/** Sweep view: one row per case, its events as a filling strip. Lanes are for one case at a time. */
export function SweepBoard({ cases, onPick }: { cases: Record<string, CaseState>; onPick: (id: string) => void }) {
  const list = Object.values(cases).sort((a, b) => b.events.length - a.events.length || a.row.caseId.localeCompare(b.row.caseId));
  // Every actor prints in ink; the shade says how far from the lead it sits, and a conflict is the one red mark.
  const ACTOR: Record<string, string> = {
    lead: "bg-ink",
    intake: "bg-ink/70",
    appetite: "bg-ink/55",
    hazard: "bg-ink/40",
    portfolio: "bg-ink/40",
    challenger: "bg-ink/85",
    system: "bg-rule",
    human: "bg-ink",
  };
  return (
    <div className="flex min-h-0 flex-col px-5 pb-1 pt-2">
      <p className="folio mb-1.5">Sweep, {list.length} cases at once. Keys 1 to 6 jump beats, space runs the sweep.</p>
      <div className="min-h-0 flex-1 overflow-y-auto">
      <table className="book text-[12px]">
        <tbody>
          {list.map((c) => {
            const last = c.events.filter((e) => e.kind !== "run_stats").at(-1);
            return (
              <tr key={c.row.caseId} onClick={() => onPick(c.row.caseId)} className="cursor-pointer hover:bg-faint/60">
                <td className="num w-[70px] !py-1 text-dim">
                  {c.row.caseId} {c.row.state}
                </td>
                <td className="w-[150px] max-w-[150px] truncate !py-1">{c.row.insured}</td>
                <td className="w-[170px] !py-1">
                  <span className="flex h-3 items-center gap-[2px]">
                    {c.events.slice(-30).map((e) => (
                      <span key={e.id} className={`lane-card h-2.5 w-1 ${e.kind === "conflict" ? "bg-red" : (ACTOR[e.actor] ?? "bg-rule")}`} />
                    ))}
                  </span>
                </td>
                <td className="num w-[56px] !py-1">{c.score ? `${c.score.lo}–${c.score.hi}` : ""}</td>
                <td className="num w-[60px] !py-1 text-dim">{c.costUsd ? `$${c.costUsd.toFixed(3)}` : c.codeOnly ? "code" : ""}</td>
                <td className="max-w-0 truncate !py-1 text-dim">
                  {c.status === "settled" ? ("because" in c.row.decision ? c.row.decision.because[0].replace(/:/g, " ").replaceAll("_", " ") : c.row.decision.kind) : ((last?.body.text as string) ?? "queued")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

/* ---------------------------------- case panel --------------------------------- */

const FACT_STATE = { missing: "text-red", estimated: "italic text-dim", known: "" } as const;

export function CasePanel({ c, state, typed, onStart }: { c: CaseView | null; state?: CaseState; typed: boolean; onStart: () => void }) {
  const events = state?.events ?? [];
  const score = state?.score ?? c?.score ?? null;
  const decided = events.find((e) => e.kind === "decision");
  const conflicts = events.filter((e) => e.kind === "conflict");
  const resolutions = events.filter((e) => e.kind === "resolution");
  const seen = new Set(events.filter((e) => e.kind === "finding" || e.kind === "estimate").map((e) => str(e.body.fact)));
  const explanation = decided ? prettyBands(str(decided.body.text)) : "";

  if (!c)
    return (
      <div className="px-5 py-4 text-[13px]">
        <p className="measure text-dim">Pick a case from the queue on the left, or a pin on the map. The case and its decision appear here.</p>
        <button onClick={onStart} className="btn btn-primary mt-4">
          Run the demo
        </button>
      </div>
    );
  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 py-4">
      <div>
        <p className="folio">Case {c.caseId}</p>
        <h2 className="display display-sm mt-1">{c.title}</h2>
      </div>
      {score && (score.lo !== 0 || score.hi !== 0) ? (
        <div>
          <p className="flex items-baseline justify-between">
            <span className="display-num text-[24px] leading-none">
              {score.lo}–{score.hi}
            </span>
            <span className="text-[11px] text-dim">refer band 45 to 70</span>
          </p>
          <div className="mt-2">
            <IntervalBar score={score} compact />
          </div>
        </div>
      ) : (
        <p className="text-[12.5px] text-dim">
          No interval: <span className="text-ink">{c.decision.kind === "routed" ? c.decision.because : "not scored by this guideline"}</span>
        </p>
      )}
      <div>
        <p className="folio mb-1.5">Facts</p>
        <table className="book text-[12px]">
          <tbody>
            {c.facts.map((f) => {
              const live = seen.has(f.id) || state?.status === "settled";
              const pv = state && !live && f.provenance !== "known" ? "missing" : f.provenance;
              return (
                <tr key={f.id}>
                  <td className="w-[96px] !py-[3px] text-[11.5px] leading-[1.3] text-dim">{f.label}</td>
                  <td className={`num max-w-0 truncate !py-[3px] transition-colors duration-300 ${FACT_STATE[pv]}`} title={f.source}>
                    {state && !live && f.provenance !== "known" ? "waiting" : f.display}
                  </td>
                  <td className={`sc w-[54px] !py-[3px] text-right ${pv === "missing" ? "text-red" : pv === "estimated" ? "text-dim" : ""}`}>{pv === "estimated" ? "est." : pv}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {explanation && (
        <div>
          <p className="folio mb-1.5">
            The lead&apos;s decision {c.explanationVerified && <span className="normal-case tracking-normal">✓ verified</span>}
          </p>
          <Typed key={explanation} text={explanation} on={typed} />
        </div>
      )}
      {conflicts.length > 0 && (
        <div>
          <p className="folio mb-1.5">Conflicts</p>
          {conflicts.map((e) => {
            const fix = resolutions.find((r) => r.body.conflict_id === e.body.conflict_id);
            return (
              <div key={e.id} className="lane-card mb-2 border-l border-red pl-2.5 text-[12px] leading-[1.4]">
                <span className="line-clamp-3" title={prettyBands(str(e.body.text))}>
                  {prettyBands(str(e.body.text))}
                </span>
                {fix && (
                  <span className="mt-0.5 line-clamp-2 text-dim" title={prettyBands(str(fix.body.text))}>
                    Resolved: {prettyBands(str(fix.body.text)).replace(/^[a-z_:]+\s*->\s*/i, "")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {!explanation && state?.status === "working" && <p className="text-[12.5px] italic text-dim">The desk is still working this case.</p>}
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
    <p className="line-clamp-8 text-[13px] leading-[1.5]" title={text}>
      {text.slice(0, n)}
      {n < text.length && <span aria-hidden>▍</span>}
    </p>
  );
}

/* ----------------------------------- chatter ----------------------------------- */

export function Chatter({ events, onPick, active, onStart }: { events: DeskEvent[]; onPick: (id: string) => void; active: string | null; onStart: () => void }) {
  const box = useRef<HTMLUListElement>(null);
  const lines = events.map(chatLine).filter(Boolean) as Chat[];
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [lines.length]);
  const tone: Record<Chat["tone"], string> = {
    plain: "border-transparent",
    ask: "border-ink",
    answer: "border-rule",
    conflict: "border-red",
    decision: "border-ink bg-faint",
  };
  return (
    <ul ref={box} className="h-full overflow-y-auto pr-1 text-[12px] leading-[1.4]" aria-live="polite" aria-label="Agent chatter">
      {lines.length === 0 && (
        <li className="text-dim">
          The agents talk here: who asked whom, what came back, what they disagreed about.
          <button onClick={onStart} className="btn mt-3 block">
            Run the demo
          </button>
        </li>
      )}
      {lines.map((l) => (
        <li key={l.id}>
          <button onClick={() => onPick(l.id)} className={`lane-card w-full border-l py-[3px] pl-2 text-left hover:bg-faint ${tone[l.tone]} ${active === l.id ? "bg-faint" : ""}`}>
            <b className="font-medium">{l.who}</b> {l.line}
          </button>
        </li>
      ))}
    </ul>
  );
}
