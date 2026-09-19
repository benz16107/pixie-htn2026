"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export function Actions({ caseId, flippers }: { caseId: string; flippers: string[] }) {
  const [status, setStatus] = useState<Record<string, string>>({});
  const run = async (key: string, fn: () => Promise<{ status: string }>) => {
    setStatus((s) => ({ ...s, [key]: "sending…" }));
    const r = await fn();
    setStatus((s) => ({ ...s, [key]: r.status }));
  };
  const btn =
    "rounded-sm border border-ink px-3 py-1 text-[12px] font-medium transition-colors duration-150 hover:bg-ink hover:text-paper active:translate-y-px disabled:opacity-50";
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex gap-2">
      <button
        className={`${btn} bg-ink text-paper hover:bg-ink/85`}
        disabled={!flippers.length || status.req === "sending…"}
        onClick={() => run("req", () => api.requestInfo(caseId))}
        title={flippers.length ? `Email the broker for: ${flippers.join(", ")}` : "No open facts to request"}
      >
        Request from broker
      </button>
      <button className={btn} disabled={status.dig === "sending…"} onClick={() => run("dig", () => api.digest(5))}>
        Send digest
      </button>
      </div>
      <span role="status" className="font-mono text-[11px] text-dim">
        {[status.req && `broker: ${status.req}`, status.dig && `digest: ${status.dig}`].filter(Boolean).join(" · ")}
      </span>
    </div>
  );
}
