"""A5: every Linq HTTP surface, on its own APIRouter (app.py adds exactly one include_router
line, so other lanes editing app.py never collide with this file). Owns:

- `POST /actions/digest`, `POST /webhooks/linq` -- moved here unchanged in shape from T12,
  extended with tapbacks, live desk re-runs from text, read-receipt tracking, and renter replies.
- `POST /linq/quote` -- the renter quote, entirely in iMessage (the Intact story over Linq).
- `GET  /linq/digest/status` -- live read-receipt poll for the last digest message.
- `POST /linq/group` -- broker + underwriter + Pixie group thread (unverified live, see docs/LINQ.md).
- `GET  /media/{filename}` -- serves the receipt PNGs under PUBLIC_URL.

Imports `atlas_api.app` lazily inside functions (not at module load) because app.py imports this
router at module load too; importing app.py's globals up front would be a circular import.
"""

from __future__ import annotations

import json
import os
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Literal

router = APIRouter()

_HUMAN_KIND = {"accept_with_subjectivity": "approve", "refer_with_subjectivity": "refer", "decline": "decline"}


# ---------- digest out ---------------------------------------------------------------------------

class DigestRequest(BaseModel):
    n: int = 3


@router.post("/actions/digest")
def actions_digest(req: DigestRequest) -> dict[str, Any]:
    import atlas_api.app as appmod
    from . import linq

    return linq.send_digest(appmod.get_store(), req.n)


# ---------- Ben's digest commands: approve/refer/decline/why/run ---------------------------------

def _write_decision(store, appmod, case_id: str, command: str) -> str:
    from .actions import append_after_run
    from .events import DecisionP

    data = store.get_case(case_id)
    if data is None:
        return f"No case {case_id} on the desk."
    title = data["case"]["title"]
    kind = _HUMAN_KIND[command]
    run = store.latest_run(case_id) or "human"
    append_after_run(store, case_id, run, "human", DecisionP(
        text=f"Underwriter replied by iMessage: {kind}", verdict=command,
        explanation=f"{kind} by the underwriter over Linq, on the desk's {data['case']['decision']['kind']} assessment.",
        verified=True))
    decision = {"kind": kind, "because": ["underwriter reply over Linq"], "by": "human"}
    data["case"]["decision"] = decision
    data["queue"]["decision"] = decision
    store.put_case(case_id, data)
    appmod.publish("decision", {"caseId": case_id, "decision": decision})
    verb = {"approve": "Approved", "refer": "Referred", "decline": "Declined"}[kind]
    return f"{verb} {case_id} {title}. Written to the case file as your decision."


def _dispatch(store, appmod, command: str, case_id: str) -> tuple[str, str | None]:
    """(reply text, receipt media url or None) for any digest command against one case."""
    from . import linq, receipt

    data = store.get_case(case_id)
    if data is None:
        return f"No case {case_id} on the desk.", None
    title = data["case"]["title"]

    if command == linq.WHY:
        text = f"{case_id} {title}: {data['case']['explanation'][:280]}"
        try:
            _bytes, filename = receipt.receipt_for_case(data["case"])
            return text, receipt.public_url(filename)
        except Exception:
            return text, None   # a broken render must not swallow the explanation itself

    if command == linq.RUN:
        import asyncio

        task = asyncio.create_task(_run_case_from_text(case_id))
        appmod._tasks.add(task)
        task.add_done_callback(appmod._tasks.discard)
        return f"Re-running {case_id} {title} live, Pixie is thinking...", None

    return _write_decision(store, appmod, case_id, command), None


