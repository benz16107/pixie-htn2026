# Composio: five-minute demo

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md)

## Context and angle

Gmail is the connected toolkit in the inspected environment. The strongest five-minute story is the closed broker-reply loop, with explicit distinction between captured email and live verification/rescoring. Calendar, Sheets, Linear and Notion paths are not proof of connected accounts.

Opening: "A broker email becomes a sourced fact, and the engine recomputes the case instead of trusting the email summary."

## Prepare

Open `/api/atlas/composio/status` and `/cases/138`. Reset case 138 before rehearsal. Keep **captured email** selected in The broker's reply. Use the real inbox path only after rehearsing it; no new email is required for the captured path.

## Timed script

| Time | Show and say |
|---|---|
| 0:00-0:40 | Show status: action mode and toolkit booleans. Name Gmail as the connected service. |
| 0:40-1:25 | Point to case 138's current premium provenance. Explain why the broker is the resolver. You may show **Request from broker** without clicking send. |
| 1:25-2:35 | Select **captured email** and click **check for a reply**. Read the captured-path badge, broker quote and message source. Show the actual before/after score. |
| 2:35-3:55 | Explain Gmail fetch, structured extraction, verbatim quote verification, Known fact, ledger append and deterministic rescore. Click again to demonstrate deduplication if time permits. |
| 3:55-5:00 | Use **reset this case**. Explain that it restores only this case and leaves the active guideline and other cases alone. Close on completing the workflow, not merely sending an email. |

## Service detail to know

The capture belongs only to case 138. Replay uses a real stored Gmail response and recorded extraction; verification, application and rescoring execute now. Live mode performs Gmail retrieval and extraction again. The route records source message ids, rejects unsupported facts and avoids applying the same message twice. Toolkit routes expose dry, not_connected and failed states instead of reporting a send.

## Evidence

[Composio implementation](../../docs/COMPOSIO.md), `api/fixtures/broker_reply_138.json`, `api/src/atlas_api/composio_routes.py`, `actions.py`, `api/tests/test_composio_routes.py`. Read-only status: `/api/atlas/composio/status`.

## Limitation to say

"This demonstration uses captured Gmail data and a recorded extraction. The verification and score update are executing now. Only Gmail is connected in this environment; other toolkit workflows need connections."

## If it fails

Use the captured path when inbox/model access is slow. If that fails, show its fixture and test, labelled as implementation evidence. Never call a dry or deduped response a newly delivered email.

## Likely question

Could the model invent a premium? "The apply path requires source evidence. The broker quote and message id are preserved; the engine, not the model, recomputes the score."
