"""Cross-case memory for the desk, on Backboard.io. Assistant-scoped, never case-scoped.

The desk's own event log (`CaseStore`) is per case: it cannot answer "this broker sent us a
near-duplicate of this account last week" or "we have asked about this peril in this region three
times". Backboard's memory is scoped to an *assistant*, so one assistant per underwriter accumulates
what the desk has learned about a broker, a peril and a region across cases and across restarts.
The same assistant holds the appetite guideline as an uploaded document, so the desk can ask it for
the paragraph behind a rule and cite it.

**The boundary, enforced in code and not only in prose.** Nothing this module returns is ever added
to `_CaseRun.facts`, which is the whitelist `verify_numbers` checks every model sentence against.
A number that exists only in memory therefore cannot reach the ledger: the output guardrail rejects
the sentence carrying it and the template stands. Memory supplies context and questions -- which
broker, which peril, which region, what we asked last time -- never a number and never a decision.
`remember()` writes lines the desk builds from identity and issue kinds only, so the stored text is
number-free by construction too. `recall()` is advisory input to the Lead's *planning* turn (which
questions get asked), not to the decision turn.

A third use, `judge()`, runs Backboard's System One (TypeSafe Jev) typed questions over an inbound
broker message: what it asks for, whether it smells like a duplicate, which missing fact to chase.
Those answers carry a probability and a confidence, which are *model* numbers: they route work and
are labelled as judgements everywhere they show, and they never become a price, a score or a tier.

Off without `BACKBOARD_API_KEY`: every call returns empty, touches no network, and says so in
`source`. Every live lookup is cached to `cache/backboard/` keyed by its query, so the demo replays
with the network off (AGENTS.md invariant 4). Setup and what was verified live: docs/BACKBOARD.md.
"""

from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .openai_runtime import underwriter
from .telemetry import log

API_DIR = Path(__file__).resolve().parents[2]
CACHE_DIR = API_DIR / "cache" / "backboard"
GUIDELINE = API_DIR.parent / "docs" / "federato" / "APPETITE_GUIDELINES.txt"

ASSISTANT_PREFIX = "pixie-desk"
SYSTEM_PROMPT = (
    "You are the memory of a property underwriting desk. You hold what the desk has learned about "
    "brokers, perils and regions across cases, and the carrier's appetite guideline as a document. "
    "You never state a premium, a score, a limit or a decision: the desk computes those in code. "
    "Answer with context and with the question the underwriter should ask next, and when you cite "
    "the guideline, quote the paragraph."
)

BOUNDARY = ("Advisory only: memory may shape which questions get asked and how the desk words them. "
            "It never supplies a number or a decision -- numbers it returns are not in the run's fact "
            "list, so the verify_numbers guardrail rejects any sentence that repeats one.")


def offline() -> bool:
    return os.environ.get("ATLAS_OFFLINE") == "1"


def enabled() -> bool:
    """Live only with a key and only when the demo is not pinned offline. `ATLAS_OFFLINE=1` still
    serves the disk cache below, so a recorded recall replays with the network unplugged."""
    return bool(os.environ.get("BACKBOARD_API_KEY")) and not offline()


# ---------- the memo: one shape for both memories (Backboard) and recall (SQLiteSession) ----------

@dataclass(frozen=True)
class CaseMemo:
    """What the desk chooses to remember about a case. No number, no verdict, by construction."""
    case_id: str
    insured: str
    broker: str
    state: str
    business: str
    issues: tuple[str, ...] = ()
    perils: tuple[str, ...] = ()

    def line(self) -> str:
        bits = [f"case {self.case_id}", f"insured {self.insured}", f"broker {self.broker}",
                f"state {self.state}", f"type {self.business}"]
        if self.issues:
            bits.append("data issues " + ", ".join(sorted(self.issues)))
        if self.perils:
            bits.append("perils read " + ", ".join(sorted(self.perils)))
        return "; ".join(bits)

    def query(self) -> str:
        return (f"What has this desk seen before from broker {self.broker}, from insured "
                f"{self.insured}, in {self.state}, on {self.business} property risks?")


def memo_for(world: Any, case_id: str, case: Any, perils: tuple[str, ...] = ()) -> CaseMemo:
    """The one builder both the desk and the API use, so they remember the same shape of thing."""
    from .case import Known

    sub = world.submissions[int(case_id)]
    return CaseMemo(
        case_id=case_id,
        insured=str(world.insureds.get(sub["insured"], {}).get("name", "?")),
        broker=str(world.brokers.get(sub.get("broker"), {}).get("name", "unknown")),
        state=str(case.primary_admin.v) if isinstance(case.primary_admin, Known) else "unknown",
        business=str(case.business_type.v) if isinstance(case.business_type, Known) else "unknown",
        issues=tuple(sorted({i.kind for i in case.issues})), perils=perils)


