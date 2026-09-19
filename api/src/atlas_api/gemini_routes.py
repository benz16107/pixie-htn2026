"""Gemini-backed routes: photo inventory, Maps-grounded advisory notes, and quote text-to-speech.

Its own APIRouter (AGENTS.md: new backend routes live in a new module with one `include_router`
line in app.py). Invariant 1 still holds here: Gemini identifies and describes, code prices.
`_totals_from_items` is the only place a dollar figure is computed; every route response carries
where its numbers and notes came from.

Everything Gemini returns is cached to disk (AGENTS.md invariant 4): inventory and context notes
in the shared CaseStore's `cache` table (keyed by a hash of the request), speech as .wav files
under `cache/gemini_tts/`. Same input -> no repeat network call, and a recorded demo replays
without a key. Unlike the fully offline Toronto pack, a *new* photo or note still needs the
network the first time; there is no way to pre-record every possible apartment photo.
"""

from __future__ import annotations

import hashlib
import os
import wave
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Response, UploadFile
from pydantic import BaseModel, Field

from .case_store import CaseStore

router = APIRouter(prefix="/gemini", tags=["gemini"])

REPO_ROOT = Path(__file__).resolve().parents[3]
TTS_CACHE_DIR = REPO_ROOT / "cache" / "gemini_tts"

INVENTORY_MODEL = "gemini-3.6-flash"
CONTEXT_MODEL = "gemini-3.6-flash"
VERIFY_MODEL = "gemini-3.6-flash"
TTS_MODEL = "gemini-2.5-flash-preview-tts"
TTS_VOICE = "Kore"

CONTENTS_MIN, CONTENTS_MAX = 10_000, 250_000  # matches TenantAnswersRequest in app.py


@lru_cache(maxsize=1)
def _store() -> CaseStore:
    return CaseStore.open()


@lru_cache(maxsize=1)
def _client():
    """Lazy: read the key at first call, not at import time, so tests can monkeypatch it and the
    module still imports with no key set (offline-first states need to render without one)."""
    from google import genai

    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    return genai.Client(api_key=key)


def _cache_key(*parts: str) -> str:
    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:24]


# ---------- 1. photograph your apartment: Gemini vision -> structured inventory ------------------

class InventoryItem(BaseModel):
    category: Literal["furniture", "electronics", "appliances", "clothing", "kitchenware", "decor", "other"]
    item: str
    quantity: int = Field(ge=1, le=50)
    estimated_value_low_cad: int = Field(ge=0)
    estimated_value_high_cad: int = Field(ge=0)
    confidence: float = Field(ge=0, le=1)


class InventoryLine(BaseModel):
    id: int
    category: str
    item: str
    quantity: int
    low: int
    high: int
    confidence: float
    source: str = "Gemini vision estimate from your photo. Review and edit before you accept it."


class InventoryResult(BaseModel):
    lines: list[InventoryLine]
    totalLow: int
    totalHigh: int
    suggestedContentsValue: int
    cached: bool
    model: str = INVENTORY_MODEL


_INVENTORY_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "items": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "category": {"type": "STRING", "enum": list(InventoryItem.model_fields["category"].annotation.__args__)},
                    "item": {"type": "STRING"},
                    "quantity": {"type": "INTEGER"},
                    "estimated_value_low_cad": {"type": "INTEGER"},
                    "estimated_value_high_cad": {"type": "INTEGER"},
                    "confidence": {"type": "NUMBER"},
                },
                "required": ["category", "item", "quantity", "estimated_value_low_cad",
                             "estimated_value_high_cad", "confidence"],
            },
        }
    },
    "required": ["items"],
}

_INVENTORY_PROMPT = (
    "You are helping a renter list their personal belongings for a tenant insurance quote. "
    "Look at the photo(s) of their apartment. List every distinct movable item that belongs to "
    "the tenant and would need to be replaced if lost: furniture, electronics, appliances they "
    "own (not built-in ones like a wall oven or dishwasher), clothing, kitchenware, decor. "
    "Skip the room itself, walls, floors, windows, and anything built into the unit. "
    "For each item give a category, a short name, a quantity, and an honest CAD replacement "
    "VALUE RANGE (low and high) reflecting typical retail prices for that kind of item in that "
    "visible condition -- do not invent a fake-precise single number. Give a confidence from 0 to "
    "1 for how sure you are of the identification. If you cannot see the apartment clearly, "
    "return fewer items rather than guessing."
)


