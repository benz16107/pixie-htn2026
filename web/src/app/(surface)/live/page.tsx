import type { CaseView, DeskEvent, Hex } from "@/contract";
import { LiveDesk, type LiveProps } from "@/components/live/LiveDesk";
import type { Row } from "@/lib/live";
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
  const allRows = ((await json<Row[]>("/queue?view=open")) ?? ((await api.queue("open")) as unknown as Row[])).filter((r) => r.caseId);
  // The desk works the commercial cases the guideline scores; routed lines and consumer
  // referrals still show in the rail, so the queue on screen matches the API's.
  const rows = allRows.filter((r) => r.region === "toronto" || (r.decision.kind !== "routed" && !r.caseId.startsWith("TQ-")));
  const deskIds = rows.filter((r) => r.region !== "toronto").map((r) => r.caseId);
  const recordedPairs = await Promise.all(
    deskIds.map(async (id) => [id, ((await json<DeskEvent[]>(`/cases/${id}/events`)) ?? []).length] as const),
  );
  const offlineEvents = { "138": events138 as unknown as DeskEvent[] };
  // With the API down, the bundled recording is the run.
  const recorded = apiUp
    ? Object.fromEntries(recordedPairs)
    : Object.fromEntries(deskIds.map((id) => [id, offlineEvents[id as keyof typeof offlineEvents]?.length ?? 0]));
  const detailPairs = await Promise.all(
    recordedPairs.filter(([, n]) => n > 0).map(async ([id]) => [id, await api.case(id)] as const),
  );
  const details = (
    apiUp
      ? Object.fromEntries(detailPairs.filter(([, c]) => c))
      : { "138": case138, "126": case126, "143": case143 }
  ) as unknown as Record<string, CaseView>;

  const sites: LiveProps["sites"] = {};
  const livePins = await json<{ caseId: string; site: { lat: number; lng: number } }[]>("/map/pins");
  for (const p of livePins ?? (mapPins as { caseId: string; site: { lat: number; lng: number } }[])) sites[p.caseId] = p.site;
  for (const [id, c] of Object.entries(details)) if (c.site) sites[id] = c.site;

  const [book3, book5] = await Promise.all([json<Hex[]>("/map/book?res=3"), json<Hex[]>("/map/book?res=5")]);
  const fixtureBook = mapBook as unknown as Record<string, Record<string, Hex[]>>;
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
      rows={rows}
      allRows={allRows}
      sites={sites}
      details={details}
      recorded={recorded}
      offlineEvents={offlineEvents}
      bookHexes={book3 ?? fixtureBook["3"].all}
      fineHexes={book5 ?? fixtureBook["5"].all}
      apiUp={apiUp}
      backtest={backtest}
    />
  );
}
