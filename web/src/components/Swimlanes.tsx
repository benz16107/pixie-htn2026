"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Actor, DeskEvent, Interval } from "@/contract";
import { IntervalBar } from "./bits";

const LANES: Actor[] = ["lead", "intake", "appetite", "hazard", "portfolio", "system", "human"];
const LANE_H = 38;
const LABEL_W = 96;
const CARD_W = 150;
const CARD_H = 34;
const KNOWN = new Set(["plan", "tool_call", "finding", "ask", "answer", "assessment", "decision"]);
const GEO = new Set<Actor>(["hazard", "portfolio"]);

type Placed = { e: DeskEvent; x: number; y: number };

const text = (e: DeskEvent) => (typeof e.body.text === "string" ? e.body.text : e.kind.replaceAll("_", " "));

function place(events: DeskEvent[], width: number): Placed[] {
  const maxT = Math.max(1, ...events.map((e) => e.tMs));
  const span = width - LABEL_W - CARD_W - 60;
  const right: Record<string, number> = {};
  return events.map((e) => {
    const lane = Math.max(0, LANES.indexOf(e.actor));
    const wide = e.kind === "decision" ? 60 : 0;
    // Time sets x; a card never overlaps the previous card in its lane.
    const x = Math.max(LABEL_W + (e.tMs / maxT) * span, (right[lane] ?? 0) + 6);
    right[lane] = x + CARD_W + wide;
    return { e, x, y: lane * LANE_H + (LANE_H - CARD_H) / 2 };
  });
}

function Card({ p }: { p: Placed }) {
  const { e } = p;
  const known = KNOWN.has(e.kind);
  const final = e.kind === "decision";
  const tool = e.kind === "tool_call" && typeof e.body.tool === "string" ? e.body.tool : null;
  const chip = final && typeof e.body.action === "string" ? e.body.action : null;
  const tone = !known
    ? "border-dashed border-dim bg-paper"
    : final
      ? "border-[1.5px] border-ink bg-paper"
      : GEO.has(e.actor)
        ? "border-ochre bg-ochre-soft"
        : "border-rule bg-land";
  return (
    <li
      className={`lane-card absolute rounded-sm has-[details[open]]:z-30 border px-[7px] py-[3px] text-[11px] leading-[1.25] ${tone}`}
      style={{ left: p.x, top: p.y, width: CARD_W + (final ? 60 : 0), minHeight: CARD_H }}
    >
      <span className="float-right ml-1 font-mono text-[10px] text-dim">{String(Math.round(e.tMs / 1000)).padStart(2, "0")}</span>
      {!known && <span className="mr-1 font-mono text-[9.5px] text-dim">{e.kind}</span>}
      <span className={tool || chip || !known ? "line-clamp-1" : "line-clamp-2"} title={text(e)}>{text(e)}</span>
      {chip && <span className="mt-px inline-block rounded-sm bg-moss px-[5px] font-mono text-[9.5px] font-medium text-paper">{chip}</span>}
      {tool && (
        <details className="group">
          <summary className="mt-px inline-block cursor-pointer list-none rounded-sm bg-moss px-[5px] font-mono text-[9.5px] font-medium text-paper [&::-webkit-details-marker]:hidden">
            {tool} <span aria-hidden className="inline-block transition-transform duration-150 group-open:rotate-90">›</span>
          </summary>
          <pre className="absolute left-0 top-full z-20 mt-1 max-h-64 w-[300px] overflow-auto rounded-sm border border-ink bg-paper p-2 font-mono text-[10.5px] leading-snug shadow-[0_6px_16px_-6px_rgba(47,42,34,0.35)]">
            {JSON.stringify({ args: e.body.args, result: e.body.result }, null, 2)}
          </pre>
        </details>
      )}
    </li>
  );
}

