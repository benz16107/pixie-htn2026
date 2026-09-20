# Atlas design, candidate 2: the case file is the trace

## Problem

Build one risk engine that serves two audiences in 14 hours: an underwriting desk of five agents that triages Federato's 158 submissions with visible, adaptive reasoning, and a consumer tenant quote on a phone that gets an instant decision from the same engine. The Federato data forces three shapes. The open queue (21 submissions) has no policy, so premium is missing and TIV only reaches buildings through `Insured.hq -> Location.buildings`, while bound submissions reach buildings through `Policy.exposure_units -> Location.buildings`. The 2025 guideline covers property only, yet 15 of the 21 open cases and 77 of 113 bound policies are other lines, so a verdict vocabulary that only says "in or out of appetite" makes the backtest look broken. The 14 declines carry a human `decline_reason` (loss_history, insufficient_controls, outside_appetite, cat_exposure_aggregation, broker_withdrew), and those reasons map one to one onto the specialist agents, which is what makes a per-agent backtest possible. Constraints from AGENTS.md hold: no number from a model, missing is never a pass, provenance on every value, every external lookup cached to disk, no region names in engine code. INTEGRATIONS.md adds: H3 polygons computed server side (no h3-js in Expo Go), react-native-maps only, Elastic hex aggregation via a keyword field and `terms` (licence-safe), Linq inbound payload unverified so log raw first, model ids read from config.

The non-obvious part is how to make the multi-agent desk genuinely collaborative without building a second system (a trace store) next to the first (the case). This design's answer: there is no separate trace. The case file is an append-only ledger of typed events, each written by exactly one actor. Every screen (queue row, factor table, swimlanes, backtest, consumer receipt) is a fold over that ledger.

## Usage (caller's view)

Four callers: the FastAPI shell, the backtest runner, the consumer quote path, and the Expo/web apps through the HTTP contract. Nothing else is public.

```python
# api/src/atlas_api/http.py: the only process
from atlas.case import CaseStore
from atlas.federato import FederatoClient
from atlas.desk import Desk, UNDERWRITING_DESK, Intake
from atlas.risk import RiskEngine
from atlas.portfolio import Portfolio
from atlas.appetite import Appetite
from atlas.actions import Actions

store = CaseStore.open(Path("var/atlas.sqlite"))                     # events + cases + lookup cache, one file
fed = FederatoClient.from_env()                                       # token refresh, schema cached at startup
risk = RiskEngine.load(Path("packs"))                                 # packs/us, packs/toronto discovered by manifest
desk = Desk(UNDERWRITING_DESK, store=store, fed=fed, risk=risk,
            portfolio=Portfolio.connect(Path("packs/us")), appetite=Appetite.load(Path("packs/us/appetite.yaml")),
            actions=Actions.from_env(store), model=settings.OPENAI_MODEL)

@app.post("/cases/{case_id}/run")
async def run(case_id: str, depth: Depth | None = None):
    asyncio.create_task(desk.run(case_id, depth=depth))              # events stream to store; SSE tails them
    return {"ok": True}

@app.get("/cases/{case_id}")
def case(case_id: str) -> CaseView:
    return store.view(case_id)                                       # fold(events) -> score, factors, lanes, actions

@app.post("/ask")
async def ask(q: AskRequest) -> AskResult:
    return await desk.intake.ask(q.question)                          # same Intake the desk uses; shows query + retries

@app.post("/quote")
def quote(req: QuoteRequest) -> QuoteView:
    return desk.consumer.quote(req)                                   # no LLM in the decision path; < 300 ms
```

