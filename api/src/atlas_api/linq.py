"""T12/A5: the underwriter's (and now the renter's) phone. Digest out over Linq (iMessage),
commands back in -- typed, tapped, or triggered live.

Out:  `send_digest(store, n=3)` texts the top open cases, numbered. `send_media` attaches a
      receipt PNG (see receipt.py). `typing_start`/`typing_stop` show "Pixie is typing..." while
      a live desk run is actually thinking.
In:   `/webhooks/linq` (linq_routes.py) logs the raw payload to var/linq_inbound/ first, then
      parses "approve 1", "refer 2", "decline 1", "why 3" or "run 1" tolerantly from Ben, a
      tapback (reaction.added) on Pixie's own digest message, or a renter's "why" threaded under
      their quote -- writes a human decision event (or starts a live run) and replies in kind.

Linq v3 (docs.linqapp.com), partner base `https://api.linqapp.com/api/partner/v3` (LINQ_API_BASE
in .env; the old LINQ_API_BASE_V3 name is kept as a fallback for anyone with the earlier env var):
POST {base}/chats to start a chat (from, to, message.parts[]), then POST {base}/chats/{id}/messages;
Bearer auth. Inbound events carry Standard Webhooks headers (webhook-id, webhook-timestamp,
webhook-signature); the signature is checked when LINQ_WEBHOOK_SECRET is set, and the raw body is
kept either way.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import time
from pathlib import Path
from typing import Any

import httpx

from .case_store import CaseStore

BASE = (os.environ.get("LINQ_API_BASE") or os.environ.get("LINQ_API_BASE_V3")
        or "https://api.linqapp.com/api/partner/v3")
INBOUND_DIR = Path(__file__).resolve().parents[3] / "var" / "linq_inbound"
CHAT_KEY = "linq:chat_id"
DIGEST_KEY = "linq:last_digest"
DIGEST_MSG_KEY = "linq:last_digest_message"          # the digest's own message id, for tapback + read-receipt
APPROVE, REFER, DECLINE, WHY, RUN = (
    "accept_with_subjectivity", "refer_with_subjectivity", "decline", "why", "run")
# What a person actually types back to a text message, not a command grammar.
WORDS = {APPROVE: {"approve", "approved", "accept", "yes", "y", "ok", "okay", "yep", "yup", "sure", "go"},
         REFER: {"refer", "no", "n", "nope", "hold", "later"},
         DECLINE: {"decline", "reject", "kill", "pass"},
         WHY: {"why", "explain", "reason", "details", "detail"},
         RUN: {"run", "reassess", "rerun", "redo", "recheck"}}
CLARIFY = "clarify"
# Tapback vocabulary (docs.linqapp.com reactions): thumbs up/down map straight onto like/dislike,
# a question mark onto Linq's own "question" type. love/laugh/emphasize are left unmapped on purpose.
REACTION_COMMAND = {"like": APPROVE, "love": APPROVE, "dislike": REFER, "question": WHY}
_REACTION_TYPES = {"love", "like", "dislike", "laugh", "emphasize", "question", "custom", "sticker"}
_WORD_RE = re.compile(r"[a-z]+")
_NUM_RE = re.compile(r"\b(\d{1,3})\b")


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {os.environ['LINQ_API_KEY']}", "Content-Type": "application/json"}


def _send(store: CaseStore, parts: list[dict[str, Any]], *, chat_key: str = CHAT_KEY,
          to: list[str] | None = None, reply_to: str | None = None) -> dict[str, Any]:
    """Send on the chat cached under `chat_key`, creating it (to `to`, or Ben by default) on the
    first call. One place for text-only, media, and reply-threaded sends."""
    message: dict[str, Any] = {"parts": parts}
    if reply_to:
        message["reply_to"] = {"message_id": reply_to}
    chat_id = store.cache_get(chat_key)
    # A first-time media URL can take Linq well over 30s to fetch and mirror to its own CDN
    # (observed live, worst case ~45s on a cold cloudflare quick-tunnel hop); a text-only send
    # is always fast, so only pay the longer timeout when a media part is actually present.
    has_media = any(p.get("type") == "media" for p in parts)
    with httpx.Client(timeout=75 if has_media else 30) as http:
        if chat_id:
            r = http.post(f"{BASE}/chats/{chat_id}/messages", headers=_headers(), json={"message": message})
            if r.status_code < 400:
                return r.json()
        r = http.post(f"{BASE}/chats", headers=_headers(), json={
            "from": os.environ["LINQ_FROM_NUMBER"], "to": to or [os.environ["BEN_PHONE"]], "message": message})
    r.raise_for_status()
    body = r.json()
    new_id = (body.get("chat") or body).get("id")
    if new_id:
        store.cache_set(chat_key, new_id)
    return body


def send_text(store: CaseStore, text: str, *, reply_to: str | None = None) -> dict[str, Any]:
    """Send on the existing chat with Ben's phone, creating it on the first call."""
    return _send(store, [{"type": "text", "value": text}], reply_to=reply_to)


