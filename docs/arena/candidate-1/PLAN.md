# Atlas execution plan (candidate 1, the interval desk)

Solo build, Sat 17:45 to Sun 08:00 EDT. Ben plus three coding agents. Design: `DESIGN.md`. Types: `sketch/`.

Lanes:
- **B** = Ben. Integrator, keys, answer key, prompt tuning, merges, demo.
- **A1** = Claude Code, backend core (`api/`): Federato client, case, engine, desk, actions.
- **A2** = Claude Code, front ends: `web/` first, then `app/` (Expo) from 00:15.
- **A3** = Codex, data and proof: region packs, prefetch caches, Elastic, backtest, tests, Gemini/ElevenLabs wrappers. Every A3 task is logged in `CODEX.md` with its commit (OpenAI evidence).

Branch rule: each agent works in its own git worktree on `lane/a1`, `lane/a2`, `lane/a3`. Ben merges to `main` at every milestone and tags `demo-safe-N`. The contract (`api` pydantic models, exported to `shared/api.d.ts`) changes only through A1, and A1 posts fixture JSON (`api/fixtures/*.json`) at 18:45 so A2 never waits on a live backend.

---

## 1. Hour-by-hour timeline

| Time | B (Ben) | A1 backend | A2 web / Expo | A3 Codex data + proof | Milestone, "done when" |
|---|---|---|---|---|---|
| 17:45-18:15 | Setup checklist part 1 (section 3): OpenAI key + model ids, Linq sandbox status, Sentry 3 projects, Elastic trial, Composio Gmail connect. Write `AGENTS.md` lane rules. | T1 Federato client (token, cache, typed errors) | W1 Next.js shell, design tokens, fixture loader, route skeletons | C1 Toronto pack download scripts (TPS B&E, basement flooding, fire stations, hydrants, TRCA floodline, address points) | **M0 18:15**: `uv run python -m atlas_api.federato ping` returns schema; `pnpm dev` serves `/queue` with fixture |
| 18:15-19:15 | Answer key: hand-score 10 cases in `eval/answer_key.yaml` (6 open property, 115, 2 bound property, 1 cgl). Linq 10-minute live test (send + inbound). | T2 SchemaGraph + QueryBuilder + lint; T3 World + Case (hq path, renewal inference, issues) | W2 queue table (interval bar, decision chip, issues icons) | C2 US prefetch: FEMA, USGS, USFS, Open-Meteo, Nominatim for 70 locations to `cache/layers/` | A1 posts fixtures at 18:45 |
| 19:15-20:15 | Review T2/T3 against the data; tune renewal and duplicate rules; merge | T4 engine `assess` + `rules/property_2025.yaml` + `estimate_premium` + templated explanations | W3 case page: facts with provenance badges, factor table with possible bands, contradictions, issues panel | C3 `packs/us` loader + curves + `risk.profile`; answer-key test runner | **M1 20:15 (Federato MVP)**: `uv run atlas triage` prints 158 rows with interval, decision, 2-3 line reason; answer key passes at least 8 of 10; tag `demo-safe-1` |
| 20:15-20:45 | Dinner | T5 FastAPI routes `/queue`, `/cases/{id}` from the engine; Sentry FastAPI + logs | W3 wired to the live API | C3 continued: enrichment on/off chip data | |
| 20:45-22:45 | Prompt the five agents on 138, 143, 126; watch lanes; adjust `DeskPolicy` | T6 `DeskEvent`, `CaseLog`, `CaseFile.fold`; T7 five agents (Agents SDK, output_type), scheduler, conflicts, `verify_numbers`; T8 replay recorder | W4 swimlane component (lanes, ask/answer arrows, tool chips, interval animation) on SSE, replay speed control | C4 Elastic: `atlas-exposure` + `toronto-events` loaders, `ExposureIndex` both impls, equality test; C5 Toronto hex scores with shrinkage | **M2 22:45**: `POST /desk/run {caseIds:[138,143,126]}` completes live in under 60 s each; lanes render live and in replay; at least one Ask between two specialists appears |
| 22:45-00:15 | Freeze the backtest definitions: commit `eval/BACKTEST.md` BEFORE the first run. Draft demo script v1 | T9 `ask()` NL path (lint, run, retry); T10 wire backtest to API | W5 map page (book hexes by TIV and peril, case pin, portfolio impact line); W6 ask box (attempts, payload JSON, rows); W7 backtest page | C6 `backtest()` metrics B1-B4 with as_of leakage rule; C7 `rules/tenant.yaml` + `packs/toronto` layers + `quote_tenant` + tests | **M3 00:15 (Federato complete)**: demo beats 1-4 of section 6 run from a clean browser; backtest page shows measured numbers; tag `demo-safe-2` |
| 00:15-01:45 | Actions end to end on real accounts; phone testing of Expo | T11 Outbox + Composio broker email; T12 Linq digest out + webhook in + `apply_command`; T13 SSE push of human decisions to the queue | E1-E5 Expo app: address, map, 3 questions, decision, receipt, list path, "View as underwriter", "Read my quote" | C8 Gemini surroundings card + ElevenLabs `speak` with caches; C9 Sentry web Session Replay + Expo JS errors + uptime monitor on `/health` | **M4 01:45**: broker email arrives in the demo inbox; digest arrives on Ben's iPhone; reply "approve 1" flips the web row within 3 s; Expo quote completes on the phone in Expo Go |
| 01:45-02:30 | Full precompute: desk run on all deep dives, 3 canned questions, backtest, tenant quotes for 3 demo addresses; record replay; rehearse once | Fix list from rehearsal | Fix list from rehearsal | Offline check: `ATLAS_OFFLINE=1`, Wi-Fi off, the whole demo runs | **Feature freeze 02:15.** Tag `demo-safe-3` |
| 02:30-06:00 | **Sleep 3.5 h** | idle | idle | Bounded overnight tasks on `lane/a3-night` only: O1 Expo accessibility audit (labels, 44 pt, dynamic type), O2 README and Intact README drafts, O3 extra tests. No merges | Sentry uptime monitor watches the tunnel overnight |
| 06:00-07:00 | Merge chosen overnight work; rerun precompute if anything in the engine changed; record the backup video (5 min, screen + phone) | Only fixes Ben names | Only fixes Ben names | CODEX.md and INCIDENTS.md evidence pass | **Code freeze 07:00.** Tag `submitted` |
| 07:00-07:45 | Devpost write-up, README, Intact README section, screenshots, video upload; submit | | | | **Submitted 07:45** (15 min buffer before 08:00) |
| 08:00-09:45 | Rehearse the 5-minute demo 3 times and each 60-s booth pitch; mint Federato token at 09:30; phone charged; hotspot ready | | | | |

