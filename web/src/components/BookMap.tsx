"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { PolygonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { Map as MapLibre, NavigationControl, setWorkerUrl } from "maplibre-gl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Hex } from "@/contract";

export type Pin = { caseId: string; insured: string; decision: string; site: { lat: number; lng: number }; cell: string; ring?: [number, number][] };

// The bundler hides the worker file MapLibre looks for next to its module; postinstall copies it to public/.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

type RGBA = [number, number, number, number];
const INK: RGBA = [207, 215, 221, 255];
const PAPER: RGBA = [10, 13, 16, 255];
const US_OUTLINE: [number, number][] = [
  [49, -124.7], [46, -124], [42, -124.4], [38.5, -123], [34.5, -120.5], [32.5, -117.1],
  [31.3, -111], [31.3, -108.2], [31.8, -106.5], [29.5, -103], [26, -97], [25.2, -81],
  [30.7, -80.1], [35, -75.3], [40.5, -73.7], [44.8, -67], [47.4, -69], [45, -74],
  [44.8, -82.4], [46, -84.8], [49, -95], [49, -124.7],
];
const STATE_LABELS: [string, number, number][] = [
  ["WA", 47.4, -120.6], ["CA", 37.1, -119.8], ["CO", 39, -105.6], ["TX", 31, -99.2],
  ["IL", 40, -89.2], ["FL", 27.9, -81.7], ["PA", 41, -77.7], ["NY", 43, -75.2],
];
export const PIN_FILL: Record<string, RGBA> = {
  open: PAPER, // hollow, ringed in ink: still undecided
  decline: [226, 89, 74, 255],
  refer: [240, 164, 55, 255],
  accept: [53, 184, 138, 255],
  approve: [53, 184, 138, 255],
  routed: [93, 106, 117, 190],
};

/**
 * Re-paints OpenFreeMap's Positron layer by layer into the night desk instead of shipping a
 * custom style. Kept deliberately low-contrast: the map is a backdrop for the hexes and pins.
 */
export function earthTone(map: MapLibre) {
  for (const l of map.getStyle().layers) {
    const id = l.id;
    if (l.type === "background") map.setPaintProperty(id, "background-color", "#0b0f13");
    else if (l.type === "fill")
      map.setPaintProperty(id, "fill-color", id.includes("water") ? "#0d181d" : id === "park" || id.includes("wood") ? "#101a16" : "#121a21");
    else if (l.type === "line")
      map.setPaintProperty(id, "line-color", id.includes("water") ? "#17303a" : id.startsWith("boundary") ? "#33414b" : "#1d262e");
    else if (l.type === "symbol") {
      map.setPaintProperty(id, "text-color", id.startsWith("water") ? "#4e6a72" : "#74838e");
      map.setPaintProperty(id, "text-halo-color", "#080b0e");
    }
  }
}

export default function BookMap({
  hexes,
  pins,
  center,
  zoom,
  highlight,
  compact = false,
  perspective = false,
}: {
  hexes: Hex[];
  pins: Pin[];
  center: [number, number]; // [lng, lat]
  zoom: number;
  highlight?: string;
  compact?: boolean;
  perspective?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const overlay = useRef<MapboxOverlay | null>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const [trouble, setTrouble] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!box.current) return;
    let map: MapLibre;
    let styleReady = false;
    let styleTimer = 0;
    try {
      map = new MapLibre({
        container: box.current,
        style: "https://tiles.openfreemap.org/styles/positron",
        center,
        zoom,
        pitch: perspective ? 55 : 0,
        bearing: perspective ? -18 : 0,
        attributionControl: { compact: true },
        interactive: !compact,
        canvasContextAttributes: { preserveDrawingBuffer: true },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Map rendering is unavailable";
      const id = window.setTimeout(() => setTrouble(message), 0);
      return () => window.clearTimeout(id);
    }
    if (!compact) map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    styleTimer = window.setTimeout(() => {
      if (!styleReady) setTrouble("The external basemap did not load in time");
    }, 5000);
    map.on("style.load", () => {
      styleReady = true;
      window.clearTimeout(styleTimer);
      earthTone(map);
    });
    map.on("error", (e) => {
      const message = e.error?.message ?? "The external basemap is unavailable";
      console.error("maplibre", message);
      if (!styleReady) setTrouble(message);
    });
    overlay.current = new MapboxOverlay({ interleaved: false, layers: [] });
    map.addControl(overlay.current);
    mapRef.current = map;
    return () => {
      window.clearTimeout(styleTimer);
      mapRef.current = null;
      map.remove();
    };
    // center/zoom only seed the camera; later changes are the user's pans
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.easeTo({ pitch: perspective ? 55 : 0, bearing: perspective ? -18 : 0, duration: reduced ? 0 : 550 });
  }, [perspective]);

  useEffect(() => {
    const maxValue = Math.max(1, ...hexes.map((hex) => hex.value));
    overlay.current?.setProps({
      getTooltip: ({ object }) =>
        object && "insured" in object
          ? `#${object.caseId} ${object.insured} · ${object.decision}`
          : object && "value" in object
            ? `${perspective ? "Tower height" : "Cell shade"}: $${(object.value / 1e6).toFixed(1)}M active TIV`
            : null,
      layers: [
        new PolygonLayer<Hex>({
          id: "hexes",
          data: hexes,
          getPolygon: (h) => h.ring.map(([lat, lng]) => [lng, lat]),
          extruded: perspective,
          elevationScale: perspective ? 1 : 0,
          getElevation: (h) => 35_000 + (h.value / maxValue) * 420_000,
          getFillColor: (h) => [183, 129, 58, perspective ? 105 + h.level * 24 : 40 + h.level * 45],
          getLineColor: (h) => (h.cell === highlight ? INK : [143, 99, 39, 160]),
          getLineWidth: (h) => (h.cell === highlight ? 3 : 1),
          lineWidthUnits: "pixels",
          wireframe: perspective,
          material: {
            ambient: 0.38,
            diffuse: 0.62,
            shininess: 24,
            specularColor: [225, 190, 126],
          },
          pickable: !compact,
          transitions: { getElevation: 500 },
          updateTriggers: {
            getElevation: [maxValue, perspective],
            getFillColor: perspective,
            getLineColor: highlight,
            getLineWidth: highlight,
          },
        }),
        new ScatterplotLayer<Pin>({
          id: "pins",
          data: pins,
          getPosition: (p) => [p.site.lng, p.site.lat],
          getFillColor: (p) => PIN_FILL[p.decision] ?? PIN_FILL.routed,
          getLineColor: (p) => (p.decision === "open" ? INK : PAPER),
          getRadius: (p) => (p.decision === "open" ? 8 : 6),
          radiusUnits: "pixels",
          lineWidthUnits: "pixels",
          getLineWidth: 2,
          stroked: true,
          pickable: !compact,
          onClick: ({ object }) => object && router.push(`/cases/${object.caseId}`),
        }),
      ],
    });
  }, [hexes, pins, highlight, compact, perspective, router]);

  // maplibre-gl.css sets .maplibregl-map to position: relative, outranking layered utilities, so size the parent.
  return (
    <div className="absolute inset-0">
      {trouble && <MapFallback hexes={hexes} pins={pins} perspective={perspective} reason={trouble} />}
      <div ref={box} className={`h-full w-full ${trouble ? "hidden" : ""}`} />
    </div>
  );
}

