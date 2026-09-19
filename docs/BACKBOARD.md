# Backboard.io in Pixie: cross-case memory, guideline RAG, and typed judgements

Code: `api/src/atlas_api/memory.py`, route in `api/src/atlas_api/openai_routes.py`, live check in
`scripts/backboard_check.py`. Research: `docs/research/openai-backboard.md` (plus two things it
predates, see System One below). Dependency: `backboard-sdk==1.5.19` (requires only `httpx` and
`pydantic`, both already in the API).

## Setup

1. Sign up at <https://backboard.io> (free tier: API access, R-CLI, basic memory and RAG, $5 of
   memory credit, no card).
2. Create an API key in the dashboard. Keys look like `espr_...`.
3. Put it in the repo's gitignored `.env`:

   ```
   BACKBOARD_API_KEY=espr_...
   ```

4. Nothing else. No assistant to create by hand, no ids to paste: `memory.assistant_id()` finds or
   creates `pixie-desk-<ATLAS_UNDERWRITER, default "desk">` on first use and caches the id under
   `api/cache/backboard/`.

Check it end to end: `cd api && uv run python ../scripts/backboard_check.py`. It prints what each
call did, verbatim, including refusals.

**Paid calls.** Memory search and assistant creation run on the free tier. Document upload, LLM chat
(the guideline citation) and System One need credits on the Billing page. With the balance at zero
this key returns `We paused document upload - your balance is used up`,
`Insufficient credits for System One`, and a generic 500 on `add_memory`. The desk handles all three
as advisory failures, so the demo still runs; see "Verified live" below for exactly what was proven.

## What it is used for, and the line it may not cross

Pixie's own `CaseStore` is one append-only log **per case**. It cannot answer "this broker sent a
near-duplicate of this account last week" or "we have asked about wind in this county three times".
Backboard's memory is scoped to an **assistant**, not a thread, so one assistant per underwriter
accumulates what the desk has learned about a broker, a peril and a region across cases and across
process restarts. That is the gap it fills, and it is the only reason it is here.

**The boundary is mechanical, not a promise.** `_CaseRun.facts` is the whitelist the `verify_numbers`
output guardrail checks every model sentence against. Nothing from Backboard is ever added to it.
So a number that exists only in memory cannot reach the ledger: the guardrail trips and the
deterministic template stands. Memory supplies context and questions, never a number and never a
decision tier. Test: `test_recall_reaches_the_plan_prompt_but_never_the_fact_list`.

What the desk stores is number-free by construction as well:

```
case 126; insured Lakeside Medical; broker Apex; state TX; type new; data issues duplicate_account
```

Identity and data-issue kinds. No premium, no score, no verdict
(`test_the_remembered_line_carries_no_money_and_no_verdict`).

Three uses, in order of how load-bearing they are:

1. **Cross-case memory** (`recall`, `remember`). `search_memories` on the underwriter's assistant,
   queried with the case's broker, insured, state and business type. Read into the Lead's *planning*
   turn only: it may change which questions get asked and how they are worded.
2. **Document RAG over the appetite guideline** (`recall(cite_guideline=True)`).
   `APPETITE_GUIDELINES.txt` is uploaded to the same assistant once, so the desk can ask for the
   paragraph behind a rule and cite it rather than paraphrasing the prompt. The citation is text for
   a human; any number in it is still not a fact, so the guardrail still governs.
3. **System One typed judgements** (`judge`), below.

## System One (TypeSafe Jev): typed decisions, labelled as model judgements

Announced in the sponsor's channel on 2026-09-17, after the research doc was written. Verified
against the live API this session: the provider is `typesafe`, the model is `jev-1.13.0`
(`list_models_by_provider("typesafe")` reports `model_type: system_one`, question types
`noul | choice | score`, request field `system_one` on `POST /threads/messages`). Passing
`llm_provider="typesafe"` without `model_name` fails with `Unknown typesafe System One model; sync
the catalog first`; naming the model is required.