async def _run_case_from_text(case_id: str) -> None:
    """A live desk re-run triggered by an inbound text. Typing indicator brackets the run; the
    decision (as text + a fresh receipt image) posts only once it's real."""
    import atlas_api.app as appmod
    from . import linq, receipt
    from .desk import Desk

    store = appmod.get_store()
    if case_id in appmod._running:
        return
    appmod._running.add(case_id)
    linq.typing_start(store)
    try:
        await Desk(appmod._world, store).run([case_id], run_id=f"linq{int(time.time())}")
        appmod.apply_desk_run(store, appmod._world, case_id)
    except Exception as exc:
        linq.typing_stop(store)
        appmod._running.discard(case_id)
        if os.environ.get("ATLAS_ACTIONS") == "live":
            try:
                linq.send_text(store, f"Re-run of {case_id} failed: {type(exc).__name__}")
            except Exception:
                pass
        return
    linq.typing_stop(store)
    appmod._running.discard(case_id)
    data = store.get_case(case_id)
    if data is None:
        return
    if os.environ.get("ATLAS_ACTIONS") == "live":
        title, decision = data["case"]["title"], data["case"]["decision"]["kind"]
        text = f"{case_id} {title}: re-run done, now {decision}. {data['case']['explanation'][:200]}"
        try:
            _bytes, filename = receipt.receipt_for_case(data["case"])
            linq.send_media(store, text, receipt.public_url(filename))
        except Exception:
            try:
                linq.send_text(store, text)
            except Exception:
                pass
    appmod.publish("decision", {"caseId": case_id, "decision": data["case"]["decision"]})


def _send_reply(store, reply: str | None, media_url: str | None) -> str | None:
    if not reply or os.environ.get("ATLAS_ACTIONS") != "live":
        return reply
    from . import linq

    try:
        linq.send_media(store, reply, media_url) if media_url else linq.send_text(store, reply)
    except Exception as exc:   # a failed reply must not fail the webhook
        reply += f" (reply send failed: {type(exc).__name__})"
    return reply


# ---------- renter and group replies --------------------------------------------------------------

def _renter_reply(store, sender: str, text: str) -> tuple[str | None, str | None]:
    """A renter's threaded "why" under their /linq/quote. (reply, last message id to thread under)."""
    from . import linq

    case_id = store.cache_get(f"linq:renter_case:{sender}")
    if not case_id:
        return None, None
    cmd = linq.parse_command(text)
    if not cmd or cmd[0] != linq.WHY:
        return None, None
    data = store.get_case(case_id)
    if not data:
        return None, None
    lines = (data["case"].get("receipt") or {}).get("lines", [])
    if lines:
        parts = [f"{ln['label']} {'+' if ln.get('dollars', 0) >= 0 else ''}{ln.get('dollars', 0):.2f}"
                for ln in lines]
        reply = f"{case_id} price breakdown: " + "; ".join(parts)
    else:
        reply = f"{case_id}: {data['case']['explanation'][:280]}"
    return reply, store.cache_get(f"linq:renter_last_msg:{sender}")


def _group_reply(store, chat_id: str | None, text: str) -> str | None:
    """A broker/underwriter question in a Pixie group thread, answered only from the case's own
    computed facts and checked with the same verify_numbers rule the desk uses (AGENTS.md
    invariant 1). Untested live -- see docs/LINQ.md -- but the grounding rule holds regardless."""
    from . import linq
    from .desk import verify_numbers

    if not chat_id:
        return None
    case_id = store.cache_get(f"linq:group_case:{chat_id}")
    if not case_id:
        return None
    data = store.get_case(case_id)
    if not data:
        return None
    case = data["case"]
    corpus = [f"{f['label']}: {f['display']}" for f in case.get("facts", [])]
    corpus += [f"{f['fact']}: {f['valueText']}" for f in case.get("factors", []) if f.get("valueText")]
    corpus.append(case.get("explanation", ""))
    words = set(linq._WORD_RE.findall(text.lower()))
    hit = next((c for c in corpus if words & set(linq._WORD_RE.findall(c.lower()))), None)
    answer = hit or case.get("explanation", "")
    if verify_numbers(answer, corpus):          # any number verify_numbers can't ground -> fall back
        answer = case.get("explanation", "")
    return f"{case_id}: {answer}"


# ---------- webhook --------------------------------------------------------------------------------

