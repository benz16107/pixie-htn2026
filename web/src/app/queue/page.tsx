import { api } from "@/lib/api";
import type { Row } from "@/lib/live";
import { Blotter } from "@/components/desk/Blotter";
import { THRESHOLDS } from "@/components/bits";

export default async function QueuePage({ searchParams }: PageProps<"/queue">) {
  const requested = (await searchParams).view;
  const view = requested === "all" || requested === "consumer" ? requested : "open";
  // The guideline is editable at /guideline, so the band ruler on every row has to read the one in
  // force rather than the two numbers that happened to be filed on disk.
  const [rowsRaw, declines, guideline] = await Promise.all([api.queue(view), api.declines(), api.guideline()]);
  const rows = rowsRaw as unknown as (Row & { deskVerdict?: string; challengeRisks?: number })[];
  return <Blotter rows={rows} view={view} declines={declines ?? null} t={guideline?.thresholds ?? THRESHOLDS} />;
}
