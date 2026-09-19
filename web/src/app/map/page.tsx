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
  const q = (await searchParams).peril;
  const peril: Peril = PERILS.includes(q as Peril) ? (q as Peril) : "all";
  const [hexes, allPins] = await Promise.all([api.mapBook(peril, 3), api.mapPins()]);
  const cells = new Set(hexes.map((h) => h.cell));
  const pins = peril === "all" ? allPins : allPins.filter((p) => cells.has(p.cell) || p.decision === "open");
  const total = hexes.reduce((s, h) => s + h.value, 0);

  return (
    <main className="grid h-[calc(100vh-48px)] grid-cols-[1fr_360px]">
      <div className="relative overflow-hidden border-r border-rule">
        <LiveMap hexes={hexes} pins={pins} center={[-99, 37]} zoom={3.5} />
        <div aria-hidden className="contours pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply" />
        <div className="absolute left-5 top-4 rounded-sm border border-rule bg-paper/95 px-3.5 py-2.5">
          <p className="kicker">Book of business · H3 res 3</p>
          <p className="mt-0.5 font-serif text-[22px] font-semibold leading-tight">
            <span className="num">{money(total)}</span> active TIV in <span className="num">{hexes.length}</span> cells
          </p>
          <nav aria-label="Peril" className="mt-2 flex gap-1">
            {PERILS.map((p) => (
              <Link
                key={p}
                href={p === "all" ? "/map" : `/map?peril=${p}`}
                aria-current={p === peril ? "page" : undefined}
                className={`rounded-sm border px-2 py-px text-[12px] transition-colors duration-150 ${p === peril ? "border-ink bg-ink text-paper" : "border-rule hover:border-ink"}`}
              >
                {PERIL_LABEL[p]}
              </Link>
            ))}
          </nav>
        </div>
        <div className="absolute bottom-6 left-5 flex items-center gap-4 rounded-sm border border-rule bg-paper/95 px-3 py-1.5 text-[11.5px]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-5 bg-[#B7813A]/25" />
            <span className="inline-block h-3 w-5 bg-[#B7813A]/80" /> low to high TIV
          </span>
          {LEGEND.map((l) => (
            <span key={l.kind} className="flex items-center gap-1.5">
              <span
                className={`inline-block size-3 rounded-full border-2 ${l.kind === "open" ? "border-ink bg-paper" : l.kind === "decline" ? "border-paper bg-rust" : "border-paper bg-dim/70"}`}
              />
              {l.label}
            </span>
          ))}
        </div>
      </div>
      <aside className="overflow-y-auto px-6 py-5" aria-labelledby="cases-h">
        <h1 id="cases-h" className="kicker mb-2">Submission sites · {pins.length}</h1>
        <p className="mb-3 text-[12px] text-dim">Every pin on the map, as a list. Choose one to open its case.</p>
        <ul>
          {pins.map((p) => (
            <li key={p.caseId} className="border-t border-rule">
              <Link href={`/cases/${p.caseId}`} className="flex items-baseline gap-2 py-1.5 transition-colors duration-150 hover:bg-land">
                <span className="num w-9 text-[11px] text-dim">#{p.caseId}</span>
                <span className="flex-1 truncate text-[12.5px]">{p.insured}</span>
                <DecisionChip decision={{ kind: p.decision } as DecisionView} />
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}
