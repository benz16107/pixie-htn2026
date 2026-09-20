"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapLibre, setWorkerUrl } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type { Hex } from "@/contract";
import { earthTone } from "./BookMap";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

// Web Mercator at MapLibre's 512px tiles, so the SVG overlay lines up with the basemap at a fixed camera.
const project = (lat: number, lng: number, z: number) => {
  const w = 512 * 2 ** z;
  const s = Math.sin((lat * Math.PI) / 180);
  return [((lng + 180) / 360) * w, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * w];
};

/**
 * Case mini-map: a static camera, so the hexes and the pin are plain SVG over the basemap.
 * If the tiles never load (offline demo), the SVG still draws on the contour background.
 */
export default function CaseMap({
  site,
  zoom,
  hexes,
  home,
}: {
  site: { lat: number; lng: number };
  zoom: number;
  hexes: Hex[];
  home?: [number, number][];
}) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 550 });

  useEffect(() => {
    if (!box.current) return;
    const el = box.current;
    setSize({ w: el.clientWidth, h: el.clientHeight });
    let map: MapLibre | null = null;
    try {
      map = new MapLibre({
        container: el,
        style: "https://tiles.openfreemap.org/styles/positron",
        center: [site.lng, site.lat],
        zoom,
        interactive: false,
        attributionControl: { compact: true },
        canvasContextAttributes: { preserveDrawingBuffer: true },
      });
      map.on("style.load", () => earthTone(map!));
    } catch {
      // No WebGL: the SVG layer below still shows the site.
    }
    return () => map?.remove();
  }, [site.lat, site.lng, zoom]);

  const [cx, cy] = project(site.lat, site.lng, zoom);
  const pt = (lat: number, lng: number) => {
    const [x, y] = project(lat, lng, zoom);
    return `${(x - cx + size.w / 2).toFixed(1)},${(y - cy + size.h / 2).toFixed(1)}`;
  };
  const poly = (ring: [number, number][]) => ring.map(([la, ln]) => pt(la, ln)).join(" ");

  return (
    <div className="absolute inset-0">
      {/* When the style cannot load (offline), the canvas stays transparent and the contour background shows. */}
      <div ref={box} className="h-full w-full" />
      <svg aria-hidden className="pointer-events-none absolute inset-0" width={size.w} height={size.h}>
        {hexes.map((h) => (
          <polygon key={h.cell} points={poly(h.ring)} fill="#1a1a19" fillOpacity={0.05 + h.level * 0.08} stroke="#1a1a19" strokeOpacity={0.35} strokeWidth={0.75} />
        ))}
        {home && <polygon points={poly(home)} fill="#1a1a19" fillOpacity={0.08} stroke="#1a1a19" strokeWidth={1.5} />}
        <circle cx={size.w / 2} cy={size.h / 2} r={6} fill="#1a1a19" stroke="#f4f3ef" strokeWidth={2} />
      </svg>
    </div>
  );
}
