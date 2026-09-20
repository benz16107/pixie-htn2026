import { api, PERILS, type Peril } from "@/lib/api";
import type { Row } from "@/lib/live";
import { BookSurface } from "@/components/surface/BookSurface";

export default async function MapPage({ searchParams }: PageProps<"/map">) {
  const q = (await searchParams).peril;
  const peril: Peril = PERILS.includes(q as Peril) ? (q as Peril) : "all";
  const [hexes, allPins, rowsRaw] = await Promise.all([api.mapBook(peril, 3), api.mapPins(), api.queue("all")]);
  const cells = new Set(hexes.map((h) => h.cell));
  const pins = peril === "all" ? allPins : allPins.filter((p) => cells.has(p.cell) || p.decision === "open");
  const rows = rowsRaw as unknown as (Row & { deskVerdict?: string; challengeRisks?: number })[];
  return <BookSurface rows={rows} pins={pins} hexes={hexes} view="all" peril={peril} showPerilPicker />;
}