Rules for the night:
- A milestone missed by more than 30 minutes triggers the cut order in section 9, not a later bedtime.
- Ben never codes a feature after 00:15. He integrates, tests on the phone and fixes.
- Every merge runs `uv run pytest -q` and `pnpm -C web build`. Red means no merge.

---

## 2. Task list per lane

Each task is small enough to paste into a coding agent. "Accept" is the test that closes it.

### A1 backend (Claude Code)

| ID | Task | Inputs | Outputs | Accept |
|---|---|---|---|---|
| T1 | Federato client: token mint + cache `.token` + refresh at 3h50m or on 401 (once); `query()` with payload-hash disk cache; parse `[CODE] message {json}` into `FederatoError`; Sentry span per call | `sketch/federato.py`, `.env`, API docs | `api/src/atlas_api/federato.py` | pytest: a bad operator `$grt` raises `FederatoError(code=VALIDATION)`; second identical query hits cache (0 network calls, mocked) |
| T2 | `SchemaGraph.from_schema`, `paths()` incl. reverse refs (Policy.submission), `QueryBuilder.fetch` and `lint` | `federato/schema.json` | same module | `paths("Submission","Building.tiv")` returns a path through `insured.hq` and one through reverse `Policy.submission`; `lint` flags `exposure_units.location.state` as `array_dot_path` with an `$elemMatch` fix; a `fetch()` payload runs live and returns rows |
| T3 | `Snapshot.load_or_fetch` (all 12 resources, paginated) and `World.load` indexes; `World.case(id, as_of)` with the fact preference order, renewal inference, `DataIssue`s (duplicate account, broker conflict, limit vs TIV, missing roof year) | `sketch/case.py`, data | `case.py` | asserts in `case.py __main__`: 138 TIV $2,073,000 via hq; premium `Missing(broker)`; 126 and 141 flagged duplicate with broker conflict; 143 `business_type` Estimated renewal citing PR-2026-1031 |
| T4 | `RulesFile.load`, `evaluate`, `assess`, `estimate_premium`, template explanations, `rules/property_2025.yaml` | `sketch/engine.py`, guideline | `engine.py`, `rules/` | answer key test passes >= 8/10; any Missing fact yields all three bands; non-property yields `Routed`; `without_enrichment` differs from `score` for at least 3 cases |
| T5 | FastAPI app: `/queue`, `/cases/{id}`, `/health`; pydantic response models = contract; export OpenAPI; `shared/api.d.ts` generation script | contract.ts | `app.py`, `shared/api.d.ts` | `curl /queue?view=open` returns 21 rows in < 500 ms; `npx openapi-typescript` runs clean |
| T6 | `DeskEvent`, `event_id`, `CaseLog` (JSONL, idempotent append, `stream` live and replay), `CaseFile.fold` | `sketch/desk.py` | `desk.py` | appending the same event twice returns False the second time; replay of a recorded file emits events in order with scaled timing |
| T7 | The five agents with the Agents SDK (`Agent`, `output_type`, `function_tool`), scheduler (`asyncio.gather`, semaphore 4), conflict computation, allowed-resolution check, `verify_numbers`, `DeskPolicy.deep_dive_candidates`; `add_trace_processor` mirrors SDK spans into `tool_call` events | engine, portfolio, risk | `desk.py`, `agents/*.md` prompts | live run on 138 produces events from all five actors, at least one `ask` from a specialist to another specialist, a `resolution` whose option is in `allowed`, an explanation that passes `verify_numbers`; a planted wrong number in a test explanation is rejected |
| T8 | Replay recorder: `atlas record --run all` writes `cache/events/<run>/`; `/cases/{id}/events?replay=1` | T6 | CLI + route | Wi-Fi off, replay of 138 plays in the UI |
| T9 | `ask()`: Intake with `schema_summary`, `paths`, `lint_query`, `run_query`; up to 3 attempts; answer verified against rows; 3 canned questions cached | `sketch/proof.py` | `proof.py` | "Florida property locations with unsprinklered buildings over $5M TIV" returns a payload using `expand` on buildings and the right filter; a deliberately bad first draft shows a lint fix in `attempts` |
| T10 | `/backtest` serving C6's report; `/map/book`, `/map/toronto` from the pack hexes | C4, C5, C6 | routes | endpoints return in < 1 s from cache |
| T11 | `Outbox` + `request_broker_info` via Composio with explicit `connected_account_id`; `ATLAS_ACTIONS=dry|live` | `sketch/actions.py` | `actions.py` | clicking twice sends one email; email lists only flipper facts; lands in the demo inbox |
| T12 | `LinqClient` (base path from config), `send_digest`, `/webhooks/linq` (raw log first, signature check, tolerant parse), `apply_command` | Linq test results from B | same | real phone: digest arrives; "approve 1" writes a `human` decision; "why 2" gets the explanation back; unknown sender ignored |
| T13 | SSE `/events/queue` pushing human decisions and action status to the queue page | T12 | route | web row updates within 3 s of the iMessage reply |

