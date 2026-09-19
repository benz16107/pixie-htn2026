# Linq v3 API — full surface + Pixie feature plan

Researched 2026-09-19 by walking docs.linqapp.com systematically and calling the live API
(sandbox number `+19492831054`, partner base `https://api.linqapp.com/api/partner/v3`, key from
`.env`, never printed). Everything under "Verified live" was confirmed by an actual API call
this session, not just read off a doc page. Everything else is "doc-only" — read from the docs
site, not independently tested.

Today we already use Linq for exactly two things (`api/src/atlas_api/linq.py`): send a 3-item
digest as one text message, and parse a reply like "approve 1" / "why 2" from the inbound
webhook. Everything below is what's available beyond that.

## API surface, by resource group

### Chats — `/chats`
- `POST /chats` — create. `from` (E.164, must be a number you own), `to` (array — one recipient
  = DM, 2+ = **group chat**, confirmed doc-only), required `message` (first message, same shape
  as a send). Optional `override_optout`. Response includes `chat.is_group`,
  `chat.health_status` (HEALTHY/AT_RISK/CRITICAL/OPTED_OUT), `chat.handles[]`.
- `GET /chats` — list. `GET /chats/{id}` — retrieve. `PATCH /chats/{id}` — update (rename group,
  set icon, per the webhook event names below). `POST /chats/{id}/mark_as_read`. `POST
  /chats/{id}/leave_chat` (for group chats Linq's number is in).
- **Verified live**: `POST /chats` with a single recipient returns HTTP 201, a real `chat.id`,
  and a nested `message` object with `delivery_status: "pending"`. Group-chat creation itself
  (3+ participants) was not test-fired — no safe third real number was available — so treat
  `is_group` behavior as doc-only until tried with the broker + underwriter's real numbers.

### Messages — `/chats/{id}/messages`, `/messages/{id}`
- `POST /chats/{id}/messages` — send on an existing chat. `GET .../messages` — list.
  `POST /messages` — create (used internally by chat-create's first message).
  `GET /messages/{id}` — retrieve, includes live `delivery_status`, `is_delivered`, `is_read`,
  `reactions[]` per part. `DELETE`, `PATCH` also exist (unmute/edit, doc-only).
- Message `parts[]`: `text` (up to 10k chars, plus `text_decorations`/`inline_stickers`/
  `mention`), `media` (`url` or `attachment_id`), `link` (must be the only part), `app_clip`,
  `imessage_app` (see below). Text and media can mix in one message; link/app_clip must stand
  alone.
- `reply_to: {message_id, part_index}` — threading. `preferred_service`: force "iMessage" /
  "SMS" / "RCS", otherwise Linq auto-falls-back iMessage → RCS → SMS. `idempotency_key` guards
  retries. **No scheduled/delayed-send parameter exists anywhere in the send schema** — if you
  want a message to go out later, you hold it and call the endpoint at send time; Linq does not
  queue it for you.
- **Verified live**: sent a plain text message (201→202/201, `delivery_status` went
  `pending` → `delivered` within ~1s on a follow-up `GET`). Sent a second message combining a
  `text` part and a `media` part (image by URL, no pre-upload) with `reply_to` pointing at the
  first message's id — accepted (202), Linq mirrored the image to its own CDN
  (`cdn.linqapp.com/uploads/...`), and the reply threading field round-tripped correctly on
  the response.

### Attachments — `/attachments`
- Two paths: (a) pass a plain `url` straight in a `media` part, no pre-upload, or (b) pre-upload:
  `POST /attachments` with `filename`/`content_type`/`size_bytes` → returns `upload_url`
  (15-min-valid S3 PUT target) + reusable `attachment_id`; `PUT` the raw binary; then reference
  `attachment_id` in a later send. Limit 100 MB. Broad type support (images, video, audio, docs,
  wallet passes); the fetched page's include/exclude lists for WebP contradicted each other, so
  don't trust WebP support either way without a live test. **Verified live only the URL path**
  (path a, via the image send above); the three-step pre-upload flow (path b) is doc-only.

### Reactions / tapbacks — `/messages/{id}/reactions`
- `POST`, body `{operation: "add"|"remove", type: ...}`. Standard tapbacks: love, like, dislike,
  laugh, emphasize, question. Plus `custom` (with `custom_emoji`) and `sticker` (with
  `emoji`/`url`/`attachment_id`, placeable via `placement.{rotation,scale,x,y}`).
- **Verified live**: added a `love` reaction to our own sent message → HTTP 202
  `{"status":"accepted"}`, and it showed up on a follow-up `GET /messages/{id}` inside that
  part's `reactions[]` array with the correct handle. Not tested: reacting to an **inbound**
  message (the docs page didn't say either way, and no inbound test message existed to react
  to). Given tapbacks are core to the "approve via thumbs-up" feature idea, that gap needs a
  real inbound message to close before relying on it.

### Typing indicators — `/chats/{id}/typing`
- `POST` starts it, `DELETE` stops it. **Verified live**: `POST` returned HTTP 204. Doc-only
  detail: one call shows the indicator for ~85–90s then auto-clears; iMessage-only, silently
  accepted-but-inert (204, no visible effect) on SMS/RCS chats.

### Read receipts / delivery status
- `POST /chats/{id}/mark_as_read` marks a chat read. Per-message status lives on `GET
  /messages/{id}`: `delivery_status` (pending/queued/sent/delivered/received/read/failed),
  `is_delivered`, `is_read`, `delivered_at`, `read_at`. **Verified live** the pending→delivered
  transition; `read_at`/`is_read` stayed null (expected — nobody opened the thread).

### Phone numbers & reputation — `/phone_numbers`
- `GET /phone_numbers` — list your numbers with `reputation.status`
  (HEALTHY/AT_RISK/CRITICAL) and a `doc_url` explaining that specific status.
  `POST /phone_numbers/{id}/start_reputation_audit` (doc-only).
- **Verified live**: `GET /phone_numbers` returned our one number, `+19492831054`, reputation
  `HEALTHY`.
- Doc-only reputation mechanics worth knowing for a demo: reputation degrades mainly from (1) 5+
  at-risk/critical conversations among your active (7-day) chats, (2) starting ~50+ brand-new
  conversations in a rolling 24h, (3) a volume spike paired with a drop in reply rate, (4) a
  line getting FLAGGED (→ CRITICAL immediately). None of this is a hackathon-demo risk at our
  scale (one underwriter, one broker).

### Rate limits (doc-only)
- Per sender/recipient pair: 30 messages / 60s window, else HTTP 429 + `Retry-After` + error
  code 1007. Sandbox accounts: 100 messages/day, resets midnight UTC — worth tracking since we
  already burned 2 on this research run. Production guideline: ~7,000 combined in/out messages
  per line per day (soft, not a hard cap). Capability-check endpoints: 1 per 10s, cache results.

### Webhooks (doc-only, not fired live this session — no inbound test message arrived)
Common envelope: `{api_version, webhook_version, event_type, event_id, created_at, trace_id,
partner_id, data:{...}}`. `event_id` is for dedup. Event families seen in the docs:
- **Message**: `message.sent`, `message.received`, `message.delivered`, `message.read`,
  `message.failed` (carries `code`/`reason`/`service`/`detail_code`), `message.edited`.
- **Reaction**: `reaction.added`, `reaction.removed` (`reaction_type` matches the tapback
  vocabulary above).
- **Chat**: `chat.created`, `chat.group_name_updated`, `chat.group_icon_updated` (+ their
  `_failed` variants), `chat.background_updated` (+ `_failed`),
  `chat.typing_indicator.started`/`.stopped`.
- **Participant**: `participant.added`, `participant.removed` — this is how a group-chat
  broker/underwriter/Pixie feature would detect someone joining or leaving.
- **Phone number**: `phone_number.status_updated`.
- Also present but irrelevant to Pixie: poll.*, location.sharing.*, contact_card.received,
  call.*, payment.*, connection.*.
- Signature verification: our existing `linq.py` already implements Standard Webhooks HMAC
  (`webhook-id`/`webhook-timestamp`/`webhook-signature` headers, HMAC-SHA256 over
  `id.timestamp.body`) — that matches what the docs describe, and is a correct implementation
  already in the codebase.

### iMessage Apps — the interactive-card system (doc-only, and it changes the plan)
- An `imessage_app` message part renders a **native iOS Messages Extension** identified by
  `app.team_id` + `app.bundle_id`, drawing its live interactive UI from a `url` you supply.
  That extension has to be a real, shipped, installed app on the recipient's phone — Linq
  doesn't host or provide one for partners.
- **Fallback when the recipient doesn't have the app**: they see your static `layout` card
  (captions + `image_url`) and a "Get the app" button if you set `app_store_id`. One extra
  wrinkle: the preview image only renders in a chat that already has inbound activity from the
  recipient; a brand-new outbound-only chat shows captions only, no image.
  This fallback path is realistic for us (nobody's installing a Messages Extension for a
  hackathon demo) — it's really just a richer, tappable version of a `media`+`text` message.
  Full interactivity requires an actual App Store Messages Extension, which is out of scope for
  a two-day build.
- I saw one Linq-docs-summary claim an `experience` part type ("a card, but no iMessage app of
  your own — Linq hosts and renders it") that would sidestep the native-app requirement
  entirely. I could **not** confirm this on the canonical sending-messages docs page, which
  lists only `text`/`media`/`link`/`app_clip`/`imessage_app` as valid part types. Treat
  `experience` as unverified/likely wrong — don't design a feature around it without confirming
  with Linq directly (e.g. at their booth).

### RCS/SMS/WhatsApp fallback
- `preferred_service` forces a channel; otherwise Linq auto-selects iMessage → RCS → SMS. No
  WhatsApp channel appears anywhere in the docs — this is iMessage/RCS/SMS only, not WhatsApp,
  despite the task brief's mention of it.

## What we verified live, in one place

Sent from `+19492831054` to `+17786809189` (2 messages total, plus a reaction and a typing-start
call — nothing else fired):
1. `POST /chats` with a text-only first message → chat created, `delivery_status` went
   `pending → delivered`.
2. `POST /messages/{id}/reactions` with `{"operation":"add","type":"love"}` on that message →
   accepted, showed up on re-fetch.
3. `POST /chats/{id}/typing` → HTTP 204.
4. `POST /chats/{id}/messages` with a combined `text`+`media` (image-by-URL) part and
   `reply_to` pointing at message 1 → accepted, image re-hosted on Linq's CDN, reply threading
   confirmed on the response.
5. `GET /phone_numbers` → confirmed our number's reputation is HEALTHY.

Not tested (would need either a second real phone number, an inbound message, or a shipped iOS
app): group chats with 3+ participants, the pre-upload attachment flow, reacting to an inbound
message, and anything webhook-triggered.

## Ranked feature plan for Pixie

Ordered by (value to a real underwriter/renter) ÷ (build effort), each effort estimate assumes
the existing `linq.py` client and webhook route already exist.

1. **Tapback-to-decide instead of typing a number** — ~20 min. The digest already numbers
   3 cases; today the underwriter types "approve 1". Instead, have Pixie's digest message be the
   thing they react to: a 👍 tapback on the whole digest approves item 1 (the highest-priority
   case), 👎 declines it, ❓ triggers the "why" explanation for it. Verified live that adding a
   reaction is a simple `POST` and it round-trips on `GET /messages/{id}`; the missing piece is
   confirming `reaction.added` actually fires on our inbound webhook for a tapback the
   underwriter places on OUR message — that's the one unverified assumption this feature leans
   on, and it's a 2-minute check once a real phone can react to a real message.
   Why: an underwriter doing 40 cases a day does not want to type; a tapback is one thumb-touch,
   no typing, no ambiguity about which case (unlike "1" which could mean fact #1 or case #1).

2. **Case receipt as an actual image, not a wall of text** — ~30 min. Instead of only text,
   attach a `media` part (image-by-URL, confirmed live, no pre-upload needed) rendering a small
   generated card: insured name, premium, the 2-3 factors that moved the decision, colored
   green/red. Pixie already computes `factors` and `decision` per case (`linq.py`'s `_needs`/
   `_open_fact`); render that as a PNG via any lightweight chart/HTML-to-image step already in
   the stack, then send `{"parts":[{"type":"text",...},{"type":"media","url":...}]}`.
   Why: "why 2" today gets a text paragraph; a person reads a receipt-shaped image faster than
   parsing prose on a 6-inch screen, and it's the same asset a renter would eventually see.

3. **Renter-facing quote + "why this price" entirely in iMessage** — ~45 min. New chat to the
   renter's number, first message is the quote (premium + coverage in plain language), second
   part or follow-up message is the factor breakdown as the same receipt-image type from #2.
   `reply_to` threads the explanation under the quote so it doesn't read as a second, unrelated
   text. Why: renters already expect quotes over text/email; doing the "why" breakdown as one
   more iMessage (not a portal login) removes the single biggest drop-off point in insurance
   UX — leaving the app.

4. **Typing indicator while Pixie's agents are actually working** — ~15 min. `POST
   /chats/{id}/typing` right when the multi-agent desk starts evaluating a case, `DELETE` (or
   let the ~90s auto-expire) when the decision posts. Verified live: the call itself is a plain
   204, trivial to wire into the existing agent-run lifecycle hooks.
   Why: it is the one piece of UI that tells a human "something is happening" without sending a
   message — turns a multi-second multi-agent pipeline into something that feels alive instead
   of silent, and it costs one HTTP call at the start and end of a run.

5. **Group chat: broker + underwriter + Pixie as a participant** — ~90 min, the highest-effort
   item here because group-chat creation itself is unverified live (see above) and because it
   needs Pixie to answer ad hoc questions, not just push a fixed digest. `POST /chats` with
   `to: [broker_number, underwriter_number]` creates the group (doc-only, needs a live test with
   two real numbers before demo day); the inbound webhook then needs to distinguish "message
   from the broker asking a question" from "underwriter approving," which is a bigger change to
   `is_inbound`/`parse_command` than anything else on this list.
   Why: today Pixie is a one-way pipe to the underwriter; a shared thread where a broker can ask
   "did the flood zone check clear?" and get an answer sourced from the same case data is the
   actual "rethink everyday tasks through messaging" pitch the prize wants, not just faster texts.

6. **Read receipt on the digest to skip a "did they see it" ping** — ~10 min. `is_read`/
   `read_at` on `GET /messages/{id}` (verified field exists, not exercised live) lets a
   scheduled follow-up check "was this actually opened" before nagging the underwriter again.
   Why: cheap, and avoids the annoying double-text pattern.

7. **`preferred_service` fallback awareness surfaced as a status line** — ~15 min. If a case is
   urgent and the underwriter's phone is Android (RCS/SMS, not iMessage), Pixie can detect the
   delivered `service` field on the response and adapt tone (no tapback affordance on
   SMS/RCS — those don't carry reactions the same way) rather than silently assuming iMessage.
   Why: this is a correctness fix more than a feature — a demo where the "tapback to approve"
   flow quietly breaks because the desk's owner is on Android would be an embarrassing live
   failure otherwise.

8. **Reply-threaded audit trail** — ~20 min. Every case-related message and decision reply uses
   `reply_to` to chain onto the original digest item; verified live that threading round-trips.
   Instead of a flat scroll of "1", "approve 2", "why 3", the whole decision history for one
   case is a visible thread in Messages itself — free audit log, no extra storage.
   Why: an underwriter or compliance reviewer scrolling a thread months later can see the whole
   decision chain for one case without cross-referencing case IDs against timestamps.

9. **`imessage_app` static fallback card with a map thumbnail + "Get the app" as a soft App
   Store tease** — ~10 min novelty item, not core. Since we're not shipping a native Messages
   Extension this weekend, this only buys the static `layout` card + `image_url` (confirmed:
   same rendering path as a plain media message, plus a caption strip) — i.e. it's cosmetic over
   feature #2, not a new capability. Worth doing only if there's spare time; do not pitch it as
   "interactive iMessage app" at the booth since it isn't one without a shipped extension.

10. **Phone-reputation-aware pacing on bulk digests** — ~15 min, defensive not flashy. Before a
    batch send (e.g. digesting to multiple underwriters), check `GET /phone_numbers` reputation
    first; if AT_RISK/CRITICAL, throttle or fall back to a single-recipient summary instead of
    fanning out. Verified live that the endpoint and field exist. Why: protects the demo number
    from getting flagged mid-hackathon, which would be a worse failure than any missing feature.

Deliberately not planned: WhatsApp fallback (channel doesn't exist in this API), a real
native `imessage_app` Messages Extension (needs Xcode + App Store review, not a weekend build),
scheduled/delayed sends (no such parameter exists — would have to be hand-rolled with a cron/
queue, which is really "feature: our own scheduler," not a Linq capability).

## Five truthful booth sentences

1. Pixie already runs its underwriter digest and command parsing over Linq's v3 API — this
   research extended that into tapbacks, image receipts, typing indicators, and threaded replies,
   each confirmed by an actual API call against Linq's sandbox this session, not just the docs.
2. An underwriter can approve a case with a single thumbs-up tapback on the digest text instead
   of typing "approve 1" — we sent a real tapback and watched it land on the message via a
   follow-up read.
3. Pixie can text a renter their quote and, in the same thread, a small image receipt showing
   exactly which factors set the price — no portal, no login, the whole "why this price"
   conversation stays inside iMessage.
4. We tested Linq's typing indicator live (a plain 204 response) so Pixie can show "Pixie is
   thinking…" for the seconds its multi-agent desk is actually evaluating a case, instead of
   going silent mid-decision.
5. We deliberately did not build on Linq's native `imessage_app` Messages Extensions — that path
   needs a shipped iOS app with an Apple Developer team ID, which is out of scope for a weekend;
   everything we're pitching runs on the plain send/react/thread API we already verified works.
