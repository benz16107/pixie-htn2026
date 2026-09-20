# Atlas: final build plan

Solo build, **Sat 17:30 to Sun 08:00 EDT**. Ben plus three coding agents. Judging: a separate 5-minute pitch to each sponsor track (see `PITCHES.md`). No sleep planned.

This plan was synthesized in an architecture arena: two independent designs (Opus, Fable), a Fable cross-judge with a fact check against the real data, then a merge. The design is in `DESIGN.md` (read "Synthesis decision" and "Amendments" first), types and signatures are in `sketch/`, integration facts are in `INTEGRATIONS.md`, data notes are in `NOTES.md`, and the candidates are in `arena/`. The repo rules are in `../AGENTS.md`.

**One sentence:** a five-agent underwriting desk that scores every Federato submission as an interval, investigates only where missing information could flip the decision, and shows its work lane by lane. The same engine then gives a Toronto renter an instant, explained tenant quote on their phone.

---

## 0. Lanes and rules

- **B = Ben.** Integrator: keys, answer key, prompt tuning, merges, phone testing, demo. **Writes no feature code after 00:00.**
- **A1 = Claude Code, backend** (`api/`): Federato client, case, engine, store, desk, actions, routes.
- **A2 = Claude Code, web** (`web/`): queue, case page, swimlanes, ask box, backtest, map, legal pages.
- **A3 = Codex, data, proof, and the Expo app:** region packs, prefetch caches, Elastic, backtest, tenant quote, then the Expo app from 23:15. Every A3 task gets a row in `CODEX.md` with its commit (OpenAI evidence).

**Branch rule:** each agent works in its own git worktree (`lane/a1`, `lane/a2`, `lane/a3`). Ben merges to `main` at every milestone and tags `demo-safe-N`. The contract lives in the pydantic models, exported to `shared/api.d.ts`, and only A1 changes it. **A1 posts fixture JSON (`api/fixtures/*.json`) at 18:30**, so A2 and A3 never wait on a live backend.

**Night rules:**
- A milestone missed by more than 30 minutes triggers the cut order (section 9), not a later bedtime.
- Every merge runs `uv run pytest -q` and `npm --prefix web run build`. Red means no merge.
- After 02:15, extras (Gemini, polish) only if tests stay green; after 06:00, only one-line fixes.

---

## 1. Hour-by-hour timeline

