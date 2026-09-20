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

/** Drag a fact along a printed number line and watch the decision flip. Every number comes back from POST /cases/{id}/whatif. */
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
  useEffect(() => {
    emit.current = onState;
  }, [onState]);

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
    <section data-brief="flip" aria-labelledby="whatif-h" className="rule mt-8 pt-5">
      <div className="grid grid-cols-12 items-end gap-x-8">
        <div className="col-span-3">
          <h3 id="whatif-h" className="folio">
            What if the {label.toLowerCase()} were
          </h3>
          <p className="display-num mt-1 text-[30px] leading-none">{usd(value)}</p>
          <p className="mt-2 text-[12.5px] leading-[1.45] text-dim">Drag it. {flips.length ? flips[0].text : "The desk re-scores the whole case on every step."}</p>
        </div>

        <div className="relative col-span-6 h-[48px] self-center">
          <div className="absolute inset-x-0 top-[26px] h-px bg-rule" />
          {flips.map((f) => (
            <div key={f.at} className="absolute top-[14px] h-[24px] w-px bg-red" style={{ left: `${(f.at / MAX) * 100}%` }}>
              <span className="num absolute left-1.5 top-[-15px] whitespace-nowrap text-[10.5px] text-red">
                {f.display}: {f.from} becomes {f.to}
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
            className="absolute inset-x-0 top-[14px] h-6 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:h-[22px] [&::-webkit-slider-thumb]:w-[3px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-ink [&::-moz-range-thumb]:h-[22px] [&::-moz-range-thumb]:w-[3px] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-ink"
          />
          <p className="absolute inset-x-0 top-[34px] flex justify-between text-[10.5px] text-dim">
            <span>$0</span>
            <span>$200,000</span>
          </p>
        </div>

        <div className="col-span-3 text-right">
          <p className="folio">{res ? "If that were true" : "As it stands"}</p>
          <p className={`display-num mt-1 text-[30px] leading-none ${kind === "decline" ? "text-red" : ""}`}>
            {score ? (score.lo === score.hi ? score.lo : `${score.lo}–${score.hi}`) : "none"}
          </p>
          <p className="mt-2 text-[12.5px] leading-[1.45] text-dim" aria-live="polite">
            {VERDICT[kind] ?? kind}
          </p>
        </div>
      </div>
      {res?.decisiveOverride && (
        <p className="mt-3 text-[13px]">
          <span className="sc mr-2">decisive</span>
          {res.decisiveOverride} alone changes the decision, so it is worth asking for.
        </p>
      )}
      {value !== start && (
        <button onClick={() => setValue(start)} className="btn btn-quiet mt-3">
          Back to what we know
        </button>
      )}
    </section>
  );
}
