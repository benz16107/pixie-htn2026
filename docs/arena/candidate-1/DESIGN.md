# Atlas, candidate 1: the interval desk

## Problem

Atlas must win Federato first and Intact second from one engine, built solo with 2-3 coding agents between 17:45 Saturday and 08:00 Sunday, while making ten stacked tracks load-bearing. The shape is non-obvious because of what the real data does, not what the brief implies:

1. **The queue that matters is small and mostly out of appetite.** 21 open submissions, 6 of them property (126, 133, 134, 138, 141, 143). Four are in TX, IL or WA, outside the 2025 state list. Only 138 (FL, 2023 masonry non-combustible, $2.1M TIV) looks in appetite. A desk that just prints "decline" six times has no story. The story is *what the desk had to find out to be sure*.
2. **Open submissions have no premium, no business type and no building link.** TIV comes from `Insured.hq -> Location.buildings`. Premium must be estimated. New vs renewal must be inferred from the insured's other policies (143's insured already holds an active property policy, PR-2026-1031, so "new business" is doubtful). Loss history must come from the insured's prior policies' claims.
3. **Sources conflict.** 126 and 141 are the same insured (Lakeside Medical) submitted by two different brokers (6 and 1), a textbook broker-clearance conflict. Requested limits ($1M on 134) sit far below hq TIV ($24.3M). Hazard tags say "flood" where FEMA may say Zone X.
4. **The ground truth is thin and mostly off-guideline.** 14 declines, only one property (115, loss_history). 3 are `broker_withdrew` (not an underwriting decision). 17 of 27 bound property policies carry premium above the guideline's $175K ceiling, so the humans wrote outside the 2025 guideline routinely. A backtest that claims "agrees with humans 12/14" would be padding.
5. **Only property has a guideline**, yet the carrier binds 75 non-property policies. Other lines are "outside this desk's appetite, route", not "decline".

Constraints carried in: no number from a model; missing is never a pass; provenance on every value; cached external lookups; region-agnostic engine (AGENTS.md). Integration facts from INTEGRATIONS.md: compute H3 cells and boundary polygons server-side (no h3-js in Expo Go), react-native-maps only, Elastic aggregates a keyword `h3` field with a terms aggregation, Linq inbound payload logged raw first, model ids from config.

## Usage (caller's view)

The engine has one entry point per audience. Everything else is private.

```python
# api/src/atlas_api/app.py  (FastAPI shell, the only process)
from atlas_api.case import World              # Federato snapshot + packs + rules, loaded once
from atlas_api.engine import assess, quote_tenant   # pure: Case -> Assessment; consumer path
from atlas_api.desk import Desk, CaseLog      # multi-agent desk over the case log

world = World.load(snapshot="cache/federato", packs=["us", "toronto"], rules="rules/")
desk = Desk(world, log=CaseLog("cache/events"), models=ModelConfig.from_env())

@app.get("/queue")
def queue(view: QueueView = "open") -> list[QueueRow]:
    return [row_of(a) for a in world.assess_all(view)]           # deterministic, <1 s for 158

@app.post("/desk/run")
async def run(req: RunRequest) -> RunAccepted:
    return await desk.run(req.case_ids, mode=req.mode)            # mode: "live" | "replay"

@app.get("/cases/{case_id}/events")
async def events(case_id: str, replay: bool = False):
    return sse(desk.log.stream(case_id, replay=replay))            # swimlane feed

@app.post("/quote/tenant")
def tenant(req: TenantRequest) -> QuoteView:
    return quote_tenant(world, req)                                # instant decision, same engine, persists a case
```

What a caller gets back for open submission 133 after triage, before any agent ran:

```python
a = assess(world.case("SUB-133"), world.rules("property_2025"), world.pack("us"), world.portfolio)
a.score            # ScoreInterval(lo=12, hi=38)   premium unknown, loss history known
a.decision         # Decided(kind="decline", because=["state:IL not_acceptable", "age:1952 not_acceptable"])
                   # Decided, so no flippers: the desk will NOT spend a deep dive here

a = assess(world.case("SUB-138"), ...)
a.score            # ScoreInterval(lo=54, hi=81)
a.decision         # Open(straddles=70, flippers=(Flipper(fact="premium", resolver="broker",
                   #      bands_possible={"target","acceptable","not_acceptable"}),))
```

The desk turns `Open` into work. The Lead sees "138 is open, $2.1M, one flipper (premium), resolver broker", asks Intake for comparables (which narrows the interval), and if it is still open, fires the Composio broker email. That is the adaptive reasoning, and it is computable.

Call site in the Expo app (TypeScript, generated from the same pydantic models):

```ts
const q = await api.quoteTenant({ address: "88 Bathurst St, Toronto", answers });
q.decision.kind        // "approve" | "refer"
q.receipt.lines        // [{ label: "Break-ins near you", multiplier: 1.06, capped: false, source: "TPS B&E 2023-2026, hex 892b9bc..." }]
q.hexes                // [{ cell, ring: [[lat,lng],...], value, level }]  polygons computed server-side
Linking.openURL(q.underwriterUrl)   // https://<host>/cases/TQ-7f3a  the same case page the desk uses
```

