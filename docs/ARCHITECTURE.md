# Pixie architecture

Three pictures. The first is for a judge with 20 seconds, the second is for an engineer reading the
repo, the third follows one submission from arrival to a human reply.

Every box is code that exists in this repo on `lane/a4`. Where a box needs a key or a cluster that
may not be up during the demo, the caption says what runs without it. Nothing planned is drawn.

Rendered copies for a slide or a Devpost post live in `docs/diagrams/` (SVG and PNG, one pair per
diagram). Re-render after editing a block here with:

    python3 scripts/render_diagrams.py      # stdlib only, needs the network once

## 1. What Pixie is

Two products sit on one risk engine. The underwriter desk prices a commercial property submission;
the renter app prices a Toronto tenant policy. The same `assess()` scores both, against a different
rules file.

<!-- diagram: 01-overview -->
```mermaid
flowchart LR
  broker["Broker sends a<br/>property submission"]
  renter["Renter answers<br/>3 questions on a phone"]
  web["<b>Product 1: underwriter desk</b><br/>Next.js web<br/>queue · case · live · map · ask"]
  expo["<b>Product 2: renter app</b><br/>Expo<br/>questions · quote · map · photos"]
  facts["<b>Federato data layer</b><br/>every fact carries its source:<br/>known, estimated or missing"]
  hazard["Public hazard layers<br/>FEMA · USGS · USFS · Open-Meteo"]
  book["The carrier's own book<br/>Elastic: exposure + precedent"]
  city["Toronto open data<br/>break-ins · fire halls · flooding"]
  photos["Photo inventory<br/>Gemini reads a room"]
  engine["<b>One risk engine</b><br/>score interval + decision<br/>a missing fact is never a pass"]
  desk["<b>Six-agent desk</b><br/>lead · intake · hazard<br/>portfolio · appetite · challenger"]
  decision["<b>Decision + explanation</b><br/>every number the engine computed,<br/>every sentence checked against it"]
  actions["<b>Outbound actions</b><br/>broker email · calendar hold<br/>audit row · defect ticket (Composio)<br/>SMS digest + renter thread (Linq)"]
  human["<b>Human replies</b><br/>broker email · SMS tapback"]
  sentry["<b>Sentry</b> watches every run<br/>one trace per decision, with cost and tokens,<br/>and an alert when an agent invents a number"]

  broker --> web
  renter --> expo
  photos --> expo
  web --> facts
  expo --> facts
  facts --> engine
  hazard --> engine
  book --> engine
  city --> engine
  engine --> desk
  desk --> decision
  decision --> actions
  actions --> human
  human -. "the reply becomes a fact,<br/>the case is re-scored" .-> facts
  desk -.-> sentry

  classDef person fill:#f3f0e9,stroke:#8a8578,color:#2b2b2b
  classDef product fill:#dce9f7,stroke:#2f6fa8,color:#12314d
  classDef core fill:#d9efdf,stroke:#2f7d4f,color:#123324
  classDef enrich fill:#fbf1d2,stroke:#a8862f,color:#4a3a0f
  classDef out fill:#ece2f5,stroke:#6b4a96,color:#2e1c47
  class broker,renter,human person
  class web,expo product
  class facts,engine,desk,decision core
  class hazard,book,city,photos enrich
  class actions,sentry out
```

![Pixie overview: two products over one risk engine](diagrams/01-overview.png)

What to read off it:

- **Two products, one engine.** `api/src/atlas_api/engine.py:232` `assess()` is called by the
  commercial path (`app.py:95`) and the tenant path (`tenant.py:224`) with different rules files
  (`rules/property_2025.yaml`, `rules/tenant.yaml`).
- **Provenance is the point.** `case.py:36-57` makes every scalar a `Known`, `Estimated` or
  `Missing`. `engine.evaluate()` gives a `Missing` fact every band at once, so a gap widens the
  score interval instead of quietly passing.
- **The score is an interval, not a number.** A case whose interval straddles a threshold is `Open`,
  and the facts that could move it are named with who can supply them (`engine.py:299`).
- **The enrichment is cached.** Hazard layer JSON is read from disk (`layers.py:35`), never fetched
  during a run. The Toronto pack ships its raw GeoJSON in `packs/toronto/raw/`.

## 2. Module map

Modules in `api/src/atlas_api/`, what calls what, and where each sponsor's service enters. An arrow
means "calls into"; several of them are lazy imports inside a route function rather than
module-level ones, which is what keeps importing the app from pulling in the Agents SDK.