@dataclass(frozen=True)
class Recall:
    lines: list[str] = field(default_factory=list)
    guideline: str = ""          # the guideline paragraph Backboard's document search returned
    source: str = "off"          # off | backboard | cache | error
    detail: str = ""

    def wire(self) -> dict[str, Any]:
        return {"lines": self.lines, "guideline": self.guideline, "source": self.source,
                "detail": self.detail, "boundary": BOUNDARY}


# ---------- client plumbing -----------------------------------------------------------------------

def _cache():
    from .federato import JsonFileCache
    return JsonFileCache(CACHE_DIR)


def _key(*parts: str) -> str:
    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:24]


def _client():
    from backboard import BackboardClient
    return BackboardClient(api_key=os.environ["BACKBOARD_API_KEY"])


async def assistant_id(client: Any) -> str:
    """The underwriter's assistant, created once and cached; the appetite guideline uploaded to it
    once so document search can cite it. Cached to disk so a restart does not create a second one."""
    cache, who = _cache(), underwriter()
    rec = cache.get(f"assistant-{who}")
    if rec:
        return rec["assistant_id"]
    name = f"{ASSISTANT_PREFIX}-{who}"
    found = await client.list_assistants(name=name)
    a = found[0] if found else await client.create_assistant(
        name=name, description="Pixie underwriting desk: cross-case memory and the appetite guideline",
        system_prompt=SYSTEM_PROMPT)
    aid, doc_id = str(a.assistant_id), ""
    if GUIDELINE.exists():
        doc = await client.upload_document_to_assistant(aid, GUIDELINE)
        doc_id = str(getattr(doc, "document_id", ""))
    cache.set(f"assistant-{who}", {"assistant_id": aid, "name": name, "guideline_document": doc_id})
    log("backboard.assistant", assistant=name, guideline_document=doc_id)
    return aid


# ---------- the two calls the desk makes ------------------------------------------------------------

async def recall(memo: CaseMemo, limit: int = 5, cite_guideline: bool = False) -> Recall:
    """What this desk has learned that bears on this case, plus optionally the guideline paragraph."""
    cache = _cache()
    key = _key("recall", memo.query(), str(limit), str(cite_guideline))
    hit = cache.get(key)
    if hit is not None:
        return Recall(lines=hit["lines"], guideline=hit.get("guideline", ""), source="cache")
    if not enabled():
        return Recall(source="off", detail="offline: this recall is not in the cache" if offline()
                      else "BACKBOARD_API_KEY is unset; see docs/BACKBOARD.md")
    client = _client()
    try:
        aid = await assistant_id(client)
        found = await client.search_memories(aid, memo.query(), limit=limit)
        lines = [m["content"] for m in (found or {}).get("memories", []) if m.get("content")]
        guideline = ""
        if cite_guideline:
            answer = await client.send_message(
                f"Quote the paragraph of the appetite guideline that governs a {memo.business} property "
                f"risk in {memo.state}. Quote it; do not summarise, and add no number of your own.",
                assistant_id=aid, memory="Auto")
            guideline = _text_of(answer)
        cache.set(key, {"lines": lines, "guideline": guideline})
        log("backboard.recall", case_id=memo.case_id, lines=len(lines), cited=bool(guideline))
        return Recall(lines=lines, guideline=guideline, source="backboard")
    except Exception as exc:                      # memory is advisory: a failure is never a failed case
        log("backboard.error", level="warning", case_id=memo.case_id, op="recall", error=f"{type(exc).__name__}: {exc}")
        return Recall(source="error", detail=f"{type(exc).__name__}: {exc}")
    finally:
        await _close(client)


async def remember(memo: CaseMemo) -> bool:
    """Store this case's number-free line as an assistant memory. False when Backboard is off."""
    if not enabled():
        return False
    client = _client()
    try:
        aid = await assistant_id(client)
        await client.add_memory(aid, memo.line(), metadata={"case_id": memo.case_id, "broker": memo.broker,
                                                            "state": memo.state, "source": "pixie-desk"})
        log("backboard.remember", case_id=memo.case_id)
        return True
    except Exception as exc:
        log("backboard.error", level="warning", case_id=memo.case_id, op="remember",
            error=f"{type(exc).__name__}: {exc}")
        return False
    finally:
        await _close(client)


# ---------- System One: typed judgements, explicitly not engine numbers ---------------------------

SYSTEM_ONE_MODEL = "jev-1.13.0"          # typesafe provider, confirmed live via list_models_by_provider
SYSTEM_ONE_PROVIDER = "typesafe"

