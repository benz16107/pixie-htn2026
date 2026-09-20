"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { Interval } from "@/contract";
import type { Sensitivity, Surface } from "@/lib/explain";
import { usd } from "@/lib/explain";
import { useKeys } from "../desk/keys";
import { WhatIf } from "./WhatIf";
import type { Pin } from "./DecisionSpace";

// WebGL needs a browser, so the 3D view never renders on the server.
const DecisionSpace = dynamic(() => import("./DecisionSpace"), {
  ssr: false,
  loading: () => <div className="min-h-0 flex-1 animate-pulse border border-rule bg-land motion-reduce:animate-none" />,
});

const TABS = [
  { id: "2d" as const, label: "how the score was built" },
  { id: "3d" as const, label: "every possible score" },
];

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

  useKeys(
    (e) => {
      if (e.key === "w") return setTab("2d"), true;
      if (e.key === "s" && surface) return setTab("3d"), true;
      return false;
    },
    [surface],
  );

  const flip = sensitivity?.facts.find((f) => f.fact === whatIf?.fact)?.flip ?? null;

  return (
    <>
      <div className="mt-2 flex items-center gap-3 border-b border-rule">
        <div role="tablist" aria-label="How to read this decision" className="flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              disabled={t.id === "3d" && !surface}
              className={`-mb-px flex items-center border-b-2 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors duration-150 disabled:cursor-not-allowed disabled:text-rule ${
                tab === t.id ? "border-ochre text-ochre" : "border-transparent text-dim hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="min-w-0 flex-1 truncate text-[10px] text-faint">
          {tab === "2d"
            ? "Each bar is one guideline rule, a hazard lookup, or a cap: break a hard rule and the score cannot climb past it."
            : surface
              ? `${surface.axes[0].label} across, ${surface.axes[1].label} into the page, score as height. ${surface.points.toLocaleString()} real re-runs in ${surface.ms}ms.`
              : "No decision space for this case."}
        </p>
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex min-h-0 flex-1 flex-col pt-2">
        {tab === "2d" ? waterfall : surface ? <DecisionSpace s={surface} pin={pin} /> : null}
      </div>

      {whatIf && (
        <>
          <WhatIf caseId={caseId} fact={whatIf.fact} label={whatIf.label} start={whatIf.start} sensitivity={sensitivity} before={before} onState={setPin} />
          {tab === "3d" && flip && (
            <p className="mt-1 text-[10px] text-dim">
              The boundary on the floor is {flip.display}: below it the case declines, at or above it the desk{" "}
              {flip.to === "accept" ? "can write it" : `moves to ${flip.to}`}.
              {pin && <span className="ml-1 text-ochre">Now at {usd(pin.value)}.</span>}
            </p>
          )}
        </>
      )}
    </>
  );
}