```python
# What the web case page receives for open-queue case SUB-2025-00126 (Lakeside Medical, TX property)
CaseView(
  case_id="sub-126", region="us", line="property", insured="Lakeside Medical Group Group",
  score=Score(points=41, cap=None, verdict="refer", enrichment_delta=-6, portfolio_delta=-4),
  factors=[Factor("line", band="acceptable", value="property", source="api:Submission.line_of_business#126"),
           Factor("state", band="not_acceptable", value="TX", source="api:Location.state#12 (hq, 3 buildings)"),
           Factor("tiv", band="acceptable", value=35_716_000, source="derived:sum(Building.tiv)[30,31,32]"),
           Factor("premium", band="unknown", value=None, source="missing; estimated 214_000 from 6 comparables"),
           Factor("building_age", band="not_acceptable", value=1968, source="derived:tiv-weighted year_built"),
           ...],
  risk=RiskReport(factors=[RiskFactor("flood", points=-6, evidence="FEMA NFHL zone AE, SFHA true", source="external:fema@2026-09-19")],
                  points=-6, cap=15),
  portfolio=Impact(hex="852a1073fffffff", existing_tiv=41_000_000, added_tiv=35_716_000, over=True, points=-4),
  conflicts=[Conflict(kind="target_vs_fail", a="tiv:acceptable", b="building_age:not_acceptable",
                      resolution="Decline unless the 1948 and 1975 buildings show post-2010 roof and wiring; keep as refer for the renovation ask")],
  explanation="Property in Texas ... every number here appears in factors",   # checker enforces
  lanes={"Lead": [...], "Intake": [...], "Appetite": [...], "Hazard": [...], "Portfolio": [...]},  # events grouped by actor
  actions=[ActionView(kind="request_info", status="sent", to="j.ortiz@harrowfinch.example.com", at="...")],
)
```

```python
# evals/backtest.py: the wow slide's producer. Deterministic path only; no LLM calls, runs in ~2 s.
report = backtest(store, snapshot=Snapshot.load(Path("data/federato")), key=AnswerKey.load(Path("evals/answer_key.yaml")))
report.write(Path("web/public/backtest/latest.json"))
# report.decline_recall = 9/11 (broker_withdrew excluded), report.by_reason = {"loss_history": 3/3, "cat_exposure_aggregation": 2/2, ...}
# report.loss_ratio_by_bucket = {"top": 0.21, "mid": 0.48, "bottom": 1.9}   # real measured numbers only
```

```typescript
// app/app/quote/[caseId].tsx (Expo): the receipt screen's data, and the link that proves the shared engine
const q = await api.quote({ address: "180 Queen St W, Toronto", unit: "upper", contents: 30000, deductible: 1000, claims: 0 });
// q.decision = "approve", q.receipt.lines[i] = { name, dollars, reason, source, capped }, q.hexes[i] = { boundary: [[lat,lng]...], multiplier }
Linking.openURL(`${WEB}/cases/${q.caseId}`);      // "View as underwriter": the same CaseView the desk renders
```

## Shape

### Data structures (sketch/case.py)

`Event` is the unit of everything. `Event(id, case_id, seq, ts, actor, kind, subject, payload, refs, key)`. `actor` is one of `lead | intake | appetite | hazard | portfolio | underwriter | broker | system`. `kind` is a closed enum: `query, query_retry, finding, estimate, gap, plan, ask, answer, conflict, decision, action, action_result, inbound, note`. Each kind has its own pydantic payload class, discriminated by `kind`, so an `ask` without a `to` field does not exist. `refs` point at earlier event ids, and are what the swimlane draws as arrows between lanes. `key` is the idempotency key (`actor:kind:subject`); posting the same key twice replaces rather than appends, so a re-run of the desk or a crashed run converges to the same case file, per make-operations-idempotent.

Every value the desk reasons about is a `Field[T](value, source, confidence)`. `source` is a parsed `Source` (`api`, `derived`, `estimated`, `external`, `answer`, `missing`) with the reference string. `Case` holds the fields Federato's guideline needs (`tiv, premium, primary_state, business_type, building_year, construction_mix, loss_5y, effective, expiration`) plus `locations`, `buildings`, `contact`, and `events`. The fold `view(case) -> CaseView` is the single place score, verdict, lanes, conflicts and explanation are computed; nothing stores a score.