### A2 web and Expo (Claude Code)

| ID | Task | Inputs | Outputs | Accept |
|---|---|---|---|---|
| W1 | Next.js shell: layout, nav (Queue, Map, Ask, Backtest), type scale, colour tokens (no purple, no glow, off-white paper background), fixture loader, API client from `shared/api.d.ts` | contract | `web/src/app/*` | `pnpm build` passes; pages render fixtures |
| W2 | Queue table: rank, insured, line, state, interval bar with thresholds 45/70 drawn, decision chip (open shows flipper icons), issues, enrichment delta, value at stake; filters open/all | QueueRow fixtures | `queue/page.tsx` | 21 open rows readable at 1280 px; keyboard sortable |
| W3 | Case page: header decision + interval, facts table with provenance badges (known, estimated with range, missing with resolver), factor table with possible bands, contradictions box, risk factors with source links and cap marks, portfolio line, explanation with "verified" tick, actions panel | CaseView | `cases/[id]/page.tsx` | page for 138, 143, 126 and a tenant case renders; every number has a source on hover |
| W4 | Swimlanes: one lane per actor (lead, intake, appetite, hazard, portfolio, system, human), events as cards on a shared time axis, ask/answer arrows, tool chips expandable to JSON, interval bar animating on `assessment` events; SSE live and replay with speed 1x/4x | DeskEvent stream | `components/Swimlanes.tsx` | replay of 138 shows arrows between lanes; unknown event kinds render as a generic card |
| W5 | Map page (MapLibre GL JS + polygons from `/map/book`): hexes by active TIV, peril filter, case pins coloured by decision, click pin opens case | Hex[] | `map/page.tsx` | 76 active policies aggregated; switching peril recolours |
| W6 | Ask box: input, canned question chips, attempts list (payload JSON with lint notes and errors), final table, verified answer | AskResult | `ask/page.tsx` | canned question returns from cache in < 1 s; live question streams Intake events |
| W7 | Backtest page: B1 tier table with loss ratios and n, Spearman with n, B2 decline table with match/not_modeled, B3 changed tiers, B4 guideline vs book, registered commit hash | BacktestView | `backtest/page.tsx` | all numbers come from the API; "n=27" shown next to every B1 stat |
| E1 | Expo Router screens: Address (text + "use my location"), Map, Questions (3), Decision + Receipt, About (sources, fairness, limits) | QuoteView | `app/app/*` | runs in Expo Go on Ben's iPhone via the tunnel URL |
| E2 | Map screen: `react-native-maps` Polygons from `hexes` (server-side boundaries), legend, a "Skip the map" button always visible | Hex[] | `MapScreen.tsx` | no h3-js dependency in `package.json` |
| E3 | Receipt: base, each line with multiplier, dollar effect, "capped" badge, source; recommendation (e.g. sewer backup add-on); next step; illustrative label | QuoteView | `Receipt.tsx` | total equals base times capped product (asserted in a unit test on the API side) |
| E4 | Accessibility: `accessibilityLabel` on every control, list-only summary screen, dynamic type, 44 pt targets, reduced motion, contrast AA; "Read my quote" plays `audioUrl` (expo-audio) | | | VoiceOver walkthrough completes the quote without the map |
| E5 | "View as underwriter" opens `underwriterUrl` (expo-web-browser); haptic on decision; Sentry `@sentry/react-native` JS errors | | | tap opens the web case page with Toronto layers in the lanes |