| Time | B (Ben) | A1 backend | A2 web | A3 Codex | Milestone ("done when") |
|---|---|---|---|---|---|
| 17:30-18:00 | Setup checklist part 1 (section 3): OpenAI key + real model ids, Composio Gmail, Elastic trial, Sentry, tunnel. Start the Linq live test | **T1** Federato client (token, snapshot load from `data/federato`, query cache, typed errors) | **W1** Next.js shell, design tokens, fixture loader, routes | **C1** Toronto downloads: TPS break-ins, basement flooding areas, fire stations (+ floodline, hydrants if quick) | **M0 18:00**: `uv run python -m atlas_api.federato ping` returns the schema; web serves `/queue` from a fixture |
| 18:00-19:00 | **Answer key**: hand-score 10 cases in `eval/answer_key.yaml` (open property 126, 133, 134, 138, 141, 143; declined 115; two bound property policies; one cgl). Finish the Linq test and save the raw inbound payload | **T2** hydration plans + `SchemaGraph.paths` + `QueryBuilder.lint`; **T3** `World` + `Case` (`Value`, `DataIssue`s). **Fixtures at 18:30** | **W2** queue table (interval bar, decision chip, flipper and issue icons) | **C2** US prefetch into the store cache: Esri FEMA flood, USGS quakes, USFS wildfire, Open-Meteo, Nominatim, for 70 locations | Fixtures posted |
| 19:00-20:00 | Review T2/T3 against the data; tune the duplicate and stale-submission rules; merge | **T4** `assess` + `rules/property_2025.yaml` + `estimate_premium` + template explanations | **W3** case page: facts with provenance badges, factor bands, contradictions, issues | **C3** `packs/us` loader + curves + `risk.profile`; answer-key test runner | **M1 20:00 (Federato MVP)**: `uv run atlas triage` prints 158 rows with interval, decision and a 2-3 line reason; answer key passes 8 of 10 or more. Tag `demo-safe-1` |
| 20:00-20:30 | Dinner | **T5** SQLite `CaseStore` + FastAPI `/queue`, `/cases/{id}`, `/health`; Sentry init | Wire W2/W3 to the API | C3 continued: enrichment on/off data | |
| 20:30-22:30 | Tune agent prompts on 138, 126/141, 143; watch the lanes | **T6** events + `CaseStore.tail` + fold; **T7** five agents (Agents SDK, `output_type`), scheduler, depth floor, conflicts, `verify_numbers`; **T8** replay recorder | **W4** swimlanes (lanes, ask/answer arrows, tool chips, interval animation) on SSE, replay at 1x or 4x | **C4** Elastic loader + in-memory index (same `impact()`); **C5** Toronto hex scores with shrinkage | **M2 22:30**: `POST /desk/run` on 138, 126 and 143 completes in under 60 s each; lanes render live and in replay; at least one ask from one specialist to another |
| 22:30-00:00 | Commit `eval/BACKTEST.md` **before** the first backtest run; write demo script v1 | **T9** `ask()` (plain English to query, lint, retry); **T10** routes for backtest and map | **W6** ask box; **W7** backtest page; **W5** map, timeboxed to 23:45 | **C6** backtest (22:30-23:00); **C7** `tenant.yaml` + `quote_tenant` (23:00-23:15); **E1** Expo scaffold on mocks (from 23:15) | **M3 00:00 (Federato complete)**: section 6 beats 1-4 run in a clean browser; the backtest page shows measured numbers. Tag `demo-safe-2` |
| 00:00-01:30 | Test actions end to end on real accounts; test the Expo app on the phone | **T11** Composio broker email via the outbox; **T12** Linq digest out + webhook in + `apply_command`; **T13** SSE push of human decisions | **W8** Toronto case view + `/privacy` + `/terms`; queue live-update UI | **E2-E5** Expo: address, map (server polygons), 3 questions, decision, receipt, list-only path, "View as underwriter" | **M4 01:30**: the broker email arrives; the digest arrives on the iPhone; replying "approve 1" flips the web row within 3 s; an Expo quote completes in Expo Go |
| 01:30-02:15 | **Precompute**: desk run on the deep-dive cases (cost cap on), 3 cached questions, backtest, 3 demo tenant quotes; record the replay; copy `var/atlas-demo.sqlite`; offline test; rehearse once | Fix list | Fix list | Offline check (`ATLAS_OFFLINE=1`, Wi-Fi off) | **Feature freeze 02:15.** Tag `demo-safe-3` |
| 02:15-04:00 | **No sleep (Ben's call).** Pitch rehearsal per sponsor (`PITCHES.md`); fix what rehearsal breaks | Gemini surroundings card (C8 moves here); Sentry extras (Session Replay) | Web map polish if it was cut; empty and error states | Expo accessibility audit | Extras land on `main` only if the tests stay green |
| 04:00-06:00 | Record a 60-90 s clip per sponsor pitch as a backup; second full offline run | Only fixes from rehearsal | Only fixes from rehearsal | README, Intact README, Devpost drafts; `CODEX.md` pass | Tag `demo-safe-4` |
| 06:00-07:00 | Rerun the precompute if anything changed; record the full backup video | Only fixes Ben names | Only fixes Ben names | `INCIDENTS.md` pass | **Code freeze 07:00** |
| 07:00-07:45 | Devpost write-up, README (with the Intact section), screenshots, video; submit | | | | **Submitted 07:45** (15 min buffer) |
| 08:00-09:45 | Rehearse the 5-minute demo three times and each 60-s pitch; mint the Federato token at 09:30; charge the phone; ready the hotspot | | | | |

---

## 2. Task list per lane (paste one task at a time into its agent)

"Accept" is the test that closes the task. Interfaces follow `sketch/`, amended by `DESIGN.md`.

### A1 backend (Claude Code)

| ID | Task | Accept |
|---|---|---|
| T1 | Federato client: token mint to `.token`, refresh at 3h50m or on the first 401; `query()` with a payload-hash cache in the store; parse `[CODE] message {json}` into `FederatoError`; `Snapshot.load("data/federato")` for all 12 resources | A bad operator `$grt` raises `FederatoError(code=VALIDATION)`; a repeated query makes 0 network calls; the snapshot loads 158 submissions and 938 exposure units |
| T2 | Two hydration plans (bound: `Policy.exposure_units -> location -> buildings`; open: `Insured.hq -> buildings`); `SchemaGraph.paths("Submission","Building.tiv")` for the demo beat; `QueryBuilder.lint` (array dot-path → `$elemMatch` fix; reference without `$expand`) | `paths()` returns both routes; `lint` flags `exposure_units.location.state` with the `$elemMatch` fix; one lint-fixed payload runs live and returns rows |
| T3 | `World.load` indexes; `World.case(id, as_of)` with `Known`/`Estimated`/`Missing`; `DataIssue`s: duplicate account with two brokers (126/141), stale/duplicate after later binding (143 vs PR-2026-1031), requested limit vs TIV (134), missing roof year | 138 TIV = $2,073,000 via hq, premium `Missing(resolver=broker)`; 126 and 141 flagged duplicate with a broker conflict; 143 flagged stale with dates cited |
| T4 | `RulesFile.load`, `assess`, `estimate_premium` (p25-p75 of comparable bound property `technical_premium / TIV`), template explanations, `rules/property_2025.yaml` | Answer key 8/10 or better; any Missing fact keeps all three bands possible; an Estimated premium never hard-fails on its own; non-property returns `Routed` |
| T5 | SQLite `CaseStore` (events, cases, cache, outbox) per candidate-2's case.py; FastAPI `/queue`, `/cases/{id}`, `/health`; OpenAPI export and `shared/api.d.ts` generation; Sentry FastAPI + Logs + OpenAI Agents integration | `curl /queue?view=open` returns 21 rows in under 500 ms; type generation runs clean |
| T6 | `DeskEvent` with content-hash ids; `CaseStore.append` (idempotent) and `tail(after=seq)`; `CaseFile.fold` | Appending the same event twice is a no-op; the fold is pure |
| T7 | Five agents on the Agents SDK with structured `output_type`; scheduler (`asyncio.gather`, semaphore 4); `depth_policy` floor the Lead can only raise; addressed `Ask` between specialists; code-computed conflicts with an allowed-resolution set; `verify_numbers` with a template fallback; SDK spans mirrored into `tool_call` events | A live run on 138 has events from all five actors, at least one specialist-to-specialist ask, a resolution inside `allowed`, and an explanation that passes `verify_numbers`; a planted wrong number is rejected |
| T8 | Replay: `atlas record --run all`; `/cases/{id}/events?replay=1` re-emits with scaled timing | With Wi-Fi off, the 138 replay plays in the UI |
| T9 | `ask()`: Intake with the schema summary, `lint`, `run_query`, up to 3 attempts, answer checked against the rows; 3 canned questions cached | "Florida property locations with unsprinklered buildings over $5M TIV" returns rows; a bad first draft shows the lint fix in `attempts` |
| T10 | `/backtest` (serves C6's report), `/map/book` (portfolio hexes), `/map/toronto` | Each returns in under 1 s from cache |
| T11 | Outbox + `request_broker_info` through Composio with an **explicit connected account**; `ATLAS_ACTIONS=dry\|live`; emails go to the demo broker inbox and name the real contact | Two clicks send one email; the email lists only the flipper facts |
| T12 | `LinqClient` (base path and auth from config, per the setup test), `send_digest`, `/webhooks/linq` (raw log first, signature check, tolerant parse), `apply_command` for approve, refer, and why | On a real phone the digest arrives; "approve 1" writes a human decision; "why 2" replies with the explanation |
| T13 | SSE `/events/queue` for human decisions and action status | The web row updates within 3 s of the iMessage reply |
| T14 | `atlas demo-reset`: clears demo actions (outbox sends, human decisions) back to the precomputed state, so every sponsor pitch can re-send the email and re-approve | Running it twice leaves the same state; the 138 email can be sent again after a reset |

### A2 web (Claude Code)

| ID | Task | Accept |
|---|---|---|
| W1 | Shell and nav (Queue, Map, Ask, Backtest); type scale and colour tokens per `~/.claude/rules/design-tells.md`: off-white paper background, one ink colour, no purple or glow, no Inter or Geist, tabular numerals; API client from `shared/api.d.ts` | The build passes; pages render fixtures |
| W2 | Queue: rank, insured, line, state, interval bar with the 45/70 thresholds drawn, decision chip (Open shows flipper icons), issue icons, enrichment delta, value at stake; open/all filter | 21 open rows readable at 1280 px; keyboard sortable; colour is never the only signal |
| W3 | Case page: decision + interval; facts with provenance badges (known, estimated with its range, missing with its resolver); factor bands; contradictions; risk factors with source links and caps; a portfolio line; the explanation with a "verified" tick; actions panel | Renders 138, 143, 126 and a tenant case; every number shows its source on hover |
| W4 | Swimlanes: one lane per actor (lead, intake, appetite, hazard, portfolio, system, human); cards on a shared time axis; ask/answer arrows; tool chips that expand to JSON; the interval bar animates on assessment events; SSE live and replay at 1x or 4x | The 138 replay shows arrows between specialist lanes; unknown event kinds render as generic cards |
| W5 | Map (timebox until 23:45): MapLibre GL JS with server polygons from `/map/book` (active TIV by hex), case pins coloured by decision, a what-if toggle for the open case | 76 active policies aggregated; clicking a pin opens its case. **If the timebox runs out, cut it**: the portfolio line on the case page carries the point |
| W6 | Ask box: input, canned question chips, the attempts list (payload JSON, lint notes, errors), the result table | A canned question returns from cache in under 1 s |
| W7 | Backtest page: B1-B4 from section 4 with n printed next to every number and the pre-registration commit hash | All numbers come from the API |
| W8 | Toronto case view (same page component, receipt block); `/privacy` and `/terms` (one paragraph each: no personal data stored, illustrative prices) | A `TQ-*` case renders; the legal pages exist |

### A3 Codex (data, proof, Expo)

| ID | Task | Accept |
|---|---|---|
| C1 | `packs/toronto/fetch.py`: TPS break-ins (2023-2026), basement flooding study areas, fire stations, plus floodline and hydrants if quick. `SOURCES.md` lists dataset, URL, licence and date | Re-runnable; row counts saved to `MANIFEST.json` |
| C2 | US prefetch for 70 locations: Esri FEMA flood (the FeatureServer URL in `NOTES.md`), USGS M4+ within 50 km over 30 years, USFS WHP, Open-Meteo gust and rain days, Nominatim (1 req/s, User-Agent) | A second run makes 0 requests; failures are listed |
| C3 | `packs/us/pack.yaml`, curves, `RegionPack.load`, `profile`, `hexes` (h3 v4 names, closed rings as [lat,lng]) | A stack of maxed factors hits the cap in a test |
| C4 | Elastic: `atlas-exposure` (geo_point + keyword `h3_r5`/`h3_r7`), idempotent `_id`, `ElasticIndex` and `InMemoryIndex` behind one protocol | Both return identical `impact()` for 10 cases; one ES\|QL query works in Kibana |
| C5 | Toronto hex scores: break-ins per res-9 cell over `grid_disk(k=1)`, shrunk toward the neighbourhood mean, capped multipliers ×0.92-×1.10 per factor, total clamped ×0.85-×1.25 | Three demo addresses give different factors; a 1-event cell stays at or under ×1.03 |
| C6 | `backtest()` per `eval/BACKTEST.md` (B1-B4, `REASON_TO_LANE`, an as-of leakage rule) | Two runs produce byte-identical output; a leakage test passes |
| C7 | `rules/tenant.yaml` + `quote_tenant` on the same `assess()`; persist `TQ-*` cases; the receipt | A basement unit in a flooding study area refers; the upper unit at the same address approves; **receipt lines sum exactly to the total** |
| E1-E5 | Expo Router app in Expo Go: Address (text, "use my location") → Map (react-native-maps Polygons from the server, "Skip the map" always visible) → 3 questions → Decision + Receipt → About (sources, fairness, limits) → "View as underwriter" (expo-web-browser). Accessibility: `accessibilityLabel` everywhere, list-only path, dynamic type, 44 pt targets, reduced motion. `@sentry/react-native` JS errors | Runs on the iPhone over the tunnel; **no h3-js in `package.json`**; VoiceOver completes a quote without the map |
| C8 (night) | Gemini Maps-grounding surroundings card (cached, it only adds a note and never changes a number) | The card shows on 138 with place citations |

---

## 3. Setup checklist (17:30-18:00, then as noted)

- [ ] **OpenAI:** key in `.env` with a spend cap. Read the real model ids from the picker into `ATLAS_MODEL_LEAD` (flagship) and `ATLAS_MODEL_SPECIALIST` (cheaper); INTEGRATIONS.md reports `gpt-6-astra` and `gpt-5.6-luna/sol`, so verify them. `uv add openai-agents`. Smoke test one `Runner.run` with a tool.
- [ ] **Codex:** signed in; paste C1 first; start the `CODEX.md` rows.
- [ ] **Linq (approved):** find which API the key accepts: v3 (`/v3/chats`, Bearer) or partner v2 (`X-LINQ-INTEGRATION-TOKEN`). Send one message to your iPhone. Subscribe the webhook (`message.received`) to `https://<tunnel>/webhooks/linq`, reply from the phone, and save the raw payload to `api/fixtures/linq_inbound.json`. Store the signing secret. Budget about 20 messages for testing.
- [ ] **Public URL:** the backend runs where you build. On the laptop, use `tailscale funnel 8000` for a stable `https://benmac.<tailnet>.ts.net`, with ngrok as the fallback. Put it in `EXPO_PUBLIC_API_URL`, `NEXT_PUBLIC_API_URL` and the Linq subscription. Test from the phone on cellular.
- [ ] **Composio:** Gmail auth config; connect the demo sender; record `COMPOSIO_USER_ID` and the connected account id (**always pass it explicitly**; the wrong account otherwise gets used silently). Create the demo broker inbox (a `+broker` alias). Send one test.
- [ ] **Elastic:** Cloud trial; URL + API key; create `atlas-exposure` and `toronto-events` (geo_point + keyword h3 fields). Try one `geohex_grid` query only to learn the licence answer.
- [ ] **Sentry:** one Python project (agent spans, tracing, Logs) + one React Native project for Expo JS errors. Web Session Replay is COULD.
- [ ] **Gemini:** key; one Maps-grounding call with a US point. If it's unavailable, drop it (it's at the bottom of the cut order).
- [ ] **Expo Go** on the iPhone; `npx expo start --tunnel` as the LAN fallback.
- [ ] **Offline mode:** `ATLAS_OFFLINE=1` makes every client read only from the store cache and fail loudly on a miss.
- [ ] **Hardware:** phone charger, a hotspot for venue-Wi-Fi failure, and a second browser profile logged into the demo broker inbox.
- [ ] **Where the code runs:** the repo is on macserver at `~/Code/hackathons/htn-2026/atlas`. If you build on the laptop, clone it there, copy `.env` over, and keep one machine as the demo host.

---

## 4. Test and eval plan

**Answer key** (`eval/answer_key.yaml`, written from the guideline alone before seeing engine output): 10 cases with the expected band per factor and the expected decision. `pytest eval/test_answer_key.py` must pass. Any mismatch is either an engine bug or an answer-key correction noted with a reason.

**Unit checks:**
- schema paths and lint
- Missing keeps every band possible
- hard-fail cap
- interval math
- caps
- idempotent append
- `verify_numbers`
- outbox dedupe
- Linq parser on the saved raw payload
- receipt exact sum
- the template-free grep (no region names in engine code)

**Backtest** (`eval/BACKTEST.md`, committed before the first run; the page prints that commit):
- **B1, outcomes for property** (n = 27 bound property policies): each built as of its `received_date`, with loss history only from claims before that date. Reports count, premium, incurred losses and loss ratio per desk tier. Plain rates with n, no correlation statistics.
- **B2, human declines** (n = 11 with an underwriting reason; the 3 `broker_withdrew` shown as excluded). Compare the desk's decision and top reason with the human's reason, using `REASON_TO_LANE`: `loss_history` → the loss factor, `cat_exposure_aggregation` → portfolio concentration, `outside_appetite` → line or state, `insufficient_controls` → controls gaps in ExposureUnit data.
- **B3, enrichment effect:** the cases whose tier changes with external layers on vs off, with the factor named. This is Federato's bonus proof.
- **B4, guideline vs book:** how many bound property policies the 2025 guideline would decline, by factor. The expected headline is premium above $175K on 17 of 27, which explains low agreement with the humans openly.

**Desk eval** (on the 01:30 precompute): every deep-dive case has events from all five actors; no unverified explanation shipped; every resolution is inside `allowed`; LLM calls and cost stay under the cap; wall time per case. Saved to `eval/desk_run.json`.

**Offline test:** Wi-Fi off, `ATLAS_OFFLINE=1`, and the whole section 6 script runs.

---

## 5. Tracks: what each one gets

| Priority | Track (prize) | Exact component | What the judge sees | Evidence |
|---|---|---|---|---|
| 1 | **Federato** ($3,500) | Schema-aware queries, interval engine, five agents, enrichment, portfolio, backtest, ask box | Queue with intervals; 138's lanes; the enrichment before/after chip; the backtest | `eval/BACKTEST.md`, `eval/answer_key.yaml` |
| 2 | **Intact** ($100 gift card + interview) | Expo tenant quote on the same `assess()` with `tenant.yaml` + the Toronto pack | Phone quote in under a minute; receipt; list-only path; VoiceOver; "View as underwriter" | README Intact section |
| 3 | **Rox** ($10K / $2K) | Messy data (duplicate account with two brokers, stale submission, limit vs TIV, missing premiums as intervals, flood tag vs FEMA, parsed API errors) + actions (broker email, iMessage decisions) | The issues panel; the interval shrinking; the email and the iMessage | `eval/desk_run.json` |
| 4 | **OpenAI + Codex** (recruiter dinner) | Agents SDK agents with structured outputs; plain English to a Federato query; Codex built the packs, prefetch, Elastic, backtest and Expo app | Live agent run; ask box; `CODEX.md` | `CODEX.md` |
| 5 | **Huawei openJiuwen** (Watch + internship) | Five agents with addressed asks, computed conflicts, a Lead that resolves from an allowed set, and an adaptive depth policy; reuse shown by the same desk handling a referred tenant case | Swimlanes with arrows between specialists; a conflict and its resolution | desk.py docstring, agent prompts |
| 6 | **Linq** ($1K / $500) | Digest out; "approve / refer / why N" in; the decision written to the case | The phone gets the digest; a reply flips the web row | `api/fixtures/linq_inbound.json` |
| 7 | **Sentry** (interview) | AI agent monitoring (OpenAI Agents integration), tracing, Logs, Expo JS errors | One desk run as a Sentry trace with agent and tool spans; a real incident | `INCIDENTS.md` (real entries only) |
| 8 | **Composio** | Broker information request via Gmail with an explicit account | Button, then the email listing exactly the facts that could flip the decision | outbox log |
| 9 | **Elastic** (Quest 3S / Bose) | Exposure index (terms aggregation on keyword H3) answering the Portfolio agent; Toronto events index; ES\|QL in Kibana | The Portfolio lane's tool call; Kibana matching the case page | loader script |
| 10 | **Expo** ($150) | Expo Router app in Expo Go, react-native-maps polygons, haptics, accessibility | The app on the phone | `app/` |
| 11 | **Gemini** (swag) | The Hazard agent's surroundings card via Maps grounding (advisory only) | Card on 138 with cited places | cached card |

**Short pitches (the full 5-minute pitch for each sponsor is in `PITCHES.md`):**
- **Federato:** "21 open submissions, 6 of them property, and none has a premium. Atlas scores each as a range. Where the range crosses a decision line, the desk investigates, and only there. Watch 138: Intake finds the insured value through the insured's headquarters, estimates premium from comparable bound policies, Hazard skips earthquake for Florida and checks FEMA, and Portfolio checks what we already hold in that hurricane cell. What's left only the broker can answer, so it emails the broker. Every number is code. And here's the backtest against your underwriters, with the small n on screen."
- **Intact:** "Type a Toronto address. The same engine that underwrites commercial property prices a tenant policy from peril-matched city data, with every factor capped. You get an instant approve or refer, a receipt where every dollar has a source, and a full screen-reader path that never needs the map. Tap 'View as underwriter' and it's the same case on the desk."
- **Rox:** "The data is messy: the same account submitted by two brokers, a submission that went stale after the insured bound coverage elsewhere, premiums missing on every open submission, and hazard tags FEMA disagrees with. Atlas keeps provenance on every value, widens the score instead of guessing, and acts: it emails the broker for exactly the fields that change the decision, and texts the underwriter the top three."
- **OpenAI:** "Five agents on the Agents SDK with structured outputs. Intake turns English into a Federato query and repairs it from the API's own error. Codex built the data packs, the Elastic loaders, the backtest and the phone app; here's CODEX.md."
- **Huawei openJiuwen:** "A desk, not a chain. Specialists ask each other questions, code detects when they disagree, and the Lead resolves from options the guideline allows. It only goes deep where information can change the decision. Swap the rules file and the region pack, and the same desk reviews a Toronto tenant referral."
- **Linq:** "The underwriter never opens the app. The top three arrive by iMessage. Reply 'approve 1' and it's written to the case, with the audit trail."
- **Sentry:** "Every agent run is a Sentry trace with agent and tool spans. Here's the slow lookup a trace showed us, and what we changed" (read from `INCIDENTS.md`).
- **Composio, Elastic, Expo, Gemini:** one line each, from the table above, on their own screen.

**Booth route (09:45-11:45, about 6-7 stops):** Federato → Intact → Rox → OpenAI → Huawei → Linq → Sentry, then Composio and Elastic if time allows.

---

## 6. The 5-minute demo (six beats)

| Time | Beat | Screen | Fallback |
|---|---|---|---|
| 0:00-0:25 | "158 submissions, 21 open, none with a premium. Underwriters check appetite, outside risk and what we already hold. Atlas is a five-agent desk that tells you which to work, and what it had to find out to be sure." | Queue (open) | Local, nothing to fail |
| 0:25-1:45 | Open 138 and replay the lanes at 4x. The Lead's plan, Intake's route through the insured's headquarters and the premium comparables, Hazard skipping earthquake and checking FEMA, Portfolio's concentration check, and a specialist-to-specialist ask. The range shrinks and the enrichment chip shows before/after. What remains only the broker can answer, so the Lead **sends the Composio email**; show the broker inbox tab | Case 138 + lanes + inbox | Replay is the default; a live run only if a judge asks; the email is pre-sent in the tab |
| 1:45-2:20 | Ask box: type a question live. Attempt 1 is flagged by lint, attempt 2 shows the payload, then the rows | Ask page | A canned chip returns the cached result |
| 2:20-3:00 | Backtest: B3 (enrichment changed N tiers), B2 (the declines table by reason), B4 ("the 2025 guideline would decline 17 of 27 bound property policies, mostly on premium"), B1 with n | Backtest page | Static, from cache |
| 3:00-4:10 | Phone: a Toronto address → map → 3 questions → approve or refer → receipt → "View as underwriter" opens the same case on the laptop | Expo Go + web | A pre-filled address; if the tunnel fails, the hotspot; the recorded clip as the last resort |
| 4:10-5:00 | Linq: the digest is already on the phone; reply "approve 1"; the queue row flips live. Close: "Every number is code, every decision is traceable, and it runs on your schema." | Phone + queue | Replay the saved Linq payload to the webhook, labelled as simulated |

Messy-data details, the Gemini card, and the Elastic query in Kibana are kept for their booths, or shown if a judge asks.

---

## 7. Write-ups

**Devpost outline:**
1. One line: a five-agent underwriting desk that only investigates where information can change the decision, plus the same engine quoting Toronto tenants.
2. The problem, with the data facts: 21 open, missing premium, the headquarters path, duplicate brokers.
3. How it works: interval scoring, flippers, the desk (roster, asks, conflicts, the Lead), schema-aware queries, enrichment sources.
4. Proof: backtest numbers with n and the pre-registration commit.
5. Actions: Composio, Linq, Gemini.
6. The Intact side: tenant quote, fairness guardrails, accessibility.
7. Built with: one line per sponsor on what it does in Atlas, with a link to `CODEX.md`.
8. Limitations: synthetic data, small n, illustrative tenant prices, Gemini advisory only.

**Intact README section** (criterion 4 headings):
- The problem.
- How AI is used: the model explains and suggests add-ons; prices and decisions are code; the desk reviews referrals.
- User journey and key features.
- Fairness guardrails: peril-matched layers only, caps, shrinkage, no demographic inputs.
- Assumptions and limitations: illustrative base rate, Toronto only, police data offset to intersections, data dates.
- **Built at Hack the North by one person with AI coding agents** (first commit time, `CODEX.md`), which covers criterion 5 honestly.

---

## 8. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Live desk runs slow or flaky | High | Replay is the default demo; live runs one case only; semaphore; per-case budget |
| Intervals too wide (every open case stays Open) | Medium | Measure at M1; tune the comparables window; the depth floor decides what gets a deep dive |
| Weak backtest numbers | Medium | Pre-registered and shown honestly; lead with B3 and B4, which are strong by construction |
| Linq payload shape | Medium | Test at 17:30-19:00; raw logging; a labelled fixture replay |
| Tunnel dies | Medium | Tailscale funnel with ngrok fallback; hotspot |
| Composio sends from the wrong account | Low | Explicit connected account id; test at setup; demo inbox only |
| Elastic trial or licence issue | Low | In-memory index behind the same protocol, with an equality test |
| Model ids or cost | Low | From config; flagship only for the Lead; cost cap on the precompute |
| Federato rate limits (unknown) | Low | The local snapshot for every deterministic path; live calls only for the ask box and live mode |
| Scope overrun | High | Section 9 cut order; `demo-safe` tags; Ben codes no features after 00:00 |
| Fatigue (no sleep) | High | Feature freeze stays at 02:15 for core features; after that, extras only behind green tests; two-pass review on every merge after 04:00 |

---

## 9. Scope tiers and cut order

- **Tier 0, never cut:** the Federato client and schema-aware queries, the case with provenance, the interval engine, verified explanations, the queue and case page, the desk with visible lanes (replay), and enrichment before/after.
- **Tier 1:** the backtest page, the ask box, portfolio impact (in memory if needed), the Composio broker email, and the Expo tenant quote with its receipt and "View as underwriter".
- **Tier 2:** the Linq loop, Elastic as the index, the web map, and Sentry beyond agent spans.
- **Tier 3:** the Gemini card, geohex_grid, web Session Replay.

**Cut order when a milestone slips by 30 minutes** (first to go at the top):
1. Gemini
2. Web map (keep the portfolio line)
3. Elastic (use the in-memory index)
4. Linq (use a labelled fixture replay)
5. The Expo map screen (keep the list path; the app still quotes)
6. Live desk mode (replay only)

---

## 10. How Intact slides over without breaking Federato

- **One function.** `assess(case, rules, pack, portfolio)` serves both. The tenant quote is `assess(Case(kind="tenant"), rules("tenant"), pack("toronto"), None)` plus pricing from `tenant.yaml`. There is no consumer-only scoring code.
- **Two seams: rules files and region packs.** Engine code names no region or dataset (AGENTS.md rule 5, plus a grep test), so adding Toronto can't change a US score. The Federato answer key reruns after every Toronto change.
- **One store.** Tenant quotes persist as `TQ-*` cases in the same SQLite store. Referrals appear in the desk queue under "Consumer referrals", and the desk can deep-dive them with the Toronto layers. That's the reuse proof for openJiuwen.
- **The link is real.** `underwriterUrl` is `/cases/TQ-*`, the same page component that renders Federato cases.
- **The guardrails are data.** The Toronto pack's caps, shrinkage and excluded crime types live in the pack file, so a reviewer can read them.
- **The build order protects Federato.** The Toronto pack is built by Codex from 17:30 on its own branch, and the Expo app starts at 23:15, after the backtest and tenant rules. If the slide-over slips, Federato is already demo-safe at M3.
