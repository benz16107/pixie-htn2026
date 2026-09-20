"use client";
import { useState } from "react";

/** Start a Sentry Session Replay on demand.
 *
 * Replay is configured with a 0 background sample rate (the free plan allows 50 replays a month),
 * so nothing is recorded until an error fires or someone presses this. A judge who sees something
 * wrong presses it, keeps going, and the replay is waiting in Sentry with everything masked. */
export function RecordButton() {
  const [state, setState] = useState<"idle" | "recording" | "unavailable">("idle");

  async function start() {
    const Sentry = await import("@sentry/nextjs");
    const replay = Sentry.getReplay();
    if (!replay) {
      setState("unavailable");
      return;
    }
    replay.start();
    Sentry.logger?.info?.("replay started from the live desk", { source: "record-button" });
    setState("recording");
  }

  if (state === "unavailable") {
    return <span className="text-[11px] text-dim">no replay (DSN unset)</span>;
  }
  return (
    <button
      onClick={start}
      disabled={state === "recording"}
      title="Record this session to Sentry, with every field masked."
      className={`btn btn-quiet !px-2 !py-1 !text-[11.5px] ${state === "recording" ? "!border-red !text-red" : ""}`}
    >
      {state === "recording" ? "recording" : "Record this"}
    </button>
  );
}
