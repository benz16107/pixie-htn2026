"use client";
import { useEffect, useRef, useState } from "react";
import type { Interval } from "@/contract";
import { usd, whatIf, type Flip, type Sensitivity, type WhatIf as WhatIfResult } from "@/lib/explain";
import { useKeys } from "../desk/keys";

const VERDICT: Record<string, string> = {
  accept: "the premium lands inside the guideline band",
  decline: "the premium is outside the band the guideline allows",
  refer: "it needs a human before it can be written",
  open: "unresolved facts still cross a decision threshold",
  routed: "no guideline scores this line",
};
const TONE: Record<string, string> = { accept: "text-moss", approve: "text-moss", decline: "text-rust", refer: "text-ochre", open: "text-ochre" };

/** Drag a fact, watch the decision flip. Every number here comes back from POST /cases/{id}/whatif. */
export function WhatIf({
  caseId,
  fact,
  label,
  start,
  sensitivity,
  before,
  onState,
}: {
  caseId: string;
  fact: string;
  label: string;
  start: number;
  sensitivity: Sensitivity | null;
  before: { score: Interval | null; decision: string };
  /** The 3D view next to this slider plots the same position. */
  onState?: (s: { fact: string; value: number; score: Interval | null; kind: string }) => void;
}) {
  const [value, setValue] = useState(start);
  const [res, setRes] = useState<WhatIfResult | null>(null);
  const seq = useRef(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const high = sensitivity?.facts.find((f) => f.fact === fact)?.high.value ?? start;
  const max = Math.max(fact === "premium" ? 200_000 : high * 1.2, start, 1000);
  const slider = useRef<HTMLInputElement>(null);
  const emit = useRef(onState);
  useEffect(() => {
    emit.current = onState;
  }, [onState]);

  // f hands the keyboard the slider; the arrow keys are then the input's own, at its own step.
  useKeys((e) => (e.key === "f" ? (e.preventDefault(), slider.current?.focus(), true) : false), []);

  // Ignore superseded responses, including requests that finish after a reset.
  useEffect(() => {
    const mine = ++seq.current;
    const timer = setTimeout(() => {
      setError("");
      if (value === start) { setRes(null); setPending(false); return; }
      setPending(true);
      whatIf(caseId, { [fact]: value }).then((r) => {
        if (mine !== seq.current) return;
        setPending(false); setRes(r);
        if (!r) setError("Could not recompute. Return to the known facts or try another value.");
      });
    }, 80);
    return () => { clearTimeout(timer); seq.current++; };
  }, [value, caseId, fact, start]);

  const flips = (sensitivity?.facts.find((f) => f.fact === fact)?.flip ? [sensitivity!.facts.find((f) => f.fact === fact)!.flip!] : []) as Flip[];
  const after = res?.after;
  const score = after?.score ?? before.score;
  const kind = after?.decision.kind ?? before.decision;

  // Primitive deps on purpose: `before` is rebuilt by the parent on every render, so depending on
  // the object itself would emit, re-render, and emit again.
  useEffect(() => {
    if (!pending && !error) emit.current?.({ fact, value, score, kind });
  }, [fact, value, score?.lo, score?.hi, kind, pending, error]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section aria-labelledby="whatif-h" className="whatif mt-2 border-t border-edge pt-2">
      <div className="flex items-end gap-5">
        <div className="w-[176px] shrink-0">
          <h2 id="whatif-h" className="kicker">
            what if the {label.toLowerCase()} were
          </h2>
          <p className="num text-[20px] font-medium leading-[24px] text-ochre">{usd(value)}</p>
          <p className="text-[10px] leading-snug text-faint">{flips.length ? flips[0].text : "the desk re-scores the whole case on every step"}</p>
        </div>

        <div className="relative h-[40px] flex-1">
          <div className="absolute inset-x-0 top-[17px] h-[5px] border border-rule bg-land" />
          {flips.map((f) => (
            <div key={f.at} className="absolute top-2 h-[24px] border-l border-dashed border-rust" style={{ left: `${(f.at / max) * 100}%` }}>
              <span className="num absolute left-1 top-0 whitespace-nowrap text-[9px] text-rust">
                {f.display} · {f.from} becomes {f.to}
              </span>
            </div>
          ))}
          <input
            ref={slider}
            type="range"
            min={0}
            max={max}
            step={1000}
            value={value}
            onChange={(e) => { setPending(true); setError(""); setValue(+e.target.value); }}
            aria-label={`${label} what-if`}
            className="absolute inset-x-0 top-[9px] h-5 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:h-[20px] [&::-webkit-slider-thumb]:w-[10px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-[1px] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-paper [&::-webkit-slider-thumb]:bg-ochre"
          />
          <span className="num absolute bottom-0 left-0 text-[9px] text-faint">$0</span>
          <span className="num absolute bottom-0 right-0 text-[9px] text-faint">${(max / 1000).toFixed(0)}K</span>
        </div>

        <div className="w-[230px] shrink-0 text-right">
          <p className="kicker">{pending ? "recomputing…" : error ? "result unavailable" : res ? "if that were true" : "as it stands"}</p>
          <p className="num text-[24px] font-medium leading-[26px]">
            {pending || error ? "…" : score ? (score.lo === score.hi ? score.lo : `${score.lo}–${score.hi}`) : "—"}
            <span className={`ml-2 text-[11px] uppercase tracking-[0.1em] ${TONE[kind] ?? "text-dim"}`}>{pending || error ? "" : kind}</span>
          </p>
          <p className="text-[10px] leading-snug text-faint" aria-live="polite">
            {error || (pending ? "Waiting for the engine" : fact === "premium" ? VERDICT[kind] ?? kind : "The engine recomputed this scenario from the changed fact.")}
          </p>
        </div>
      </div>
      <div className="mt-1 flex items-baseline gap-3">
        {!pending && !error && res?.decisiveOverride && (
          <p className="text-[10px] text-dim">
            <span className="mr-1.5 rounded-sm border border-ochre/60 px-1 text-[9px] uppercase tracking-[0.08em] text-ochre">decisive</span>
            {res.decisiveOverride} alone changes the decision, so it is worth asking for.
          </p>
        )}
        {value !== start && (
          <button
            onClick={() => { setPending(false); setError(""); setRes(null); setValue(start); }}
            className="ml-auto shrink-0 border border-edge px-2 text-[10px] uppercase leading-[17px] tracking-[0.08em] text-dim transition-colors duration-150 hover:border-ochre hover:text-ochre"
          >
            back to what we know
          </button>
        )}
      </div>
    </section>
  );
}
