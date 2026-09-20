import { api } from "@/lib/api";
import type { Row } from "@/lib/live";
import { BookSurface } from "@/components/surface/BookSurface";

export default async function QueuePage({ searchParams }: PageProps<"/queue">) {
  const view = (await searchParams).view === "all" ? "all" : "open";
  const [rowsRaw, declines, pins, hexes] = await Promise.all([api.queue(view), api.declines(), api.mapPins(), api.mapBook("all", 3)]);
  const rows = rowsRaw as unknown as (Row & { deskVerdict?: string; challengeRisks?: number })[];
  return <BookSurface rows={rows} pins={pins} hexes={hexes} declines={declines} view={view} peril="all" />;
}
