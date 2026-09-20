"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { Interval } from "@/contract";
import type { Sensitivity, Surface } from "@/lib/explain";
import { usd } from "@/lib/explain";
import { WhatIf } from "./WhatIf";
import type { Pin } from "./DecisionSpace";

// WebGL needs a browser, so the 3D view never renders on the server.
const DecisionSpace = dynamic(() => import("./DecisionSpace"), {
  ssr: false,
  loading: () => <div className="min-h-0 flex-1 animate-pulse rounded-sm border border-rule bg-land motion-reduce:animate-none" />,
});

/**
 * One decision, two ways to read it. The waterfall is how the score was built; the decision space is
 * everywhere the score could have landed. The same what-if slider drives both, so dragging it moves
 * the bar on one and walks the case across the accept boundary on the other.
 */
export function Views({
  caseId,
  surface,
  sensitivity,
  before,
  whatIf,
  waterfall,
}: {
  caseId: string;
  surface: Surface | null;
  sensitivity: Sensitivity | null;
  before: { score: Interval | null; decision: string };
  whatIf: { fact: string; label: string; start: number } | null;
  waterfall: React.ReactNode;
}) {
  const [tab, setTab] = useState<"2d" | "3d">("2d");
  const [pin, setPin] = useState<Pin>(null);

  const flip = sensitivity?.facts.find((f) => f.fact === whatIf?.fact)?.flip ?? null;
  const tabs = [
    { id: "2d" as const, label: "Waterfall" },
    { id: "3d" as const, label: "Decision space" },
  ];

  return (
    <>
      <div className="mt-1.5 flex items-center gap-4 border-b border-rule">
        <div role="tablist" aria-label="How to read this decision" className="flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              disabled={t.id === "3d" && !surface}
              className={`-mb-px border-b-2 px-3 py-1.5 text-[12.5px] transition-colors duration-150 disabled:cursor-not-allowed disabled:text-rule ${
                tab === t.id ? "border-ink font-medium text-ink" : "border-transparent text-dim hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="min-w-0 flex-1 truncate text-[11.5px] text-dim">
          {tab === "2d"
            ? "Each bar is one guideline factor, a hazard layer or a cap."
            : surface
              ? `${surface.axes[0].label} across, ${surface.axes[1].label} into the page, score as height. Drag to orbit.`
              : "No decision space for this case."}
        </p>
      </div>

      <div data-brief="score" id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex min-h-0 flex-1 flex-col pt-2">
        {tab === "2d" ? waterfall : surface ? <DecisionSpace s={surface} pin={pin} /> : null}
      </div>

      {whatIf && (
        <>
          <WhatIf caseId={caseId} fact={whatIf.fact} label={whatIf.label} start={whatIf.start} sensitivity={sensitivity} before={before} onState={setPin} />
          {tab === "3d" && flip && (
            <p className="mt-1 text-[11.5px] text-dim">
              The boundary on the floor is {flip.display}: below it the case declines, at or above it the desk {flip.to === "accept" ? "can write it" : `moves to ${flip.to}`}.
              {pin && <span className="ml-1 text-ink">Now at {usd(pin.value)}.</span>}
            </p>
          )}
        </>
      )}
    </>
  );
}
