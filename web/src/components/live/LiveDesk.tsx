"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CaseView, DeskEvent, Hex, QueueRow } from "@/contract";
import { Swimlanes } from "../Swimlanes";
import { CasePanel, Chatter, QueueRail } from "./Panels";
import { Phone } from "./Phone";
import { useRun, type Speed } from "./useRun";
import type { MapPin, Pulse } from "./DeskMap";
import type { Quote } from "./types";
import { PROXY, brokerEmail, isPlumbing } from "@/lib/live";
import { parseHazard, parseSkip } from "@/lib/format";
import { money } from "../bits";

const DeskMap = dynamic(() => import("./DeskMap"), { ssr: false, loading: () => <div className="absolute inset-0 bg-land" /> });

const LANES = ["lead", "intake", "appetite", "hazard", "portfolio", "system"] as const;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const BEATS = ["Queue", "Case run", "Actions", "Backtest", "Toronto", "Close"] as const;

export type LiveProps = {
  rows: QueueRow[];
  allRows: QueueRow[];
  sites: Record<string, { lat: number; lng: number }>;
  details: Record<string, CaseView>;
  recorded: Record<string, number>;
  offlineEvents: Record<string, DeskEvent[]>;
  bookHexes: Hex[];
  fineHexes: Hex[];
  apiUp: boolean;
  backtest: { over: number; of: number; declines: number; excluded: number; changed: number; n3: number; prereg: string; lossRatio: number } | null;
};