def send_media(store: CaseStore, text: str, media_url: str, *, reply_to: str | None = None,
               chat_key: str = CHAT_KEY, to: list[str] | None = None) -> dict[str, Any]:
    """Text + an image in one message (verified live: Linq mirrors the URL to its own CDN and a
    combined text+media part round-trips fine)."""
    parts: list[dict[str, Any]] = []
    if text:
        parts.append({"type": "text", "value": text})
    parts.append({"type": "media", "url": media_url})
    return _send(store, parts, chat_key=chat_key, to=to, reply_to=reply_to)


def send_text_to(store: CaseStore, chat_key: str, to: list[str], text: str, *,
                  reply_to: str | None = None) -> dict[str, Any]:
    """Text-only send on an arbitrary (non-Ben) chat, e.g. a renter's number."""
    return _send(store, [{"type": "text", "value": text}], chat_key=chat_key, to=to, reply_to=reply_to)


def chat_key_for(phone: str) -> str:
    return f"linq:chat:{phone}"


def typing_start(store: CaseStore, chat_key: str = CHAT_KEY) -> None:
    """POST /chats/{id}/typing. Cosmetic: never raises, so a typing-indicator hiccup can't fail
    the desk run it's decorating. No-op if the chat doesn't exist yet or we're in dry mode."""
    _typing(store, chat_key, http_method="POST")


def typing_stop(store: CaseStore, chat_key: str = CHAT_KEY) -> None:
    """DELETE /chats/{id}/typing. It also auto-clears after ~85-90s, so a missed stop is harmless."""
    _typing(store, chat_key, http_method="DELETE")


def _typing(store: CaseStore, chat_key: str, http_method: str) -> None:
    if os.environ.get("ATLAS_ACTIONS") != "live":
        return
    chat_id = store.cache_get(chat_key)
    if not chat_id:
        return
    try:
        with httpx.Client(timeout=10) as http:
            http.request(http_method, f"{BASE}/chats/{chat_id}/typing", headers=_headers())
    except Exception:
        pass


def get_message(message_id: str) -> dict[str, Any]:
    """GET /messages/{id}: live delivery_status/is_read/read_at (verified live for the delivery
    transition; read_at only populates once someone actually opens the thread)."""
    with httpx.Client(timeout=15) as http:
        r = http.get(f"{BASE}/messages/{message_id}", headers=_headers())
    r.raise_for_status()
    return r.json()


def create_group(store: CaseStore, numbers: list[str], text: str) -> dict[str, Any]:
    """POST /chats with 2+ recipients = a group chat (doc-only: never fired live in the research
    session, and this lane has only one real phone number to test with, so this call is
    implemented to spec but unverified -- see docs/LINQ.md)."""
    with httpx.Client(timeout=30) as http:
        r = http.post(f"{BASE}/chats", headers=_headers(), json={
            "from": os.environ["LINQ_FROM_NUMBER"], "to": numbers,
            "message": {"parts": [{"type": "text", "value": text}]}})
    r.raise_for_status()
    return r.json()


def extract_sent_message_id(resp: dict[str, Any]) -> str | None:
    """The id of the message we just sent. Verified live in two different shapes: an existing-chat
    send returns `{"message": {"id": ...}}` at the top level, but a first-message chat-create
    nests it one level deeper, under `{"chat": {"message": {"id": ...}}}`."""
    if not isinstance(resp, dict):
        return None
    for holder in (resp, resp.get("chat")):
        if isinstance(holder, dict) and isinstance(holder.get("message"), dict):
            mid = holder["message"].get("id")
            if isinstance(mid, str):
                return mid
    return None


BLOCKING_ISSUE_TEXT = {
    "duplicate_account": "duplicate account, two brokers",
    "stale_submission": "stale submission, insured bound elsewhere",
    "limit_vs_tiv": "requested limit far below insured value",
}


def _clip(text: str, n: int = 48) -> str:
    """Cut on a word boundary: a phone shows one line per case."""
    text = " ".join(text.split())
    return text if len(text) <= n else text[:n].rsplit(" ", 1)[0] + "..."


