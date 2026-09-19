# Expo + Gemini research for Pixie

Scope: what runs in Expo Go on SDK 57 with zero custom native build, and what the Gemini API
offers today, both scored for the Pixie demo (Toronto tenant-insurance quote app: hexagon risk
map + priced receipt). Verified items cite a URL; anything not checked against a primary source
is marked **unverified**.

## Part 1 — Expo SDK 57, Expo Go only

Two facts gate everything below:

- SDK 57 bundles React Native 0.86 and Reanimated 4.3–4.5, which **require the New
  Architecture**; New Arch has been the default (Legacy Architecture dropped) since SDK 55, so
  a plain `npx expo start` + Expo Go app already runs on it — no opt-in needed.
  [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57)
- Since **SDK 53, Expo Go no longer supports remote push notifications** (Android especially);
  local/in-app notifications still work. A development build is required for real push.
  [Expo Notifications docs](https://docs.expo.dev/versions/latest/sdk/notifications/)

| Module | Works in Expo Go? | What it adds to Pixie | Effort |
|---|---|---|---|
| `expo-haptics` | Yes — standard SDK module | Impact feedback on quote reveal, selection tick on map hexes, success notification when receipt generates | 10 min |
| `expo-location` | Yes | Auto-fill the Toronto address from device GPS instead of typing it | 15 min |
| `expo-camera` | Yes | "Photograph your apartment" flow — capture 1–3 room photos to feed Gemini vision for contents estimation | 20 min |
| `expo-image` | Yes | Fast, cached image rendering for the risk-map hex thumbnails / apartment photos | 10 min (likely already used) |
| `expo-blur` | Yes | Frosted-glass card behind the price on the receipt screen, blur over map while a bottom sheet is open | 10 min |
| `expo-linear-gradient` | Yes | Risk-tier gradient fills on hexagons (green→amber→red), receipt header gradient | 10 min |
| `react-native-maps` (custom markers, `Polygon`/`Circle`, animated camera, `mapType`) | Yes — works in Expo Go without prebuild, per Expo/community docs | The actual hexagon risk map: `Polygon` per hex colored by risk tier, custom `Marker` for the address pin, `animateCamera` to fly in when the quote resolves | 45–90 min (this is core product, already likely built) |
| Reanimated 4 + Gesture Handler (bottom sheets, shared-element-style transitions) | Yes, runs on New Arch by default in Expo Go SDK 57 | Draggable bottom sheet for quote details, swipe-to-dismiss coverage cards, shared transition from address form → risk map → receipt | 30–60 min if not already wired |
| `expo-audio` / `expo-video` | Yes (replaces deprecated `expo-av`, fully removed in SDK 55) | Play back a generated voice walkthrough of the quote (see Gemini TTS below) | 15 min |
| `expo-speech` | Yes | Cheap on-device TTS fallback (no API cost) for reading the quote aloud if Gemini TTS is skipped | 10 min |
| `expo-sharing` | Yes — confirmed in Expo Go | Native share sheet for the PDF receipt | 10 min |
| `expo-print` | Documented as an SDK module; not directly confirmed against Expo Go in this pass — **treat as likely-yes, spot-check on device** | `Print.printToFileAsync()` to turn the receipt into a real PDF, then hand to `expo-sharing` | 20–30 min |
| `expo-notifications` | Local notifications only in Expo Go (remote push broken since SDK 53) | Local reminder notification ("your quote is ready") — skip anything server-push | 10 min if used only locally |
| `expo-clipboard` | Yes | Copy policy number / quote ID | 5 min |
| `expo-web-browser` | Yes | Open Toronto rental-market source links or policy PDF from an in-app browser instead of leaving the app | 5 min |
| `expo-file-system` | Yes, but SDK 54 replaced the old `writeAsStringAsync`/`documentDirectory` API with a new `File`/`Directory`/`Paths` class API; the old one still exists at `expo-file-system/legacy` | Save the generated PDF/JSON receipt locally before sharing | 15 min |
| `expo-sensors` | Yes | Not obviously useful for underwriting; skip unless a gimmick is wanted (e.g., tilt-to-reveal risk score) | n/a |
| Accessibility APIs (`AccessibilityInfo`, roles/labels) | Yes, core React Native | Screen-reader labels on the map hexes and price breakdown — cheap correctness win, also a judge-visible polish signal | 20 min |
| `expo-router` (typed routes, modals, deep links) | Yes | Typed routes for address → risk-map → receipt flow; a `deepLink` like `pixie://quote/<id>` to reopen a saved quote | 15–30 min if not already on Router |
| EAS Update (OTA) | **Does not apply to Expo Go** — `expo-updates` is inert inside Expo Go itself; OTA only affects standalone/dev-client builds | Not usable for the Expo Go demo; skip | n/a |
| `expo-dev-client` | Requires `eas build`/prebuild — out of scope for a no-custom-build app | n/a | n/a |
| `expo-widgets` (iOS widgets/Live Activities, stable since SDK 56) | **No** — the config plugin generates a native Widget Extension target via prebuild; cannot run inside stock Expo Go | Would be the "why is my price this" Live Activity, but needs a dev build. Skip for Expo Go track, note as a "if we had another day" line for the demo pitch | n/a |
| `use dom` directive (DOM Components) | Yes since SDK 52, present in 57 | Low value here — Pixie doesn't need an embedded web view; skip | n/a |

Sources: [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57), [Expo Notifications docs](https://docs.expo.dev/versions/latest/sdk/notifications/), [Expo Sharing](https://docs.expo.dev/versions/latest/sdk/sharing/), [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/), [react-native-maps Expo Go compatibility](https://reactnativerelay.com/article/react-native-maps-expo-google-maps-markers-clustering-directions), [expo-av removal](https://x.com/expo/status/2029307755174216109), [EAS Update / Expo Go behavior](https://docs.expo.dev/eas-update/introduction/), [expo-widgets / Live Activities stable in SDK 56](https://expo.dev/blog/ios-widgets-and-live-activities-in-expo), [expo-file-system new API](https://expo.dev/blog/expo-file-system), [DOM components guide](https://docs.expo.dev/guides/dom-components/).

## Part 2 — Gemini API, current state

GEMINI_API_KEY is already live in `atlas/.env`; confirmed working models: `gemini-2.5-flash`,
`gemini-2.5-pro`, `gemini-3-flash-preview`, plus TTS and image models (per task brief, not
re-verified here).

| Capability | What it does | What Pixie could do with it | Cost | Effort |
|---|---|---|---|---|
| Structured outputs (`response_schema` / `responseSchema`) | Forces JSON matching a schema | Already probably used for the quote JSON; extend to force a strict `{contents: [...], estimatedValue}` object from the apartment-photo flow | Standard token price, no premium | 15 min if pattern already exists |
| Function calling (+ thought signatures when thinking is on) | Model emits structured function calls; when thinking is enabled you must round-trip `thought_signature` | Let the OpenAI Agents SDK desk call into a Gemini-backed "explain my price" tool, or have Gemini call a local `getUnderwritingFactors()` function | Standard token price | 30–45 min |
| Thinking / `thinking_level` (MINIMAL/LOW/MEDIUM/HIGH, replaced `thinking_budget` as of March 2026) | Controls reasoning depth | Turn thinking down (MINIMAL/LOW) for the fast quote path to cut latency during a live demo | Higher thinking level = more output tokens = more cost | 5 min (one param) |
| Multimodal image understanding | Vision on uploaded images | **Photograph-your-apartment flow**: 1–3 photos → Gemini lists visible contents (TV, laptop, furniture) → feeds the contents-value estimate that drives the quote | gemini-2.5-flash input pricing: $0.30/1M tokens (image/text/video) | 45–60 min |
| Video understanding | Frame-sampled video analysis (1 fps default), 2GB free / 20GB paid via File API, YouTube URL support with an 8 hr/day free-tier cap | Lower priority for Pixie — a photo walkthrough is faster to demo than a video upload; keep as a stretch | Same token pricing as image; more tokens per second (~100–300/sec) | Skip unless time allows |
| Grounding with Google Maps | Returns places, reviews, photos, addresses, opening hours near a location; no separate Maps Platform key needed, uses the same Gemini key; globally available but "may not be available in all regions" and English-only prompts | **Underwriting note from real surroundings**: ground on the Toronto address, pull back what's actually nearby (fire hall proximity, bars/nightlife density, construction) as a one-paragraph underwriting rationale next to the price | Gemini 3: billed per search query executed; Gemini 2.5: billed per prompt that returns results. Exact $ rate not found in this pass — **unverified**, check `ai.google.dev/gemini-api/docs/pricing` at build time | 30–45 min |
| Grounding with Google Search | Live web search grounding, billed per executed search query (Gemini 3) | Ground rental-market comps or recent Toronto flood/break-in news for the risk narrative | Rate not confirmed in this pass — **unverified** (older public number was ~$35/1000 requests past a free daily quota; not re-verified for 2026) | 20–30 min |
| URL context tool | Feeds specific URLs (incl. PDFs) into the prompt | Pull a specific City of Toronto flood-map or crime-stats page by URL as underwriting evidence instead of open search | Input-token rate for fetched content | 20 min |
| Code execution tool | Model writes + runs Python in a sandbox inline | Have Gemini compute the actual premium math (transparent, inspectable) rather than trusting a hallucinated number — strong "explainability" story for judges | Standard token rate for code + output | 30 min |
| Live API (realtime voice/video, GA on Vertex per one 2026 source, still called "preview" in others) | Bidirectional audio/video streaming, ~25 tokens/sec of audio, roughly $3/1M input + $12/1M output audio tokens (~$0.005/min in, $0.018/min out on the Flash Live tier) | **"Why is my price this?" live voice conversation** — renter taps a mic button, asks a follow-up, gets a spoken answer grounded in their actual quote factors | ~$0.02–0.04/min all-in at the rates found; cheap for a demo | 60–90 min (websocket session, audio capture via `expo-audio`, playback) |
| Embeddings (Gemini Embedding 2) | Text $0.20/1M tokens, image $0.45/1M ($0.00012/image) | Low priority — no obvious retrieval need in a single-quote flow; skip unless building a comps database | Cheap | Skip |
| Batch mode | 50% discount vs. standard, e.g. Flash input $0.15/1M vs $0.30/1M | Not useful live in a demo (batch = async, minutes-to-hours turnaround); irrelevant to a real-time hackathon judge flow | n/a | Skip |
| Context caching | Flash: $0.03/1M cached tokens; Pro: $0.125–0.25/1M | Cache the underwriting system prompt / rulebook across repeated quote calls to cut per-request cost | Marginal for a hackathon-scale demo | Skip unless cost becomes real |
| Image generation (`gemini-2.5-flash-image`, "Nano Banana") | $0.039/image standard (1290 output tokens at $30/1M), $0.0195/image in batch | Generate a stylized "risk map hex art" hero image or a fun before/after "your neighbourhood as insurance sees it" visual for the receipt/share card | ~$0.04/image, trivial for a demo | 30–45 min |
| TTS models (Gemini 2.5 Flash Preview TTS) | Input $0.50/1M, output $10/1M audio tokens | **Voice walkthrough of the quote**: short TTS narration ("Your Toronto apartment near King & Bathurst comes in at $23/month because...") played through `expo-audio` | A 30-second narration is a few cents | 30 min |
| Gemini CLI | Free, terminal coding agent, ReAct loop + MCP | Not an in-app feature — a dev tool for building Pixie faster, not something to demo inside the app | Free tier: 1000 req/day | n/a for the pitch |

Sources: [Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output), [Function calling](https://ai.google.dev/gemini-api/docs/generate-content/function-calling), [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing), [Grounding with Google Maps](https://ai.google.dev/gemini-api/docs/maps-grounding), [Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search), [URL context tool GA](https://developers.googleblog.com/url-context-tool-for-gemini-api-now-generally-available/), [Video understanding](https://ai.google.dev/gemini-api/docs/video-understanding) (fetched via cache, not independently re-verified for every number), [Live API pricing discussion](https://discuss.ai.google.dev/t/pricing-of-speech-to-speech-live-model/140340), [Gemini 2.5 Flash Image pricing](https://developers.googleblog.com/introducing-gemini-2-5-flash-image/), [Gemini CLI](https://github.com/google-gemini/gemini-cli).

**Unverified / flag for re-check before the pitch:** the exact $/1000 rate for Google Search
grounding in 2026, and whether Google Maps grounding responses are English-only in a way that
blocks a French/bilingual Toronto framing (docs say English-only prompts/responses as of this
pass) — worth a 2-minute live check against `ai.google.dev/gemini-api/docs/pricing` the morning
of the demo since these numbers move often.

## Part 3 — ranked plan (10–14 features)

Ranked by (impact for the two prizes) ÷ (effort), high to low.

1. **Hexagon risk map with `react-native-maps` `Polygon`/animated camera** (Expo, ~60–90 min,
   if not already built) — this is the product; both prizes depend on it looking native and the
   underwriting story being visible.
2. **PDF receipt via `expo-print` + `expo-sharing`** (Expo, ~30 min) — turns "a screen" into "a
   document you can text your landlord," a concrete deliverable judges can hold.
3. **Haptics + Reanimated bottom sheet for the quote reveal** (Expo, ~40 min) — the single
   biggest "feels native" signal for the Expo prize criteria, cheap to add.
4. **Code execution tool computes the premium math live** (Gemini, ~30 min) — unconventional:
   instead of the model asserting a number, it writes and runs the pricing formula in front of
   the user, which is a strong "trustworthy underwriting" demo beat.
5. **Photograph-your-apartment → Gemini vision lists contents → feeds the quote** (Expo camera +
   Gemini multimodal, ~60–90 min combined) — unconventional, the single most "wait, it actually
   understood my room" moment for judges.
6. **Grounding with Google Maps as an underwriting note** (Gemini, ~30–45 min) — unconventional:
   "23 bars within 500m, nearest fire hall 1.2km" printed next to the price is a genuinely novel
   use of the sponsor API tied to the product's actual purpose.
7. **TTS voice walkthrough of the quote** (Gemini TTS + `expo-audio`, ~30 min) — unconventional,
   cheap, and demoable in 15 seconds on stage.
8. **`expo-location` auto-fills the address** (Expo, ~15 min) — small but removes a typing step
   in the demo, makes the flow look considered.
9. **`expo-blur` + `expo-linear-gradient` polish pass on receipt/map** (Expo, ~20 min combined) —
   cheap visual lift, directly scored by "beautiful, feels truly native."
10. **Live API "why is my price this?" voice Q&A** (Gemini, ~60–90 min) — highest-effort item
    on the list but the most memorable if it lands: a judge asks a spoken follow-up and gets a
    grounded spoken answer mid-demo.
11. **`expo-router` typed routes + deep link to reopen a saved quote** (Expo, ~20 min) — small
    correctness/polish item, easy to skip if time runs out.
12. **Accessibility labels on the map and price breakdown** (Expo, ~20 min) — cheap, real, and a
    detail judges from an accessibility-conscious sponsor track will notice.
13. **Nano Banana hero/share-card image** (Gemini image gen, ~30–45 min) — unconventional but
    optional: a generated "your neighbourhood as risk art" image for a share card, only if time
    remains after 1–10.
14. **Grounding with Google Search for a recent-news underwriting line** (Gemini, ~20–30 min) —
    lowest priority; overlaps in spirit with Maps grounding (#6), which is the stronger, more
    on-theme choice, so build this only as a fallback if Maps grounding underperforms in testing.

Cut list if short on time: skip embeddings, batch mode, context caching, video understanding,
`expo-sensors`, `expo-widgets`/Live Activities (blocked by needing a dev build), and the `use
dom` directive — none change the demo's story and several are blocked outright in Expo Go.

## Part 4 — booth sentences

**Expo:**
1. Pixie runs entirely in Expo Go on SDK 57 — no dev client, no custom native build, just scan
   and go.
2. The hexagon risk map is `react-native-maps` with animated camera moves and per-hex risk-tier
   polygons, not a static image.
3. The quote reveal uses Reanimated 4 gestures and `expo-haptics` so it feels like a native iOS
   sheet, not a web view.
4. Tenants can generate a real PDF receipt on-device with `expo-print` and hand it off through
   the native share sheet via `expo-sharing`.
5. Every one of those — maps, haptics, gestures, PDF export — ships from a single Expo Go
   session with zero EAS build step.

**Gemini:**
1. Pixie points its camera at your apartment, and Gemini's vision reads the room to estimate
   what's actually inside it for contents coverage.
2. Grounding with Google Maps pulls real, current data about what's near the address — bars,
   fire halls, construction — straight into the underwriting note.
3. The premium isn't a number Gemini claims; the code execution tool runs the actual pricing
   formula live and shows its work.
4. A Gemini TTS narration reads the quote back to you in under 30 seconds, generated fresh for
   every address.
5. Ask "why is my price this?" out loud, and the Live API answers back in real time, grounded in
   your specific quote.
