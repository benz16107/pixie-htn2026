# Sentry: five-minute demo

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md)

## Context and angle

The strongest story is a real observability failure that changed the build, plus an alert for unsupported numeric prose. Spend most of the demo in an existing Sentry trace and the code that emits it, not the underwriting map.

Opening: "We instrument the decision, including the case where an agent says a number our tools never computed."

## Prepare

Open the benzhou Sentry organisation, atlas-api, and a verified decision trace. The audited web build has no NEXT_PUBLIC_SENTRY_DSN, so browser replay is unavailable until that public DSN is configured and the web app is rebuilt. Open INCIDENTS.md and docs/SENTRY.md. The prior verification found a wrong DSN; the corrected project received 53 transactions from a recorded run. That count is one observation, not a fixed per-run guarantee.

## Timed script

| Time | Show and say |
|---|---|
| 0:00-0:40 | Describe the wrong-project DSN incident and its impact: the API appeared instrumented but no data arrived in the intended project. |
| 0:40-1:55 | Open a real `pixie.underwrite_case` trace. Follow the root into agent and tool spans. Point to case id, model, tokens and cost fields actually present. |
| 1:55-3:10 | Show `verify_numbers_alert` and a verified event if available. Explain the unsupported-number trigger and the application fallback. |
| 3:10-4:15 | Show the created workflow and uptime monitor if available. Explain error replay/privacy masking on web and why an unscheduled backtest job is not a nightly service. |
| 4:15-5:00 | Close with the engineering change Sentry evidence caused. Separate instrumented code, observed telemetry and proven notification delivery. |

## Service detail to know

OpenAIAgentsIntegration adds model/tool spans under the application case span. Structured logs include query rejection, conflicts and action sends. The semantic error tag is `pixie.alert=verify_numbers`. The existing workflow id is 6034549 and uptime monitor id is 10388850 in the verification notes. Browser replay masks text, inputs and media. Expo Go does not provide native crash reporting or mobile replay.

## Evidence

[Sentry implementation and observed setup](../../docs/SENTRY.md), [incident log](../../INCIDENTS.md), `api/src/atlas_api/telemetry.py`, `api/tests/test_telemetry.py`. Sentry dashboard: https://benzhou.sentry.io/. Open a saved real trace before the table.

## Limitation to say

"A workflow existing is not proof an email notification reached us. The backtest monitor emits check-ins when its script runs; this repository does not schedule a nightly job. Trace cost can undercount guardrail-tripped turns."

## If it fails

Show the saved trace capture, incident record and instrumentation test. Do not generate a fake incident or claim a dashboard screenshot is live.

## Likely question

What did monitoring change? "It exposed a wrong DSN/project configuration. We corrected that and confirmed actual ingestion, rather than assuming the SDK init meant telemetry worked."
