# Linq: what Pixie does with it (A5)

Builds on `docs/research/linq.md` (the live-API research pass) and T12's original digest/webhook
(`api/src/atlas_api/linq.py`, `api/src/atlas_api/app.py`). This lane deepened the integration per
the ranked feature plan; code lives in `api/src/atlas_api/linq.py` (the Linq client), `linq_routes.py`
(the HTTP surface, one `APIRouter`), and `receipt.py` (the image renderer). All live testing in this
session used `+19492831054` (Pixie's sandbox number) to `+17786809189` (Ben's real phone) — the only
two real numbers available to this lane.

## Endpoints

| Route | What it does for Pixie |
|---|---|
| `POST /actions/digest` | Sends the top-N open cases as one text; now also captures the sent message's own id (`DIGEST_MSG_KEY`), so a tapback and a read-receipt poll both know which message they're reacting to. |
| `POST /webhooks/linq` | One handler, four event shapes: Ben's typed digest replies (`approve/refer/decline/why/run N`), a tapback (`reaction.added`) on Pixie's own digest message, a renter's threaded "why" under their `/linq/quote`, and (best-effort) a question in a Pixie group thread. Always 200; logs the raw payload to `var/linq_inbound/` first, same as before. |
| `POST /linq/quote` | The renter quote, entirely in iMessage: given a Toronto address and a phone number, runs the same `quote_tenant` engine as `/quote/tenant`, texts back the price with a receipt-image attachment, and remembers the phone→case mapping so a "why" reply threads the factor breakdown. |
| `GET /linq/digest/status` | Read receipt: polls Linq's `GET /messages/{id}` live for the last digest message's `delivery_status`/`is_read`/`read_at`, for the web to show "seen 18:42". |
| `POST /linq/group` | Creates a broker + underwriter + Pixie group thread (`POST /chats` with 2 recipients) and remembers which case it's about, so Pixie can answer questions in it. **Not exercised live** — see below. |
| `GET /media/{filename}` | Serves a receipt PNG from `var/linq_media/` under `PUBLIC_URL`, so Linq's `media` part has something real to fetch. |

## Feature-by-feature: what was verified live vs. doc-only

