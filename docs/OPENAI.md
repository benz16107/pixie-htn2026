# OpenAI in Pixie: what is live, what is verified, what to show a judge

Research behind every choice: `docs/research/openai-backboard.md`. Code: `api/src/atlas_api/openai_runtime.py`,
`api/src/atlas_api/desk.py`, `api/src/atlas_api/openai_routes.py`, `eval/model_eval.py`.
Tests: `api/tests/test_openai_runtime.py`, `eval/test_model_eval.py`. Everything below is reproducible
from this repo; where something is blocked, this page says so instead of claiming it works.

## The one rule everything here serves

AGENTS.md invariant 1: **no number comes from a model.** Tools compute; models plan, choose what to
investigate, and write prose. The guardrail below is the enforcement, not a prompt asking nicely.

## 1. `verify_numbers` is a real SDK output guardrail

Every agent the desk builds carries it:

```python
Agent(..., output_guardrails=[numbers_guardrail(lambda: run.facts)])
```

The guardrail reads every free-text field of the structured output (`PROSE_FIELDS`: explanation,
reason, answer, summary, question, argument, size, remedy, risk, response, change_my_mind) and
compares every number in them against the strings tools actually returned, after `$`/`K`/`M`
normalisation. Ids and enums the code chose (`case_id`, `verdict`, `option`, `depth`) are not
checked, because they are not claims.

When a number has no computed fact behind it the guardrail returns `tripwire_triggered=True`, the SDK
raises `OutputGuardrailTripwireTriggered`, and `Desk._turn` does three things:

1. posts a `guardrail` event into the case ledger with the offending tokens and the agent's name;
2. fires the error-level Sentry event (`telemetry.verify_numbers_alert`) an alert rule can watch;
3. recovers `guardrail_result.agent_output` and hands it back to the existing per-sentence fallback,
   which replaces the ungrounded sentence with the deterministic template.

So a hallucinated number is visible three ways (traces, ledger, Sentry) and still never reaches the
log. A tripwire is evidence, never a crashed case. Test:
`test_a_tripwire_posts_a_guardrail_event_and_returns_the_output_to_the_fallback`.

The tripwire path loses that turn's token usage, because the SDK raises instead of returning a
`RunResult`. The turn's cost is therefore undercounted on a tripped turn. Named here rather than
hidden.

## 2. Per-role `ModelSettings`

`ROLE_SETTINGS` in `openai_runtime.py`, one row per role, exposed at `GET /openai/runtime`:

| role | model | reasoning.effort | verbosity | why |
|---|---|---|---|---|
| lead_plan | lead | low | low | routing a code triage into a depth and 1-3 briefs; the floor is code's |
| intake, hazard, portfolio, appetite, answer | specialist | low | low | lookups with typed answers; the numbers are tool output |
| challenger | specialist | **high** | low | the one adversarial turn on the desk |
| lead_decide | lead | **high** | **high** | the final verdict and the explanation an underwriter reads |
| lead_respond | lead | **high** | **high** | answers every challenged risk and may change the verdict |

High effort only where judgement happens; high verbosity only on the two human-facing explanations,
because the other seven calls return JSON that gains nothing from prose padding. The settings ride
into the trace metadata on every call, so a trace shows what each turn was allowed to spend.
Test: `test_effort_is_high_only_where_judgement_happens`.

## 3. Tracing: one case, one workflow

Every `Runner.run` gets

```python
RunConfig(workflow_name=f"pixie-case-{case_id}", group_id=run_id,
          trace_metadata={product, case_id, run_id, role, model, reasoning_effort, verbosity,
                          depth, output_guardrail})
```

so <https://platform.openai.com/traces> shows one workflow per case with all six agents, their tool
calls and their guardrail spans inside it, grouped by run. `ATLAS_TRACING=off` disables it.
Test: `test_run_config_names_the_workflow_per_case_and_groups_the_run`.

## 4. Sessions: cross-case recall, strictly advisory

`agents.memory.SQLiteSession`, session id `underwriter:<ATLAS_UNDERWRITER, default "desk">`, stored
at `api/cache/desk-sessions.sqlite`. One line per closed case, written by `Desk._remember`:

```
case 126; insured Lakeside Medical; broker Apex; state TX; type new; data issues duplicate_account
```

Identity and data issues only. No premium, no score, no verdict, by construction
(`test_the_remembered_line_carries_no_money_and_no_verdict`).

On the next run, the last eight lines go into the **planning** prompt under a header that says they
are advisory. They never go into `run.facts`. That is the whole boundary, and it is mechanical: the
fact list is the guardrail's whitelist, so a number that exists only in memory fails the guardrail if
a model repeats it (`test_recall_reaches_the_plan_prompt_but_never_the_fact_list`). Recall changes
which questions get asked, not what anything is worth.