JUDGEMENT_BOUNDARY = (
    "A model judgement, not an engine number. System One returns a probability and a confidence; "
    "neither may become a price, a score, a points value or a decision tier (AGENTS.md invariant 1). "
    "They are used to route work: what an inbound broker message is asking for, whether it smells "
    "like a duplicate, and which missing fact to chase first."
)


@dataclass(frozen=True)
class Judgement:
    """One typed answer from Backboard's System One (TypeSafe Jev)."""
    question: str
    answer: str
    probability: float | None = None
    confidence: float | None = None

    def wire(self) -> dict[str, Any]:
        return {"question": self.question, "answer": self.answer, "probability": self.probability,
                "confidence": self.confidence, "kind": "model_judgement"}


async def judge(state: Any, questions: dict[str, Any]) -> tuple[list[Judgement], str]:
    """Ask System One typed questions about `state`. Returns (judgements, detail).

    `questions` uses Backboard's own shape: each value is {"type": "choice"|"noul"|"score",
    "instructions": ..., "criteria": ...}. Nothing here touches the guideline engine: the caller
    must label every number as a model judgement and must never feed one into a score or a price.
    """
    if not enabled():
        return [], ("offline: no cached judgement for this message" if offline()
                    else "BACKBOARD_API_KEY is unset; see docs/BACKBOARD.md")
    cache = _cache()
    key = _key("judge", repr(state), repr(sorted(questions)))
    hit = cache.get(key)
    if hit is not None:
        return [Judgement(**j) for j in hit["judgements"]], "cache"
    client = _client()
    try:
        answer = await client.send_message("", llm_provider=SYSTEM_ONE_PROVIDER, model_name=SYSTEM_ONE_MODEL,
                                           system_one={"state": state, "questions": questions})
        payload = _system_one_of(answer)
        out = [Judgement(question=q, answer=str(a.get("answer", a.get("value", ""))),
                         probability=_num(a.get("probability")), confidence=_num(a.get("confidence")))
               for q, a in (payload or {}).items()]
        cache.set(key, {"judgements": [j.__dict__ for j in out]})
        log("backboard.system_one", questions=len(questions), answers=len(out))
        return out, SYSTEM_ONE_MODEL
    except Exception as exc:
        log("backboard.error", level="warning", op="system_one", error=f"{type(exc).__name__}: {exc}")
        return [], f"{type(exc).__name__}: {exc}"
    finally:
        await _close(client)


def broker_questions(open_facts: list[str]) -> dict[str, Any]:
    """The three typed questions the desk asks about an inbound broker message.

    `chase_first` ranks the facts the code already knows are missing, so even this answer picks from
    a list code computed rather than inventing one.
    """
    facts = {f: f"the broker's message bears on {f.replace('_', ' ')}" for f in open_facts[:5]} or \
            {"premium": "the broker's message bears on premium"}
    return {
        "intent": {"type": "choice", "instructions": "What is this broker asking the underwriting desk for?",
                   "criteria": {"answers_our_question": "supplies a fact the desk asked for",
                                "asks_a_question": "asks the desk something",
                                "chases_status": "asks for a decision or a status update",
                                "other": None}},
        "looks_like_duplicate": {"type": "noul", "instructions": "Does this message suggest the same account "
                                 "has already been submitted, by this broker or another?",
                                 "criteria": {"true": "it refers to a prior or parallel submission of this risk",
                                              "false": "no sign of a prior submission"}},
        "chase_first": {"type": "choice", "instructions": "Which still-missing fact should the desk chase first "
                        "after this message?", "criteria": facts},
    }


def _num(v: Any) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _messages(answer: Any) -> list[Any]:
    return list(getattr(answer, "messages", None) or [])


def _field(m: Any, name: str) -> Any:
    return m.get(name) if isinstance(m, dict) else getattr(m, name, None)


def _system_one_of(answer: Any) -> dict[str, Any]:
    for m in reversed(_messages(answer)):
        payload = _field(m, "system_one")
        if isinstance(payload, dict):
            return payload.get("answers", payload)
    return {}


def _text_of(answer: Any) -> str:
    """The assistant's reply text out of a ChatMessagesResponse, whatever shape the messages take.

    A run Backboard refused (no credits, provider error) comes back as a normal assistant message
    with status FAILED carrying the billing notice; returning that as a guideline citation would be
    a lie, so a failed message yields "".
    """
    for m in reversed(_messages(answer)):
        content, role, status = _field(m, "content"), _field(m, "role"), _field(m, "status")
        if content and str(role).lower().endswith("assistant") and str(status).upper() != "FAILED":
            return str(content)[:1200]
    return ""


async def _close(client: Any) -> None:
    try:
        await client.aclose()
    except Exception:
        pass
