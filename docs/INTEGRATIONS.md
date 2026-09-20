# Integration verification — HTN 2026 Federato build (multi-agent underwriting desk)

Verified 2026-09-19 via live doc fetches and web search. Each section: status, minimal code path, gotchas, source URL(s). Anything not independently confirmed is marked unverified.

---

## 1. OpenAI Agents SDK for Python (openai-agents)

**Works — verified.**

Agent with tools, handoffs, structured output, streaming, and custom tracing are all first-class in `openai-agents`.

```python
from agents import Agent, Runner, function_tool, add_trace_processor
from pydantic import BaseModel

@function_tool
def check_appetite(state: str, line: str) -> str:
    return "in-appetite"

class HazardReport(BaseModel):
    score: float
    flags: list[str]

hazard_agent = Agent(name="Hazard", instructions="Assess hazard.", output_type=HazardReport)

lead_agent = Agent(
    name="Lead",
    instructions="Route submissions to the right specialist.",
    tools=[check_appetite],
    handoffs=[hazard_agent],   # handoff = specialist takes over the conversation
    # or: tools=[hazard_agent.as_tool(tool_name="hazard_check", tool_description="...")]
    #     agent-as-tool = specialist runs and returns control to Lead — closer fit for
    #     a "desk" where Lead stays in charge and just calls out to Intake/Appetite/Hazard/Portfolio
)

result = Runner.run_streamed(lead_agent, "New submission: ...")
async for event in result.stream_events():
    if event.type == "raw_response_event":
        continue
    print(event.type)   # drives the per-agent live trace UI
```

Custom trace export for your own per-agent trace UI:

```python
from agents import add_trace_processor

class MyProcessor:
    def process(self, spans): ...   # ship to your own event stream / websocket

add_trace_processor(MyProcessor())   # adds alongside OpenAI's backend exporter
# set_trace_processors([...]) replaces it entirely if you don't want OpenAI's backend at all
```

Built-in spans: `agent_span()`, `generation_span()` (LLM calls), `function_span()` (tool calls), `handoff_span()`, `guardrail_span()`, `custom_span()` — nest automatically via contextvar, safe under concurrent sub-agent runs. Parallel sub-agents: run several `Runner.run(...)` coroutines with `asyncio.gather`; each gets its own nested trace.

**Model names (verified via two independent official-domain fetches, 2026-09-19):**
- Flagship: `gpt-6-astra` (developers.openai.com calls it "most intelligent model yet").
- Cost-tiered family: `gpt-5.6-luna` (SDK default, low reasoning/verbosity, cost-sensitive) and `gpt-5.6-sol` (explicit opt-in for frontier capability).
- Legacy names still referenced in Agents SDK docs: `gpt-5`, `gpt-5-mini`, `gpt-5-nano`, `gpt-4.1`.
- These 2026-era names (Astra/Luna/Sol) are unusual enough that they're worth a sanity-check against your own OpenAI dashboard model picker before the hackathon — flagged, not just accepted at face value.

**Agents SDK vs. plain Responses API loop for a 5-agent desk with visible traces:** Agents SDK is faster to build here. `handoffs=[...]` and `.as_tool()` give you Lead→Intake→Appetite→Hazard→Portfolio orchestration in a few lines instead of hand-rolled function-calling loops, and `stream_events()` + spans give you the per-agent trace UI for free instead of instrumenting a bespoke Responses API loop by hand.

