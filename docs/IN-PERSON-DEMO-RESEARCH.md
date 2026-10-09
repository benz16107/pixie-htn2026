# In-person demo research

Checked against the official Hack the North 2026 Devpost pages and first-party sponsor documentation on September 20, 2026. Intact is excluded because its judging is asynchronous.

## Event format and general judging

Hack the North says the first-round presentation lasts five minutes and gives a warning at four minutes. Judges may use the remaining time for questions or feedback. The second round uses four minutes of demo and one minute of questions. In both rounds, the organizers want a live product demo, not slides or a product pitch. Sponsor judging can use one of three formats depending on submission count, so the public rules do not guarantee one common sponsor-demo format. [Official rules](https://hackthenorth2026.devpost.com/rules)

The general track scores originality, user experience, technical complexity, and "WOW factor." Hack the North also says finalists can be useful, playful, experimental, or unusual. A startup plan is not required. [Official overview and judging criteria](https://hackthenorth2026.devpost.com/)

### What that means for a five-minute room

- Rehearse a 3:30 to 3:45 live path, then stop for questions. The four-minute warning should not arrive while the main result is still loading.
- Demonstrate one complete user outcome. Do not tour every tab, sponsor, or architecture layer.
- Make the original idea, the hardest technical step, and the user-facing result visible through the interaction itself.
- Keep one backup capture for each network-dependent step, but begin with the working product.
- Explain limitations only where they affect what is on screen. One precise boundary builds more trust than a long disclaimer list.

## Federato

### Official target

Federato asks for an AI agent that acts like an underwriting professional. It should ingest submissions, enrich them with real-world risk data, and produce explainable, actionable insights relative to carrier appetite guidelines. Federato supplies a sample submissions API, schema-discovery endpoint, appetite guidelines, and an underwriting glossary. [Official Federato prize description](https://hackthenorth2026.devpost.com/)

### Live proof to prioritize

1. Open one incomplete submission, preferably case 138, and identify the source field that keeps the decision uncertain.
2. Show the schema-aware Federato query or hydrated linked records. This proves ingestion rather than a hand-written demo object.
3. Show one enrichment result, such as nearby exposure or hazard context, with its source visible.
4. Run the premium what-if and show the score changing from a range to a specific recommendation.
5. End on the next action for the underwriter and the exact calculation behind it.

This path covers all four verbs in the challenge: ingest, enrich, compare with appetite, and explain an action.

### Keep out of the timed path

- A full queue tour, guideline editing, every map layer, and the entire validation report.
- A long insurance glossary lesson. Define "appetite" in one sentence when the rulebook appears.
- More than one case unless a judge asks about a contrasting outcome.

### Claim boundaries

- Say that the demo uses Federato's supplied synthetic data and schema. Do not describe it as a Federato production account.
- Separate Federato's written criteria from Pixie's point mapping, thresholds, caps, and evidence adjustments.
- Call the result an appetite score or rule-based range. It is not a loss probability or a confidence interval.
- The historical backtest is a small synthetic evaluation. It does not prove production accuracy or loss prevention.

## Rox

### Official target

To qualify, a project must use large language models to operate on real-world, messy data and take meaningful actions. The agent should handle at least one kind of messiness, such as unstructured information, incomplete data, conflicting sources, or noisy records. Suggested evidence includes validation, source resolution, error handling, and decisions under uncertainty. Rox judges technical complexity, creativity, handling of messiness, and practical utility. [Official Rox prize description](https://hackthenorth2026.devpost.com/)

### Live proof to prioritize

1. Show cases 126 and 141 and the duplicated insured across two submissions.
2. Open the exact conflicting source rows and the visible defect label.
3. Show one LLM-driven operation. The checked Ask query and its lint or retry history is stronger proof than the deterministic duplicate detector alone.
4. Show the meaningful action: request evidence, flag the case for review, or refuse to give a falsely precise answer.
5. Return to the decision and explain what the agent did because the records conflicted.

A purely deterministic data-quality check does not, by itself, prove the qualifying LLM-agent requirement. The demo needs to make the model's role and its bounded action explicit.

### Keep out of the timed path

- Generic claims that agents can handle any dirty enterprise data.
- Local recall unless it directly changes the next evidence request.
- A clean happy-path query with no validation, conflict, or recovery behavior visible.

### Claim boundaries

- Pixie detects a defined set of defects. It does not repair or merge upstream Federato records.
- The current insurance dataset is synthetic. Describe the implemented incomplete and conflicting record behavior precisely instead of calling it production customer data.
- Pixie does not use a Rox SDK. The published prize description requires an LLM agent, not a Rox integration.
- Local recall is advisory and does not supply prices or engine scores.

## Sentry

### Official target

The project must use at least two Sentry products beyond error monitoring. The listed options are Session Replay, Logs, Tracing, Profiling, Uptime Monitoring, and MCP or AI Agent Monitoring. Judges care about creativity, depth of integration, and evidence that Sentry data changed the project. Installing the SDK is not enough. [Official Sentry prize description](https://hackthenorth2026.devpost.com/)

### Live proof to prioritize

1. Name the judged products at the start: Tracing, Logs, and AI Agent Monitoring.
2. Open one authenticated `pixie.underwrite_case` trace and follow it into an agent turn or tool call.
3. Trigger or show the unsupported-number guardrail. Connect the rejected sentence to its trace, structured log, and safe fallback shown to the user.
4. State the concrete engineering change. The team found and replaced a stale project DSN, then verified ingestion. The semantic guardrail also turned a silent unsafe answer into a tagged operational event.
5. End in the product UI with the safe replacement, so the judge sees why observability mattered to a user.

Sentry's trace API returns related spans and errors as one trace, while its Explore API treats logs and spans as distinct queryable datasets. Those first-party APIs support showing the relationship without calling every record an error. [Sentry trace API](https://docs.sentry.io/api/discover/retrieve-a-trace/) and [Sentry Explore API](https://docs.sentry.io/api/explore/query-explore-events-in-table-format/)

### Keep out of the timed path

- Source-code tours of initialization files.
- Session Replay, native crash capture, mobile replay, or alert delivery unless the judge can inspect real data from that feature.
- Monitor configuration that never emitted a check-in.

### Claim boundaries

- Count only products with real captured data. The strongest current set is Tracing, Logs, and AI Agent Monitoring.
- A configured issue workflow is not proof that a notification arrived.
- Expo Go does not prove native mobile crash capture or replay.
- The previous 53-transaction observation is one verification run, not an expected count for every demo.

## Elastic

### Official target

Elastic wants projects that turn messy, unstructured, real-world data into something a person or agent can act on. The strongest entries are agentic systems that choose what to retrieve, call tools, and trigger actions with Elasticsearch as the context layer. The sponsor explicitly asks teams to go beyond a basic RAG chatbot and points to hybrid BM25 and vector search, reranking, aggregations, ES|QL, geo or time-series queries, Agent Builder tools, and Workflows. [Official Elastic prize description](https://hackthenorth2026.devpost.com/)

Elastic's documentation defines hybrid search as full-text and vector retrieval combined into one ranked list and recommends reciprocal rank fusion. Agent Builder grounds agents in Elasticsearch data through built-in or custom tools. Workflows are a separate mechanism that agents can trigger for multi-step automation. [Elastic hybrid search](https://www.elastic.co/docs/solutions/search/hybrid-search), [Elastic Agent Builder](https://www.elastic.co/docs/explore-analyze/ai-features/elastic-agent-builder), and [agents with Workflows](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/agents-and-workflows)

### Live proof to prioritize

1. Ask one underwriting question that requires context, such as comparable outcomes or nearby active exposure.
2. Show the returned records and their real outcomes, with the `elastic` backend badge visible.
3. Explain the retrieval path in one sentence: BM25 and semantic candidates, reciprocal-rank fusion, then reranking.
4. Show a second Elasticsearch operation that is not semantic search, preferably the nearby-exposure geo aggregation or a registered Agent Builder ES|QL tool.
5. Show the action the result supports, such as requesting evidence, reviewing a concentration, or changing the order of cases for human review.

The strongest Pixie angle is that Elasticsearch retrieves evidence and computes portfolio context while deterministic underwriting rules own the score.

### Keep out of the timed path

- A generic chat prompt with no retrieved records, outcome, backend label, or action.
- All five indices, every query type, or a long Kibana tour.
- The local fallback as track proof.

### Claim boundaries

- If the badge says `memory` or `local`, that request did not use Elasticsearch. Switch to verified Elastic output or a saved authenticated response.
- Pixie has registered Agent Builder tools but no implemented Elastic Workflow. Do not claim an autonomous Workflow.
- Similarity and significant terms show associations in a small sample. They do not establish causal risk.
- Distinguish the real Toronto geo sources from the synthetic underwriting records.

## Expo

### Official target

Expo asks for a mobile app built with Expo and React Native for iOS and Android. The prize is for the best mobile experience, with emphasis on beauty, native feel, and enjoyment. Expo lists Router, Expo UI, and `expo-widgets` as examples, not mandatory components. [Official Expo prize description](https://hackthenorth2026.devpost.com/)

Expo UI exposes native SwiftUI and Jetpack Compose components to React. `expo-widgets` builds iOS Home Screen widgets and Live Activities, but the library is unavailable in Expo Go and requires a development build. [Expo UI documentation](https://docs.expo.dev/versions/latest/sdk/ui/) and [Expo Widgets documentation](https://docs.expo.dev/versions/latest/sdk/widgets/)

### Live proof to prioritize

1. Keep the iPhone Simulator or device on screen for nearly the whole demo.
2. Complete one short consumer task with visible input and output. The belongings inventory into tenant coverage, or car budget into vehicle comparison, is easier to follow than a tab tour.
3. Show one native interaction, such as the Expo UI drive action, haptic confirmation, Image Picker, speech, or share sheet.
4. Run or resume Drive Score, then leave the app and show the real Home Screen widget and Lock Screen Live Activity.
5. End on the permission and privacy boundary: foreground session, coarse service coordinates, and no stored route.

The judge is selecting a mobile experience, so interaction quality and transitions matter more than the number of Expo packages named aloud.

### Keep out of the timed path

- The underwriting website, provider architecture, or a list of every installed Expo module.
- Browser screenshots as proof of a native capability.
- A long incident exchange unless it is the single end-to-end story chosen for this room.

### Claim boundaries

- The widget and Live Activity are iOS development-build features. They do not run in Expo Go, and the current evidence is from the iOS Simulator rather than a physical iPhone or App Store build.
- Do not claim tested Android-native behavior unless it was verified on Android. Expo's prize description does not require both platforms to be shown in the same demo.
- Vehicle listings and Auto estimates are illustrative. Drive Score is coaching only and does not affect a quote or premium.
- Home pricing currently covers tenant insurance, not homeowner insurance.

## One-page rehearsal checklist

- General room: one coherent live story, 3:30 to 3:45, then questions.
- Federato: linked submission evidence, one enrichment, appetite calculation, next action.
- Rox: visible dirty record, visible LLM operation, bounded action under uncertainty.
- Sentry: name two or more products, open real telemetry, show the engineering or user-facing change.
- Elastic: keep `elastic` visible, show retrieval plus one non-search operation, end with an action.
- Expo: stay on the phone, complete one task, prove one native surface outside the app.
- Every room: preload the exact screens, keep a saved capture beside each network dependency, and never spend the timed path proving unrelated tracks.