@router.post("/webhooks/linq")
async def linq_webhook(request: Request) -> dict[str, Any]:
    """Always 200: log the raw payload first, then parse tolerantly. Handles four event shapes:
    Ben's digest replies (typed or "run N"), a tapback on Pixie's own digest message, a renter's
    threaded "why", and (best-effort, unverified) a question in a Pixie group thread."""
    import atlas_api.app as appmod
    from . import linq

    raw = await request.body()
    headers = dict(request.headers)
    logged = linq.log_raw(raw, headers)
    signature = linq.verify(raw, headers)
    try:
        payload = json.loads(raw or b"{}")
    except json.JSONDecodeError:
        payload = {}

    store = appmod.get_store()
    ev = linq.event_kind(payload, headers)
    base = {"ok": True, "logged": logged.name, "signatureValid": signature, "event": ev}

    if signature is False or not linq.is_inbound(payload):
        return {**base, "text": "", "command": None, "reply": None}

    if ev == "reaction.added":
        reaction = linq.extract_reaction(payload)
        reply, command = None, None
        if reaction:
            rtype, msg_id = reaction
            command = linq.REACTION_COMMAND.get(rtype)
            digest_msg = store.cache_get(linq.DIGEST_MSG_KEY)
            if command and (msg_id is None or digest_msg is None or msg_id == digest_msg):
                case_ids = store.cache_get(linq.DIGEST_KEY) or []
                if case_ids:
                    reply, media_url = _dispatch(store, appmod, command, case_ids[0])
                    reply = _send_reply(store, reply, media_url)
        return {**base, "reaction": reaction, "command": command, "reply": reply}

    if ev in ("message.read", "message.delivered"):
        mid = linq.extract_message_id(payload)
        if mid:
            store.cache_set(f"linq:status:{mid}", {"event": ev, "at": payload.get("created_at")})
        return {**base, "messageId": mid}

    text = linq.extract_text(payload)
    parsed = linq.parse_command(text)
    reply = None
    if parsed:
        sender, ben = linq.sender_phone(payload), os.environ.get("BEN_PHONE")
        if not sender or sender == ben:
            command, index = parsed
            case_ids = store.cache_get(linq.DIGEST_KEY) or []
            if command == linq.CLARIFY:
                reply = f"Which one? Reply approve 1, refer 2, or why 1 (numbers from the last {len(case_ids)})."
            elif 1 <= index <= len(case_ids):
                reply, media_url = _dispatch(store, appmod, command, case_ids[index - 1])
                reply = _send_reply(store, reply, media_url)
            else:
                reply = f"I only sent {len(case_ids)} cases; reply with a number up to {len(case_ids)}."
        else:
            reply, reply_to = _renter_reply(store, sender, text)
            if reply is None:
                reply = _group_reply(store, linq.chat_id_of(payload), text)
                reply_to = None
            if reply and os.environ.get("ATLAS_ACTIONS") == "live":
                try:
                    linq.send_text_to(store, linq.chat_key_for(sender), [sender], reply, reply_to=reply_to)
                except Exception as exc:
                    reply += f" (reply send failed: {type(exc).__name__})"
    return {**base, "text": text, "command": parsed, "reply": reply}


# ---------- renter quote (the Intact story, entirely in iMessage) ---------------------------------

class RenterQuoteRequest(BaseModel):
    address: str
    phone: str
    contentsValue: int = Field(default=30_000, ge=10_000, le=250_000, multiple_of=1000)
    unitLevel: Literal["basement", "ground", "upper"] = "ground"
    claims5yr: int = Field(default=0, ge=0)
    deductible: Literal[500, 1000, 2500] = 1000
    liability: Literal[1_000_000, 2_000_000] = 1_000_000
    sewerBackup: bool = False
    bundleAuto: bool = False