Sources: [Agents](https://openai.github.io/openai-agents-python/agents/) · [Running agents](https://openai.github.io/openai-agents-python/running_agents/) · [Handoffs](https://openai.github.io/openai-agents-python/handoffs/) · [Tracing](https://openai.github.io/openai-agents-python/tracing/) · [Tracing source doc](https://github.com/openai/openai-agents-python/blob/main/docs/tracing.md) · [Models](https://openai.github.io/openai-agents-python/models/) · [Model guidance](https://developers.openai.com/api/docs/guides/latest-model)

---

## 2. Sentry Python (OpenAIAgentsIntegration + FastAPI) and Sentry Expo

**Works — verified, one gap.**

```python
import sentry_sdk

sentry_sdk.init(
    dsn="https://<key>@o<orgId>.ingest.sentry.io/<projectId>",
    traces_sample_rate=1.0,
    enable_logs=True,   # ships structured logs, separate from traces_sample_rate
)
```
The `OpenAIAgentsIntegration` activates automatically once `openai-agents` is an installed dependency; `FastAPI` integration likewise auto-enables when `fastapi` is installed — no explicit `integrations=[...]` needed for either in the minimal path (explicit `OpenAIAgentsIntegration(include_prompts=True)` if you want prompt/response bodies captured too).

Spans recorded per the docs page: agent invocations, tool executions, and input/output token counts / model usage. The fetched page did **not** explicitly list handoffs or per-generation spans as separately tracked — unverified whether a Lead→Hazard handoff shows as its own span or just nests inside the agent invocation span. Worth a smoke test before relying on it for the trace UI.

**Sentry Expo / React Native:**
`sentry-expo` is deprecated since Expo SDK 50 (Jan 2024) and merged into `@sentry/react-native`. Use `@sentry/react-native` with the `@sentry/react-native/expo` config plugin (both work as Expo config plugins per Sentry's own issue tracker). In Expo Go specifically: only JS errors are captured — native crashes, frame tracking, and session replay all require a development build, so for a hackathon demo running in Expo Go, expect JS-error tracking only.

Gotcha: don't install `sentry-expo` for a new 2026 build — it's dead weight, go straight to `@sentry/react-native`.

Sources: [Sentry OpenAI Agents integration](https://docs.sentry.io/platforms/python/integrations/openai-agents/) · [Sentry FastAPI integration](https://docs.sentry.io/platforms/python/integrations/fastapi/) · [Expo sentry-expo migration guide](https://github.com/expo/fyi/blob/main/sentry-expo-migration.md) · [Expo "Using Sentry" guide](https://docs.expo.dev/guides/using-sentry/) · [sentry-react-native issue on config plugin](https://github.com/getsentry/sentry-react-native/issues/5859)

---

## 3. Linq API (linqapp.com, iMessage)

**Works — partially verified.**

```
POST https://api.linqapp.com/api/partner/v2/chats/{chat_id}/chat_messages
Header: X-LINQ-INTEGRATION-TOKEN: <your_token>
```
Linq auto-picks the best channel (iMessage → RCS → SMS) — you don't select the protocol per message.

**Verified:** auth header is `X-LINQ-INTEGRATION-TOKEN` (per docs.linqapp.com/v2/api/); sandbox limit is 100 messages/day (from search result, not independently re-confirmed by direct fetch — treat as likely but not doc-page-verified).

**Unverified / gap:** exact inbound webhook payload shape for `message.received` (sender handle, chat id, message parts, direction fields) — the fetched overview page referenced webhook subscriptions for "incoming messages, reactions, and events" and a `phone_number.status_updated` event, but did not show a concrete JSON payload for inbound messages. A search hit separately claimed a `message.received` event with `event_type`, chat info, `direction`, `sender_handle`, and message parts, but that was search-engine synthesis, not a page fetch — **do not build the webhook parser off that claim alone; pull the actual webhook reference page (`docs.linqapp.com/.../webhooks`) before wiring it up.**

**Tapbacks/reactions:** the docs reference a "React to Message" send operation and mention reactions are included in webhook notifications generically, but whether a tapback on an *inbound* user message reliably fires its own webhook event was not confirmed on the fetched page. Verify with a live test send + tapback before the demo depends on it.

Sources: [Linq API docs overview](https://docs.linqapp.com/v2/api/) · [Linq API docs root](https://docs.linqapp.com/) · [Linq iMessage API product page](https://linqapp.com/imessage-api)

---

## 4. Composio Python SDK — Gmail send

**Works — verified.**

```python
from composio import Composio

composio = Composio(api_key="your_composio_key")

result = composio.tools.execute(
    "GMAIL_SEND_EMAIL",
    user_id="user-k7334",           # scopes to the connected account for this user
    arguments={
        "recipient_email": "recipient@example.com",
        "subject": "Hello",
        "body": "Message body here",
    },
)
```
Setup: create an Auth Config in the Composio dashboard, connect a Gmail account for your `user_id`, then `tools.execute()` with that `user_id` routes to the matching connected account automatically.

**Account-routing gotcha (matches your own prior note on Composio/Instagram):** tool execution scopes by `user_id`, not by explicitly naming a connected account, in the minimal path shown in docs. Where multiple connected accounts exist for one user/toolkit, the proxy-call variant accepts an explicit `connected_account_id` — but the standard `tools.execute()` docs page does not spell out the selection/priority logic when a user has more than one Gmail connection. Given your memory note that `connected_account_id` inside `-d` payloads has silently posted to the wrong (default) account before on other toolkits, **treat multi-account Gmail the same way: explicitly pass/verify `connected_account_id` rather than trusting default routing, and test with the actual connected account before demo day.**

Sources: [Composio executing tools docs](https://docs.composio.dev/docs/tools-direct/executing-tools) · [Composio Gmail toolkit](https://docs.composio.dev/kb/guide/toolkits-gmail)

---

## 5. Gemini API — Grounding with Google Maps

**Exists — verified.**

```python
client.interactions.create(
    model="gemini-3.8-flash",
    input="What's the flood/wildfire exposure near this address?",
    tools=[{
        "type": "google_maps",
        "latitude": 37.7749,
        "longitude": -122.4194,
    }],
)
```
Returns text plus inline `PlaceCitation` annotations (source name + Google Maps URL) — good fit for a Hazard agent citing real places.

**Supported models (per fetched docs page):** Gemini 3.8 Flash, 3.7 Flash, 3.6 Flash, 3.5 Flash-Lite, 3.5 Flash, 3.1 Pro Preview, 3.1 Flash-Lite, 3 Flash Preview, plus 2.5 Pro/Flash/Flash-Lite. (Note: these model numbers, like the OpenAI ones above, are past-cutoff and worth a sanity check against the live Gemini model picker.)

**Pricing:** Gemini 3.x billed per search query the model executes internally; Gemini 2.5-and-older billed per grounded prompt (only charged if at least one Maps result returns), roughly $25/1,000 grounded prompts per an earlier search hit (not independently re-verified on the pricing page itself — confirm on ai.google.dev/gemini-api/docs/pricing before budgeting API spend).

**Canada availability:** doc page states "globally available" but explicitly adds the tool "may not be available in all regions" — **no explicit Canada confirmation either way. Unverified for your specific use case; test a real call from a Canadian project/region before relying on it at HTN.**

Sources: [Grounding with Google Maps](https://ai.google.dev/gemini-api/docs/maps-grounding)

---

## 6. Expo Go — maps, H3, location, router

**Mixed — verified per sub-item.**

- **react-native-maps in Expo Go:** works, verified. "No additional setup is required when testing your project using Expo Go" (current version referenced: v57.0.0). Google provider on Android needs an API key in `app.json` (`plugins.react-native-maps.androidGoogleMapsApiKey`) + `PROVIDER_GOOGLE`, but that's for production builds/full native features, not a Expo-Go blocker for basic map rendering.
- **h3-js on Hermes (Expo Go's JS engine):** real risk, verified as a known issue class, not confirmed fixed. Hermes historically threw `TypeError: Cannot convert BigInt to number` on BigInt-heavy code unless you enable the `hermes-stable` Babel transform profile; h3-js's internals use BigInt-like operations. Meta has been actively adding native BigInt support to Hermes, but whether it's fully resolved in the Hermes version bundled with the current Expo SDK (Sept 2026) is **unverified** — test `h3-js` inside actual Expo Go before committing to it; have the Babel transform-profile fallback ready, or compute H3 cells server-side (Python `h3` package, section 9) and ship only cell IDs/boundaries to the client as a fallback plan.
- **expo-location, expo-router:** standard Expo SDK modules, no gotchas surfaced — not specifically re-verified this session beyond general Expo SDK familiarity; treat as low-risk.
- **MapLibre RN alternative:** confirmed requires a development build. `@maplibre/maplibre-react-native`'s own docs state Expo Go is not a supported runtime — it needs the config plugin plus a rebuilt dev client (native code changes via `Add custom native code` / `expo prebuild`). **Not usable for a plain-Expo-Go hackathon demo** unless you build a dev client ahead of time.

Sources: [react-native-maps Expo docs](https://docs.expo.dev/versions/latest/sdk/map-view/) · [MapLibre RN GitHub](https://github.com/maplibre/maplibre-react-native) · [MapLibre RN Expo setup](https://maplibre.org/maplibre-react-native/docs/setup/expo/) · [Hermes BigInt issue](https://github.com/facebook/hermes/issues/510)

---

## 7. Elastic — geo_point / geohex_grid / geo_distance

**Works — mostly verified, license unresolved.**

```python
# Mapping
PUT /submissions
{ "mappings": { "properties": { "location": { "type": "geo_point" } } } }

# geohex_grid aggregation (H3 hex buckets)
GET /submissions/_search
{
  "size": 0,
  "aggregations": {
    "hex_grid": { "geohex_grid": { "field": "location", "precision": 6 } }
  }
}
```
`geohex_grid` buckets `geo_point`/`geo_shape` values into H3 hex cells (default zoom/precision 6, default max 10,000 buckets) — directly useful for the Portfolio agent's hex-based exposure aggregation.

**geo_distance query** (Python client 9.x, standard):
```python
from elasticsearch import Elasticsearch
es = Elasticsearch("https://...")
es.search(index="submissions", query={
    "geo_distance": {"distance": "50km", "location": {"lat": 37.7749, "lon": -122.4194}}
})
```
(This is a stable, long-standing ES query DSL shape; not specifically re-verified against the 9.x Python client reference page this session, but consistent with current Elasticsearch geo query docs and unchanged client method (`es.search(query=...)`) since 8.x.)

**License — unverified, real risk.** The fetched `geohex_grid` doc page shows no license/subscription badge and doesn't call out a tier requirement. However, a separate Elastic discuss-forum thread reports a "non-compliant license" error for `geohash_grid` aggregation specifically **on `geo_shape` fields** (not `geo_point`). Net: `geohex_grid` on plain `geo_point` fields (the mapping you'd actually use for lat/lon submissions) looks like it should be free-tier/Basic-license compatible, but this is **not confirmed** — the docs page carried no explicit "Free" badge either. **Before building the Portfolio agent's aggregation around this, spin up an Elastic Cloud trial and run the exact `geohex_grid` query against a `geo_point` field to confirm no license error**, rather than trusting the absence of a badge on the doc page.

Sources: [Geohex grid aggregation](https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-geohexgrid-aggregation) · [Geopoint field type](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/geo-point) · [Discuss thread: non-compliant license for geohash_grid on geo_shape](https://discuss.elastic.co/t/non-compliant-license-for-geohash-grid-aggregation-on-geo-shape-fields/297702)

---

## 8. H3 in Python (v4 API)

**Works — verified.**

```python
import h3

lat, lng = 37.769377, -122.388903
cell = h3.latlng_to_cell(lat, lng, res=9)      # '89283082e73ffff'
boundary = h3.cell_to_boundary(cell)            # tuple of (lat, lng) pairs, ring closed (first == last)
```
v4.0.0 renamed the old API: `geo_to_h3` → `latlng_to_cell`, `h3_to_geo_boundary` → `cell_to_boundary`, `h3_to_geo` → `cell_to_latlng`. If any reference code or Stack Overflow snippet uses the old v3 names, it'll break on a fresh `pip install h3` — confirm you're pinned to v4 and using the new names throughout, including in any prompt/tool-schema examples fed to the Hazard/Portfolio agents.

Sources: [h3-py PyPI](https://pypi.org/project/h3/) · [h3-py GitHub](https://github.com/uber/h3-py) · [H3 indexing functions docs](https://h3geo.org/docs/api/indexing/)

---

## Gotchas that change the plan

1. **h3-js may not run cleanly in Expo Go's Hermes engine** (BigInt handling is a known Hermes weak spot). Default plan: compute H3 cells server-side in Python (`h3` v4, section 9) and ship cell IDs + pre-computed boundaries to the Expo client — don't depend on client-side `h3-js` working until you've smoke-tested it in actual Expo Go.
2. **MapLibre RN is off the table for Expo Go** — it needs a dev build. Stick with `react-native-maps`, which is confirmed to work with zero setup in Expo Go.
3. **Elastic `geohex_grid` license status is unconfirmed** — test against a real Elastic Cloud trial on a `geo_point` field before building the Portfolio agent's hex aggregation around it; have a fallback (compute hex buckets in Python with `h3`, aggregate manually) ready.
4. **Linq's inbound webhook payload shape (and whether tapbacks fire their own event) is unverified** — pull the live webhook reference doc and do a real send/react round-trip before wiring the Intake agent's inbound handler, rather than coding against the shape a search engine guessed at.
5. **Composio Gmail multi-account routing is a repeat of a gotcha you've hit before on Instagram** — don't trust default `user_id`-only routing if more than one Gmail account could be connected; pass `connected_account_id` explicitly and verify the send lands on the right account.
6. **Model names for both OpenAI (`gpt-6-astra`, `gpt-5.6-luna`/`gpt-5.6-sol`) and Gemini (3.8/3.7/3.6 Flash etc.) are past this session's knowledge cutoff and look unusual** — both were confirmed via live doc fetches from official domains, but cross-check against your actual API dashboard/model picker at build time in case of a doc-vs-availability mismatch.
8. **Sentry's OpenAI Agents integration may not span-out handoffs separately** — verify the per-agent trace UI actually shows Lead→Hazard as a distinct step before building demo narrative around it; the fetched docs only confirmed agent invocations, tool calls, and token counts as tracked.