function MapFallback({ hexes, pins, perspective, reason }: { hexes: Hex[]; pins: Pin[]; perspective: boolean; reason: string }) {
  const maxValue = Math.max(1, ...hexes.map((hex) => hex.value));
  const point = ([lat, lng]: [number, number]) => ({
    x: ((lng + 125) / 59) * 1000,
    y: ((50 - lat) / 26) * 600,
  });
  const polygon = (ring: [number, number][], lift = 0) => ring.map((coord) => {
    const p = point(coord);
    return `${p.x.toFixed(1)},${(p.y - lift).toFixed(1)}`;
  }).join(" ");

  return (
    <div className="absolute inset-0 overflow-hidden bg-water" title={reason}>
      <svg viewBox="0 0 1000 600" className="h-full w-full" role="img" aria-label="Fallback view of portfolio exposure across the United States">
        <defs>
          <linearGradient id="fallback-land" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#182128" />
            <stop offset="1" stopColor="#0d1419" />
          </linearGradient>
          <pattern id="fallback-grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M100 0H0V100" fill="none" stroke="#27343d" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="1000" height="600" fill="url(#fallback-land)" />
        <rect width="1000" height="600" fill="url(#fallback-grid)" opacity="0.55" />
        <polygon points={polygon(US_OUTLINE)} fill="#111b21" stroke="#52626d" strokeWidth="2" />
        {STATE_LABELS.map(([label, lat, lng]) => {
          const p = point([lat, lng]);
          return <text key={label} x={p.x} y={p.y} fill="#74838e" fontSize="12" textAnchor="middle">{label}</text>;
        })}
        {hexes.map((hex) => {
          const lift = perspective ? 10 + (hex.value / maxValue) * 68 : 0;
          return (
            <g key={hex.cell}>
              {lift > 0 && <polygon points={polygon(hex.ring)} fill="#6e4b20" opacity="0.5" />}
              <polygon
                points={polygon(hex.ring, lift)}
                fill="#b7813a"
                fillOpacity={0.2 + hex.level * 0.15}
                stroke="#d19a4e"
                strokeWidth={hex.level >= 4 ? 2.2 : 1}
              />
            </g>
          );
        })}
        {pins.map((pin) => {
          const p = point([pin.site.lat, pin.site.lng]);
          const color = pin.decision === "decline" ? "#e2594a" : pin.decision === "open" ? "#0a0d10" : "#8a97a3";
          return <circle key={pin.caseId} cx={p.x} cy={p.y} r={pin.decision === "open" ? 7 : 5} fill={color} stroke="#cfd7dd" strokeWidth="2" />;
        })}
      </svg>
      <p className="absolute bottom-14 right-5 max-w-[260px] border border-edge bg-paper/95 px-3 py-2 text-[10px] leading-snug text-dim">
        Offline portfolio view. The external basemap is unavailable, so Pixie is using its bundled geographic outline with the same exposure cells and submissions.
      </p>
    </div>
  );
}
