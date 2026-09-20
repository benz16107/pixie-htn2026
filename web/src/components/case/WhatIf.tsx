"use client";
import { useEffect, useRef, useState } from "react";
import type { Interval } from "@/contract";
import { usd, whatIf, type Flip, type Sensitivity, type WhatIf as WhatIfResult } from "@/lib/explain";

const MAX = 200_000;
const VERDICT: Record<string, string> = {
  accept: "Accept. The premium lands inside the guideline band.",
  decline: "Decline. The premium is outside the band the guideline allows.",
  refer: "Refer. It needs a human before it can be written.",
  open: "Open. The premium is still the only fact that can settle it.",
  routed: "Routed. No guideline scores this line.",
};

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
  const emit = useRef(onState);
  emit.current = onState;

  // The API answers in well under a millisecond, so ask on every drag frame and keep the last answer.
  useEffect(() => {
    if (value === start) {
      const id = setTimeout(() => setRes(null), 0);
      return () => clearTimeout(id);
    }
    const mine = ++seq.current;
    whatIf(caseId, { [fact]: value }).then((r) => {
      if (mine !== seq.current) return;
      setRes(r);
    });
  }, [value, caseId, fact, start]);

  const flips = (sensitivity?.facts.find((f) => f.fact === fact)?.flip ? [sensitivity!.facts.find((f) => f.fact === fact)!.flip!] : []) as Flip[];
  const after = res?.after;
  const score = after?.score ?? before.score;
  const kind = after?.decision.kind ?? before.decision;

  // Primitive deps on purpose: `before` is rebuilt by the parent on every render, so depending on
  // the object itself would emit, re-render, and emit again.
  useEffect(() => {
    emit.current?.({ fact, value, score, kind });
  }, [fact, value, score?.lo, score?.hi, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section data-brief="flip" aria-labelledby="whatif-h" className="border-t border-rule pt-3">
      <div className="flex items-end gap-5">
        <div className="w-[196px] shrink-0">
          <h2 id="whatif-h" className="kicker">
            What if the {label.toLowerCase()} were
          </h2>
          <p className="num text-[22px] font-medium leading-tight">{usd(value)}</p>
          <p className="text-[11.5px] text-dim">
            Drag it. {flips.length ? flips[0].text : "The desk re-scores the whole case on every step."}
          </p>
        </div>

        <div className="relative h-[42px] flex-1">
          <div className="absolute inset-x-0 top-4 h-1.5 rounded-sm border border-rule bg-land" />
          {flips.map((f) => (
            <div key={f.at} className="absolute top-1.5 h-[26px] border-l-[1.5px] border-dashed border-rust" style={{ left: `${(f.at / MAX) * 100}%` }}>
              <span className="num absolute left-1 top-0 whitespace-nowrap text-[10px] text-rust">
                {f.display}, {f.from} becomes {f.to}
              </span>
            </div>
          ))}
          <input
            type="range"
            min={0}
            max={MAX}
            step={1000}
            value={value}
            onChange={(e) => setValue(+e.target.value)}
            aria-label={`${label} what-if`}
            className="absolute inset-x-0 top-2 h-6 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:h-[22px] [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-[3px] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-paper [&::-webkit-slider-thumb]:bg-ink"
          />
        </div>

        <div className="w-[236px] shrink-0 text-right">
          <p className="kicker">{res ? "If that were true" : "As it stands"}</p>
          <p className="num text-[25px] font-medium leading-none">
            {score ? (score.lo === score.hi ? score.lo : `${score.lo}-${score.hi}`) : "—"}
          </p>
          <p className="text-[11.5px] text-dim" aria-live="polite">
            {VERDICT[kind] ?? kind}
          </p>
        </div>
      </div>
      {res?.decisiveOverride && (
        <p className="mt-1.5 text-[11.5px]">
          <span className="mr-1.5 font-mono text-[10px] text-ochre">DECISIVE</span>
          {res.decisiveOverride} alone changes the decision, so it is worth asking for.
        </p>
      )}
      {value !== start && (
        <button onClick={() => setValue(start)} className="mt-1.5 rounded-sm border border-rule px-2 py-0.5 text-[11px] transition-colors duration-150 hover:border-ink">
          Back to what we know
        </button>
      )}
    </section>
  );
}