@router.post("/linq/quote")
def linq_quote(req: RenterQuoteRequest) -> dict[str, Any]:
    """Given a Toronto address and a phone number, run the same tenant quote engine as
    /quote/tenant and text back the price, a receipt image, and a threaded "why" explanation
    (see the webhook's renter branch). Unanswered fields fall back to a quick-quote default --
    a caller with the real intake answers can pass them all."""
    import atlas_api.app as appmod
    from . import linq, receipt
    from .tenant import TenantAnswers, quote_tenant

    store = appmod.get_store()
    try:
        quote = quote_tenant(
            address=req.address, lat=None, lng=None,
            answers=TenantAnswers(contents_value=req.contentsValue, unit_level=req.unitLevel,
                                  claims_5yr=req.claims5yr, deductible=req.deductible,
                                  liability=req.liability, sewer_backup=req.sewerBackup,
                                  bundle_auto=req.bundleAuto),
            store=store, pack=appmod._tenant_pack())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    case_id = quote["caseId"]
    case_view = store.get_case(case_id)["case"]
    _bytes, filename = receipt.receipt_for_case(case_view)
    url = receipt.public_url(filename)
    text = (f"Pixie quote for {quote['address']}: ${quote['annual']:.2f}/yr, "
            f"${quote['monthly']:.2f}/mo. {quote['decision']['kind'].capitalize()}. "
            f"{quote['label']} Reply 'why' for the breakdown.")
    result: dict[str, Any] = {"quote": quote, "receiptUrl": url, "sent": False}
    if os.environ.get("ATLAS_ACTIONS") == "live":
        chat_key = linq.chat_key_for(req.phone)
        out = linq.send_media(store, text, url, chat_key=chat_key, to=[req.phone])
        mid = linq.extract_sent_message_id(out)
        store.cache_set(f"linq:renter_case:{req.phone}", case_id)
        if mid:
            store.cache_set(f"linq:renter_last_msg:{req.phone}", mid)
        result["sent"] = True
        result["detail"] = str(out)[:200]
    return result


# ---------- read receipts ---------------------------------------------------------------------------

@router.get("/linq/digest/status")
def digest_status() -> dict[str, Any]:
    """Whether the last digest was read, pulled live from Linq (message.read is a doc-only,
    never-fired-in-sandbox webhook event, so GET /messages/{id} -- verified live for the
    pending->delivered transition -- is the truthful path; `passive` carries whatever the webhook
    branch above happened to log)."""
    import atlas_api.app as appmod
    from . import linq

    store = appmod.get_store()
    mid = store.cache_get(linq.DIGEST_MSG_KEY)
    if not mid:
        return {"sent": False}
    passive = store.cache_get(f"linq:status:{mid}")
    try:
        msg = linq.get_message(mid)
    except Exception as exc:
        return {"sent": True, "messageId": mid, "error": type(exc).__name__, "passive": passive}
    return {"sent": True, "messageId": mid, "deliveryStatus": msg.get("delivery_status"),
            "isDelivered": msg.get("is_delivered"), "isRead": msg.get("is_read"),
            "readAt": msg.get("read_at"), "deliveredAt": msg.get("delivered_at"), "passive": passive}


# ---------- group thread (best-effort, see docs/LINQ.md) --------------------------------------------

class GroupChatRequest(BaseModel):
    caseId: str
    brokerPhone: str
    underwriterPhone: str


@router.post("/linq/group")
def linq_group(req: GroupChatRequest) -> dict[str, Any]:
    """Broker + underwriter + Pixie thread; Pixie answers case questions from the same case data
    (see `_group_reply`). Group-chat creation was never fired live in this lane's research (no
    safe third real number, and this lane has only BEN_PHONE to test with) -- this call is
    implemented to the documented `POST /chats` shape but not independently verified."""
    import atlas_api.app as appmod
    from . import linq

    store = appmod.get_store()
    case_id = req.caseId.removeprefix("SUB-")
    data = store.get_case(case_id)
    if data is None:
        raise HTTPException(status_code=404, detail=f"no case {req.caseId}")
    title = data["case"]["title"]
    text = f"Pixie: case {case_id} ({title}) thread. Ask about the case; answers cite computed facts only."
    if os.environ.get("ATLAS_ACTIONS") != "live":
        return {"status": "dry", "text": text}
    out = linq.create_group(store, [req.brokerPhone, req.underwriterPhone], text)
    chat_id = (out.get("chat") or out).get("id")
    if chat_id:
        store.cache_set(f"linq:group_case:{chat_id}", case_id)
    return {"status": "sent", "chatId": chat_id, "detail": str(out)[:300]}


# ---------- media hosting ---------------------------------------------------------------------------

@router.get("/media/{filename}")
def media(filename: str) -> FileResponse:
    from . import receipt

    if "/" in filename or ".." in filename:
        raise HTTPException(status_code=404, detail="not found")
    path = receipt.MEDIA_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="not found")
    return FileResponse(path, media_type="image/png")
