# Pixie audit and improvement plan (Sat 18:50)

What exists, what is weak, and what we do about it. Ordered by what a judge sees.

## 1. What exists

| Piece | State | Evidence |
|---|---|---|
| Federato client, schema graph, query lint, snapshot | Solid | 66 tests; live queries work; `[CODE]` errors parsed |
| Case builder with provenance (`Known`/`Estimated`/`Missing`) + data issues | Solid | 138 TIV via hq, 126/141 duplicate, 143 stale, 134 limit vs TIV |
| Appetite engine + interval scoring + rules YAML | Solid | Answer key 10/10 |
| Five-agent desk (Lead, Intake, Appetite, Hazard, Portfolio), event ledger, replay | Works | 5 cases with full lanes; 138 run = 42 events, $0.03, 28 s |
| Hazard enrichment from cached layers (FEMA/Esri, USGS, USFS, Open-Meteo, Nominatim) | Works | 350 cache files, 0 failures |
| Portfolio concentration (in-memory H3) | Works, shallow | Elastic version in flight |
| Tenant quote + Toronto pack + receipt | Works | Receipt sums exactly; basement refers |
| Actions: Composio email, Linq digest + inbound | Works, real | Real email sent; Ben's "1" approved 138 |
| Backtest B1-B4 + pre-registration | Works | 17/27 over ceiling; 11 declines; enrichment moved 38/38 intervals, 0 tiers |
| Web: queue, case, map, ask, backtest, live, legal | Works | All pages 200 in prod build |
| Expo app: address, map, 3 questions, receipt, about | Works | Runs in Expo Go on Ben's phone |

## 2. Weaknesses, ranked by demo damage

1. **The screens are cluttered and dense.** Three panels plus lanes plus chatter all compete. A judge cannot tell where to look. (Ben's own verdict.)
2. **The reasoning is listed, not shown.** We print factors, conflicts and an explanation as text. Nothing lets a judge *feel* the decision: no visual of how the score was built, no way to poke it ("what if the premium were $80K?").
3. **No counter-argument.** The desk decides; nothing argues the other side, states what could be wrong, or what would change its mind. This is exactly what an underwriter does and what makes a demo credible.
4. **Enrichment changes no decisions** (0 tier changes). It moves intervals and ranks only, which is honest but weak on Federato's bonus criterion. We can make the effect visible and explain when it does bind.
5. **Sponsor integrations are shallow** in several places: Composio is one email; Elastic is one aggregation (in flight); Gemini and Backboard are unused; Expo uses few native capabilities; Sentry is init plus agent spans.
6. **No precedent.** The desk never says "we wrote three risks like this and two produced losses", which is the most underwriter-ish thing a system can do and is a natural Elastic use.
7. **Tenant pricing lacks a visual.** The receipt is honest but flat; no sense of how the block compares with the city.
8. **No architecture picture** for judges or the Devpost write-up.

## 3. Backend improvements (do these before the design refresh)

### 3.1 Explainability (make the decision inspectable)
- `GET /cases/{id}/explain` returns a **contribution waterfall**: each factor's band, its points, the running score, the cap that bit, the hazard multipliers and the portfolio penalty, each with provenance and the rule text it came from.
- `POST /cases/{id}/whatif` takes overrides (premium = 80,000; year_built = 2012; sprinklered = true; a different hazard layer) and returns the recomputed interval, decision, and which factors changed. Deterministic, no model.
- `GET /cases/{id}/sensitivity` ranks the facts by how much they could move the decision: for each unknown or estimated fact, the decision at the low end and the high end, and the value at which the decision flips ("premium above $50,000 flips this from decline to refer").
- `GET /cases/{id}/precedent` (Elastic): the most similar past submissions by hybrid search plus their outcomes and losses.

### 3.2 A sixth agent: the Challenger (devil's advocate)
A `challenger` actor that runs after the Lead's draft decision and must produce, in structured output:
- the strongest argument **against** the decision, citing facts;
- the top three **risks** if we are wrong, each with a rough size ("if the premium is really $6K, we are writing a $2.1M TIV for a tenth of the guideline floor");
- a **remedy** per risk (a subjectivity, a deductible, a question to the broker, a re-inspection);
- what evidence would change its mind.
The Lead must respond to the challenge before the decision is final; the response is an event. This is honest (nothing is invented; the challenge is grounded in the same facts) and it is the "devil's advocate" Ben asked for. It also strengthens Huawei openJiuwen (genuine disagreement) and Federato (contradictions handled openly).

### 3.3 Decision quality
- Make the hard-fail cap explicit in the waterfall rather than a silent clamp.
- Tenant: return the same waterfall shape for the price, plus the city percentile of each block factor.
- Record model, tokens and cost per agent step in the event payload so the UI can show "who spent what".

## 4. Visualising the reasoning (the interactive part)

Three linked views, all driven by the same explain payload:
1. **Score waterfall (2D)**: bars from 0 to the final interval, each factor adding or removing points, the cap shown as a ceiling, hover to see the rule text and the source. Click a bar to open the fact.
2. **Decision space (3D)**: the case plotted against the two or three facts that matter most (premium, building age, TIV), with the accept and decline regions drawn as translucent volumes and the uncertainty of the missing premium as a line through the space. Drag the premium slider and watch the point travel across the decision boundary. This is where the "what if" becomes physical.
3. **Devil's advocate panel**: the Challenger's argument, risks with sizes, remedies, and "what would change my mind", each line clickable to the fact it cites.

## 5. Sponsor depth (research in flight, see docs/research/*.md)

Target: every sponsor gets at least one feature that is load-bearing, and at least one that is unusual. Decide from the research, then implement in this order: Elastic (context layer + precedent), Composio (watch the broker inbox, calendar, sheets audit trail), Sentry (agent traces, logs, replay, cron, alerts, MCP), Gemini (vision for contents, Maps grounding note), Expo (haptics, PDF receipt, share, notifications), Backboard (memory across cases, honestly scoped), OpenAI (guardrails, evals, built-in tools).

## 6. Risk register for the demo itself (devil's advocate on us)

| What could go wrong | Likelihood | Remedy already in place | Gap to close |
|---|---|---|---|
| Live model run stalls in front of a judge | Medium | Replay is the default; recorded runs for all 21 | Make replay the default on /live, not live |
| Tunnel or Wi-Fi dies | Medium | Everything runs locally; offline mode verified | Print a one-page fallback script |
| A judge asks for a case we never ran | Low | All 21 are pre-run | Keep demo-reset handy |
| "Your prices are invented" | High (fair) | Receipt says illustrative; PRICING.md documents constants | Say it first, before they ask |
| "Your data is synthetic" | High (fair) | It is Federato's own synthetic set | Show the backtest anyway, with n |
| "Enrichment changes nothing" | Medium | B3 reports interval and rank moves honestly | Add the case where it does bind |
| Sponsor judge asks a deep API question | Medium | Research docs per sponsor | Keep docs/research open on a tab |
