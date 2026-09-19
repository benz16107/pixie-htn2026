import type { CaseView, DeskEvent, Hex, QueueRow } from "@/contract";
import { LiveDesk, type LiveProps } from "@/components/live/LiveDesk";
import { api } from "@/lib/api";
import { API } from "@/lib/live";
import mapBook from "@/fixtures/map-book.json";
import mapPins from "@/fixtures/map-pins.json";
import events138 from "@/fixtures/events-138.json";
import case138 from "@/fixtures/case-138.json";
import case126 from "@/fixtures/case-126.json";
import case143 from "@/fixtures/case-143.json";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pixie live desk" };

async function json<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(API + path, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

type Backtest = {
  b1: { all: { lossRatio: number; n: number } };
  b2: { cases: { humanReason: string }[] };
  b3: { changed: number; n: number };
  b4: { factors: { factor: string; declines: number }[]; n?: number };
  preregistration: string;
};

export default async function LivePage() {
  const health = await json<{ ok: boolean }>("/health");
  const apiUp = !!health?.ok;
  const allRows = await api.queue("open");
  // The desk view runs the commercial cases; tenant quotes live in the Toronto mode.
  const rows = allRows.filter((r) => r.decision.kind !== "routed" && !r.caseId.startsWith("TQ-"));
  const recordedPairs = await Promise.all(
    rows.map(async (r) => [r.caseId, ((await json<DeskEvent[]>(`/cases/${r.caseId}/events`)) ?? []).length] as const),
  );
  const offlineEvents = { "138": events138 as unknown as DeskEvent[] };
  // With the API down, the bundled recording is the run.
  const recorded = apiUp
    ? Object.fromEntries(recordedPairs)
    : Object.fromEntries(rows.map((r) => [r.caseId, offlineEvents[r.caseId as keyof typeof offlineEvents]?.length ?? 0]));
  const detailPairs = await Promise.all(
    recordedPairs.filter(([, n]) => n > 0).map(async ([id]) => [id, await api.case(id)] as const),
  );
  const details = (
    apiUp
      ? Object.fromEntries(detailPairs.filter(([, c]) => c))
      : { "138": case138, "126": case126, "143": case143 }
  ) as unknown as Record<string, CaseView>;

  const sites: LiveProps["sites"] = {};
  for (const p of mapPins as { caseId: string; site: { lat: number; lng: number } }[]) sites[p.caseId] = p.site;
  for (const [id, c] of Object.entries(details)) if (c.site) sites[id] = c.site;

  const bt = await json<Backtest>("/backtest");
  const backtest = bt
    ? {
        over: bt.b4.factors.find((f) => /175,000/.test(f.factor))?.declines ?? 0,
        of: bt.b1.all.n,
        declines: bt.b2.cases.filter((c) => c.humanReason !== "broker_withdrew").length,
        excluded: bt.b2.cases.filter((c) => c.humanReason === "broker_withdrew").length,
        changed: bt.b3.changed,
        n3: bt.b3.n,
        prereg: bt.preregistration,
        lossRatio: bt.b1.all.lossRatio,
      }
    : null;

  return (
    <LiveDesk
      rows={rows as QueueRow[]}
      allRows={allRows as QueueRow[]}
      sites={sites}
      details={details}
      recorded={recorded}
      offlineEvents={offlineEvents}
      bookHexes={(mapBook as unknown as Record<string, Record<string, Hex[]>>)["3"].all}
      fineHexes={(mapBook as unknown as Record<string, Record<string, Hex[]>>)["5"].all}
      apiUp={apiUp}
      backtest={backtest}
    />
  );
}