function Arrows({ placed, height, width }: { placed: Placed[]; height: number; width: number }) {
  const byId = new Map(placed.map((p) => [p.e.id, p]));
  const edges: { from: Placed; to: Placed; dashed: boolean }[] = [];
  for (const p of placed) {
    const parent = p.e.inReplyTo && byId.get(p.e.inReplyTo);
    if (parent) edges.push({ from: parent, to: p, dashed: false });
    for (const r of p.e.refs) {
      const src = byId.get(r);
      if (src && r !== p.e.inReplyTo) edges.push({ from: src, to: p, dashed: true });
    }
  }
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 overflow-visible" width={width} height={height}>
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8z" fill="#2F2A22" />
        </marker>
      </defs>
      {edges.map(({ from, to, dashed }) => {
        const x1 = from.x + CARD_W + (from.e.kind === "decision" ? 60 : 0);
        const y1 = from.y + CARD_H / 2;
        const y2 = to.y + CARD_H / 2;
        const bend = Math.max(x1 + 6, Math.min(to.x - 8, x1 + 12));
        return (
          <path
            key={`${from.e.id}-${to.e.id}`}
            d={`M${x1},${y1} H${bend} V${y2} H${to.x - 2}`}
            fill="none"
            stroke="#2F2A22"
            strokeWidth={1.25}
            strokeDasharray={dashed ? "4 3" : undefined}
            markerEnd="url(#arr)"
          />
        );
      })}
    </svg>
  );
}

export function Swimlanes({ events, initialScore }: { events: DeskEvent[]; initialScore: Interval }) {
  const sorted = useMemo(() => [...events].sort((a, b) => a.seq - b.seq), [events]);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1360);
  const [clock, setClock] = useState<number | null>(null); // null = show the whole run
  const [speed, setSpeed] = useState(1);

  useLayoutEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  const end = sorted.at(-1)?.tMs ?? 0;
  useEffect(() => {
    if (clock === null) return;
    const id = setTimeout(() => setClock((c) => (c === null || c > end ? null : c + 250 * speed)), 250);
    return () => clearTimeout(id);
  }, [clock, speed, end]);

  const visible = clock === null ? sorted : sorted.filter((e) => e.tMs <= clock);
  const placed = useMemo(() => place(sorted, width), [sorted, width]).filter((p) => visible.includes(p.e));
  const assessed = visible.filter((e) => e.kind === "assessment" && e.body.score).at(-1);
  const score = (assessed?.body.score as Interval | undefined) ?? initialScore;
  const height = LANES.length * LANE_H;
  const play = (s: number) => {
    setSpeed(s);
    setClock(0);
  };
  const btn = "rounded-sm border border-ink px-2 py-px font-mono text-[11px] transition-colors duration-150 hover:bg-ink hover:text-paper";

  return (
    <section aria-labelledby="lanes-h" className="px-10 pb-4 pt-2.5">
      <div className="mb-2 flex items-center gap-6">
        <h2 id="lanes-h" className="kicker">Agent lanes</h2>
        <div className="flex items-center gap-2" role="group" aria-label="Replay">
          <button className={btn} onClick={() => play(1)}>Replay 1×</button>
          <button className={btn} onClick={() => play(4)}>4×</button>
          {clock !== null && <button className={btn} onClick={() => setClock(null)}>Skip to end</button>}
        </div>
        <div className="ml-auto flex w-[380px] items-center gap-3">
          <span className="kicker whitespace-nowrap">Interval</span>
          <div className="flex-1"><IntervalBar score={score} compact /></div>
          <span className="num w-[44px] text-[11.5px]" aria-live="polite">{score.lo}–{score.hi}</span>
        </div>
        <span className="kicker font-mono">
          t+ <span className="num">{clock === null ? Math.round(end / 1000) : Math.round(Math.min(clock, end) / 1000)}</span> s
        </span>
      </div>
      <div ref={box} className="relative" style={{ height }}>
        {LANES.map((l, i) => (
          <div key={l} className="absolute inset-x-0 border-b border-dashed border-rule" style={{ top: i * LANE_H, height: LANE_H }}>
            <span className="absolute left-0 top-[11px] text-[11px] font-semibold uppercase tracking-[0.08em]">{l}</span>
            {l === "human" && !visible.some((e) => e.actor === "human") && (
              <span className="absolute top-[11px] text-[11px] text-dim" style={{ left: LABEL_W }}>
                Waiting on the underwriter. Replies to the digest land here.
              </span>
            )}
          </div>
        ))}
        <Arrows placed={placed} height={height} width={width} />
        <ol aria-label="Desk events in time order">
          {placed.map((p) => <Card key={p.e.id} p={p} />)}
        </ol>
      </div>
    </section>
  );
}