def _open_fact(row: dict[str, Any], case: dict[str, Any] | None) -> tuple[str, str]:
    """(fact, who can resolve it) for an open case: its flipper, else the fact still unresolved."""
    flip = (row["decision"].get("flippers") or [{}])[0]
    if flip.get("fact"):
        return flip["fact"].replace("_", " "), flip.get("resolver", "broker")
    # No flipper left: name the unresolved fact that can still fail the guideline, not just any estimate.
    factors = (case or {}).get("factors", [])
    unresolved = [f for f in factors if f["provenance"] in ("missing", "estimated")]
    failing = [f for f in unresolved if "not_acceptable" in f["possible"]]
    for f in failing or unresolved:
        resolver = next((x.get("resolver", "broker") for x in (case or {}).get("facts", [])
                          if x["id"] == f["fact"]), "broker")
        return f["fact"].replace("_", " "), resolver
    return "the last open fact", "broker"


def _needs(row: dict[str, Any], asked: bool, case: dict[str, Any] | None = None) -> str:
    """The one thing a human has to do about this case, from the row's own computed facts."""
    decision = row["decision"]
    if decision["kind"] == "open":
        fact, who = _open_fact(row, case)
        return f"{fact} missing, {who} asked" if asked else f"needs {fact} from the {who}"
    issues = [i["kind"] for i in row.get("issues", []) if i["kind"] in BLOCKING_ISSUE_TEXT]
    if decision["kind"] == "refer":
        because = (decision.get("because") or [""])[0]
        label = "consumer referral" if row.get("region") == "toronto" else "refer"
        return f"{label}: {_clip(because)}"
    if issues:
        return BLOCKING_ISSUE_TEXT[issues[0]] + (", desk reviewed" if row.get("deepDived") else "")
    if decision["kind"] == "routed":
        return f"route to the {decision.get('to', 'right')} desk"
    return f"{decision['kind']}, no open question"


def digest_text(store: CaseStore, n: int = 3) -> tuple[str, list[str]]:
    """The cases that actually need a person, in that order: open first, then refers (including
    consumer referrals), then deep-dived declines carrying a blocking data issue, then value order."""
    rows = [c["queue"] for c in store.list_cases()]
    live = [r for r in rows if r["status"] in ("received", "cleared", "quoted", "referred")]
    by_value = sorted(live, key=lambda r: -r.get("valueAtStake", 0))
    asked = {r["caseId"] for r in live
             if any(o["status"] in ("sent", "dry") for o in store.outbox_for(r["caseId"]))}

    buckets = [
        [r for r in by_value if r["decision"]["kind"] == "open"],
        [r for r in by_value if r["decision"]["kind"] == "refer"],
        [r for r in by_value if r["decision"]["kind"] == "decline" and r.get("deepDived")
         and any(i["kind"] in BLOCKING_ISSUE_TEXT for i in r.get("issues", []))],
        by_value,
    ]
    top: list[dict[str, Any]] = []
    for bucket in buckets:
        for r in bucket:
            if len(top) < n and r["caseId"] not in {x["caseId"] for x in top}:
                top.append(r)

    lines = ["Pixie: " + ("nothing needs you." if not top else f"{len(top)} need you.")]
    for i, r in enumerate(top, start=1):
        stored = store.get_case(r["caseId"]) or {}
        lines.append(f"{i}. {r['caseId']} {_clip(r['insured'], 28)}, {r['state']} {r['line']}: "
                     f"{_needs(r, r['caseId'] in asked, stored.get('case'))}")
    if top:
        lines.append(f"Reply: approve 1 / refer 2 / why {len(top)} (or just the number to approve)")
    return "\n".join(lines), [r["caseId"] for r in top]


def send_digest(store: CaseStore, n: int = 3) -> dict[str, Any]:
    text, case_ids = digest_text(store, n)
    store.cache_set(DIGEST_KEY, case_ids)
    if os.environ.get("ATLAS_ACTIONS") != "live":
        return {"status": "dry", "text": text, "caseIds": case_ids}
    out = send_text(store, text)
    mid = extract_sent_message_id(out)
    if mid:
        store.cache_set(DIGEST_MSG_KEY, mid)          # so a tapback and a read-receipt poll know which message
    return {"status": "sent", "text": text, "caseIds": case_ids, "detail": str(out)[:200]}


# ---------- inbound ------------------------------------------------------------------------------

def log_raw(payload: bytes, headers: dict[str, str]) -> Path:
    INBOUND_DIR.mkdir(parents=True, exist_ok=True)
    path = INBOUND_DIR / f"{time.time():.3f}.json"
    path.write_text(json.dumps({"headers": {k.lower(): v for k, v in headers.items()},
                                "body": payload.decode("utf-8", "replace")}, indent=1))
    return path


