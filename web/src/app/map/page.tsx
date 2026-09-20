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
    <main className="mx-auto grid h-[calc(100vh-140px)] max-w-[1320px] grid-cols-[1fr_360px] px-8 pt-8">
      <div className="relative overflow-hidden border border-rule">
        <LiveMap hexes={hexes} pins={pins} center={[-99, 37]} zoom={3.5} />
        <div className="absolute left-5 top-4 border-l border-ink bg-paper/95 py-1 pl-3 pr-4">
          <p className="folio">Book of business</p>
          <p className="display display-md mt-1">
            <span className="num">{money(total)}</span> active TIV in <span className="num">{hexes.length}</span> cells
          </p>
          <nav aria-label="Peril" className="mt-2 flex gap-4 text-[12.5px]">
            {PERILS.map((p) => (
              <Link
                key={p}
                href={p === "all" ? "/map" : `/map?peril=${p}`}
                aria-current={p === peril ? "page" : undefined}
                className={`underline-offset-[5px] decoration-1 transition-colors duration-150 ${p === peril ? "underline" : "text-dim hover:text-ink"}`}
              >
                {PERIL_LABEL[p]}
              </Link>
            ))}
          </nav>
        </div>
        <div className="absolute bottom-5 left-5 flex items-center gap-4 bg-paper/95 px-3 py-1.5 text-[11.5px]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-5 bg-ink/15" />
            <span className="inline-block h-3 w-5 bg-ink/60" /> low to high TIV
          </span>
          {LEGEND.map((l) => (
            <span key={l.kind} className="flex items-center gap-1.5">
              <span
                className={`inline-block size-3 rounded-full border ${l.kind === "open" ? "border-ink bg-paper" : l.kind === "decline" ? "border-red bg-red" : "border-rule bg-rule"}`}
              />
              {l.label}
            </span>
          ))}
        </div>
      </div>
      <aside className="overflow-y-auto pl-8" aria-labelledby="cases-h">
        <h1 id="cases-h" className="display display-md">{pins.length} submission sites</h1>
        <p className="mb-4 mt-1 text-[12.5px] text-dim">Every pin, as a list. Open one to see how its score was built.</p>
        <ul>
          {pins.map((p) => (
            <li key={p.caseId} className="rule-faint">
              <Link href={`/cases/${p.caseId}`} className="flex items-baseline gap-3 py-1.5 transition-colors duration-150 hover:bg-faint/60">
                <span className="num w-8 shrink-0 text-[11.5px] text-dim">{p.caseId}</span>
                <span className="min-w-0 flex-1 truncate text-[13px]">{p.insured}</span>
                <DecisionChip decision={{ kind: p.decision } as DecisionView} />
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}
