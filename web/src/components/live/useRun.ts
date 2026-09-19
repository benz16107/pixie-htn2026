"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DeskEvent } from "@/contract";
import { PROXY, foldScore, isModelStep, type CaseState, type Row } from "@/lib/live";

export type Speed = 1 | 2 | 4;

type Options = {
  rows: Row[];
  /** seq count of the recorded run per case id; 0 means the desk decided it in code alone */
  recorded: Record<string, number>;
  /** used when the API cannot be reached at all */
  offlineEvents: Record<string, DeskEvent[]>;
  apiUp: boolean;
};

const blank = (row: Row, recorded: number): CaseState => ({
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
  const current = useRef<{ ids: string[]; mode: "replay" | "live" } | null>(null);
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
      current.current = { ids, mode };
      setCases(Object.fromEntries(ids.map((id) => [id, blank(rows.find((r) => r.caseId === id)!, recorded[id] ?? 0)])));

      const streamed = ids.filter((id) => recorded[id]);
      ids.forEach((id, i) => {
        if (recorded[id]) {
          setCases((p) => (p[id] ? { ...p, [id]: { ...p[id], status: "working" } } : p));
          return;
        }
        // Cases the desk settled in code get no stream: they land in queue order, fast.
        timers.current.push(
          setTimeout(() => setCases((p) => (p[id] ? { ...p, [id]: { ...p[id], status: "settled" } } : p)), 300 + i * (260 / sp)),
        );
      });
      if (!streamed.length) return;

      // Keep the whole recording to hand so the scrub can jump anywhere in it.
      streamed.forEach((id) => {
        if (loaded.current[id] || !apiUp) return;
        fetch(`${PROXY}/cases/${id}/events`, { cache: "no-store" })
          .then((r) => r.json() as Promise<DeskEvent[]>)
          .then((evs) => {
            loaded.current[id] = evs;
          })
          .catch(() => {});
      });

      const settleAll = (ms: number) =>
        timers.current.push(
          setTimeout(() => setCases((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { ...v, status: "settled" as const }]))), ms),
        );

      if (mode === "live") {
        fetch(`${PROXY}/desk/run`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ caseIds: streamed, mode: "live" }),
        }).catch(() => {});
      }

      if (!apiUp) {
        // Recorded runs from disk, on a local clock.
        streamed.forEach((id) => {
          const evs = offlineEvents[id] ?? [];
          const t0 = evs[0]?.tMs ?? 0;
          loaded.current[id] = evs;
          evs.forEach((e) => timers.current.push(setTimeout(() => push(id, e), (e.tMs - t0) / sp)));
          settleAll(((evs.at(-1)?.tMs ?? 0) - t0) / sp + 200);
        });
        return;
      }

      // One stream for every case in the run: the desk paces it, live or replayed.
      const url =
        mode === "live"
          ? `${PROXY}/events/stream?cases=${streamed.join(",")}&replay=0`
          : `${PROXY}/events/stream?cases=${streamed.join(",")}&replay=1&speed=${sp}`;
      const es = new EventSource(url);
      es.addEventListener("desk", (ev) => {
        const e = JSON.parse((ev as MessageEvent).data) as DeskEvent;
        push(e.caseId, e);
        if (e.kind === "note") setCases((p) => (p[e.caseId] ? { ...p, [e.caseId]: { ...p[e.caseId], status: "settled" } } : p));
      });
      es.addEventListener("done", () => {
        es.close();
        settleAll(0);
      });
      es.onerror = () => {
        es.close();
        // The stream dropped: finish from the recording we already hold.
        streamed.forEach((id) => {
          const evs = loaded.current[id] ?? offlineEvents[id] ?? [];
          evs.forEach((e) => push(id, e));
        });
        settleAll(200);
      };
      streams.current.push(es);
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

  /** Changing speed mid-run restarts it at the new pace, rather than waiting for the next run. */
  const changeSpeed = useCallback(
    (s: Speed) => {
      setSpeed(s);
      const c = current.current;
      if (c && running) start(c.ids, c.mode, s);
    },
    [running, start],
  );

  return { cases, setCases, start, stop, seek, running, elapsed, speed, setSpeed: changeSpeed, totals };
}
