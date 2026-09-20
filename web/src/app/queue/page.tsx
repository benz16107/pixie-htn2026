import { api } from "@/lib/api";
import type { Row } from "@/lib/live";
import { Blotter } from "@/components/desk/Blotter";

export default async function QueuePage({ searchParams }: PageProps<"/queue">) {
  const view = (await searchParams).view === "all" ? "all" : "open";
  const [rowsRaw, declines] = await Promise.all([api.queue(view), api.declines()]);
  const rows = rowsRaw as unknown as (Row & { deskVerdict?: string; challengeRisks?: number })[];
  return <Blotter rows={rows} view={view} declines={declines ?? null} />;
}
