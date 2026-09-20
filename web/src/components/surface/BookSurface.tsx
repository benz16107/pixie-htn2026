"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import type { Pin } from "@/components/BookMap";
import { DeclinesPanel } from "@/components/BookInsights";
import { QueueRail } from "@/components/surface/QueueRail";
import { money } from "@/components/bits";
import type { Hex } from "@/contract";
import type { DeclinesInsight, Peril } from "@/lib/api";
import type { Row } from "@/lib/live";
import { useSurface } from "@/lib/surface/context";
import { hexLayer, pinLayer, unsettledLayer, usePulsePhase } from "@/lib/surface/layers";

const OVERVIEW: [number, number] = [-99, 37];
const PERIL_LABEL: Record<Peril, string> = { all: "All perils", flood: "Flood", wildfire: "Wildfire", wind: "Wind", quake: "Quake" };
const PERILS: Peril[] = ["all", "flood", "wildfire", "wind", "quake"];

/**
 * The book of business, as the ground the desk stands on. Every submission is a pin at its real
 * site; the ranked list is the same book read as text, so a keyboard user reaches every case a
 * mouse can reach a pin for. Opening one is the same action either way: it flies you there.
 */
export function BookSurface({
  rows,
  pins,
  hexes,
  declines,
  view,
  peril,
  showPerilPicker = false,
}: {
  rows: (Row & { deskVerdict?: string; challengeRisks?: number })[];
  pins: Pin[];
  hexes: Hex[];
  declines?: DeclinesInsight;
  view: "open" | "all";
  peril: Peril;
  showPerilPicker?: boolean;
}) {
  const router = useRouter();
  const { flyTo, setLayers, reduced } = useSurface();
  const phase = usePulsePhase(reduced);
  const total = useMemo(() => hexes.reduce((s, h) => s + h.value, 0), [hexes]);

  useEffect(() => {
    flyTo({ center: OVERVIEW, zoom: 3.5, padding: { left: 452, top: 64, bottom: 16, right: 16 } });
    // one flight to the overview per mount; panning afterward is the user's own
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLayers(
      [
        hexLayer(hexes),
        pinLayer(pins, { id: "book-pins", onClick: (p) => router.push(`/cases/${p.caseId}`) }),
        unsettledLayer(pins, phase, reduced),
      ],
      ({ object }) => {
        const o = object as (Pin & { value?: number }) | undefined;
        if (!o) return null;
        return "insured" in o ? `#${o.caseId} ${o.insured} · ${o.decision}` : null;
      },
    );
  }, [hexes, pins, phase, reduced, setLayers, router]);

  const open = rows.filter((r) => r.decision.kind === "open").length;

  return (
    <aside
      aria-label="Book of business"
      className="pointer-events-auto fixed left-4 top-[64px] z-20 flex w-[452px] max-w-[calc(100vw-32px)] flex-col rounded-sm border border-ink bg-paper/97 shadow-[0_10px_36px_rgba(47,42,34,0.18)]"
      style={{ bottom: 16 }}
    >
      <div className="shrink-0 border-b border-rule px-4 py-3">
        <p className="kicker">{showPerilPicker ? "Book · by peril" : "Queue · October 2025 effective dates"}</p>
        <h1 className="mt-0.5 font-serif text-[21px] font-semibold leading-tight">
          <span className="num">{money(total)}</span> active TIV
        </h1>
        <p className="mt-0.5 text-[11.5px] text-dim">
          {rows.length} submissions, {open} still open. Each pin on the map is one of them, at its real site.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Which submissions" className="flex rounded-sm border border-ink text-[11.5px]">
            {(["open", "all"] as const).map((v) => (
              <Link
                key={v}
                href={`/queue?view=${v}`}
                aria-current={v === view ? "page" : undefined}
                className={`px-2.5 py-1 transition-colors duration-150 ${v === view ? "bg-ink text-paper" : "hover:bg-land"}`}
              >
                {v === "open" ? "Open" : "All"}
              </Link>
            ))}
          </div>
          {showPerilPicker && (
            <nav aria-label="Peril" className="flex flex-wrap gap-1">
              {PERILS.map((p) => (
                <Link
                  key={p}
                  href={p === "all" ? "/map" : `/map?peril=${p}`}
                  aria-current={p === peril ? "page" : undefined}
                  className={`rounded-sm border px-2 py-px text-[11.5px] transition-colors duration-150 ${p === peril ? "border-ink bg-ink text-paper" : "border-rule hover:border-ink"}`}
                >
                  {PERIL_LABEL[p]}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <QueueRail rows={rows} />
        {declines && (
          <div className="mt-6">
            <DeclinesPanel d={declines} />
          </div>
        )}
      </div>
    </aside>
  );
}
