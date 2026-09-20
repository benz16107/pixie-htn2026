import { PolygonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { useEffect, useState } from "react";
import type { Hex } from "@/contract";
import { PIN_FILL, type Pin } from "@/components/BookMap";

type RGBA = [number, number, number, number];
const INK: RGBA = [47, 42, 34, 255];
const PAPER: RGBA = [243, 239, 228, 255];

export function hexLayer(hexes: Hex[], opts: { id?: string; highlight?: string } = {}) {
  return new PolygonLayer<Hex>({
    id: opts.id ?? "hexes",
    data: hexes,
    getPolygon: (h) => h.ring.map(([lat, lng]) => [lng, lat]),
    getFillColor: (h) => [183, 129, 58, 40 + h.level * 45],
    getLineColor: (h) => (h.cell === opts.highlight ? INK : [143, 99, 39, 160]),
    getLineWidth: (h) => (h.cell === opts.highlight ? 3 : 1),
    lineWidthUnits: "pixels",
    pickable: false,
    updateTriggers: { getLineColor: opts.highlight, getLineWidth: opts.highlight },
  });
}

export function pinLayer(pins: Pin[], opts: { id?: string; onClick?: (p: Pin) => void; dim?: (p: Pin) => boolean } = {}) {
  return new ScatterplotLayer<Pin>({
    id: opts.id ?? "pins",
    data: pins,
    getPosition: (p) => [p.site.lng, p.site.lat],
    getFillColor: (p) => {
      const c = PIN_FILL[p.decision] ?? PIN_FILL.routed;
      return opts.dim?.(p) ? ([c[0], c[1], c[2], 70] as RGBA) : c;
    },
    getLineColor: (p) => (p.decision === "open" ? INK : PAPER),
    getRadius: (p) => (p.decision === "open" ? 8 : 6),
    radiusUnits: "pixels",
    lineWidthUnits: "pixels",
    getLineWidth: 2,
    stroked: true,
    pickable: !!opts.onClick,
    onClick: opts.onClick ? ({ object }) => object && opts.onClick!(object) : undefined,
    updateTriggers: { getFillColor: opts.dim },
  });
}

/**
 * The honesty of a decision made visible: an "open" case hasn't settled, so its pin carries an
 * unsettled halo instead of a solid mark. `phase` (0..1) breathes the ring outward; under reduced
 * motion it freezes at a fixed, still-legible radius instead of animating at all.
 */
export function unsettledLayer(pins: Pin[], phase: number, reduced: boolean) {
  const open = pins.filter((p) => p.decision === "open");
  const r = reduced ? 13 : 9 + phase * 9;
  return new ScatterplotLayer<Pin>({
    id: "unsettled",
    data: open,
    getPosition: (p) => [p.site.lng, p.site.lat],
    getFillColor: [0, 0, 0, 0],
    getLineColor: reduced ? [47, 42, 34, 130] : [143, 99, 39, Math.round(150 * (1 - phase))],
    getRadius: r,
    radiusUnits: "pixels",
    lineWidthUnits: "pixels",
    getLineWidth: reduced ? 1.5 : 2,
    stroked: true,
    filled: false,
    pickable: false,
    updateTriggers: { getRadius: phase, getLineColor: phase },
  });
}

/**
 * A slow, cheap breathing clock for the unsettled halo: 0..1..0 on a 2.2s sine, ticked at ~16fps
 * (not rAF) because it only drives a radius a few pixels wide, not a smooth drag. Frozen at 0
 * under reduced motion so callers can render the static ring instead.
 */
export function usePulsePhase(reduced: boolean) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const period = 2200;
    const t0 = performance.now();
    const id = setInterval(() => {
      const t = (performance.now() - t0) % period;
      setPhase((1 + Math.sin((t / period) * Math.PI * 2 - Math.PI / 2)) / 2);
    }, 60);
    return () => clearInterval(id);
  }, [reduced]);
  return phase;
}
