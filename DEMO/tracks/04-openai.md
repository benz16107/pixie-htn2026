# OpenAI and Codex: five-minute demo

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md)

## Context and angle

The runtime story is the OpenAI Agents SDK, structured outputs, numeric guardrails, sessions and traces. The Codex story is separately recorded in CODEX.md and git. Do not confuse software built with Codex with a model being called at demo time.

Opening: "Agents decide what to investigate; every commercial score is computed by a tool, and an SDK guardrail checks the explanation."

## Prepare

Open `/live`, `/cases/138`, and `/api/atlas/openai/runtime` in the web app. Open a previously verified OpenAI trace and CODEX.md. Use a recording for the five-minute run; a fresh run can take minutes.

## Timed script

| Time | Show and say |
|---|---|
| 0:00-0:35 | Show the runtime response. Name the six roles and explain why the engine does not need a model for a settled case. |
| 0:35-1:40 | On `/live`, select Case run. Say "recorded run". Point at a tool call and an addressed ask/answer. |
| 1:40-2:50 | Show Challenger and Lead resolution. Explain role-specific reasoning effort and typed outputs, using runtime settings rather than fixed model names. |
| 2:50-4:10 | Open the real trace or guardrail incident. Walk from computed fact to rejected unsupported number and deterministic fallback. Show the code path if a trace is unavailable. |
| 4:10-5:00 | Show the small local evaluation and CODEX.md/git evidence. Close: "The model is accountable to the tools and the event log." |

## Service detail to know

`openai_runtime.py` attaches `output_guardrails`, per-role ModelSettings and RunConfig workflow metadata. SQLiteSession stores advisory cross-case identity/issue recall. `Desk._turn` catches a tripwire and falls back rather than crashing the case. The local evaluation compares against a handwritten answer key; it is not the hosted Evals API or a broad benchmark.

## Evidence

[OpenAI implementation](../../docs/OPENAI.md), `api/tests/test_openai_runtime.py`, `eval/model_eval.py`, [Codex log](../../CODEX.md). Prepare the no-network baseline with `cd api && uv run python ../eval/model_eval.py --engine-only`; use the output that actually runs.

## Limitation to say

"A numeric guardrail is narrower than truth verification. Tripped turns can undercount token cost. The local answer key is small, and a replay is not a live model invocation."

## If it fails

Use the labelled replay, local guardrail test and runtime configuration. Do not trigger a new billed run simply to hide a failed trace page.

## Likely question

Why six roles? "Each has a different tool responsibility or review role. The Challenger is the explicit adversarial check. The scheduler bounds the work rather than letting agents converse indefinitely."