def verify(payload: bytes, headers: dict[str, str]) -> bool | None:
    """Standard Webhooks HMAC. None = no secret configured, so nothing to check."""
    secret = os.environ.get("LINQ_WEBHOOK_SECRET")
    if not secret:
        return None
    h = {k.lower(): v for k, v in headers.items()}
    msg_id = h.get("webhook-id") or h.get("x-webhook-id", "")
    ts = h.get("webhook-timestamp") or h.get("x-webhook-timestamp", "")
    sig = h.get("webhook-signature") or h.get("x-webhook-signature", "")
    key = base64.b64decode(secret.split("_", 1)[-1] + "==") if secret.startswith("whsec_") else secret.encode()
    expect = base64.b64encode(hmac.new(key, f"{msg_id}.{ts}.{payload.decode()}".encode(), hashlib.sha256).digest()).decode()
    return any(hmac.compare_digest(part.split(",", 1)[-1], expect) for part in sig.split() if part)


def extract_text(payload: Any) -> str:
    """Find the message text wherever this event shape hides it."""
    found: list[str] = []

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            if node.get("type") == "text" and isinstance(node.get("value"), str):
                found.append(node["value"])
            for k, v in node.items():
                if k in ("text", "body", "content") and isinstance(v, str):
                    found.append(v)
                else:
                    walk(v)
        elif isinstance(node, list):
            for x in node:
                walk(x)

    walk(payload)
    return found[0] if found else ""


def parse_command(text: str) -> tuple[str, int] | None:
    """What the underwriter meant, from what they actually typed.

    "1" alone approves item 1 (the reply Ben sent). "approve 1 please", "yes", "why 2", "no" all work,
    case-insensitively. Anything with more than one item number, or a number with words that carry no
    command, returns ("clarify", 0): the webhook asks which item and acts on nothing.
    """
    t = (text or "").strip().lower()
    if not t:
        return None
    words = set(_WORD_RE.findall(t))
    numbers = [int(n) for n in _NUM_RE.findall(t)]
    command = next((c for c, vocab in WORDS.items() if words & vocab), None)
    if len(numbers) > 1:
        return (CLARIFY, 0)
    if command:
        return (command, numbers[0] if numbers else 1)
    if numbers and not words:            # a bare item number is an approval of that item
        return (APPROVE, numbers[0])
    if numbers:                           # a number, but nothing that says what to do with it
        return (CLARIFY, 0)
    return None


def is_inbound(payload: Any) -> bool:
    """False for our own outbound messages, so an echoed event never acts on a case."""
    data = payload.get("data") if isinstance(payload, dict) else None
    direction = (data or {}).get("direction") if isinstance(data, dict) else None
    return direction != "outbound"


def event_kind(payload: Any, headers: dict[str, str]) -> str:
    """The webhook's event_type, wherever it landed: the real payload carries it at the top
    level (`event_type`), but the doc-only envelope also names it in an `x-webhook-event` header."""
    if isinstance(payload, dict) and isinstance(payload.get("event_type"), str):
        return payload["event_type"]
    h = {k.lower(): v for k, v in headers.items()}
    return h.get("x-webhook-event", "")


def sender_phone(payload: Any) -> str:
    """E.164 number of whoever sent this inbound message (confirmed shape: data.sender_handle.handle)."""
    data = payload.get("data") if isinstance(payload, dict) else None
    handle = data.get("sender_handle") if isinstance(data, dict) else None
    return handle.get("handle", "") if isinstance(handle, dict) else ""


def chat_id_of(payload: Any) -> str | None:
    data = payload.get("data") if isinstance(payload, dict) else None
    chat = data.get("chat") if isinstance(data, dict) else None
    return chat.get("id") if isinstance(chat, dict) else None


def extract_message_id(payload: Any) -> str | None:
    data = payload.get("data") if isinstance(payload, dict) else None
    return data.get("id") if isinstance(data, dict) and isinstance(data.get("id"), str) else None


def extract_reaction(payload: Any) -> tuple[str, str | None] | None:
    """(reaction type, message id it landed on) for a reaction.added event. Doc-only shape --
    docs.linqapp.com names `reaction_type` and a tapback vocabulary but this event never actually
    fired in the research session's sandbox (no inbound test message existed to react to), so this
    walks the payload tolerantly like extract_text rather than trusting one exact key path."""
    found_type: str | None = None
    found_msg: str | None = None

    def walk(node: Any, msg_ctx: str | None) -> None:
        nonlocal found_type, found_msg
        if isinstance(node, dict):
            ctx = node.get("message_id") or msg_ctx
            rtype = node.get("reaction_type") or node.get("type")
            if isinstance(rtype, str) and rtype.lower() in _REACTION_TYPES:
                found_type, found_msg = rtype.lower(), found_msg or ctx or node.get("id")
            for v in node.values():
                walk(v, ctx)
        elif isinstance(node, list):
            for x in node:
                walk(x, msg_ctx)

    walk(payload, None)
    return (found_type, found_msg) if found_type else None
