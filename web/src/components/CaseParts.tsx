import type { CaseView } from "@/contract";
import { money } from "./bits";
import { parseHazard, parseSkip, signed, sourceLabel } from "@/lib/format";

type Portfolio = NonNullable<CaseView["portfolio"]>;

// Copy comes from the API's numbers; the count and radius are read from its line, or left out.
export function portfolioSentence(p: Portfolio) {
  const count = p.line.match(/(\d+) active property locations?/)?.[1];
  const radius = p.line.match(/within (\d+\s?km)/)?.[1];
  const who = count ? `${count} active property location${count === "1" ? "" : "s"}` : "Active property locations";
  const over = p.neighbourhoodTiv > p.threshold;
  return `${who}${radius ? ` within ${radius}` : " nearby"} hold ${money(p.neighbourhoodTiv)}, ${over ? "over" : "under"} the ${money(p.threshold)} threshold: ${signed(p.points)} points.`;
}

/** The portfolio check as one sentence under the map, with its backend mark if the line carries one. */
export function PortfolioNote({ p }: { p: Portfolio }) {
  const backend = p.line.match(/^\[(\w+)\]/)?.[1];
  return (
    <p className="mt-3 flex items-baseline gap-4 text-[13.5px] leading-[1.5]">
      <span className={`display-num shrink-0 text-[22px] leading-none ${p.points < 0 ? "text-red" : ""}`}>{signed(p.points)}</span>
      <span>
        <span className="text-dim">Portfolio. </span>
        {portfolioSentence(p)}
        {backend && <span className="num ml-1.5 text-[11px] text-dim">[{backend}]</span>}
      </span>
    </p>
  );
}

/** Every hazard layer that ran, one row each, and the ones the desk chose to skip, with the reason. */
export function HazardTable({ risk }: { risk: CaseView["risk"] }) {
  if (!risk.factors.length && !risk.skipped.length) return null;
  return (
    <table className="book mt-5 text-[13px]">
      <thead>
        <tr>
          <th className="w-[64px]">Applied</th>
          <th>Hazard at the site</th>
          <th className="r w-[72px]">Points</th>
          <th className="w-[150px] !pl-8">Source</th>
        </tr>
      </thead>
      <tbody>
        {risk.factors.map((f) => {
          const h = parseHazard(f.line, f.peril);
          return (
            <tr key={f.peril}>
              <td className={`num ${f.applied > 1 ? "text-red" : ""}`}>×{f.applied.toFixed(2)}</td>
              <td>
                <span className="font-medium">{h.peril}.</span> {h.sentence}
                {f.capped && <span className="sc ml-2 text-dim">capped</span>}
              </td>
              <td className="r num">{h.points !== undefined ? signed(h.points) : ""}</td>
              <td className="!pl-8 text-dim">
                {f.source.startsWith("http") ? (
                  <a href={f.source} target="_blank" rel="noreferrer" className="link" title={f.source}>
                    {sourceLabel(f.source)}
                  </a>
                ) : (
                  sourceLabel(f.source)
                )}
              </td>
            </tr>
          );
        })}
        {risk.skipped.map(([key, why]) => {
          const s = parseSkip(key, why);
          return (
            <tr key={key} className="text-dim">
              <td className="sc">skip</td>
              <td colSpan={3}>
                {s.peril}: {s.reason}.
              </td>
            </tr>
          );
        })}
        <tr>
          <td className="num font-medium">×{risk.total.toFixed(2)}</td>
          <td colSpan={3} className="text-dim">
            Total hazard multiplier{risk.totalCapped ? ", capped by the rules file" : ""}.
          </td>
        </tr>
      </tbody>
    </table>
  );
}