def _totals_from_items(items: list[InventoryItem]) -> tuple[list[InventoryLine], int, int, int]:
    """Code, not Gemini, computes the totals a price ever depends on."""
    lines = [
        InventoryLine(
            id=i, category=it.category, item=it.item, quantity=it.quantity,
            low=it.estimated_value_low_cad * it.quantity, high=it.estimated_value_high_cad * it.quantity,
            confidence=round(it.confidence, 2),
        )
        for i, it in enumerate(items)
    ]
    total_low = sum(l.low for l in lines)
    total_high = sum(l.high for l in lines)
    mid = round((total_low + total_high) / 2, -3)  # nearest $1,000, the pricing table's grain
    suggested = int(min(CONTENTS_MAX, max(CONTENTS_MIN, mid)))
    return lines, total_low, total_high, suggested


@router.post("/inventory", response_model=InventoryResult)
async def inventory(photos: list[UploadFile]) -> InventoryResult:
    if not photos:
        raise HTTPException(status_code=422, detail="attach at least one photo")
    blobs = [(await p.read(), p.content_type or "image/jpeg") for p in photos]
    if any(not b for b, _ in blobs):
        raise HTTPException(status_code=422, detail="an attached photo was empty")
    key = "inv:" + _cache_key(*(hashlib.sha256(b).hexdigest() for b, _ in blobs))
    cached = _store().cache_get(key)
    if cached is not None:
        return InventoryResult(**cached, cached=True)

    from google.genai import types

    parts: list[Any] = [_INVENTORY_PROMPT]
    for data, mime in blobs:
        parts.append(types.Part.from_bytes(data=data, mime_type=mime))
    try:
        resp = _client().models.generate_content(
            model=INVENTORY_MODEL,
            contents=parts,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=_INVENTORY_SCHEMA,
            ),
        )
    except Exception as exc:  # network/quota/key problems must surface as a clean app error, not a 500 trace
        raise HTTPException(status_code=502, detail=f"Gemini vision call failed: {exc}") from exc

    import json
    try:
        raw_items = json.loads(resp.text)["items"]
        items = [InventoryItem(**it) for it in raw_items]
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini returned an unexpected shape: {exc}") from exc

    lines, total_low, total_high, suggested = _totals_from_items(items)
    result = InventoryResult(lines=lines, totalLow=total_low, totalHigh=total_high,
                              suggestedContentsValue=suggested, cached=False)
    _store().cache_set(key, result.model_dump(exclude={"cached"}))
    return result


# ---------- 2. Gemini Maps grounding: advisory context, never a price input ----------------------

class ContextCitation(BaseModel):
    title: str
    uri: str


class ContextNote(BaseModel):
    note: str
    citations: list[ContextCitation]
    grounded: bool
    label: str = "Advisory only. This never changes your price."
    cached: bool


_CONTEXT_PROMPT = {
    "consumer": (
        "In 2-3 short, factual sentences for a renter, describe what is around this location in "
        "Toronto that is relevant to home contents risk: roughly how far the nearest fire hall is, "
        "and whether anything nearby (a gas station, rail line, or waterway) is worth knowing about. "
        "Do not mention price, premium, or insurance cost. Do not invent facts you cannot ground."
    ),
    "commercial": (
        "In 2-3 short, factual sentences for a commercial underwriter reviewing this address, "
        "note the nearest fire hall and any notable nearby hazard exposures (fuel storage, rail, "
        "flood-prone waterway, heavy industry). This is background for the underwriter's judgment, "
        "not a rating factor. Do not mention price, premium, or a recommended decision."
    ),
}


