"use client";
import { useState } from "react";
import { api } from "@/lib/api";

// The broker request is live when the desk proposed it or an open fact names the broker as resolver.
export function Actions({ caseId, facts, proposed }: { caseId: string; facts: string[]; proposed?: string }) {
  const [status, setStatus] = useState<Record<string, string>>({});
  const run = async (key: string, fn: () => Promise<{ status: string }>) => {
    setStatus((s) => ({ ...s, [key]: "sending…" }));
    const r = await fn();
    setStatus((s) => ({ ...s, [key]: r.status }));
  };
  const canRequest = proposed === "proposed" || facts.length > 0;
  const btn =
    "rounded-sm border border-ink px-3 py-1.5 text-[12.5px] font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:border-rule disabled:bg-transparent disabled:text-dim";
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          className={`${btn} bg-ink text-paper hover:bg-ink/85`}
          disabled={!canRequest || status.req === "sending…"}
          onClick={() => run("req", () => api.requestInfo(caseId))}
          title={
            !canRequest
              ? "Nothing open for the broker to answer"
              : facts.length
                ? `Email the broker for: ${facts.join(", ")}`
                : "The desk proposed asking the broker; this sends it"
          }
        >
          Request from broker
        </button>
        <button className={`${btn} hover:bg-land`} disabled={status.dig === "sending…"} onClick={() => run("dig", () => api.digest(5))}>
          Send digest
        </button>
      </div>
      <span role="status" className="font-mono text-[11px] text-dim">
        {status.req ? `broker: ${status.req}` : proposed === "proposed" ? "desk proposed a broker request" : proposed ? `broker request ${proposed}` : ""}
        {status.dig ? ` · digest: ${status.dig}` : ""}
      </span>
    </div>
  );
}