<!-- diagram: 02-modules -->
```mermaid
flowchart LR
  subgraph clients["Clients"]
    webc["web/ Next.js<br/>queue · cases/[id] · live<br/>map · ask · backtest<br/>proxied by /api/atlas/[...path]"]
    expoc["app/ Expo Router<br/>index · questions/[step]<br/>quote · map · inventory"]
  end

  subgraph routers["FastAPI: app.py and its routers"]
    appmod["<b>app.py</b><br/>lifespan · /queue · /cases/{id}<br/>/desk/run · SSE /events<br/>/map/* · /quote/tenant<br/>explain · whatif · sensitivity"]
    insights["insights_routes.py<br/>/cases/{id}/precedent<br/>/insights/declines<br/>/cases/{id}/percentile"]
    composior["composio_routes.py<br/>prefix /composio<br/>status · broker-reply/check<br/>review/book · decision/log<br/>defects/file · agent"]
    linqr["linq_routes.py<br/>/webhooks/linq · /actions/digest<br/>/linq/quote · group · digest/status<br/>/media/{file}"]
    geminir["gemini_routes.py<br/>prefix /gemini<br/>inventory · context<br/>speech · verify"]
  end

  subgraph orch["Orchestration, the only model callers"]
    deskm["<b>desk.py</b><br/>Desk.run(): lead, intake, hazard,<br/>portfolio, appetite, challenger<br/>depth_floor · detect_conflicts<br/>_gate_on_challenge"]
    actionsm["actions.py<br/>outbox · request_broker_info<br/>book_referral_review · log_decision_to_sheet<br/>file_data_quality_ticket · run_actions_agent"]
    askm["ask.py<br/>question to Federato query,<br/>lint, retry, verified answer"]
    opsm["ops.py<br/>ask_ops() over the<br/>Sentry MCP server"]
  end

  subgraph core["Deterministic core, no model anywhere"]
    engine["<b>engine.py</b><br/>assess() · evaluate()<br/>estimate_premium() · verify_numbers()"]
    casem["<b>case.py</b><br/>Case · Known/Estimated/Missing<br/>World · DataIssue"]
    eventsm["events.py<br/>DeskEvent, 20 payload types,<br/>CaseFile.fold()"]
    explainm["explain.py<br/>waterfall · whatif · sensitivity"]
    tenantm["tenant.py<br/>quote_tenant() · receipt lines"]
  end

  subgraph data["Data, index and channel layer"]
    fedm["federato.py<br/>FederatoClient · SchemaGraph<br/>QueryBuilder.lint · Snapshot"]
    storem["case_store.py<br/>SQLite: cases, events,<br/>outbox, cache"]
    portm["portfolio.py<br/>ElasticIndex / InMemoryIndex"]
    precm["precedent.py<br/>hybrid search · significant_terms"]
    layersm["layers.py<br/>cached hazard layers<br/>to multipliers"]
    mapsm["maps.py<br/>pins · per-H3-cell TIV"]
    receiptm["receipt.py<br/>PNG receipt card"]
    linqm["linq.py<br/>send · typing · media<br/>webhook parse"]
    telem["telemetry.py<br/>log() · verify_numbers_alert()"]
  end

  subgraph ext["Sponsor services, where each one enters"]
    fedapi["<b>Federato</b><br/>core-api handler<br/>+ data/federato snapshot"]
    openai["<b>OpenAI</b><br/>Agents SDK<br/>gpt-6-astra / gpt-5.6-luna"]
    elastic["<b>Elastic</b><br/>pixie-exposure<br/>pixie-precedent"]
    composio["<b>Composio</b><br/>Gmail · Calendar<br/>Sheets · Linear/Notion"]
    linqapi["<b>Linq</b><br/>partner v3 chats API"]
    gemini["<b>Gemini</b><br/>vision · Maps grounding<br/>TTS · code execution"]
    sentryext["<b>Sentry</b><br/>traces · logs · MCP server"]
    opendata["Open data<br/>packs/toronto · cache/layers"]
  end

  webc --> appmod
  expoc --> appmod
  appmod --> insights & composior & linqr & geminir
  appmod --> deskm & askm & opsm & tenantm & explainm & storem & mapsm
  insights --> precm
  composior --> actionsm
  linqr --> linqm & receiptm & deskm
  geminir --> storem

  deskm --> engine & eventsm & storem & layersm & portm & precm & telem & fedm & explainm
  actionsm --> engine & eventsm & storem
  askm --> fedm & storem
  explainm --> engine
  eventsm --> casem
  engine --> casem
  tenantm --> engine & storem
  casem --> fedm
  portm --> mapsm
  precm --> portm
  linqm --> storem

  fedm --> fedapi
  deskm --> openai
  askm --> openai
  actionsm --> openai & composio
  opsm --> openai & sentryext
  portm --> elastic
  precm --> elastic
  linqm --> linqapi
  geminir --> gemini
  telem --> sentryext
  layersm --> opendata
  tenantm --> opendata

  classDef sponsor fill:#ece2f5,stroke:#6b4a96,color:#2e1c47
  classDef corebox fill:#d9efdf,stroke:#2f7d4f,color:#123324
  classDef modelbox fill:#fbf1d2,stroke:#a8862f,color:#4a3a0f
  class fedapi,openai,elastic,composio,linqapi,gemini,sentryext,opendata sponsor
  class engine,casem,eventsm,explainm,tenantm corebox
  class deskm,actionsm,askm,opsm modelbox
```

