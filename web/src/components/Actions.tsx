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
    "rounded-sm border px-2.5 text-[10px] uppercase leading-[21px] tracking-[0.08em] transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:border-rule disabled:bg-transparent disabled:text-faint";
  return (
    <div className="flex shrink-0 items-center gap-2">
      <div className="flex gap-1.5">
        <button
          className={`${btn} border-ochre bg-ochre text-paper hover:bg-ochre/85`}
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
        <button className={`${btn} border-edge text-dim hover:border-ochre hover:text-ochre`} disabled={status.dig === "sending…"} onClick={() => run("dig", () => api.digest(5))}>
          Send digest
        </button>
      </div>
      <span role="status" className="max-w-[190px] truncate font-mono text-[9px] text-dim">
        {status.req ? `broker: ${status.req}` : proposed === "proposed" ? "desk proposed a broker request" : proposed ? `broker request ${proposed}` : ""}
        {status.dig ? ` · digest: ${status.dig}` : ""}
      </span>
    </div>
  );
}
