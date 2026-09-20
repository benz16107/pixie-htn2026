import Link from "next/link";
import { api } from "@/lib/api";
import type { Row } from "@/lib/live";
import { QueueTable } from "@/components/QueueTable";
import { DeclinesPanel } from "@/components/BookInsights";

export default async function QueuePage({ searchParams }: PageProps<"/queue">) {
  const view = (await searchParams).view === "all" ? "all" : "open";
  const [rowsRaw, declines] = await Promise.all([api.queue(view), api.declines()]);
  const rows = rowsRaw as unknown as (Row & { deskVerdict?: string; challengeRisks?: number })[];
  const open = rows.filter((r) => r.decision.kind === "open").length;
  const deskCount = rows.filter((r) => r.region !== "toronto").length;
  return (
    <main className="mx-auto max-w-[1320px] px-8 pt-12">
      <p className="folio">The queue, October 2025 effective dates</p>
      <div className="mt-3 flex items-end justify-between gap-10">
        <h1 className="display display-lg">
          {rows.length} submissions, {open} still open.
        </h1>
        <nav aria-label="Which submissions" className="flex shrink-0 gap-5 pb-1.5 text-[13px]">
          {(["open", "all"] as const).map((v) => (
            <Link
              key={v}
              href={`/queue?view=${v}`}
              aria-current={v === view ? "page" : undefined}
              className={`underline-offset-[6px] decoration-1 transition-colors duration-150 ${v === view ? "underline" : "text-dim hover:text-ink"}`}
            >
              {v === "open" ? "Open submissions" : "All submissions"}
            </Link>
          ))}
        </nav>
      </div>
      <p className="measure mt-4 text-[15px] leading-[1.55] text-dim">
        Ranked by the midpoint of each score interval, open cases first. The property guideline scores {deskCount} of them; the rest
        are routed to their own line or referred by a renter. Where the Challenger moved the call, the row says so.
      </p>
      <QueueTable rows={rows} />
      {declines && (
        <div className="mt-14">
          <DeclinesPanel d={declines} />
        </div>
      )}
    </main>
  );
}
