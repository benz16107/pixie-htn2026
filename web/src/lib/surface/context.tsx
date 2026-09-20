"use client";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { Layer } from "@deck.gl/core";
import type { Map as MapLibre, PaddingOptions } from "maplibre-gl";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/**
 * The one map the whole desk moves through. A page doesn't get its own map instance; it gets a
 * camera command and a stack of deck.gl layers, and the Shell (mounted once, in the layout) carries
 * both across every navigation between queue, a case, and back. That's what makes opening a case a
 * flight instead of a page load.
 */

type Fly = { center: [number, number]; zoom: number; padding?: PaddingOptions; duration?: number };

type Ctx = {
  ready: boolean;
  reduced: boolean;
  setMap: (m: MapLibre | null) => void;
  setOverlay: (o: MapboxOverlay | null) => void;
  flyTo: (opts: Fly) => void;
  setLayers: (layers: Layer[], getTooltip?: (info: { object?: unknown }) => string | null) => void;
  project: (lngLat: [number, number]) => { x: number; y: number } | null;
};

const SurfaceCtx = createContext<Ctx | null>(null);

export function SurfaceProvider({ children }: { children: React.ReactNode }) {
  const mapRef = useRef<MapLibre | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const setMap = useCallback((m: MapLibre | null) => {
    mapRef.current = m;
    setReady(!!m);
  }, []);
  const setOverlay = useCallback((o: MapboxOverlay | null) => {
    overlayRef.current = o;
  }, []);

  const flyTo = useCallback(
    (opts: Fly) => {
      const map = mapRef.current;
      if (!map) return;
      if (reduced) {
        map.jumpTo({ center: opts.center, zoom: opts.zoom, padding: opts.padding });
      } else {
        map.flyTo({
          center: opts.center,
          zoom: opts.zoom,
          padding: opts.padding,
          duration: opts.duration ?? 1600,
          curve: 1.35,
          essential: true,
        });
      }
    },
    [reduced],
  );

  const setLayers = useCallback((layers: Layer[], getTooltip?: (info: { object?: unknown }) => string | null) => {
    overlayRef.current?.setProps({ layers, getTooltip: getTooltip ?? (() => null) });
  }, []);

  const project = useCallback((lngLat: [number, number]) => {
    const map = mapRef.current;
    if (!map) return null;
    const p = map.project(lngLat);
    return { x: p.x, y: p.y };
  }, []);

  const value = useMemo(() => ({ ready, reduced, setMap, setOverlay, flyTo, setLayers, project }), [ready, reduced, setMap, setOverlay, flyTo, setLayers, project]);

  return <SurfaceCtx.Provider value={value}>{children}</SurfaceCtx.Provider>;
}

export function useSurface() {
  const ctx = useContext(SurfaceCtx);
  if (!ctx) throw new Error("useSurface must be used inside SurfaceProvider");
  return ctx;
}
