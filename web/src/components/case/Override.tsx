"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CaseOverride } from "@/contract";
import { api } from "@/lib/api";

// Fixed width: the explanation beside it is flex-1, so an unbounded block here would squeeze that
// paragraph down to one word a line. A long reason truncates and keeps its full text in the title.
const BOX = "w-[392px] shrink-0 border-l border-rule pl-4 text-[11.5px]";
const BTN = "rounded-sm border border-rule px-1.5 leading-tight transition-colors duration-150 hover:border-ink disabled:text-dim";

/**
 * The underwriter's bounded nudge of the engine's interval (docs/OVERRIDE.md). Dietvorst et al.
 * (2018): people use an imperfect model far more when they can move its output, even by a couple of
 * points. Plus and minus inside the bound, a reason that is required, and an undo. The engine's own
 * interval and decision sit to its left and stay exactly as the engine computed them.
 */
export function Override({ caseId, current, bound = 5 }: { caseId: string; current?: CaseOverride; bound?: number }) {
  const router = useRouter();
  const [points, setPoints] = useState(0);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<{ ok: boolean; detail: string }>) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    setNote(r.ok ? "" : r.detail);
    if (r.ok) {
      setPoints(0);
      setReason("");
      router.refresh();
    }
  };

  if (current) {
    const when = new Date(current.at * 1000).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" });
    const moved = current.decision.kind !== current.engineDecision.kind;
    return (
      <div className={BOX}>
        <p className="flex items-baseline gap-2">
          <span className="kicker shrink-0 text-ink">Underwriter adjusted</span>
          <span className="num shrink-0 font-medium">
            {current.points > 0 ? "+" : "−"}
            {Math.abs(current.points)}
          </span>
          <span className="num shrink-0 text-dim">
            {current.engineScore.lo}-{current.engineScore.hi} → {current.score.lo}-{current.score.hi}
            {moved ? `, ${current.engineDecision.kind} → ${current.decision.kind}` : ""}
          </span>
          <button onClick={() => run(() => api.clearOverride(caseId))} disabled={busy} className={`${BTN} ml-auto shrink-0`}>
            Undo
          </button>
        </p>
        <p className="mt-0.5 truncate text-dim" title={current.reason}>
          {current.reason}, at {when}
        </p>
      </div>
    );
  }

  const step = (d: number) => setPoints((p) => Math.max(-bound, Math.min(bound, p + d)));

  return (
    <form
      className={BOX}
      onSubmit={(e) => {
        e.preventDefault();
        void run(() => api.override(caseId, points, reason));
      }}
    >
      <div className="flex items-baseline gap-2">
        <span className="kicker shrink-0" id="ov-h">
          Adjust
        </span>
        <button type="button" className={BTN} onClick={() => step(-1)} disabled={points <= -bound} aria-label="one point down">
          −
        </button>
        <span className="num w-[26px] shrink-0 text-center font-medium" aria-live="polite" aria-label={`adjustment ${points} points`}>
          {points > 0 ? `+${points}` : points}
        </span>
        <button type="button" className={BTN} onClick={() => step(1)} disabled={points >= bound} aria-label="one point up">
          +
        </button>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={`why, in your words (±${bound} max)`}
          aria-labelledby="ov-h"
          className="min-w-0 flex-1 rounded-sm border border-rule bg-paper px-1.5 py-0.5 placeholder:text-dim focus:border-ink focus:outline-none"
        />
        <button type="submit" className={`${BTN} shrink-0`} disabled={busy || points === 0 || !reason.trim()}>
          Apply
        </button>
      </div>
      <p role="status" className="mt-0.5 truncate text-[11px] text-rust" title={note}>
        {note}
      </p>
    </form>
  );
}