Per-actor state with a merge at the read boundary, per separate-before-serializing-shared-state: each specialist posts only under its own `actor`, and the fold merges. Two agents never write the same field.

### Flow

1. **Intake** builds the case. Live path: the Intake agent (OpenAI Agents SDK) reads the cached schema and the guideline's required data points and writes `Query` objects; `Schema.check(query)` rejects unknown fields and rewrites array dot-paths to `$elemMatch` (both posted as `query_retry` events, which is the "adapts when a query fails" proof); `FederatoClient.run(query)` executes; `CaseBuilder.assemble(rows)` folds rows into `Field`s. Backtest path: `CaseBuilder.assemble(Snapshot)` is the same fold over the pulled JSON, no LLM. The premium estimate and the renewal detection are code (`estimate_premium`, `infer_business_type`) with cited comparables.
2. **Appetite** is deterministic: `Appetite.evaluate(case) -> [Factor]` from `packs/us/appetite.yaml` (rule = field, bands, `unknown` handling). Its thin agent posts one `finding` per contradiction it sees in the factor table.
3. **Depth policy** (code) proposes `skim | standard | deep` from the preliminary factors and TIV; the Lead may raise it with a `plan` event and a reason, never lower it.
4. **Hazard** and **Portfolio** run concurrently. Hazard chooses lookups per location from the pack's lookup roster (the agent picks, the pack's `applies(location)` guard filters, e.g. no earthquake lookup where the tag list has no quake and the state has no M4+ history), posts each as `finding` with the score delta it caused. Portfolio calls `Portfolio.impact(case)` (Elastic `terms` on `hex5` keyword with `sum(tiv)`, fallback in-memory h3) and posts the concentration finding.
5. **Lead** reads the merged view. Code computes `conflicts(view)`; the desk refuses a `decision` while any conflict lacks a `conflict` resolution event, and re-prompts the Lead with the list. The Lead may post up to two `ask` events per case; the addressed specialist answers. Then `decision` (verdict, one-paragraph explanation) and zero or more `action` events (request_info, notify).
6. **Explanation check**: every number token in the decision text must appear in the factor list; otherwise the decision is rejected and the Lead is re-prompted with the offending number. Per boundary-discipline, this runs at the LLM boundary, and everything after it trusts the text.
7. **Actions** are events too. `Actions.perform(event)` is idempotent by `key`; results post as `action_result`. Linq inbound is a webhook that logs the raw payload, parses `approve 3 | refer 2 | decline 5`, and posts a `decision` under `actor=underwriter`, which the SSE tail turns into a live queue update.

### The consumer path is the same fold with a different roster

`CONSUMER_DESK` has no LLM: Intake is code (address -> Toronto geocode -> `Case` with `answer:` sources), Hazard is `RiskEngine.assess(point, pack="toronto")`, Appetite is `packs/toronto/tenant.yaml` (bands plus `refer_when`), and pricing is `Receipt.build(factors)` (fixed-order dollar lines, sums exactly). It posts the same event kinds under the same actors, so `/cases/{id}` on the web renders a consumer quote as a swimlane with three lanes. That link is real because there is one store and one fold.

### Region packs (sketch/risk.py)

A pack is a directory with `manifest.yaml`, lookups, and cached results. `RiskEngine.assess(point, pack, context) -> RiskReport` returns capped `RiskFactor`s: for `us`, points in [-15, +5] from FEMA flood zone, USGS quake count, USFS wildfire class, Open-Meteo gust days, plus the data's own `hazard_tags` and `protection_class`; for `toronto`, multipliers in [x0.92, x1.10] per peril, product clamped to [x0.85, x1.25], from precomputed `hex_scores` (GEO-PLAN C1). Same type, two units, declared in the manifest; the appetite engine consumes points, the receipt consumes multipliers. No state or city name appears in engine code.

### Interface depth