### A3 Codex (data and proof)

| ID | Task | Inputs | Outputs | Accept |
|---|---|---|---|---|
| C1 | Toronto downloads as scripts (`packs/toronto/fetch.py`): TPS B&E (apartment + house, 2023-2026), basement flooding study areas, fire stations, hydrants, TRCA floodline, address points (subset) | GEO-PLAN URLs | `packs/toronto/raw/`, `fetch.py` | re-runnable; row counts printed and saved to `packs/toronto/MANIFEST.json` |
| C2 | US prefetch of all external layers for 70 locations (Nominatim 1 req/s with User-Agent) | risk.py catalog, section 11 of federato/PLAN.md | `cache/layers/*.json` | 70 x 5 layers cached; failures listed; a second run makes 0 requests |
| C3 | `packs/us/pack.yaml`, curves, `RegionPack.load`, `profile`, `hexes` (h3 v4 names) | sketch/risk.py | `risk.py`, `packs/us/` | caps enforced in a test (a stack of maxed factors caps at 1.25); `hexes` returns closed rings as [lat,lng] |
| C4 | Elastic loaders (idempotent `_id`), `ElasticIndex` and `InMemoryIndex`, `open_index` fallback | sketch/portfolio.py | `portfolio.py`, `scripts/load_elastic.py` | test: both indexes return identical `impact()` for 10 cases; ES|QL query from the docstring runs in Kibana |
| C5 | Toronto hex scores: B&E per res-9 cell over grid_disk k=1, credibility shrink toward neighbourhood mean (k=20), percentile levels 0-4 | C1 | `packs/toronto/layers.py` | 3 demo addresses produce different factors; a cell with 1 event does not exceed x1.03 |
| C6 | `backtest()` per `eval/BACKTEST.md`: B1, B1b, B2, B3, B4, answer key; as_of leakage rule | engine | `proof.py`, `cache/backtest.json` | a leakage test: moving a claim's date_of_loss after as_of changes nothing in the input case |
| C7 | `rules/tenant.yaml`, Toronto layers wired to `profile`, `quote_tenant`, geocoding from address points | C1, C5 | `engine.py` addition | basement unit in a study area refers; upper unit same address approves; receipt total test |
| C8 | `surroundings()` (Gemini Maps grounding, cached) and `speak()` (ElevenLabs, cached mp3, pre-rendered fallback file) | actions.py | `actions.py` | card for 138 shows places with Maps links; `/briefing.mp3` plays offline |
| C9 | Sentry: web Session Replay + tracing, API logs + tracing + OpenAIAgentsIntegration, Expo JS errors, uptime monitor on `/health`, cron monitor on the precompute job | DSNs | configs | a thrown test error appears in each project; one agent run shows agent and tool spans |
| O1-O3 | Overnight, branch only: accessibility audit fixes for Expo; README drafts; more tests | | `lane/a3-night` | Ben reviews at 06:00 |

### B (Ben)

B1 keys and accounts (section 3). B2 answer key by 19:15. B3 Linq live test by 19:15. B4 merge and tag at every milestone. B5 prompt tuning on 3 cases. B6 `eval/BACKTEST.md` committed before C6's first run. B7 phone testing from 00:15. B8 precompute and rehearsal at 01:45. B9 backup video, Devpost, READMEs from 06:00.

---

## 3. Setup checklist (17:45-18:15, then as noted)