The session is used as the store, not passed to `Runner.run(session=...)`, so the desk controls
exactly which text crosses between cases instead of replaying whole prior turns.

## 5. The eval: one table per model tier, local

`eval/model_eval.py` scores the desk against `eval/answer_key.yaml`, the key Ben hand-wrote from
`APPETITE_GUIDELINES.txt` independently of the engine.

```
cd api && uv run python ../eval/model_eval.py                        # engine + all three tiers
cd api && uv run python ../eval/model_eval.py --engine-only          # no model calls
cd api && uv run python ../eval/model_eval.py --tiers gpt-5.6-luna --cases 138,133
```

Deliberately **not** on the OpenAI Evals API: it goes read-only 2026-10-31 and shuts down
2026-11-30 (research doc), so a demo built on it would be a demo of something that is gone. A tier
the account cannot reach is printed as `unavailable: <reason>` with no accuracy, cost or latency
invented for it (`test_an_unavailable_tier_gets_a_reason_and_no_numbers`).

Runs recorded live on 2026-09-19 from this worktree (real OpenAI calls, real dollars):

```
tier                      cases  agree  accuracy    cost $  seconds  calls
engine (no model)             8      8      100%    0.0000      0.0      0
gpt-5.6-luna (138, 133)       2      2      100%    0.0102     55.8     16
gpt-5.6-luna (126)            1      0        0%    0.0114     56.7     15
gpt-5.6-luna (141)            1      1      100%    0.0114     55.7     15
```

The engine row is the point: the deterministic baseline already matches the key 8/8, because the
tier is computed, not chosen by a model. What a model tier changes is which option inside
`allowed_options()` gets picked, how deep the desk digs, what the explanation says, and what it
costs.

Case 126 is the honest result worth showing. The key says `decline`; with **both** the lead and the
specialist roles pinned to the cheap tier, the Lead conceded to the Challenger and moved to
`refer_with_subjectivity`, which maps to `open`. It could only move inside `allowed_options()`
(`decline` or `refer_with_subjectivity`), so the guideline still held; the tier changed the
judgement inside that envelope. The shipped default puts `gpt-6-astra` on the lead roles for exactly
this reason, and the eval is how that claim gets checked rather than asserted.

## What a judge can be shown on screen

1. **The guardrail tripping, live.** Run the desk, then `GET /openai/runtime` for the settings table
   and the guardrail description. To force a tripwire on demand, run with a model told to quote a
   number that no tool computed; the ledger gets a `guardrail` event, Sentry gets an error, and the
   decision text falls back to the template. The same three-way evidence is in
   `api/tests/test_openai_runtime.py` if the network is down.
2. **The traces dashboard.** Open <https://platform.openai.com/traces>, filter by
   `pixie-case-138`, and watch six agents, their tools and their guardrail spans in one workflow.
3. **The cost lever.** `GET /openai/runtime` shows effort and verbosity per role next to the model
   each one runs on; the ledger's `run_stats` events show what each phase actually spent.
4. **Cross-case recall.** Run case 126, then 141 (the same insured through another broker). The
   second run's ledger opens with a `recall` event naming 126. Recorded live on 2026-09-19, case
   141's recall event read:

   ```
   case 126; insured Lakeside Medical Group; broker Ashford Specialty Group; state TX;
     data issues duplicate_account; perils read fema_flood, nominatim, open_meteo
   ```

   `GET /cases/141/memory` returns the same thing as JSON.
5. **The eval table.** `--engine-only` runs in under a second with no network and prints 8/8; add a
   tier to show the cost and latency of putting a model on top of it.

## Verified, not claimed

- `openai-agents==0.22.3`, `Agent(output_guardrails=...)`, `ModelSettings(reasoning=..., verbosity=...)`,
  `RunConfig(workflow_name/group_id/trace_metadata)` and `agents.memory.SQLiteSession` all read off
  the installed package, not from memory.
- The live eval runs above really called OpenAI with `gpt-5.6-luna`.
- The guardrail has tripped for real, not only in a test. On the first live run of case 141 it
  caught the Lead quoting `$2,000,000` and `$35,716,000` in its plan. That turned out to be the
  guardrail being right about a gap in the code: the triage digest handed to the planning turn was
  never registered as a computed fact, so numbers code itself had produced were not on the
  whitelist. `Desk._plan` now calls `r.fact()` on each digest entry, and the re-run was clean. The
  check found a real bug on its first live outing.
- Prompt caching (90% off repeated system-prompt tokens on this model family) applies with no code
  change. It is worth one sentence in the pitch and no demo time.
- Not built, and why: handoffs (the roster is fixed and the ask/answer event log is the contract),
  fine-tuning (closed to new users since May 2026), batch API (underwriting is not batch-tolerant),
  code interpreter, computer use, vision, image generation (no fit in a pipeline whose inputs are
  structured data).
