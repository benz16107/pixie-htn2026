import type { CaseView, DeskEvent, QueueRow } from "@/contract";
import queue from "@/fixtures/queue.json";
import case126 from "@/fixtures/case-126.json";
import case138 from "@/fixtures/case-138.json";
import case143 from "@/fixtures/case-143.json";
import events138 from "@/fixtures/events-138.json";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const FIXTURES_ONLY = process.env.NEXT_PUBLIC_FIXTURES === "1";
const OPEN = new Set(["cleared", "received", "quoted"]);

const cases: Record<string, unknown> = { "126": case126, "138": case138, "143": case143 };
const events: Record<string, unknown> = { "138": events138 };

// Fixtures stand in when the API is down, so the demo never shows a blank page.
async function get<T>(path: string, fixture: () => T | undefined): Promise<T | undefined> {
  if (!FIXTURES_ONLY) {
    try {
      const res = await fetch(BASE + path, { cache: "no-store", signal: AbortSignal.timeout(1500) });
      if (res.ok) return (await res.json()) as T;
    } catch {}
  }
  return fixture();
}

async function post(path: string, body: unknown): Promise<{ ok: boolean; status: string }> {
  if (FIXTURES_ONLY) return { ok: true, status: "dry run (fixtures)" };
  try {
    const res = await fetch(BASE + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok, status: res.ok ? "queued" : `API returned ${res.status}` };
  } catch {
    return { ok: false, status: "API unreachable" };
  }
}

export const api = {
  queue: async (view: "open" | "all") =>
    (await get<QueueRow[]>(`/queue?view=${view}`, () => {
      const rows = queue as unknown as QueueRow[];
      return view === "open" ? rows.filter((r) => OPEN.has(r.status)) : rows;
    })) ?? [],
  case: (id: string) => get<CaseView>(`/cases/${id}`, () => cases[id] as CaseView | undefined),
  events: async (id: string) =>
    (await get<DeskEvent[]>(`/cases/${id}/events?replay=0`, () => events[id] as DeskEvent[] | undefined)) ?? [],
  requestInfo: (caseId: string) => post(`/actions/${caseId}/request-info`, {}),
  digest: (n: number) => post(`/actions/digest`, { n }),
};