- [ ] **OpenAI**: key in `.env`; set a spend cap; open the model picker and write the real ids into `ATLAS_MODEL_LEAD` and `ATLAS_MODEL_SPECIALIST` (INTEGRATIONS lists `gpt-6-astra`, `gpt-5.6-luna`, `gpt-5.6-sol`; do not hardcode). `uv add openai-agents`. Smoke test: one `Runner.run` with a tool.
- [ ] **Codex**: signed in; A3 tasks pasted from section 2; `CODEX.md` gets one row per task with the commit hash.
- [ ] **Linq**: sandbox access confirmed (landing page `linqapp.com/s/events/hack-the-north`). Find out which API the key accepts: v3 (`POST /v3/chats`, `Authorization: Bearer`) or partner v2 (`X-LINQ-INTEGRATION-TOKEN`). Send one message to Ben's iPhone. Create the webhook subscription (`message.received`) to `https://<tunnel>/webhooks/linq`, reply from the phone, and save the raw payload to `api/fixtures/linq_inbound.json`. Store the signing secret. Sandbox limit is about 100 messages a day: budget 20 for testing.
- [ ] **Public URL for webhook and phone**: `tailscale funnel 8000` on the laptop gives a stable `https://benmac.<tailnet>.ts.net`. Fallback: ngrok with its free static domain. Put the URL in `EXPO_PUBLIC_API_URL`, `NEXT_PUBLIC_API_URL` and the Linq subscription. Test from the phone on cellular.
- [ ] **Composio**: dashboard auth config for Gmail; connect the demo sender account; record `COMPOSIO_USER_ID` and `COMPOSIO_GMAIL_ACCOUNT` (connected account id). Create the demo "broker" inbox (a second Gmail or a `+broker` alias). Send one test through `tools.execute` with the explicit account id and confirm the sender.
- [ ] **Elastic**: Cloud trial; `ELASTIC_URL` and API key; create `atlas-exposure` and `toronto-events` with `geo_point` and keyword `h3_*` fields. Try one `geohex_grid` query to learn the licence answer (optional extra only).
- [ ] **Sentry**: three projects (api-python, web-nextjs, app-react-native); DSNs in `.env`; enable Logs; uptime monitor on `/health` once the tunnel is up.
- [ ] **Gemini**: API key; one Maps grounding call from the venue network with a US lat/lng and a Toronto lat/lng. If the tool is unavailable in the region, card shows "unavailable" and Gemini drops in the cut order.
- [ ] **ElevenLabs**: key (paid if the free tier blocks the API); pick one voice id; render and commit a fallback `briefing.mp3`.
- [ ] **Expo Go** on the iPhone, same account; `npx expo start --tunnel` works as a fallback if LAN is blocked.
- [ ] **Caching**: `cache/` holds Federato snapshot and query cache, layers, events, TTS, Gemini cards, backtest. `ATLAS_OFFLINE=1` makes every client read only from cache and fail loudly on a miss.
- [ ] **Hardware**: phone charger, hotspot as the venue-Wi-Fi fallback, a second browser profile logged into the demo inbox.

---

## 4. Test and eval plan

**Answer key** (`eval/answer_key.yaml`, Ben writes 18:15-19:15 from the guideline alone, before seeing engine output): 10 cases with the expected band per factor and expected decision. Proposed set: open property 126, 133, 134, 138, 141, 143; declined 115; two bound property policies (one inside the premium band, one above); one cgl (expect Routed). Test: `pytest eval/test_answer_key.py` must pass 10/10 on bands for Known facts and on decisions; mismatches are either an engine bug or an answer-key correction noted in the file with a reason.