1. **Tapback to decide.** `reaction.added` is doc-only in Linq's docs, and no one physically
   tapped a reaction on a real phone during this session to find out whether Linq's sandbox
   actually delivers it (that needs a human at the device, which this agent isn't) — that gap,
   already flagged in the research doc, is unchanged. What I verified live is everything
   downstream of that event actually arriving: I signed a `reaction.added` payload with the real
   webhook secret, pointed it at Pixie's real last-digest message id, and posted it to a live
   server — a `like` correctly approved item 1 and sent a real confirmation text to Ben's phone;
   `dislike` correctly referred it; `question` correctly triggered the "why" explanation.
   `extract_reaction` walks the payload tolerantly (docs say `reaction_type` is the key; I don't
   trust one exact path since I've never seen a real one). **Fallback**: if the event doesn't
   match a known reaction type, or its `message_id` doesn't match the last digest message, the
   webhook still 200s and logs the raw payload, but sends nothing.

2. **Typing indicator while the desk is actually thinking.** New: replying `run 1` (or `reassess`/
   `rerun`/`redo`/`recheck`) to a digest now triggers a **live multi-agent desk re-run** for that
   case — `POST /chats/{id}/typing` fires the moment the run starts, the actual `Desk.run()`
   executes (real LLM calls, ~2.5 minutes for case 138 in this session, not the ~28s AUDIT.md
   number for a bare run — this one paid for a cold model warmup), and `DELETE .../typing` fires
   right before the final decision posts. Verified live end to end: sent "run 1" over the real
   webhook, watched the ack land immediately, waited for the desk run to actually complete and
   change case 138's decision (score moved from its prior interval to 30-92), and confirmed the
   final "re-run done" text arrived on Ben's phone afterward. Both `typing_start`/`typing_stop`
   are best-effort (they swallow their own exceptions) so a typing-indicator hiccup can't break
   a real desk run or leave a decision unsent.

3. **Receipt as an image.** `receipt.py` renders a 640x360 PNG (Pillow — the one new dependency
   this lane adds, `uv add pillow`; no headless browser, no font files on disk) with insured/
   title, decision, the price or score interval, the 2-3 factors that moved it (receipt dollar
   lines for a tenant quote, ranked by size; constraining assessment factors for a property case),
   and the action taken. Content-addressed filename, so repeat calls with the same facts reuse the
   same file instead of piling up `var/linq_media/`. Served at `/media/{filename}` under
   `PUBLIC_URL`. Verified live in three different places this session: a "why 3" reply (text +
   image, `delivery_status: delivered`), a re-run's final decision, and the renter quote below —
   in every case Linq's own infra (`54.157.59.12`, matching the `cf-connecting-ip` in the research
   session's fixture) actually fetched the URL, confirmed by server access logs showing real `GET
   /media/...` hits from Linq. **Finding worth keeping**: a first-time fetch of a brand-new media
   URL can take Linq well over 30s to validate and mirror to its own CDN (one attempt through a
   cold cloudflare quick-tunnel hop hit `ReadTimeout` at 30s and genuinely never sent); `_send()`
   now uses a 75s timeout specifically for media parts, and `_run_case_from_text` falls back to a
   text-only send if the image attempt still fails, so a slow media fetch degrades gracefully
   instead of losing the reply.

4. **Renter quote entirely in iMessage.** `POST /linq/quote` — verified live end to end: quoted
   1100 Queen St W (upper unit, $25,000 contents) at $186.86/yr, sent as one message with the
   receipt image, `delivery_status: delivered`. The webhook's renter branch (a "why" reply from
   that phone threads the factor breakdown via `reply_to`, sourced from the same `receipt.lines`
   the image used) is implemented and covered by a unit test, but **not independently verified
   live**: this lane has only Ben's real number to send to, and a message from Ben's number hits
   the Ben-digest-command branch first (by design — Ben is also the underwriter), so there's no
   way to simulate a distinct renter replying without a second real phone number. Same limitation
   the research doc already flagged for group chats.

5. **Read receipts.** `GET /linq/digest/status` polls Linq's `GET /messages/{id}` live rather than
   trusting the doc-only, never-fired `message.read` webhook event. Verified live: the digest
   message's `delivery_status` genuinely transitioned `pending → delivered` between two polls a
   couple seconds apart. `is_read`/`read_at` stayed `null` in this session (expected — nobody
   opened the thread mid-test); the webhook also passively records `message.read`/
   `message.delivered` events under `linq:status:{message_id}` if Linq ever does fire them, and
   that's surfaced alongside the live poll as `passive`.

6. **Group thread.** Implemented (`POST /linq/group`, plus `_group_reply` in `linq_routes.py`
   answering from the case's own `facts`/`factors`/`explanation`, checked with the same
   `desk.verify_numbers` rule the multi-agent desk uses) but **not tested live** — this lane has
   only one real phone number, and the original research session already established group-chat
   creation itself was never fired live for the same reason (no safe third real number). Say so
   plainly: this is doc-only, implemented to the documented `POST /chats` shape (`to` with 2+
   recipients), untested.

## Bug found and fixed along the way

`linq.py`'s `BASE` read `LINQ_API_BASE_V3`, but `.env` sets `LINQ_API_BASE` (to the correct
`https://api.linqapp.com/api/partner/v3`) — so every live call before this lane was silently
falling back to a hardcoded, wrong-looking default. Fixed to read `LINQ_API_BASE` first, keeping
`LINQ_API_BASE_V3` as a fallback. Also fixed `extract_sent_message_id`: an existing chat's send
returns `{"message": {"id": ...}}` at the top level, but a brand-new chat's first message nests it
one level deeper, under `{"chat": {"message": {"id": ...}}}` — the digest's read-receipt tracking
needs both shapes.

## Five truthful booth sentences

1. Reply "run 1" to Pixie's digest and it kicks off a real multi-agent desk re-run right there in
   iMessage — Pixie shows "typing..." the whole time it's actually thinking, then posts the new
   decision with a receipt image when it's done.
2. A thumbs-up, thumbs-down, or question-mark tapback on Pixie's digest approves, refers, or asks
   "why" on the top case — no typing, no ambiguity about which case.
3. Every receipt Pixie sends, whether it's "why is this open" or a renter's quote, is a small
   rendered image, not a wall of text: insured, decision, price or score, and the 2-3 numbers that
   actually moved it — all numbers computed by code, never a model.
4. A renter can get a real Toronto tenant-insurance quote, with the price and the full factor
   breakdown, entirely inside iMessage — no portal, no login, same appetite engine the underwriter
   desk runs on.
5. We're honest about the edges: nobody physically tapped a reaction on a real phone this session
   (that needs a human at the device, not an agent), so whether Linq's sandbox actually fires
   `reaction.added` for a real tapback is still unconfirmed — everything downstream of that event
   is proven live with a signed, hand-built payload instead. Group chats were never tested live
   either, because this lane only ever had one real phone number. Both gaps are called out here
   rather than glossed over.