## Shape

### Data structures first

**`Value[T]`** (case.py) is the whole provenance story in one sum type: `Known(v, source)`, `Estimated(lo, hi, point, method, evidence)`, `Missing(reason, resolver)`. `Resolver` is a closed enum: `broker | intake | hazard | portfolio | applicant | none`. A rule never sees a raw float, so "missing counts as a pass" cannot be written (per encode-lessons-in-structure).

**`Case`** is flat and region-agnostic: `id, kind (commercial | tenant), as_of, line, business_type, primary_admin, tiv, premium, year_built (TIV-weighted), construction_share, loss_5yr, sites[], issues[]`. Every scalar is a `Value`. `issues` are typed `DataIssue`s (duplicate account, broker conflict, limit vs TIV, coordinate mismatch, tag vs FEMA) with the facts they cite. Cases come from `World`, which holds an immutable Federato snapshot (dict of resource -> id -> record) fetched once through the query planner and cached. Every dominant access pattern (case by id, insured's other policies, locations by cell, bound comparables by line) is an index built at `World.load`, not a later cache.

**`RulesFile`** (engine.py) is YAML: factors, each with a `fact` name, ordered bands (`target`, `acceptable`, `not_acceptable`) as predicates, `points`, and `hard_fail`. The property 2025 guideline and `tenant.yaml` are two files in the same format.

**`Assessment`** = `factors: list[FactorResult]` (each with the set of bands still possible), `risk: RiskProfile`, `portfolio: PortfolioImpact | None`, `score: ScoreInterval`, `decision: Decided | Open | Routed`. Unknown and estimated facts widen the interval instead of zeroing out. `Open` exists only when the interval straddles a threshold, and it lists the `Flipper`s: the facts whose resolution could change the decision, with their resolver.

**`RiskProfile`** (risk.py) = capped `Factor`s (peril, observation, raw multiplier, applied multiplier, cap hit, source, citation) and a capped total. Region packs supply layers and curves. The same object prices a Toronto tenant and adjusts a Texas warehouse score.

**`DeskEvent`** (desk.py) is the only thing agents write. The case file is a fold over the event log. Each agent appends only its own events (per separate-before-serializing-shared-state), and event ids are content hashes, so a replayed or retried append is a no-op (per make-operations-idempotent). The swimlane UI renders events directly. There is no second trace format.

### Flow

```
Federato API --(planner: rules -> schema paths -> queries)--> Snapshot --> World (indexes)
World.case(id) -> Case (Values with provenance, DataIssues)
assess(Case, RulesFile, RegionPack, Portfolio) -> Assessment        # pure, no I/O except cached layers
Desk.run(ids):  triage all (code) -> Lead picks deep dives from Open cases by value
                -> Intake/Hazard/Portfolio fan out (asyncio.gather), post Findings that add Facts
                -> assess() re-runs on the enriched Case (Appetite agent narrates the delta and contradictions)
                -> code detects Conflicts between stances -> Lead resolves from an allowed set
                -> Decision event -> Actions (outbox, idempotent)
```

### Load-bearing decisions

1. **Interval scoring drives orchestration** (the biggest bet). The desk deepens analysis exactly where information can flip a decision, weighted by value at stake. This turns Federato's "adapts, deepens for high-value" into a computable policy the Lead follows and can justify in its lane. Cases whose interval is decided get no deep dive, and the lane says why. This is also why the demo can show the interval shrinking live as the broker email, the FEMA lookup and the comparables come back.
2. **Queries are derived from the rules file through the schema graph**, not hardcoded and not free-written by an LLM. `SchemaGraph.paths(from="Submission", to_field="Building.tiv")` returns every reference path (via `Policy.exposure_units.location.buildings`, via `insured.hq.buildings`), and `QueryBuilder` emits correct `expand`/`unwind`/`$elemMatch`. The Intake agent chooses among candidate paths when the first yields missing data and explains the choice. That meets "agent constructs queries dynamically" and "schema discovery" without betting the case builder on LLM JSON. The free-form LLM query writer exists only in the plain-English box, where a lint pass (`QueryBuilder.lint`) catches array dot-paths and unexpanded references before the call, and a retry loop feeds the parsed `[CODE] message` back.
3. **Agents own judgment, code owns numbers.** Appetite, risk, portfolio math and the premium estimate are pure functions. Agents choose which lookups to run, which path to query, which conflicts matter, which resolution to take (from an allowed enum), and write prose. `verify_numbers(text, facts)` rejects any number not in the fact set, falling back to the template explanation.
4. **The desk is a scheduler over typed messages, not a chain.** Agents address each other (`Ask` with `to`), subscribe to event kinds, and the Lead can re-ask. Round and budget caps are in `DeskPolicy`. Agents are OpenAI Agents SDK `Agent`s with `output_type` pydantic models (structured outputs), so Sentry's OpenAIAgentsIntegration records every agent and tool span for free.
5. **The consumer path is the same `assess()`** with `tenant.yaml` and the Toronto pack. It persists a `Case(kind="tenant")` in the same store, so "View as underwriter" opens a real case page, and a `refer` lands in the underwriter queue for the desk. The Intact slide-over is two files (rules and pack), plus an Expo UI.
6. **Replay is a first-class mode.** A full desk run is recorded to the event log at feature freeze. `stream(replay=True)` re-emits it with original timing. The demo never depends on a live LLM, Federato, FEMA or Elastic call. Live mode is used for one case the judge picks.

### Interface depth

Public surface: `World.load`, `World.case`, `World.assess_all`, `assess`, `Desk.run`, `CaseLog.stream`, `quote_tenant`, `ask`, `backtest`, and the actions outbox. Hidden behind it: token refresh, schema graph path finding, query linting, `[CODE]` error parsing, snapshot caching, premium comparables, renewal inference, duplicate detection, layer selection, caps, H3 math, Elastic vs in-memory portfolio, message routing, budget, conflict detection, number verification, idempotent sends. No transport types (Federato JSON, Linq payloads, Elastic hits) cross the public surface. They are parsed into domain types inside the module that owns them (per boundary-discipline).

### What it deliberately does not do

No LLM-produced score, premium, factor, or rank. No JiuwenSwarm (custom scheduler, stated honestly). No client-side H3. No price that claims to be an Intact rate. Gemini output never changes a number: it can only add an inspection subjectivity with citations. No Elastic dependency at demo time: the in-memory portfolio index answers the same two questions if Elastic is down.

## Synthesis decision

To be filled by arena.

## Tradeoffs accepted

- We accept a deterministic fetch planner as the primary query path in exchange for a case builder that never fails on bad LLM JSON. The LLM-written query appears in the plain-English box and in Intake's fallback path choice, where failure is visible and recoverable.
- We accept intervals in the UI (a score of "54-81") in exchange for honest handling of missing data and a real reason to deepen analysis. Rank uses the interval midpoint, ties broken by value at stake.
- We accept that the tenant quote runs without LLM agents in its decision path (instant, <300 ms) in exchange for speed and honesty. The desk only runs on referred quotes.
- We accept a backtest that reports small and mixed numbers (27 bound property policies, 11 underwriting declines) in exchange for credibility with Federato's FDE judges. The backtest is pre-registered in `eval/BACKTEST.md` before the first run.
- We accept sending "broker" emails to a demo inbox (Contact emails are synthetic) with the real contact name in the greeting.
- We accept one event format for trace, UI, replay and audit, which means the UI must tolerate new event kinds (render unknown kinds as a generic card).

## Alternatives considered

- **Lead agent with specialists as tools (`Agent.as_tool`, one conversation).** Smallest code and native SDK traces, but it is a pipeline in disguise: specialists cannot address each other, the Lead serializes everything, and "who asked whom" is not visible. It hides the orchestration inside one prompt, so openJiuwen judges see a chain. Lost on collaboration quality.
- **LLM writes every Federato query (free-form).** Most "agentic" on paper, but the case builder would then depend on model JSON for 158 cases, and failures cascade into wrong scores. It exposes model failure to every downstream module. Lost on robustness; kept for the question box only.
- **Point scores with "unknown = 0" (the current PLAN.md).** Simpler, but it hides missing data inside a number, gives the Lead no principled reason to deepen, and makes "estimated premium" look as certain as a real one. Lost on the Exceptional tier's adaptive and contradiction criteria.
- **Separate consumer pricing service for Intact.** Faster to write the Expo side, but then "same engine" is a slide claim. Lost because the slide-over's value is that it is literally the same `assess()`.

## Open questions and risks

- Do the synthetic coordinates match their zip codes? If most are offset (Tampa location 1 sits east of downtown), a coordinate-mismatch flag on every case is noise. Should the flag threshold be set from the measured distribution before it ships?
- Is the premium estimate interval (p25-p75 of comparable `technical_premium / TIV`) wide enough that nearly every open case stays `Open`? If so, should the flipper threshold use p10-p90 for the broker ask but p25-p75 for ranking?
- Does the Linq sandbox key use v3 (`/v3/chats`, Bearer) or partner v2 (`X-LINQ-INTEGRATION-TOKEN`)? Both are documented. The client takes a base path from config; which one does the hackathon key accept?
- Should 143 (insured already holds an active property policy) be scored as renewal (not acceptable) or new with a conflict? The design marks it `Estimated` renewal with evidence and lets the Lead resolve. Ben should confirm he likes that as a demo beat.
- Is `gpt-6-astra` (or whatever the picker shows) fast enough for live single-case runs under 20 s? If not, Lead on the flagship, specialists on the cheap tier.
- Geohex license on the Elastic trial is untested. The design uses a keyword `h3` terms aggregation regardless.

## Next implementation step

Write `api/src/atlas_api/federato.py` (token, snapshot, `SchemaGraph.paths`, `QueryBuilder` with `lint`) and `api/src/atlas_api/case.py` (`Value`, `Case`, `World.case`) against the cached data, with an assert-based check that open submission 138 builds TIV $2,073,000 via `insured.hq` and premium as `Missing(resolver="broker")`.
