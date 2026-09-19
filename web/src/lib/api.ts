import type { AskResult, CaseView, DeskEvent, Hex, QueueRow, QuoteView } from "@/contract";
import askFixture from "@/fixtures/ask.json";
import backtestFixture from "@/fixtures/backtest.json";
import type { Pin } from "@/components/BookMap";
import mapBook from "@/fixtures/map-book.json";
import mapPins from "@/fixtures/map-pins.json";
import queue from "@/fixtures/queue.json";
import case126 from "@/fixtures/case-126.json";
import case138 from "@/fixtures/case-138.json";
import case143 from "@/fixtures/case-143.json";
import caseTQ from "@/fixtures/case-TQ-7f3a.json";
import events138 from "@/fixtures/events-138.json";

// contract.ts leaves BacktestView open; this is the shape the page reads (mirrors proof.BacktestReport).
export type Backtest = typeof backtestFixture;

// Tenant cases carry the quote receipt; contract.ts has it on QuoteView only, so the case view extends it here.
export type Receipt = Omit<QuoteView["receipt"], "base"> & { base: number; annual: number; label: string };
export type CaseWithReceipt = CaseView & { receipt?: Receipt };

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const FIXTURES_ONLY = process.env.NEXT_PUBLIC_FIXTURES === "1";
export const PERILS = ["all", "flood", "wildfire", "wind", "quake"] as const;
export type Peril = (typeof PERILS)[number];
const OPEN = new Set(["cleared", "received", "quoted"]);

const cases: Record<string, unknown> = { "126": case126, "138": case138, "143": case143, "TQ-7f3a": caseTQ };
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

async function postJson<T>(path: string, body: unknown): Promise<T | undefined> {
  if (FIXTURES_ONLY) return undefined;
  try {
    const res = await fetch(BASE + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    return res.ok ? ((await res.json()) as T) : undefined;
  } catch {
    return undefined;
  }
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
  case: (id: string) => get<CaseWithReceipt>(`/cases/${id}`, () => cases[id] as CaseWithReceipt | undefined),
  events: async (id: string) =>
    (await get<DeskEvent[]>(`/cases/${id}/events?replay=0`, () => events[id] as DeskEvent[] | undefined)) ?? [],
  mapBook: async (peril: Peril, res: 3 | 5 = 5) =>
    (await get<Hex[]>(`/map/book?res=${res}&peril=${peril === "all" ? "" : peril}`, () =>
      (mapBook as unknown as Record<string, Record<Peril, Hex[]>>)[res][peril],
    )) ?? [],
  // Not in contract.ts yet: case sites for the map. Backend can serve it as GET /map/pins.
  mapPins: async () => (await get<Pin[]>(`/map/pins`, () => mapPins as Pin[])) ?? [],
  askCanned: Object.keys(askFixture),
  ask: async (question: string) =>
    (await postJson<AskResult>(`/ask`, { question })) ??
    ((askFixture as unknown as Record<string, AskResult>)[question] as AskResult | undefined),
  backtest: async () => (await get<Backtest>(`/backtest`, () => backtestFixture)) as Backtest,
  requestInfo: (caseId: string) => post(`/actions/${caseId}/request-info`, {}),
  digest: (n: number) => post(`/actions/digest`, { n }),
};
