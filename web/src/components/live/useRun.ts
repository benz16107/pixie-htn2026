"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DeskEvent, QueueRow } from "@/contract";
import { PROXY, foldScore, isModelStep, type CaseState } from "@/lib/live";

export type Speed = 1 | 2 | 4;

type Options = {
  rows: QueueRow[];
  /** seq count of the recorded run per case id; 0 means the desk decided it in code alone */
  recorded: Record<string, number>;
  /** used when the API cannot be reached at all */
  offlineEvents: Record<string, DeskEvent[]>;
  apiUp: boolean;
};

const blank = (row: QueueRow, recorded: number): CaseState => ({
  row,
  status: "waiting",
  events: [],
  score: row.score,
  modelSteps: 0,
  codeOnly: recorded === 0,
});

export function useRun({ rows, recorded, offlineEvents, apiUp }: Options) {
  const [cases, setCases] = useState<Record<string, CaseState>>({});
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [speed, setSpeed] = useState<Speed>(2);
  const streams = useRef<EventSource[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const started = useRef(0);
  const loaded = useRef<Record<string, DeskEvent[]>>({});

  const stop = useCallback(() => {
    streams.current.forEach((s) => s.close());
    streams.current = [];
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(false);
  }, []);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed(Date.now() - started.current), 100);
    return () => clearInterval(id);
  }, [running]);

  const push = useCallback((id: string, e: DeskEvent) => {
    setCases((prev) => {
      const c = prev[id];
      if (!c || c.events.some((x) => x.id === e.id)) return prev;
      const events = [...c.events, e].sort((a, b) => a.seq - b.seq);
      // run_stats and the closing note both carry the running cost the desk measured.
      const note = (e.kind === "note" || e.kind === "run_stats") && typeof e.body.cost_usd === "number" ? e.body : null;
      const settled = e.kind === "note" || e.kind === "decision";
      return {
        ...prev,
        [id]: {
          ...c,
          events,
          status: settled && e.kind === "note" ? "settled" : "working",
          score: foldScore(events, c.row.score),
          modelSteps: events.filter(isModelStep).length,
          costUsd: note ? Math.max(note.cost_usd as number, c.costUsd ?? 0) : c.costUsd,
          ms: note ? ((note.ms as number) ?? (note.elapsed_s as number) * 1000) : c.ms,
        },
      };
    });
  }, []);

  const start = useCallback(
    (ids: string[], mode: "replay" | "live" = "replay", sp: Speed = speed) => {
      stop();
      started.current = Date.now();
      setElapsed(0);
      setRunning(true);
      setCases(Object.fromEntries(ids.map((id) => [id, blank(rows.find((r) => r.caseId === id)!, recorded[id] ?? 0)])));

      ids.forEach((id, i) => {
        // Cases the desk settled in code get no stream: they land in queue order, fast.
        if (!recorded[id]) {
          timers.current.push(
            setTimeout(
              () => setCases((p) => (p[id] ? { ...p, [id]: { ...p[id], status: "settled" } } : p)),
              300 + i * (260 / sp),
            ),
          );
          return;
        }
        setCases((p) => (p[id] ? { ...p, [id]: { ...p[id], status: "working" } } : p));

        if (mode === "live") {
          // Ask the desk to think for real, then poll for what it writes.
          fetch(`${PROXY}/desk/run`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ caseIds: [id], mode: "live" }),
          }).catch(() => {});
          let after = 0;
          const poll = async () => {
            try {
              const res = await fetch(`${PROXY}/cases/${id}/events?after=${after}`, { cache: "no-store" });
              for (const e of (await res.json()) as DeskEvent[]) {
                after = Math.max(after, e.seq);
                push(id, e);
              }
            } catch {}
            timers.current.push(setTimeout(poll, 900));
          };
          poll();
          return;
        }

        // Replay: take the recorded run whole, then play it on our own clock. No stream to drop,
        // it pauses and restarts cleanly, and it works with the API off.
        const schedule = (evs: DeskEvent[]) => {
          loaded.current[id] = evs;
          const t0 = evs[0]?.tMs ?? 0;
          evs.forEach((e) => timers.current.push(setTimeout(() => push(id, e), (e.tMs - t0) / sp)));
          timers.current.push(
            setTimeout(
              () => setCases((p) => (p[id] ? { ...p, [id]: { ...p[id], status: "settled" } } : p)),
              ((evs.at(-1)?.tMs ?? 0) - t0) / sp + 150,
            ),
          );
        };
        if (!apiUp) return schedule(offlineEvents[id] ?? []);
        if (loaded.current[id]) return schedule(loaded.current[id]);
        fetch(`${PROXY}/cases/${id}/events`, { cache: "no-store" })
          .then((r) => r.json() as Promise<DeskEvent[]>)
          .then((evs) => schedule(evs.length ? evs : (offlineEvents[id] ?? [])))
          .catch(() => schedule(offlineEvents[id] ?? []));
      });
    },
    [apiUp, offlineEvents, push, recorded, rows, speed, stop],
  );

  /** Jump the run to t+ms: every recorded event up to that point, at once. Keeps a demo on rails. */
  const seek = useCallback(
    (ms: number) => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setRunning(false);
      started.current = Date.now() - ms;
      setElapsed(ms);
      Object.entries(loaded.current).forEach(([id, evs]) => {
        const t0 = evs[0]?.tMs ?? 0;
        evs.filter((e) => e.tMs - t0 <= ms).forEach((e) => push(id, e));
        if (evs.length && (evs.at(-1)!.tMs - t0) <= ms) setCases((p) => (p[id] ? { ...p, [id]: { ...p[id], status: "settled" } } : p));
      });
    },
    [push],
  );

  const totals = useMemo(() => {
    const list = Object.values(cases);
    return {
      runMs: Math.max(0, ...list.map((c) => (c.events.at(-1)?.tMs ?? 0) - (c.events[0]?.tMs ?? 0))),
      steps: list.reduce((n, c) => n + c.modelSteps, 0),
      cost: list.reduce((n, c) => n + (c.costUsd ?? 0), 0),
      settled: list.filter((c) => c.status === "settled").length,
      total: list.length,
    };
  }, [cases]);

  return { cases, setCases, start, stop, seek, running, elapsed, speed, setSpeed, totals };
}
