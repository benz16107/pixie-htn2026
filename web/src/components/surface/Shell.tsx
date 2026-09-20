"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { Map as MapLibre, NavigationControl, setWorkerUrl } from "maplibre-gl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { earthTone } from "@/components/BookMap";
import { SurfaceProvider, useSurface } from "@/lib/surface/context";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const OVERVIEW: [number, number] = [-99, 37];

function Canvas() {
  const box = useRef<HTMLDivElement>(null);
  const { setMap, setOverlay } = useSurface();

  useEffect(() => {
    if (!box.current) return;
    const map = new MapLibre({
      container: box.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: OVERVIEW,
      zoom: 3.5,
      attributionControl: { compact: true },
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("style.load", () => earthTone(map));
    map.on("error", (e) => console.error("maplibre", e.error?.message ?? e));
    const overlay = new MapboxOverlay({ interleaved: false, layers: [] });
    map.addControl(overlay);
    setMap(map);
    setOverlay(overlay);
    return () => {
      setMap(null);
      setOverlay(null);
      map.remove();
    };
    // mounted once for the whole surface; pages command the camera, they don't remount it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-0">
      <div ref={box} className="h-full w-full" />
      <div aria-hidden className="contours pointer-events-none absolute inset-0 opacity-30 mix-blend-multiply" />
    </div>
  );
}

const MODES = [
  { href: "/queue", label: "Book" },
  { href: "/live", label: "Live desk" },
];

function Hud() {
  const path = usePathname();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between p-4">
      <Link href="/queue" className="pointer-events-auto rounded-sm border border-ink bg-paper/95 px-3 py-1.5 text-[12px] font-semibold tracking-[0.16em] shadow-[0_2px_10px_rgba(47,42,34,0.12)]">
        PIXIE<span className="ml-2.5 font-normal tracking-[0.04em] text-dim">underwriting desk</span>
      </Link>
      <nav aria-label="Surface" className="pointer-events-auto flex gap-3">
        <div role="group" aria-label="Where" className="flex rounded-sm border border-ink bg-paper/95 text-[12px] shadow-[0_2px_10px_rgba(47,42,34,0.12)]">
          {MODES.map((m) => {
            const on = path.startsWith(m.href) || (m.href === "/queue" && (path.startsWith("/cases") || path.startsWith("/map")));
            return (
              <Link
                key={m.href}
                href={m.href}
                aria-current={on ? "page" : undefined}
                className={`px-3 py-1.5 transition-colors duration-150 ${on ? "bg-ink text-paper" : "hover:bg-land"}`}
              >
                {m.label}
              </Link>
            );
          })}
        </div>
        <div className="flex gap-2 self-center text-[11px] text-dim">
          <Link href="/ask" className="rounded-sm border border-rule bg-paper/90 px-2 py-1 hover:border-ink hover:text-ink">Ask</Link>
          <Link href="/backtest" className="rounded-sm border border-rule bg-paper/90 px-2 py-1 hover:border-ink hover:text-ink">Backtest</Link>
        </div>
      </nav>
    </div>
  );
}

function KeyHint() {
  const path = usePathname();
  const onACase = path.startsWith("/cases");
  return (
    <p className="pointer-events-none fixed bottom-4 right-4 z-30 hidden rounded-sm border border-rule bg-paper/95 px-2.5 py-1 font-mono text-[10.5px] text-dim shadow-[0_2px_10px_rgba(47,42,34,0.1)] md:block">
      {onACase ? "Esc back to the book" : "↑↓ move · Enter open · Esc back"}
    </p>
  );
}

function Legend() {
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-30 hidden items-center gap-3 rounded-sm border border-rule bg-paper/95 px-3 py-1.5 font-mono text-[10.5px] text-dim shadow-[0_2px_10px_rgba(47,42,34,0.1)] md:flex">
      <span className="flex items-center gap-1.5">
        <span className="inline-block size-2.5 rounded-full border-2 border-ink bg-paper" /> open, unsettled
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block size-2.5 rounded-full bg-moss" /> written
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block size-2.5 rounded-full bg-rust" /> declined
      </span>
      <span>every number on this desk carries where it came from</span>
    </div>
  );
}

function Inner({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  // The live desk brings its own full-bleed control room (DeskMap); don't pay for a second
  // WebGL context underneath it.
  const showMap = !path.startsWith("/live");
  return (
    <div className="fixed inset-0 overflow-hidden bg-paper">
      {showMap && <Canvas />}
      {showMap && <Hud />}
      {children}
      {showMap && <Legend />}
      {showMap && <KeyHint />}
    </div>
  );
}

export function SurfaceShell({ children }: { children: React.ReactNode }) {
  return (
    <SurfaceProvider>
      <Inner>{children}</Inner>
    </SurfaceProvider>
  );
}
