"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { PolygonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { Map as MapLibre, NavigationControl, setWorkerUrl } from "maplibre-gl";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { Hex } from "@/contract";

export type Pin = { caseId: string; insured: string; decision: string; site: { lat: number; lng: number }; cell: string; ring?: [number, number][] };

// The bundler hides the worker file MapLibre looks for next to its module; postinstall copies it to public/.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

type RGBA = [number, number, number, number];
const INK: RGBA = [26, 26, 25, 255];
const PAPER: RGBA = [244, 243, 239, 255];
export const PIN_FILL: Record<string, RGBA> = {
  open: PAPER, // hollow, ringed in ink: still undecided
  decline: [166, 43, 31, 255],
  refer: [99, 98, 92, 255],
  accept: [26, 26, 25, 255],
  approve: [26, 26, 25, 255],
  routed: [196, 195, 189, 255],
};

// Pull OpenFreeMap's Positron toward the Cartographic palette instead of shipping a custom style.
export function earthTone(map: MapLibre) {
  for (const l of map.getStyle().layers) {
    const id = l.id;
    if (l.type === "background") map.setPaintProperty(id, "background-color", "#efeeea");
    else if (l.type === "fill")
      map.setPaintProperty(id, "fill-color", id.includes("water") ? "#dcdbd6" : id === "park" || id.includes("wood") ? "#e6e5e0" : "#e9e8e3");
    else if (l.type === "line")
      map.setPaintProperty(id, "line-color", id.includes("water") ? "#cfcec9" : id.startsWith("boundary") ? "#9a9994" : "#d6d5d0");
    else if (l.type === "symbol") {
      map.setPaintProperty(id, "text-color", "#63625c");
      map.setPaintProperty(id, "text-halo-color", "#f4f3ef");
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
}: {
  hexes: Hex[];
  pins: Pin[];
  center: [number, number]; // [lng, lat]
  zoom: number;
  highlight?: string;
  compact?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const overlay = useRef<MapboxOverlay | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!box.current) return;
    const map = new MapLibre({
      container: box.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center,
      zoom,
      attributionControl: { compact: true },
      interactive: !compact,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    if (!compact) map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("style.load", () => earthTone(map));
    map.on("error", (e) => console.error("maplibre", e.error?.message ?? e));
    overlay.current = new MapboxOverlay({ interleaved: false, layers: [] });
    map.addControl(overlay.current);
    return () => map.remove();
    // center/zoom only seed the camera; later changes are the user's pans
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact]);

  useEffect(() => {
    overlay.current?.setProps({
      getTooltip: ({ object }) =>
        object && "insured" in object
          ? `#${object.caseId} ${object.insured} · ${object.decision}`
          : object && "value" in object
            ? `Active TIV $${(object.value / 1e6).toFixed(1)}M`
            : null,
      layers: [
        new PolygonLayer<Hex>({
          id: "hexes",
          data: hexes,
          getPolygon: (h) => h.ring.map(([lat, lng]) => [lng, lat]),
          getFillColor: (h) => [26, 26, 25, 14 + h.level * 22],
          getLineColor: (h) => (h.cell === highlight ? INK : [26, 26, 25, 90]),
          getLineWidth: (h) => (h.cell === highlight ? 3 : 1),
          lineWidthUnits: "pixels",
          pickable: !compact,
          updateTriggers: { getLineColor: highlight, getLineWidth: highlight },
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
  }, [hexes, pins, highlight, compact, router]);

  // maplibre-gl.css sets .maplibregl-map to position: relative, outranking layered utilities, so size the parent.
  return (
    <div className="absolute inset-0">
      <div ref={box} className="h-full w-full" />
    </div>
  );
}
