# D3: one continuous surface

## The idea, in three sentences

The book of business is a map and every case is a real pin at its real site; opening one flies
the camera there instead of loading a new screen, and the reasoning (score, facts, the
Challenger, precedent) unfolds as a dossier beside the pin it's about. The live desk is the same
map's control room, not a fourth page. Nothing that used to be a page is a page anymore: the
queue, a case and the live desk are three states of one persistent map, reachable by the same
back button, the same Escape key and the same URL a judge can be sent.

## How it's built

A route group, `web/src/app/(surface)/`, wraps `/queue`, `/cases/[id]`, `/map` and `/live` in one
layout (`layout.tsx` → `components/surface/Shell.tsx`). Shell mounts a single MapLibre + deck.gl
canvas once, in the layout, so Next's App Router keeps it mounted across navigations between
those routes: only the leaf page changes, the WebGL context and camera never remount. A React
context (`lib/surface/context.tsx`) hands each page two verbs: `flyTo` (camera, with padding so
the open map area always sits beside whatever panel is showing) and `setLayers` (deck.gl
polygons/pins for that page's data). `BookSurface` (queue and map, now the same component with
different initial state) commands the overview; `CaseSurface` commands a flight to the case's
site and renders the dossier. The live desk keeps its own existing `DeskMap` instance instead of
sharing the canvas (see "what's next"), so Shell skips mounting its map on `/live` and the
existing `LiveDesk` component renders untouched, full-bleed.

Every existing feature still exists: the score interval and waterfall, the what-if slider and
sensitivity flip, the Challenger panel, the decision-space 3D view, Elastic precedent and TIV
percentile, the agent lanes, the phone mirror, the actions, the `[elastic]`/`[memory]` backend
badges, every provenance badge and the "every number checked" mark. Nothing was deleted, only
reorganised: the six-column queue table became a three-line rail list sized for a 452px panel
(the original table's columns don't fit a sidebar and were clipping), and the hazard/portfolio
cards moved off the case page's small inset map onto the real one, next to the pin they describe.

## Motion and layout rules

- **One flight per navigation.** `flyTo` runs once per case (or once on mount for the overview),
  never on every render; MapLibre's own `flyTo` is already interruptible by a user drag mid-flight.
- **Padding, not repositioning.** The dossier and the rail don't sit *on top of* the map's logical
  center, they're excluded from it via MapLibre's `padding` option, so the pin the camera is
  aiming at always lands in the open half of the screen, never behind a panel.
- **Uncertainty is visible, not just labelled.** An `open` decision's pin carries a breathing
  unsettled ring on the map (a second, unfilled, radius-oscillating deck.gl layer) and its score
  bar gets a 2px `unsettled` wobble in the dossier. Both are decorative confirmation of what the
  OPEN chip already says in text, so `prefers-reduced-motion: reduce` freezes the ring at a fixed
  radius and drops the wobble instead of hiding the signal.
- **Reduced motion is a real second path, not a shorter first one.** The camera calls
  `jumpTo` instead of `flyTo` (checked in `context.tsx`, so every page gets it for free), the
  dossier's entrance transition is `motion-reduce:transition-none`, and the pulse hook never
  starts its interval. Verified by emulating `prefers-reduced-motion: reduce` and screenshotting
  at 250ms post-click: the dossier is already fully at rest (`d3-reduced-250ms.png`), where the
  equivalent normal-motion frame is still mid-flight.
- **Keyboard reaches everything a pin does.** Map pins are canvas pixels, not focusable DOM nodes,
  so the rail list beside the map is not decoration, it's the accessibility backbone: every case
  is a real `<Link>`, reachable by Tab, and once inside the list, ArrowUp/ArrowDown move focus
  between rows (`QueueRail.tsx`), matching the HUD's own `↑↓ move · Enter open · Esc back` hint.
  Escape returns to the book from any case, bound to `window.keydown` and to a visible `× esc`
  button in the dossier header, so it's discoverable without reading a hint. The HUD hint text
  itself is state-aware (it doesn't claim arrow-key list movement while looking at a case, where
  there's no list).

## What's next

- The live desk (`/live`) still drives its own separate `DeskMap` instance instead of the shared
  canvas; unifying them would let the underwriter fly from the book straight into a working case
  on the live desk without the current hard cut between the two surfaces.
- The hazard/portfolio cards float on the map at a fixed screen position rather than tracking the
  pin's actual projected pixel (`map.project()`) as the user pans; cheap to add, cut for time.
- `QueueTable.tsx`, `LiveMap.tsx`'s `LiveMap` export and `CaseMap.tsx` are now unused (superseded
  by `QueueRail` and the shared canvas) but left in place rather than deleted, in case another
  lane's comparison wants the reference.

## Screenshots

All at 1512x900, in `web/screenshots/`:

- `d3-01-queue.png` — the book as a map, rail list open, legend and keyboard hint visible.
- `d3-02-case.png` — a case flown to: portfolio callout and hazard card on the map, dossier open,
  waterfall and what-if slider legible at the dossier's working width.
- `d3-03-live.png` — the live desk (existing `LiveDesk`, now living inside the same shell).
- `d3-04-map-peril.png` — the `/map` entry point, same `BookSurface`, peril lens engaged.
- `d3-05-tenant-case.png` — a Toronto tenant case: price waterfall and receipt in the dossier,
  hazard card over the street-level map, no portfolio card (tenants don't have one).
- `d3-fly-0.png` through `d3-fly-5.png` — one interaction, six frames ~300ms apart: click a row
  in Illinois, watch the camera leave the continental overview and arrive at Chicago while the
  dossier is already open.
- `d3-reduced-instant.png` / `d3-reduced-250ms.png` — the same click under
  `prefers-reduced-motion: reduce`: no mid-flight frame exists, the camera is already at rest.
