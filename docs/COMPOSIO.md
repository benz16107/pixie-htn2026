# Composio in Pixie (A7)

Before this lane: one Composio call in the whole codebase (`GMAIL_SEND_EMAIL`, in `actions.py`).
This lane closes the loop on that email, adds three more toolkits, and gives the Lead's job to an
agent instead of hardcoding it. Everything lives in `api/src/atlas_api/actions.py` (the Composio
logic) and `api/src/atlas_api/composio_routes.py` (its own `APIRouter`, one `include_router` line
in `app.py`). Research: `docs/research/composio.md` (verified tool slugs, the multi-account
routing gotcha, the trigger vs. poll tradeoff, free-tier limits).

## Tools used, with their slugs

| Feature | Tool slug(s) | Toolkit | Connected today |
|---|---|---|---|
| Broker information request | `GMAIL_SEND_EMAIL` | gmail | yes |
| Broker reply watch | `GMAIL_FETCH_EMAILS` | gmail | yes |
| Referral review hold | `GOOGLECALENDAR_CREATE_EVENT` | googlecalendar | **no -- needs Ben** |
| Decision audit trail | `GOOGLESHEETS_CREATE_GOOGLE_SHEET1`, `GOOGLESHEETS_SPREADSHEETS_VALUES_APPEND` | googlesheets | **no -- needs Ben** |
| Data-quality defect tickets | `LINEAR_CREATE_LINEAR_ISSUE` (or `NOTION_CREATE_NOTION_PAGE`) | linear / notion | **no -- needs Ben** |

Every call passes an explicit `connected_account_id` (env var `COMPOSIO_<TOOLKIT>_ACCOUNT`), never
the default-account routing -- `docs/research/composio.md` section 4 confirms Composio's docs still
don't publish a precedence rule for a user with two connections on one toolkit, and this project's
own entity already has 5 connected Instagram accounts under one user id, so the gotcha is real, not
theoretical.

## What Ben needs to click (only toolkits with no live connection today)

Everything below works in `ATLAS_ACTIONS=dry` right now with no connection at all -- it composes
the calendar hold / sheet row / ticket and logs it as an event, so the demo can show "here's what
Pixie would do" even unconnected. To make them send for real:

1. **Google Calendar**: `composio link googlecalendar`, approve the Google OAuth prompt with Ben's
   account, then set `COMPOSIO_GOOGLECALENDAR_ACCOUNT=<the connected account id it prints>` in
   `.env`. Optional: `ATLAS_UNDERWRITER_EMAIL=<email>` to add an attendee (default: none, the event
   just sits on the connected calendar).
2. **Google Sheets**: `composio link googlesheets`, approve the same way, set
   `COMPOSIO_GOOGLESHEETS_ACCOUNT=<id>`. No spreadsheet id needed -- the first live call creates
   "Pixie Decisions" and caches its id to disk (`cache` table, same as every other external lookup
   per AGENTS.md invariant 4).
3. **Linear** (preferred) or **Notion**: `composio link linear`, set
   `COMPOSIO_LINEAR_ACCOUNT=<id>` and `COMPOSIO_LINEAR_TEAM_ID=<a real team id>` (Linear's API needs
   a team on every issue; `composio` or the Linear web app can show it). Notion is the fallback if
   Linear isn't the team's tool: `composio link notion`, `COMPOSIO_NOTION_ACCOUNT=<id>`,
   `COMPOSIO_NOTION_PARENT_ID=<a page id issues get created under>`.

Until connected, every one of these routes returns `{"status": "not_connected", "detail": "..."}` --
never a silent failure, and it's exactly this text (verified live in `test_defects_file_reports_not_connected_when_live`).

## The broker-reply watch: trigger vs. poll

`docs/research/composio.md` confirms a real Gmail trigger exists for this
(`GMAIL_NEW_GMAIL_MESSAGE`, poll-type, 2-minute interval, filterable by query/labels) but wiring a
trigger means either a public webhook URL (a tunnel only Ben can stand up, same as the existing Linq
webhook) or `composio listen` staying alive in a background thread for the whole demo. For a
hackathon, `POST /composio/cases/{id}/broker-reply/check` does the same job as a button or a timer:
it searches the connected Gmail inbox with `GMAIL_FETCH_EMAILS` scoped to
`from:<broker> subject:"submission <case>"`, runs a strict structured-output read of the reply (only
the facts that were actually asked for, and only a value the model can quote verbatim from the
email -- `extract_broker_facts` in `actions.py`), re-verifies the quote against the raw email text,
and only then writes it as `Known(source="broker email, message <id>")`. Swapping the poll for the
real trigger later is a one-function change (`check_broker_reply` keeps its contract; only what
calls it changes from a button to a webhook handler).

## What a judge sees

1. Hit `GET /composio/status` -- shows which toolkits are live vs. need connecting, mode
   (`dry`/`live`), in one call.
2. Open a case with a missing premium (e.g. SUB-138), click "request broker info" -- a real Gmail
   send to the demo broker inbox (`benz16107+broker@gmail.com`).
3. Reply from that inbox with a premium figure, then click "check broker reply" (or wait for the
   poll) -- the case's own event lane shows a `finding` (Known premium, sourced to the message id)
   followed by an `assessment` narrowing the interval, live, with no human re-running anything.
4. Refer a case -- `POST /composio/cases/{id}/review/book` puts a real 15-minute hold on the
   connected calendar (once connected) with the case link in the description, and the event id shows
   up on the case.
5. Finalize any decision -- `POST /composio/cases/{id}/decision/log` appends one row to a live
   Google Sheet: case, decision, score interval, the facts that decided it, who approved it, when.
6. A case with a real data defect (SUB-126/141 duplicate account, SUB-143 stale, SUB-134 limit far
   below TIV) -- `POST /composio/cases/{id}/defects/file` opens a Linear ticket citing the exact
   conflicting facts, pointed at the carrier's own data team, not the broker.
7. `POST /composio/cases/{id}/agent` -- a small agent with three tools (`email_broker`,
   `book_review`, `file_defect`) reads the case and decides what to do; every tool refuses anything
   not already true of the case (wrong facts, wrong verdict, a defect kind that isn't real), so the
   agent chooses the action but never invents the fact or defect behind it.

Every action above is idempotent (one outbox row per case+kind, or per case+message-id for the
broker reply), respects `ATLAS_ACTIONS=dry|live`, and logs an `action`/`action_result` event pair
regardless of whether it actually sent.

## 5 truthful booth sentences

1. Pixie doesn't just send one email and wait -- when the broker replies, `GMAIL_FETCH_EMAILS` plus
   a structured-output read that can only report a value it can quote verbatim from the email turns
   that reply into a `Known` fact with its message id as provenance, and the case re-scores itself
   live, no human re-running anything.
2. A referral isn't a status label -- `GOOGLECALENDAR_CREATE_EVENT` books a real 15-minute hold on an
   underwriter's calendar with the case link in the description, so "referred" means someone's actual
   time got claimed.
3. Every finalized decision is appended to a live Google Sheet with the exact facts and score
   interval behind it, because "the agent decided" isn't defensible in insurance without a paper
   trail outside the app.
4. When the engine finds a real contradiction in the carrier's own data (a duplicate account, a
   requested limit far below TIV), it files a Linear ticket citing the conflicting facts and pointed
   at the carrier's data team, not the broker -- Composio aimed at the sponsor's own house.
5. The Lead doesn't get these four actions hardcoded to fire automatically -- a small agent with
   three tools chooses whether to email, book, or file, and every tool refuses anything not already
   true of the case, so the agent can choose the action but never invent the fact or defect behind
   it.