![Pixie module map](diagrams/02-modules.png)

Reading notes:

- `app.py` imports the four routers at module level (`app.py:26-43`) and everything else lazily
  inside the route functions, so importing the app does not pull the OpenAI Agents SDK.
- `composio_routes.py` and `linq_routes.py` import `atlas_api.app` back for `get_store()`,
  `_world` and `apply_desk_run` (`composio_routes.py:37`, `linq_routes.py:40`). That is the one
  cycle in the graph, and it is deliberate: the routers own their own endpoints so lanes editing
  `app.py` do not collide.
- `precedent.py` reuses `portfolio._elastic_client` (`precedent.py:29`), so both indexes share one
  connection check and one silent in-memory fallback.
- Nothing in `engine.py`, `case.py`, `explain.py` or `events.py` imports a model SDK. Every number
  on screen is computed there.

## 3. One case, end to end

The path a single commercial submission takes. Solid arrows are the happy path. Dashed arrows are
the shortcut and the two guards: a decided case skips every model call, the call budget cuts the run
short, and the number check can replace what a model wrote.

<!-- diagram: 03-decision -->
```mermaid
flowchart TB
  sub["<b>1. Submission arrives</b><br/>World.case('SUB-138') reads the Federato snapshot<br/>case.py:194"]
  facts["<b>2. Facts with provenance</b><br/>TIV: Known, source 'Insured.hq → Location 19 → Buildings'<br/>premium: Missing, resolver 'broker'<br/>plus DataIssues: duplicate broker, stale, limit vs TIV"]
  triage["<b>3. Interval score, and the depth code demands</b><br/>assess(case, property_2025.yaml): each factor contributes its own<br/>min and max band points → ScoreInterval(lo, hi) + Decided | Open | Routed<br/>depth_floor(): an open case or a blocking issue forces a deep dive,<br/>and the Lead may raise that floor but never lower it"]
  plan["<b>4. Lead plans the deep dive</b><br/>one model call for the whole batch,<br/>1-3 addressed briefs per case"]

  subgraph spec["5. Specialists run in parallel, each writing DeskEvents"]
    direction LR
    intake["<b>intake</b><br/>hydration path, one linted<br/>Federato query, estimate_premium"]
    hazardg["<b>hazard</b><br/>picks layers per site,<br/>skips with a reason,<br/>search_precedent (Elastic)"]
    portfoliog["<b>portfolio</b><br/>active TIV within 30 km,<br/>H3 res-5 cell"]
    appetiteg["<b>appetite</b><br/>re-runs the engine,<br/>narrates the contradiction"]
  end

  fold["<b>6. Fold, then hazard and portfolio adjustments</b><br/>CaseFile.fold(events) → new facts + hazard multipliers<br/>assess(case, rules, LayersPack, portfolio impact)<br/>hazard points = -15 · ln(multiplier) / ln(1.25), total clamped 0.85-1.25<br/>portfolio = -1 point per $25M of active TIV within 30 km, capped"]
  conflict["<b>7. Conflicts, detected in code, resolved by the Lead</b><br/>detect_conflicts() reads typed outputs, not prose<br/>the Lead may only pick from the allowed option list,<br/>and code fills in the first allowed option if it picks outside"]
  challenge["<b>8. Challenger, then the Lead's answer, then the gate</b><br/>the Challenger argues against the draft and sizes 2-4 risks;<br/>'what would change my mind' comes from the sensitivity analysis<br/>the Lead answers every risk by name and may change the verdict<br/>_gate_on_challenge() records any unanswered risk as unaddressed"]
  decision["<b>9. Decision and the stored view</b><br/>accept / refer / decline / request_info, plus the explanation<br/>apply_desk_run() rebuilds the QueueRow and CaseView, and the<br/>waterfall, what-if and sensitivity all read the same numbers"]
  action["<b>10. Action</b><br/>broker email (Composio Gmail), calendar hold, audit row in Sheets,<br/>defect ticket, SMS digest or renter reply (Linq)<br/>an outbox row per (case, action, facts) makes each one idempotent"]
  reply["<b>11. Human replies, and the case is re-scored</b><br/>broker email: a value is accepted only if the model can quote it<br/>verbatim and the quote re-checks against the email<br/>SMS: a tapback or 'accept 138' writes a human decision<br/>the value becomes Known with the message id as its source,<br/>assess() runs again at step 3 and the interval narrows on screen"]

  verify["<b>verify_numbers</b>, at every model step (4, 5, 8, 9)<br/>every model sentence is checked against the strings tools returned;<br/>a failure swaps in the template and fires a Sentry alert"]
  budget["<b>budget and timeout</b>, over the whole run<br/>22 model calls per case, 85 seconds;<br/>on exhaustion the deterministic verdict stands"]

  sub --> facts --> triage --> plan --> spec --> fold --> conflict --> challenge --> decision --> action --> reply
  triage -. "skim: no model call at all, and the<br/>challenge is read off the sensitivity analysis" .-> decision
  budget -.-> spec
  verify -.-> decision

  classDef codeonly fill:#d9efdf,stroke:#2f7d4f,color:#123324
  classDef modelstep fill:#fbf1d2,stroke:#a8862f,color:#4a3a0f
  classDef guard fill:#f7dede,stroke:#a83b3b,color:#4d1414
  class sub,facts,triage,fold,conflict codeonly
  class plan,challenge modelstep
  class verify,budget guard
```