Public surface: `Desk.run`, `Desk.intake.ask`, `Desk.consumer.quote`, `CaseStore.view/tail`, `backtest`, and the HTTP contract in `api.ts`. Hidden behind it: token refresh and error parsing, schema validation and dot-path repair, the two hydration paths, premium estimation, renewal inference, the depth policy, conflict detection, the numbers check, per-agent concurrency, idempotent replays, the lookup cache, hex math, and the receipt's line ordering. The web app never sees a query payload except as the `query` event's payload it renders. Deliberately not done: no generic agent framework (the roster is two literal lists), no separate trace store, no message bus (events in SQLite with a `seq` cursor are the bus), no vector search.

## Synthesis decision

To be filled by arena.

## Tradeoffs accepted

- We accept that the backtest runs the deterministic path only (no LLM) in exchange for a two-second, reproducible number on stage. The Lead's prose and depth choices are demonstrated live on the open queue, not scored in the backtest.
- We accept SQLite as the event bus and cache in exchange for one file, zero services, and a demo that runs with the network off. Elastic holds only what is geo: portfolio locations and the Toronto pack.
- We accept that non-property lines get the verdict `out_of_guideline` (line-agnostic checks only) rather than `decline`, in exchange for a backtest that measures what the guideline can measure. This is stated on the backtest page.
- We accept a code-owned depth policy the Lead can only raise, in exchange for never skipping a deep dive on a $35M case because a model felt like it.
- We accept the Agents SDK for the four LLM specialists (as_tool pattern, Lead in charge) in exchange for not hand-rolling tool loops; our swimlanes come from our events, not from SDK spans, so a Sentry or SDK tracing gap cannot break the UI.
- We accept two premium estimators (property: technical_premium/TIV rate; other lines: premium/requested_limit rate) with cited comparables, marked `estimated`, in exchange for a ranked open queue that still asks the broker for the real figure.

## Alternatives considered

- **Separate trace store next to the case** (PLAN.md's draft shape: case builder, trace log, blackboard). Loses on depth: three representations of one fact (the field, the blackboard entry, the trace line) must be kept in sync, and the swimlane UI needs joins. The ledger fold gives the same screens from one structure.
- **Handoff-style orchestration** (Lead hands the conversation to Hazard, which hands back). Loses on coordination quality: the conversation is sequential by construction, so Hazard and Portfolio cannot run concurrently and there is no place to record a conflict as data. Agent-as-tool plus a shared ledger is genuinely parallel and auditable.
- **LLM-scored appetite** (ask the model for 0-100 with reasons). Loses on every axis the judges named: not reproducible, no backtest, violates the no-number rule. Rules-as-YAML interpreted by code also gives the consumer side its `tenant.yaml` for free.
- **Elastic as the primary store for events and cases.** Loses on buildability: one more service in the demo path and no benefit for an append-only log of a few thousand rows. Elastic stays where its geo aggregations do work.

## Open questions and risks

- Does the Lead need the freedom to lower depth (skip Portfolio on a $1M cgl)? The sketch says no; is a fixed floor per line acceptable, or should skim be allowed for `out_of_guideline` lines to save demo time?
- The guideline's "loss value" for a declined or open submission has no policy of its own; the sketch derives it from all prior policies of the same insured. Is that the reading Federato's judges expect, or should losses be limited to the same line?
- Elastic trial: if `terms` on `hex5` with `sum(tiv)` returns a licence error at 21:45, the fallback is the in-memory h3 aggregation over the same records; does Elastic then still count as load-bearing for the booth (Toronto pack + map layers), or do we drop the track?
- Linq inbound: if the sandbox approval or the webhook shape is not confirmed by 00:30, the sketch downgrades the reply loop to "outbound digest + a manual `POST /webhooks/linq` replay from a saved payload". Acceptable for the booth?
- OpenAI model ids (`gpt-6-astra`, `gpt-5.6-luna`) come from config; which one is affordable for 21 live cases x 5 agents plus retries? Budget check at setup.

## Next implementation step

Write `case.py` (Event, Field, Source, Case, CaseStore with SQLite, and `view()`) with a fixture of one hand-written case file, so the web swimlane and every engine module can be built against the fold before any agent exists.