@router.get("/context", response_model=ContextNote)
def context(lat: float, lng: float, kind: Literal["consumer", "commercial"] = "consumer") -> ContextNote:
    # Round to ~11m so nearby requests for the same block share one cached, grounded note.
    key = f"ctx:{kind}:{round(lat, 4)}:{round(lng, 4)}"
    cached = _store().cache_get(key)
    if cached is not None:
        return ContextNote(**cached, cached=True)

    from google.genai import types

    try:
        resp = _client().models.generate_content(
            model=CONTEXT_MODEL,
            contents=_CONTEXT_PROMPT[kind],
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_maps=types.GoogleMaps())],
                tool_config=types.ToolConfig(
                    retrieval_config=types.RetrievalConfig(lat_lng=types.LatLng(latitude=lat, longitude=lng))
                ),
            ),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini Maps grounding call failed: {exc}") from exc

    grounding = resp.candidates[0].grounding_metadata if resp.candidates else None
    citations = [
        ContextCitation(title=c.maps.title, uri=c.maps.uri)
        for c in (grounding.grounding_chunks or []) if grounding and getattr(c, "maps", None)
    ] if grounding else []
    result = ContextNote(note=(resp.text or "").strip(), citations=citations, grounded=bool(citations), cached=False)
    _store().cache_set(key, result.model_dump(exclude={"cached"}))
    return result


# ---------- 3. quote text-to-speech, cached to disk as .wav ---------------------------------------

def _wav_bytes(pcm: bytes, channels: int = 1, rate: int = 24_000, sample_width: int = 2) -> bytes:
    buf = BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(rate)
        wf.writeframes(pcm)
    return buf.getvalue()


@router.get("/speech")
def speech(text: str) -> Response:
    text = text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="text must not be empty")
    if len(text) > 2000:
        raise HTTPException(status_code=422, detail="text is too long to read aloud")
    TTS_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = TTS_CACHE_DIR / f"{_cache_key(TTS_VOICE, text)}.wav"
    if not path.exists():
        from google.genai import types

        try:
            resp = _client().models.generate_content(
                model=TTS_MODEL,
                contents=text,
                config=types.GenerateContentConfig(
                    response_modalities=["audio"],
                    speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=TTS_VOICE)
                        )
                    ),
                ),
            )
            pcm = resp.candidates[0].content.parts[0].inline_data.data
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Gemini speech call failed: {exc}") from exc
        path.write_bytes(_wav_bytes(pcm))
    return Response(content=path.read_bytes(), media_type="audio/wav",
                     headers={"Cache-Control": "public, max-age=31536000, immutable"})


# ---------- 4. bonus: Gemini code execution double-checks the receipt arithmetic -----------------
#
# `matches` is computed in Python from the same numbers the client already summed (invariant 1:
# code decides, never the model's own claim). Gemini's generated code and its own printed answer
# are shown only as a transparent, on-demand demo of a second, independent check -- the checkmark
# the quote screen already shows above this is the one that counts.

class VerifyLine(BaseModel):
    label: str
    dollars: float


class VerifyRequest(BaseModel):
    base: float
    lines: list[VerifyLine]
    total: float


class VerifyResult(BaseModel):
    matches: bool
    code: str
    output: str
    cached: bool


@router.post("/verify", response_model=VerifyResult)
def verify(req: VerifyRequest) -> VerifyResult:
    numbers = [req.base] + [l.dollars for l in req.lines]
    key = "verify:" + _cache_key(str(numbers), f"{req.total:.2f}")
    cached = _store().cache_get(key)
    if cached is not None:
        return VerifyResult(**cached, cached=True)

    from google.genai import types

    prompt = (
        f"Write and run Python code that adds these numbers: {numbers}. "
        f"Print the sum rounded to 2 decimal places, then print whether it equals {req.total:.2f}."
    )
    try:
        resp = _client().models.generate_content(
            model=VERIFY_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(tools=[types.Tool(code_execution=types.ToolCodeExecution())]),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini code execution call failed: {exc}") from exc

    matches = abs(round(sum(numbers), 2) - round(req.total, 2)) < 0.01
    result = VerifyResult(matches=matches, code=(resp.executable_code or "").strip(),
                          output=(resp.code_execution_result or "").strip(), cached=False)
    _store().cache_set(key, result.model_dump(exclude={"cached"}))
    return result