![One case from submission to human reply](diagrams/03-decision.png)

Where each step lives:

| Step | Code |
| --- | --- |
| 1, 2 | `case.py` `World.case()`, `_tiv_via_policy`, `_infer_business_type`, `_duplicate_and_stale_issues` |
| 3 | `engine.py` `assess()`, `evaluate()`; `desk.py` `depth_floor()` |
| 4, 5 | `desk.py` `Desk._plan()`, `Desk._case()`, `_answer_asks()`, the four tool sets |
| 6 | `events.py` `CaseFile.fold()`, `desk.py` `_CaseRun.enriched()`, `layers.py` `LayersPack`, `portfolio.py` `Impact` |
| 7 | `desk.py` `detect_conflicts()`, `allowed_options()` |
| 8 | `desk.py` `_challenge()`, `_deterministic_challenge()`, `_gate_on_challenge()`; `explain.py` `sensitivity()` |
| 9 | `desk.py` `_decide()`, `_close()`; `app.py` `apply_desk_run()`; `explain.py` `waterfall()`, `whatif()` |
| 10 | `actions.py`, `composio_routes.py`, `linq_routes.py`, `case_store.py` outbox |
| 11 | `actions.py` `check_broker_reply()` / `apply_broker_reply()`, `linq_routes.py` `_dispatch()` |

## What runs with nothing configured

The demo has to survive a dead conference network, so every external call has a recorded or
computed path behind it.

| Missing | What happens |
| --- | --- |
| `ELASTIC_*` | `open_index()` and `open_precedent_index()` fall back to the in-memory index with the same math and the same shape. The desk prints the backend it used, `[elastic]` or `[memory]`. |
| `OPENAI_API_KEY` | `/desk/run` defaults to `mode: "replay"`, which returns the recorded run id and streams the stored events with their original timing, with no model call. Live mode needs the key and fails without it. |
| `ATLAS_OFFLINE=1` | Federato queries answer from `api/cache/federato/q` or say "offline: this query is not in the cache"; `/ask` answers from the store cache only. |
| `ATLAS_ACTIONS` unset (default `dry`) | Every Composio and Linq action composes the message, writes the outbox row and the events, and calls nothing. The repo's own `.env` sets `live`, so on the demo machine they really send. |
| `SENTRY_DSN_API` | `telemetry.log()` is a no-op; the app boots identically. |
| `cache/layers/` empty | Each layer read is a `GapP` event, not a guess. The score simply carries no hazard adjustment. |
| `GEMINI_API_KEY` | The four `/gemini/*` routes return 502 and each client shows an unavailable state. There is no canned Gemini response anywhere, by design: the feature disappears rather than lying. |
| `EXPO_PUBLIC_API_URL` | The Expo app falls back to `app/fixtures/quotes.json` with an "Offline sample" banner, and the photo inventory dead-ends. It is not set in the repo, so it has to be pointed at the tunnel before a demo. |

Two caches carry the demo and neither is in git, because `cache/` and `var/` are in `.gitignore`:
the 350 prefetched hazard layer files (70 locations, five sources) and the Gemini response cache.
Both exist only on the machine that warmed them. `data/federato` is a symlink to a sibling repo, not
content in this one.
