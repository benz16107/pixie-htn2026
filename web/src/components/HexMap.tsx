import type { CaseView } from "@/contract";

// Static preview until W5 swaps in MapLibre with /map/book hexes. Shading around the pin is illustrative.
const R = 21;
const W = Math.sqrt(3) * R;
const HOT: Record<string, number> = {
  "9,7": 3, "10,7": 2, "8,8": 4, "9,8": 5, "10,8": 3, "9,9": 3, "10,9": 2, "11,8": 1, "8,7": 1, "10,6": 1, "8,9": 1, "11,10": 1, "10,10": 2,
};
const hex = (x: number, y: number) =>
  Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 180) * (60 * k - 30);
    return `${(x + R * Math.cos(a)).toFixed(1)},${(y + R * Math.sin(a)).toFixed(1)}`;
  }).join(" ");

function contour(cx: number, cy: number, i: number) {
  const r = i * 26;
  return Array.from({ length: 65 }, (_, a) => {
    const t = (a / 64) * Math.PI * 2;
    const w = r * (1 + 0.12 * Math.sin(3 * t + i) + 0.07 * Math.sin(5 * t + cx));
    return `${a ? "L" : "M"}${(cx + w * Math.cos(t)).toFixed(1)},${(cy + 0.8 * w * Math.sin(t)).toFixed(1)}`;
  }).join("");
}

export function HexMap({ c, width = 640, height = 550 }: { c: CaseView; width?: number; height?: number }) {
  const cells = [];
  for (let r = 0; r < 18; r++)
    for (let q = 0; q < 20; q++) {
      const h = HOT[`${q},${r}`];
      cells.push(
        <polygon
          key={`${q},${r}`}
          points={hex(q * W + (r % 2 ? W / 2 : 0), r * 1.5 * R)}
          fill={h ? "#B7813A" : "none"}
          fillOpacity={h ? 0.12 + h * 0.13 : 0}
          stroke="#A89C80"
          strokeWidth={0.5}
          strokeOpacity={0.55}
        />,
      );
    }
  const tx = 9 * W, ty = 8 * 1.5 * R;
  const flood = c.risk.factors.find((f) => f.peril === "flood");
  const coastal = c.site.lng > -81.5 && c.site.lat < 27.5; // south Florida sites sit on Biscayne Bay
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Site of case ${c.caseId} at ${c.site.lat}, ${c.site.lng}`} className="block">
      <rect width={width} height={height} fill="#ECE6D6" />
      {[[500, 150, 8], [150, 110, 6], [520, 440, 6]].flatMap(([cx, cy, n]) =>
        Array.from({ length: n }, (_, i) => (
          <path key={`${cx}-${i}`} d={contour(cx, cy, i + 1)} fill="none" stroke="#BFB295" strokeWidth={(i + 1) % 3 ? 0.6 : 1.1} opacity={0.7} />
        )),
      )}
      {cells}
      {coastal && (
        <>
          <path d={`M${width},0 L${width},${height} L560,${height} C520,470 530,420 510,380 C490,340 450,320 440,280 C430,240 480,200 490,160 C500,110 470,60 490,0Z`} fill="#C8D2CB" />
          <text x={520} y={250} transform="rotate(-78 520 250)" fontFamily="var(--font-newsreader)" fontStyle="italic" fontSize={15} fill="#6E6452">Biscayne Bay</text>
        </>
      )}
      {flood && (
        <>
          <defs>
            <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#A2492F" strokeWidth="1" opacity=".45" />
            </pattern>
          </defs>
          <path d={`M${tx - 30},${ty - 40} C${tx - 10},${ty - 60} ${tx + 40},${ty - 30} ${tx + 36},${ty + 10} C${tx + 30},${ty + 50} ${tx - 20},${ty + 60} ${tx - 40},${ty + 20}Z`} fill="url(#hatch)" stroke="#A2492F" strokeWidth={0.8} strokeDasharray="3 2" />
        </>
      )}
      <line x1={tx + 5} y1={ty - 7} x2={tx + 60} y2={160} stroke="#2F2A22" strokeWidth={1} />
      <polygon points={hex(tx, ty)} fill="none" stroke="#2F2A22" strokeWidth={2} />
      <circle cx={tx} cy={ty} r={6} fill="#A2492F" stroke="#F3EFE4" strokeWidth={2} />
      <text x={tx + 10} y={ty + 34} fontFamily="var(--font-dm-mono)" fontSize={10} fill="#2F2A22">
        #{c.caseId}{flood ? ` · ${flood.line.match(/zone (\w+)/)?.[1] ?? "flood"}` : ""}
      </text>
    </svg>
  );
}
