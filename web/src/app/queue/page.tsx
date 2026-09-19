import Link from "next/link";
import { api } from "@/lib/api";
import { QueueTable } from "@/components/QueueTable";

export default async function QueuePage({ searchParams }: PageProps<"/queue">) {
  const view = (await searchParams).view === "all" ? "all" : "open";
  const rows = await api.queue(view);
  const open = rows.filter((r) => r.decision.kind === "open").length;
  return (
    <main className="px-10 pb-12 pt-7">
      <div className="flex items-end justify-between gap-8">
        <div>
          <p className="font-mono text-[11px] text-dim">QUEUE · OCTOBER 2025 EFFECTIVE DATES</p>
          <h1 className="mt-0.5 font-serif text-[32px] font-semibold leading-tight">
            {rows.length} submissions, {open} still open
          </h1>
          <p className="mt-1 max-w-[70ch] text-dim">
            Ranked by the midpoint of each score interval. An open case straddles a threshold; the flippers name the
            facts that could move it and who can supply them.
          </p>
        </div>
        <div role="group" aria-label="Which submissions" className="flex rounded-sm border border-ink text-[12px]">
          {(["open", "all"] as const).map((v) => (
            <Link
              key={v}
              href={`/queue?view=${v}`}
              aria-current={v === view ? "page" : undefined}
              className={`px-3 py-1 transition-colors duration-150 ${v === view ? "bg-ink text-paper" : "hover:bg-land"}`}
            >
              {v === "open" ? "Open submissions" : "All"}
            </Link>
          ))}
        </div>
      </div>
      <QueueTable rows={rows} />
    </main>
  );
}