**Unit checks** (each module's `__main__` asserts plus one pytest file per module): schema paths and lint; Missing gives all bands; hard-fail cap; interval math; caps; idempotent log append; `verify_numbers`; outbox dedupe; Linq parser on the saved raw payload; receipt total.

**Backtest** (`eval/BACKTEST.md`, committed before the first run; the page prints that commit):
- **B1 outcomes, property** (n = 27 bound property policies): build each as of its submission `received_date`, loss history from the insured's other policies' claims before that date, premium Known. Report per desk tier: count, premium, incurred (paid + reserve, indemnity + expense), loss ratio. Plus the Spearman correlation of score midpoint vs loss ratio with n. Success is reported, not assumed. If the correlation is weak, the demo says so and moves to B2.
- **B1b outcomes, all lines** (n = 113): risk-engine total multiplier quartiles vs loss ratio. Tests the shared risk engine independent of the property guideline.
- **B2 human declines** (n = 11 with an underwriting reason; 3 `broker_withdrew` shown as excluded): desk decision and top reason vs the human reason. `loss_history` maps to the loss factor, `cat_exposure_aggregation` to portfolio concentration, `outside_appetite` to line or state, `insufficient_controls` is `not_modeled` and counted as such.
- **B3 enrichment effect**: cases whose tier changes with external layers on vs off, with the named factor; Kendall tau of the two rankings. This is Federato's "enrichment visibly changes ranking" proof.
- **B4 guideline vs book**: how many bound property policies the 2025 guideline would decline, by factor (expected headline: premium above $175K on 17 of 27). This explains the low bind agreement openly.

**Desk evals** (run at 01:45 on the precompute): for every deep-dive case, all five actors emitted events; no explanation failed `verify_numbers` without falling back; every `resolution` option is in `allowed`; total LLM calls under the policy budget; wall time per case. Results in `eval/desk_run.json`, shown on the backtest page footer.

**Offline test**: Wi-Fi off, `ATLAS_OFFLINE=1`, run the section 6 script end to end. Anything that breaks goes on the fix list before sleep.

---

## 5. Track-by-track checklist

| Track | Exact component | What the judge sees | Evidence file |
|---|---|---|---|
| **Federato** | Whole desk: schema-graph fetch planner, interval engine, five agents, enrichment, portfolio, backtest, ask box | Queue with intervals, case 138 lanes, before/after enrichment chip, ask box payloads, backtest page | `eval/BACKTEST.md`, `eval/answer_key.yaml` |
| **Intact** | Expo tenant quote on the same `assess()` with `tenant.yaml` + Toronto pack | Phone quote in under a minute, receipt, list-only path, VoiceOver, "View as underwriter" | README Intact section |
| **Rox** | Messy-data handling + actions: duplicate account with two brokers, renewal inference, limit vs TIV, missing premium intervals, tag vs FEMA disagreements, parsed API errors with retry; broker email and iMessage decisions | Issues panel on 126/141/143; the interval shrinking as facts arrive; the email and iMessage | `eval/desk_run.json` |
| **OpenAI + Codex** | Agents SDK agents with structured outputs; NL to Federato query; Codex built the Toronto pack, prefetch, Elastic loaders, backtest | Live agent run, ask box; `CODEX.md` with commits; one concrete story (the leakage test Codex wrote caught X, measured on the night) | `CODEX.md` |
| **Huawei openJiuwen** | Five-agent desk with addressed asks, computed conflicts, Lead resolution from an allowed set, adaptive deep-dive policy; reusability shown by the same desk running a referred tenant case with different rules and pack | Swimlanes with arrows between specialists; a conflict and its resolution | `agents/*.md`, desk.py docstring |
| **Linq** | Digest out, "approve N / refer N / why N" in, decision written to the case | Judge's or Ben's phone gets the digest; reply flips the web row | `api/fixtures/linq_inbound.json` |
| **Sentry** | AI agent monitoring (OpenAIAgentsIntegration), Tracing, Logs, Session Replay (web), Uptime monitor, Expo JS errors | Sentry trace of one desk run with agent and tool spans; the incident that changed the build | `INCIDENTS.md` (real entries only) |
| **Composio** | Broker info request, Gmail via `tools.execute` with explicit account; stretch reply polling | Button, then the email in the inbox listing exactly the facts that could flip the decision | outbox log |
| **Elastic** | Exposure index (terms on keyword H3 cells) answering the Portfolio agent's concentration question; Toronto events index driving the break-in layer; ES|QL in Kibana | Portfolio lane tool call hitting Elastic; Kibana ES|QL result matching the case page | `scripts/load_elastic.py` |
| **Expo** | Expo Router app in Expo Go with react-native-maps polygons, haptics, expo-audio, accessibility | The app on the phone | `app/` |
| **Gemini** | Hazard agent's surroundings card via Maps grounding with place citations; can only add an inspection subjectivity | Card on 138 with cited places | cached cards |
| **ElevenLabs** | Spoken queue briefing (web) and "Read my quote" (Expo, accessibility) | Tap, it speaks | `cache/tts/` |

### 60-second booth pitches

- **Federato**: "Your queue has 21 open submissions and six are property. Atlas scores each as an interval, because open submissions have no premium and no building link. Where the interval straddles a decision line, the desk investigates, and only there. Watch 138: Intake finds TIV through the insured's headquarters, estimates premium from nine comparables, Hazard skips earthquake for Florida and runs FEMA, Portfolio checks what we already hold in that hurricane cell. The interval shrinks, and what's left only the broker can answer, so it emails the broker. Every query is derived from your appetite rules through your schema, and every number is code. Here's the backtest against your underwriters, with the small n on screen."
- **Intact**: "Type a Toronto address. The same engine that underwrites commercial property prices a tenant policy from four peril-matched city datasets, each factor capped. You get approve or refer instantly, a receipt where every dollar has a source, and a full screen-reader path that never needs the map. Tap 'View as underwriter' and you see the exact same case on the underwriter's desk."
- **Rox**: "The data is messy on purpose: the same account submitted by two brokers, a renewal disguised as new business, premiums missing on every open submission, hazard tags FEMA disagrees with. Atlas keeps provenance on every value, widens the score instead of guessing, and acts: it emails the broker for exactly the fields that would change the decision and texts the underwriter the top three."
- **OpenAI**: "Five agents on the Agents SDK with structured outputs; the Intake agent turns English into a Federato query and repairs it from the API's own error. Codex built the Toronto data pack, the Elastic loaders and the backtest, including the leakage test in CODEX.md."
- **Huawei openJiuwen**: "A desk, not a chain. Specialists ask each other questions, code detects when they disagree, and the Lead resolves from options the guideline allows. It only goes deep where information can change the decision. Swap the rules file and the region pack and the same desk underwrites a Toronto tenant referral."
- **Linq**: "The underwriter never opens the app. The top three arrive by iMessage; reply 'approve 1' and the decision is written to the case, with the audit trail."
- **Sentry**: "Every agent run is a Sentry trace with agent and tool spans. Here is the slow Hazard lookup we found in a trace and moved to the prefetch cache, and the overnight uptime alert on our tunnel (INCIDENTS.md)."
- **Composio**: "When only the broker can resolve a decision, the agent writes and sends the request through Composio Gmail, listing just the fields that matter and why."
- **Elastic**: "Portfolio concentration is an Elastic aggregation over H3 cells of our active book; the Toronto break-in layer is an aggregation over 86K police points. Same query in ES|QL here."
- **Expo / Gemini / ElevenLabs**: one-line add-ons on the Intact or Federato demo: the app itself; the surroundings card; the spoken briefing and read-aloud receipt.

---

## 6. The 5-minute demo

| Time | Beat | Screen | Fallback |
|---|---|---|---|
| 0:00-0:20 | "An underwriter has 158 submissions, 21 open. Atlas is a five-agent desk that tells you which to work and what it had to find out to be sure." | Queue, open view | none needed (local) |
| 0:20-1:30 | Open 138. Replay the lanes at 4x: Lead's plan ("2 open decisions worth a deep dive, 138 first, $2.1M, flipper premium"); Intake picks the hq path and runs comparables; Hazard skips quake, runs FEMA; Portfolio queries Elastic; Appetite narrates the contradiction; the interval bar shrinks from 54-81 to its final range; enrichment chip before/after | Case 138 + swimlanes | replay is the default; live run only if a judge asks |
| 1:30-2:00 | Messy data: 126/141 duplicate from two brokers, 143 renewal inferred from PR-2026-1031. Lead's resolution from allowed options | Issues panel, conflict card | cached |
| 2:00-2:25 | Press "Request from broker": email lands in the inbox tab | Composio email | outbox shows "sent" with the Gmail id; screenshot in the video |
| 2:25-2:55 | Ask box: type a question live; show attempt 1 flagged by lint, attempt 2 payload, rows | Ask page | canned chip returns cached result |
| 2:55-3:35 | Backtest: B3 enrichment changed N tiers; B1 loss ratio by tier with n; B2 declines table; B4 "the 2025 guideline would decline 17 of 27 bound property policies, mostly on premium" | Backtest page | static, from cache |
| 3:35-4:25 | Phone: Toronto address, map, 3 questions, refer or approve, receipt, "Read my quote", then "View as underwriter" opens the same case on the laptop | Expo Go + web | pre-filled demo address; if the tunnel fails, phone on hotspot; if Expo fails, the recorded clip |
| 4:25-5:00 | Linq: "the underwriter's morning": digest already on the phone, reply "approve 1", the queue row flips live. Close: "Every number is code, every decision is traceable, and it runs on your schema." | Phone + queue | if Linq is down, `POST /webhooks/linq` with the saved fixture from a terminal alias, labelled as simulated |

Spoken briefing (ElevenLabs) and the Gemini card are shown only at their booths or if a judge asks.

---

## 7. Write-ups

**Devpost outline**
1. One line: a five-agent underwriting desk that only investigates where information can change the decision, and the same engine quoting Toronto tenants.
2. The problem, with the data facts (21 open, missing premium, the hq path, duplicate brokers).
3. How it works: interval scoring, flippers, the desk (roster, asks, conflicts, Lead), schema-derived queries, enrichment sources.
4. Proof: backtest numbers with n, the pre-registration commit.
5. Actions: Composio, Linq, Gemini, ElevenLabs.
6. The Intact side: tenant quote, fairness guardrails, accessibility.
7. Built with: OpenAI Agents SDK, Codex (link CODEX.md), Elastic, Sentry, Expo, Gemini, ElevenLabs, Linq, Composio. One line per sponsor on what it does in Atlas.
8. Limitations: synthetic data, small n, illustrative tenant prices, Gemini advisory only.

**Intact README section** (criterion 4, verbatim headings): The problem; How AI is used (the model explains and recommends add-ons; prices and decisions are code; the desk reviews referrals); User journey and key features (address, map or list, three questions, instant approve or refer, receipt, read aloud, view as underwriter); Fairness guardrails (peril-matched layers only, caps, shrinkage, no demographic inputs, excluded crime types); Assumptions and limitations (illustrative base rate, Toronto only, TPS offsets points to intersections, data dates); Built at Hack the North (first commit time, CODEX.md).

---

## 8. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Desk live runs slow or flaky | High | Demo stalls | Replay is the default demo; live only for one case; semaphore and per-case budget |
| Intervals too wide (every open case stays Open) | Medium | "Adapts" beat weakens | Measure at M1; tune comparables window; flippers use p10-p90, rank uses p25-p75 |
| Backtest numbers are weak | Medium | Wow beat weakens | Pre-registered and shown honestly; lead with B3 and B4, which are strong by construction |
| Linq sandbox approval or payload shape | Medium | Lose Linq beat | Live test at 18:15; raw logging; fixture replay labelled as simulated |
| Tunnel dies | Medium | Phone and webhook fail | Tailscale funnel with ngrok fallback; Sentry uptime alert; hotspot |
| Composio routes to the wrong Gmail | Low | Embarrassing email | Explicit connected account id; test at setup; demo inbox only |
| Elastic trial or licence issue | Low | Lose Elastic | In-memory index behind the same protocol; equality test |
| h3 on the client | n/a | | Not used: polygons come from the server |
| Model ids unavailable | Low | Setup delay | Read from config; verified at 17:45 |
| Ben's sleep cut short | Medium | Morning errors | Feature freeze 02:15 is hard; overnight work only on branches |
| Coordinates don't match zips | Medium | Noisy issue flags | Measure distribution first; ship the flag only above a measured threshold |

---

## 9. Scope tiers and cut order

- **Tier 0, never cut**: Federato client + schema-derived queries, case with provenance, interval engine, explanations with verification, queue + case page, desk with visible lanes (replay), enrichment before/after.
- **Tier 1**: backtest page, ask box, portfolio impact (in-memory if needed), Composio broker email, Expo tenant quote with receipt and "View as underwriter".
- **Tier 2**: Linq loop, Elastic as the index, map page, Sentry beyond errors.
- **Tier 3**: Gemini card, ElevenLabs audio, Composio reply polling, geohex_grid.

**Cut order when a milestone slips by 30 minutes** (first to go at the top): Composio reply polling, ElevenLabs, Gemini, web map page (keep the portfolio line in the case page), Elastic (in-memory index), Linq, Expo map screen (keep the list path; the app still quotes), live desk mode (replay only).

---

## 10. How Intact slides over without breaking Federato

- **One function**: `assess(case, rules, pack, portfolio)` serves both. The tenant quote is `assess(Case(kind="tenant"), rules("tenant"), pack("toronto"), None)` plus pricing from `tenant.yaml`. No consumer-only scoring code exists.
- **Seams**: rules files (`rules/*.yaml`) and region packs (`packs/<id>/pack.yaml` + layers). Engine code names no region or dataset (AGENTS.md 5), so adding Toronto cannot change a US score. A test runs the Federato answer key after every Toronto change.
- **Same case store**: tenant quotes persist as `TQ-*` cases through `World.add_case`. The queue shows them under "Consumer referrals" when their decision is refer, and the desk can deep-dive them with the Toronto layers in the Hazard agent's catalog. That is the reusability proof for openJiuwen.
- **The link is real**: `underwriterUrl` is `/cases/TQ-*`, the same page component that renders Federato cases, with the same factor table, risk lines, sources and lanes.
- **Fairness at the seam**: the Toronto pack's caps (x0.92 to x1.10 per factor, x0.85 to x1.25 total), shrinkage and excluded crime types live in the pack file, so the guardrails are data a reviewer can read.
- **Build order protects Federato**: the Toronto pack is built in parallel by Codex from 17:45 on its own branch, and the Expo app starts only after M3 (Federato complete). If the slide-over slips, Federato is already demo-safe.