export function LiveDesk(props: LiveProps) {
  const { rows, allRows, sites, recorded, offlineEvents, bookHexes, fineHexes, apiUp, backtest } = props;
  const [details, setDetails] = useState(props.details);
  const [mode, setMode] = useState<"sweep" | "focus">("sweep");
  const [region, setRegion] = useState<"desk" | "toronto">("desk");
  const [selected, setSelected] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [beat, setBeat] = useState(0);
  const [overlay, setOverlay] = useState<"backtest" | "close" | null>(null);
  const [phoneTab, setPhoneTab] = useState<"digest" | "quote">("digest");
  const [reply, setReply] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [reduced, setReduced] = useState(false);
  const run = useRun({ rows, recorded, offlineEvents, apiUp });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const pick = useCallback(
    async (id: string) => {
      setSelected(id);
      setMode("focus");
      if (!details[id] && apiUp) {
        const res = await fetch(`${PROXY}/cases/${id}`).catch(() => null);
        if (res?.ok) {
          const view = (await res.json()) as CaseView;
          setDetails((d) => ({ ...d, [id]: view }));
        }
      }
    },
    [apiUp, details],
  );

  const startSweep = useCallback(() => {
    setMode("sweep");
    setSelected(null);
    run.start(rows.map((r) => r.caseId), "replay");
  }, [rows, run]);

  const startFocus = useCallback(
    (id: string) => {
      pick(id);
      run.start([id], "replay");
    },
    [pick, run],
  );

  const loadQuote = useCallback(async () => {
    setRegion("toronto");
    setShowEmail(false);
    setPhoneTab("quote");
    if (quote || !apiUp) return;
    const res = await fetch(`${PROXY}/quote/tenant`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address: "180 Queen St W, Toronto", answers: { contentsValue: 30000, unitLevel: "upper", claims3yr: 0, deductible: 1000 } }),
    }).catch(() => null);
    if (res?.ok) setQuote((await res.json()) as Quote);
  }, [apiUp, quote]);

  // Director keys: the demo cannot get lost.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
      const jump: Record<string, () => void> = {
        "1": () => { setOverlay(null); setRegion("desk"); setShowEmail(false); startSweep(); },
        "2": () => { setOverlay(null); setRegion("desk"); setShowEmail(false); startFocus("138"); },
        "3": () => { setOverlay(null); setShowEmail(true); setPhoneTab("digest"); },
        "4": () => setOverlay("backtest"),
        "5": () => { setOverlay(null); loadQuote(); },
        "6": () => setOverlay("close"),
      };
      if (jump[e.key]) {
        setBeat(Number(e.key) - 1);
        jump[e.key]();
      }
      if (e.key === "Escape") setOverlay(null);
      if (e.key === "]") run.seek(run.elapsed + 5000);
      if (e.key === "[") run.seek(Math.max(0, run.elapsed - 5000));
      if (e.key === "e") run.seek(600_000); // jump to the end of every recorded run
      if (e.key === " ") {
        e.preventDefault();
        if (run.running) run.stop();
        else startSweep();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loadQuote, run, startFocus, startSweep]);

  // ?at=SECONDS drives the run straight to a moment: screenshots and a demo that cannot stall.
  useEffect(() => {
    const at = Number(new URLSearchParams(window.location.search).get("at"));
    if (!Number.isFinite(at) || at <= 0) return;
    const id = setTimeout(() => run.seek(at * 1000), 900);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.cases[selected ?? ""]?.events.length === 1]);

  const focusCase = selected ? run.cases[selected] : undefined;
  const events = useMemo(
    () =>
      (mode === "focus" && selected ? (run.cases[selected]?.events ?? []) : Object.values(run.cases).flatMap((c) => c.events)).filter(
        (e) => !isPlumbing(e),
      ),
    [mode, selected, run.cases],
  );
  const chatEvents = useMemo(() => [...events].sort((a, b) => a.tMs - b.tMs || a.seq - b.seq), [events]);

  const pins: MapPin[] = rows
    .filter((r) => sites[r.caseId])
    .map((r) => ({
      caseId: r.caseId,
      insured: r.insured,
      ...sites[r.caseId],
      state: run.cases[r.caseId]?.status ?? "waiting",
      decision: r.decision.kind,
    }));

  // Hazard findings pulse at the site as they arrive, and name themselves in a chip.
  const hazardChips = (focusCase?.events ?? [])
    .filter((e) => e.actor === "hazard" && e.kind === "finding")
    .map((e) => {
      const t = str(e.body.text);
      if (e.body.skipped) {
        const sk = parseSkip(str(e.body.skipped), t);
        return { id: e.id, label: `${sk.peril} lookup skipped`, skipped: true };
      }
      const h = parseHazard(t);
      return { id: e.id, label: `${h.peril}: ${h.sentence}`, skipped: false };
    });
  const portfolio = (focusCase?.events ?? []).find((e) => e.actor === "portfolio" && e.kind === "finding");

  const SPECIALISTS = new Set(["intake", "appetite", "hazard", "portfolio"]);
  const hasSpecialist = (focusCase?.events ?? []).some((e) => SPECIALISTS.has(e.actor));
  const triageReason =
    (focusCase?.events ?? []).find((e) => e.kind === "plan" || e.kind === "decision")?.body.text?.toString() ??
    "The interval never straddled a threshold, so no lookup could change the decision.";

  const site = selected ? sites[selected] : null;
  const focusPoint =
    region === "toronto" && quote
      ? { lat: quote.center[0], lng: quote.center[1], zoom: 13 }
      : mode === "focus" && site
        ? { lat: site.lat, lng: site.lng, zoom: 8.5 }
        : { lat: 38, lng: -96, zoom: 3.2 };
  const pulses: Pulse[] =
    mode === "focus" && site && focusCase?.status === "working" && hazardChips.length ? [{ id: "site", ...site, label: "hazard lookup" }] : [];
  const near = (h: Hex) => !site || Math.abs(h.ring[0][0] - site.lat) < 1.6 && Math.abs(h.ring[0][1] - site.lng) < 1.9;
  const hexes = region === "toronto" && quote ? quote.hexes : mode === "focus" ? fineHexes.filter(near) : bookHexes;

  const email = brokerEmail(selected ? (details[selected] ?? null) : null, focusCase?.events ?? []);
  const decidedNow = Object.values(run.cases).filter((c) => c.status === "settled").length;
  const costCase = focusCase?.costUsd;

  return (
    <main className="grid h-screen grid-rows-[44px_minmax(0,1fr)_238px] overflow-hidden bg-paper">
      {/* ------------------------------ top strip ------------------------------ */}
      <header className="contours flex items-center gap-3 overflow-hidden border-b border-ink bg-land px-4 text-[11.5px]">
        <span className="shrink-0 text-[12px] font-semibold tracking-[0.16em]">PIXIE LIVE</span>
        <span className="num shrink-0">
          <b className="font-semibold">158</b> subs · <b className="font-semibold">{allRows.length}</b> open ·{" "}
          <b className="font-semibold">{rows.length}</b> desk · <b className="font-semibold">{decidedNow}</b> decided
        </span>
        <span className="num shrink-0 rounded-sm border border-rule bg-paper/70 px-2 py-0.5" aria-live="off">
          {((run.totals.steps || run.totals.total ? Math.min(run.elapsed, run.totals.runMs || run.elapsed) : 0) / 1000).toFixed(1)}s · {run.totals.steps} steps · ${run.totals.cost.toFixed(3)}
          {costCase !== undefined && <span className="text-dim"> · case ${costCase.toFixed(3)}</span>}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <div className="flex rounded-sm border border-ink" role="group" aria-label="Run mode">
            <button onClick={startSweep} aria-pressed={mode === "sweep"} className={`px-2 py-0.5 ${mode === "sweep" ? "bg-ink text-paper" : "hover:bg-paper"}`}>
              Sweep
            </button>
            <button
              onClick={() => startFocus(selected ?? "138")}
              aria-pressed={mode === "focus"}
              className={`px-2 py-0.5 ${mode === "focus" ? "bg-ink text-paper" : "hover:bg-paper"}`}
            >
              Focus
            </button>
          </div>
          <div className="flex rounded-sm border border-rule" role="group" aria-label="Speed">
            {([1, 2, 4] as Speed[]).map((s) => (
              <button
                key={s}
                onClick={() => run.setSpeed(s)}
                aria-pressed={run.speed === s}
                className={`num px-1.5 py-0.5 ${run.speed === s ? "bg-ink text-paper" : "hover:bg-paper"}`}
              >
                {s}×
              </button>
            ))}
          </div>
          <button
            onClick={() => (mode === "focus" && selected ? run.start([selected], "live") : run.start(["138"], "live"))}
            className="rounded-sm border border-ink px-2 py-0.5 hover:bg-paper"
            title="Ask the API to run the desk for real. Costs model calls."
          >
            Run live
          </button>
          <div className="flex rounded-sm border border-ink" role="group" aria-label="Region">
            <button onClick={() => setRegion("desk")} aria-pressed={region === "desk"} className={`px-2 py-0.5 ${region === "desk" ? "bg-ink text-paper" : "hover:bg-paper"}`}>
              Commercial desk
            </button>
            <button onClick={loadQuote} aria-pressed={region === "toronto"} className={`px-2 py-0.5 ${region === "toronto" ? "bg-ink text-paper" : "hover:bg-paper"}`}>
              Toronto renter
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------- middle -------------------------------- */}
      <div className="grid min-h-0 grid-cols-[214px_minmax(0,1fr)_318px_222px]">
        <aside className="min-h-0 overflow-y-auto border-r border-rule px-2 py-2" aria-label="Open queue">
          <p className="kicker mb-1.5 px-1">Open queue</p>
          <QueueRail rows={rows} cases={run.cases} selected={selected} onPick={(id) => startFocus(id)} />
        </aside>

        <section className="relative min-h-0 border-r border-rule" aria-label="Map">
          <DeskMap pins={region === "toronto" ? [] : pins} hexes={hexes} focus={focusPoint} pulses={pulses} onPick={(id) => startFocus(id)} reduced={reduced} />
          {mode === "focus" && hazardChips.length > 0 && region === "desk" && (
            <ul className="absolute bottom-3 left-3 w-[280px] space-y-1">
              {hazardChips.slice(-5).map((h) => (
                <li key={h.id} className={`lane-card rounded-sm border px-2 py-1 text-[11.5px] ${h.skipped ? "border-dashed border-dim bg-paper/90 text-dim" : "border-ochre bg-paper/95"}`}>
                  {h.label}
                </li>
              ))}
              {portfolio && <li className="lane-card rounded-sm border border-ink bg-paper/95 px-2 py-1 text-[11.5px]">{str(portfolio.body.text)}</li>}
            </ul>
          )}
          {region === "toronto" && quote && (
            <div className="absolute bottom-3 left-3 rounded-sm border border-ink bg-paper/95 px-3 py-2 text-[12px]">
              <p className="kicker">Same engine, Toronto pack</p>
              <p>
                {quote.address}: break-ins, fire protection and basement flooding priced per hex, then capped. Quote{" "}
                <b className="num">${quote.annual.toFixed(2)}</b> a year.
              </p>
            </div>
          )}
          {showEmail && (
            <div className="absolute right-3 top-3 w-[320px] rounded-sm border border-ink bg-paper p-3 text-[11.5px] shadow-[0_10px_30px_-12px_rgba(47,42,34,0.5)]">
              <p className="kicker mb-1 flex justify-between">
                <span>Broker email</span>
                <button onClick={() => setShowEmail(false)} aria-label="Close the email preview">✕</button>
              </p>
              <p className="text-dim">To: {email.to}</p>
              <p className="font-semibold">{email.subject}</p>
              {email.body.map((l) => (
                <p key={l} className="mt-1">{l}</p>
              ))}
              <p className="mt-2 text-[10.5px] text-dim">Composed from this run. Sending needs the actions endpoint, which is not in the API yet.</p>
            </div>
          )}
        </section>

        <section className="min-h-0 border-r border-rule" aria-label="Case">
          <CasePanel c={selected ? (details[selected] ?? null) : null} state={focusCase} typed={!reduced} />
        </section>

        <aside className="min-h-0 px-2.5 py-2" aria-label="Phone mirror">
          <Phone tab={phoneTab} setTab={setPhoneTab} rows={allRows} quote={quote} reply={reply} onReply={() => setReply(true)} />
        </aside>
      </div>

      {/* ------------------------- lanes and chatter --------------------------- */}
      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_300px] border-t border-ink">
        <div className="relative min-h-0">
          {focusCase && focusCase.events.length > 0 && !hasSpecialist && (
            <p className="absolute inset-x-0 top-9 z-10 px-5 text-[12.5px]">
              <b className="font-semibold">No specialist time spent: decided at triage.</b>{" "}
              <span className="text-dim">{triageReason}</span>
            </p>
          )}
          <Swimlanes
            events={events}
            initialScore={focusCase?.row.score ?? { lo: 0, hi: 100 }}
            lanes={[...LANES]}
            laneH={28}
            controls={false}
            follow
            pad="px-4 pb-0 pt-1"
            heading={`${mode === "focus" ? `Agent lanes · case ${selected ?? ""}` : "Agent lanes · whole queue"} · keys 1-6 jump beats, space runs the sweep · ${money(rows.reduce((n, r) => n + r.valueAtStake, 0))} at stake`}
          />
        </div>
        <div className="min-h-0 border-l border-rule px-3 py-2">
          <p className="kicker mb-1">Agent chatter</p>
          <div className="h-[calc(100%-22px)]">
            <Chatter events={chatEvents} onPick={setHighlight} active={highlight} />
          </div>
        </div>
      </div>

      {/* -------------------------------- beats -------------------------------- */}
      <nav className="pointer-events-none absolute bottom-[246px] left-1/2 flex -translate-x-1/2 gap-1" aria-label="Demo beats">
        {BEATS.map((b, i) => (
          <span key={b} className={`rounded-sm border px-1.5 text-[10px] ${beat === i ? "border-ink bg-ink text-paper" : "border-rule bg-paper/80 text-dim"}`}>
            {i + 1} {b}
          </span>
        ))}
      </nav>

      {overlay && (
        <div className="absolute inset-0 grid place-items-center bg-ink/35 p-10" onClick={() => setOverlay(null)}>
          <div className="w-[720px] rounded-sm border border-ink bg-paper p-6" onClick={(e) => e.stopPropagation()}>
            {overlay === "backtest" && backtest && (
              <>
                <h2 className="font-serif text-[26px] font-semibold">The guideline versus the book</h2>
                <ul className="mt-3 space-y-1.5 text-[13px]">
                  <li>
                    <b className="num">{backtest.over}</b> of <b className="num">{backtest.of}</b> bound property policies sit above the $175,000 premium
                    ceiling, so the humans wrote outside the 2025 guideline routinely.
                  </li>
                  <li>
                    <b className="num">{backtest.declines}</b> human declines carry an underwriting reason
                    {backtest.excluded > 0 && (
                      <>
                        ; <b className="num">{backtest.excluded}</b> broker withdrawals are excluded
                      </>
                    )}
                    .
                  </li>
                  <li>
                    Enrichment changed <b className="num">{backtest.changed}</b> tiers across <b className="num">{backtest.n3}</b> cases.
                  </li>
                  <li>
                    Bound property loss ratio <b className="num">{backtest.lossRatio.toFixed(2)}</b> over {backtest.of} policies.
                  </li>
                </ul>
                <p className="mt-3 font-mono text-[11px] text-dim">Pre-registered at {backtest.prereg.slice(0, 12)} before the first run.</p>
              </>
            )}
            {overlay === "close" && (
              <>
                <h2 className="font-serif text-[28px] font-semibold">Every number is code. Every decision is traceable.</h2>
                <p className="mt-3 text-[14px] leading-relaxed">
                  The desk spent <b className="num">{run.totals.steps}</b> model steps and{" "}
                  <b className="num">${run.totals.cost.toFixed(2)}</b> on {run.totals.total} submissions, and only where information could flip a
                  decision. The same engine priced a Toronto renter from the same rules and the same caps, and it runs on your schema.
                </p>
              </>
            )}
            <button className="mt-4 rounded-sm border border-ink px-3 py-1 text-[12px]" onClick={() => setOverlay(null)}>
              Back to the desk (Esc)
            </button>
          </div>
        </div>
      )}
      {!apiUp && (
        <p className="absolute bottom-2 left-3 rounded-sm border border-rule bg-paper px-2 py-0.5 font-mono text-[10.5px] text-dim">
          offline: replaying recorded runs from disk
        </p>
      )}

    </main>
  );
}
