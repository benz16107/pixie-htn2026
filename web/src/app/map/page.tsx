import Link from "next/link";
import { api, PERILS, type Peril } from "@/lib/api";
import { LiveMap } from "@/components/LiveMap";
import { DecisionChip, money } from "@/components/bits";
import type { DecisionView } from "@/contract";

const PERIL_LABEL: Record<Peril, string> = { all: "All perils", flood: "Flood", wildfire: "Wildfire", wind: "Wind", quake: "Quake" };
const LEGEND = [
  { kind: "open", label: "Open, ringed" },
  { kind: "decline", label: "Decline" },
  { kind: "routed", label: "Routed" },
];

export default async function MapPage({ searchParams }: PageProps<"/map">) {
  const params = await searchParams;
  const q = params.peril;
  const peril: Peril = PERILS.includes(q as Peril) ? (q as Peril) : "all";
  const perspective = params.view !== "flat";
  const [hexes, allPins] = await Promise.all([api.mapBook(peril, 5), api.mapPins()]);
  const cells = new Set(hexes.map((h) => h.cell));
  const pins = peril === "all" ? allPins : allPins.filter((p) => cells.has(p.cell) || p.decision === "open");
  const total = hexes.reduce((s, h) => s + h.value, 0);
  const concentrations = [...hexes].sort((a, b) => b.value - a.value).slice(0, 5);
  const largestConcentration = concentrations[0]?.value ?? 1;
  const topThree = concentrations.slice(0, 3).reduce((sum, cell) => sum + cell.value, 0);
  const concentrationShare = total ? Math.round((topThree / total) * 100) : 0;
  const hrefFor = (nextPeril: Peril, nextPerspective = perspective) => {
    const query = new URLSearchParams();
    if (nextPeril !== "all") query.set("peril", nextPeril);
    if (!nextPerspective) query.set("view", "flat");
    const suffix = query.toString();
    return suffix ? `/map?${suffix}` : "/map";
  };

  return (
    <main className="map-page grid h-[calc(100dvh-40px)] grid-cols-[minmax(0,1fr)_410px] bg-paper">
      <div className="relative overflow-hidden border-r border-rule">
        <LiveMap hexes={hexes} pins={pins} center={[-99, 37]} zoom={3.5} perspective={perspective} />
        <div className="absolute left-5 top-5 max-w-[520px] border border-edge bg-paper/95 px-5 py-4 shadow-[0_14px_50px_rgba(0,0,0,0.32)]">
          <p className="kicker text-ochre">Portfolio exposure</p>
          <h1 className="cond mt-1 text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink">
            Where the book is concentrated
          </h1>
          <p className="cond mt-2 max-w-[46ch] text-[14px] leading-snug text-dim">
            {perspective
              ? "Tower height is active total insured value. Rotate the map to compare concentrations, then select a pin to inspect the submission."
              : "Darker cells hold more active total insured value. Select a pin to inspect the submission behind it."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <nav aria-label="Map view" className="flex border border-edge bg-land p-0.5">
              <Link
                href={hrefFor(peril, true)}
                aria-current={perspective ? "page" : undefined}
                className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${perspective ? "bg-ink text-paper" : "text-dim hover:text-ink"}`}
              >
                3D exposure
              </Link>
              <Link
                href={hrefFor(peril, false)}
                aria-current={!perspective ? "page" : undefined}
                className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${!perspective ? "bg-ink text-paper" : "text-dim hover:text-ink"}`}
              >
                Flat map
              </Link>
            </nav>
            <nav aria-label="Peril" className="flex flex-wrap gap-1">
            {PERILS.map((p) => (
              <Link
                key={p}
                href={hrefFor(p)}
                aria-current={p === peril ? "page" : undefined}
                className={`border px-2.5 py-1.5 text-[11px] transition-colors duration-150 ${p === peril ? "border-ochre bg-ochre text-paper" : "border-rule bg-paper/80 text-dim hover:border-edge hover:text-ink"}`}
              >
                {PERIL_LABEL[p]}
              </Link>
            ))}
            </nav>
          </div>
        </div>
        <div className="absolute bottom-6 left-5 flex items-center gap-4 border border-rule bg-paper/95 px-3 py-2 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-5 bg-[#B7813A]/25" />
            <span className="inline-block h-3 w-5 bg-[#B7813A]/80" /> {perspective ? "short to tall" : "low to high"} TIV
          </span>
          {LEGEND.map((l) => (
            <span key={l.kind} className="flex items-center gap-1.5">
              <span
                className={`inline-block size-3 rounded-full border-2 ${l.kind === "open" ? "border-edge bg-paper" : l.kind === "decline" ? "border-paper bg-rust" : "border-paper bg-dim/70"}`}
              />
              {l.label}
            </span>
          ))}
        </div>
      </div>
      <aside className="overflow-y-auto" aria-labelledby="cases-h">
        <section className="border-b border-edge px-6 py-6">
          <p className="kicker text-ochre">Book in view</p>
          <p className="num mt-2 text-[32px] font-medium leading-none text-ink">{money(total)}</p>
          <p className="cond mt-2 text-[14px] leading-snug text-dim">
            Active insured value across {hexes.length} H3 cells. The three largest cells hold {concentrationShare}% of the visible exposure.
          </p>
        </section>

        <section className="border-b border-edge px-6 py-5" aria-labelledby="concentration-h">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="concentration-h" className="cond text-[18px] font-semibold text-ink">Largest concentrations</h2>
            <span className="kicker">active TIV</span>
          </div>
          <ol className="mt-3">
            {concentrations.map((cell, index) => (
              <li key={cell.cell} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 border-t border-rule py-2.5">
                <span className="num text-[11px] text-dim">{String(index + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] text-ink">Cell {cell.cell}</span>
                  <span className="mt-1 block h-1 bg-land">
                    <span className="block h-full bg-ochre" style={{ width: `${Math.max(8, (cell.value / largestConcentration) * 100)}%` }} />
                  </span>
                </span>
                <strong className="num text-[12px] font-medium text-ink">{money(cell.value)}</strong>
              </li>
            ))}
          </ol>
        </section>

        <section className="px-6 py-5">
          <h2 id="cases-h" className="cond text-[18px] font-semibold text-ink">Submission sites</h2>
          <p className="mt-1 text-[11px] text-dim">{pins.length} visible pins. Open one to see its score, sources, and nearby exposure.</p>
          <ul className="mt-3">
          {pins.map((p) => (
            <li key={p.caseId} className="border-t border-rule">
              <Link href={`/cases/${p.caseId}`} className="flex min-h-10 items-center gap-2 py-2 transition-colors duration-150 hover:bg-land">
                <span className="num w-9 shrink-0 text-[11px] text-dim">#{p.caseId}</span>
                <span className="min-w-0 flex-1 truncate text-[12px]">{p.insured}</span>
                <DecisionChip decision={{ kind: p.decision } as DecisionView} />
              </Link>
            </li>
          ))}
          </ul>
        </section>
      </aside>
    </main>
  );
}