Pixie uses it on **inbound broker messages**, never on the risk itself:

```
POST /cases/138/triage-message   {"message": "...", "channel": "email"}
```

Three typed questions (`memory.broker_questions`):

- `intent` (choice): answers_our_question / asks_a_question / chases_status / other.
- `looks_like_duplicate` (noul, true-false with probability): does this message refer to a
  submission of the same risk we have already seen?
- `chase_first` (choice): which still-missing fact to chase, **picked from the list code computed**
  by checking which facts are `Missing` on the case, so even this answer chooses from a set the
  engine produced.

**Invariant 1 still binds.** A System One probability or confidence is a model-generated number. It
may never become a price, a score, a points value or a decision tier. It routes work: what to reply
to, what to flag, what to ask for next. Every judgement is stored in the ledger as a `judgement`
event with `model_number: true`, returned by the API next to `JUDGEMENT_BOUNDARY`, and must be
rendered in the UI as a model judgement, visually separate from the engine's numbers.

Wiring it to the live inbound path is one call: the Linq webhook (A5's lane) or the Composio email
watcher can `POST /cases/{id}/triage-message` with the message body.

## Routes

| route | what it returns |
|---|---|
| `GET /cases/{id}/memory` | the `recall` events the run actually saw, the session lines, any `judgement` events, and the boundary text. `?live=true` re-queries Backboard (cached to disk). |
| `POST /cases/{id}/triage-message` | System One typed answers for an inbound message, plus the facts code knows are missing. |
| `GET /openai/runtime` | the OpenAI side: per-role settings, guardrail, tracing. See docs/OPENAI.md. |

## Offline and cached

Every live lookup is cached to `api/cache/backboard/` keyed by the query (AGENTS.md invariant 4).
`ATLAS_OFFLINE=1` serves the cache and makes no network call, which is also why the test suite never
touches Backboard. With no key at all, every call returns empty with
`source: "off"` and the demo runs unchanged.

## Verified live on 2026-09-19 (key in `.env`, zero credit balance)

| call | result |
|---|---|
| `create_assistant`, `list_assistants` | works |
| `add_memory` | **worked once** (23:26:49 UTC, memory id `ca5dbddb-...`) and then returned a generic 500 once the balance was gone |
| `search_memories` | works, returns the stored line with a similarity score (`0.402`) |
| `get_memory_stats` | works |
| `upload_document_to_assistant` | worked once: `APPETITE_GUIDELINES.txt` reached status `INDEXED`; later uploads refused with "balance is used up" |
| `send_message` (guideline citation) | refused: "We paused LLM chat - your balance is used up". The reply comes back as an assistant message with `status: FAILED`, which `_text_of` treats as no citation rather than quoting the billing notice |
| `send_message` + `system_one` (`typesafe/jev-1.13.0`) | refused: "Insufficient credits for System One" |
| `list_models_by_provider("typesafe")` | works; this is where the model id and question types were confirmed |

**What Ben needs to do:** add credits on the Backboard Billing page (or turn on auto-reload). Then
re-run `scripts/backboard_check.py`; memory writes, the guideline citation and System One should all
come back with content, and no code changes are needed. If the guideline citation is still empty
after credits, check that the document shows `INDEXED` via `list_assistant_documents`.

## What was not built, and why

- **Routing the five desk agents through Backboard's model catalog.** Doing so would give up the
  Agents SDK's `output_type` validation, `RunHooks` and tracing, which is what the guardrail and the
  event ledger are built on. That is a bolt-on, so it is not here.
- **Memory Pro (`memory_pro="Auto"`).** Lite is enough for advisory recall, and the docs are explicit
  that `memory` and `memory_pro` cannot both be set on a message. Pro is where to go if recall
  accuracy ever matters more than cost.
- **R-CLI.** A terminal coding agent bundled with the free tier, not infrastructure for a desk.
