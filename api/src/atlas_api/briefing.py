"""The spoken case briefing (ElevenLabs), with the timing the screen needs to follow along.

`GET /briefing/{case_id}` returns an MP3 URL, the script, and one mark per segment carrying the
segment's start and end second. The web player highlights the matching part of the score waterfall
as each sentence is read, so the audio and the picture stay in step without anyone guessing.

The script is composed from the case's own computed fields, one sentence per idea; no number in it
comes from a model (AGENTS.md invariant 1), and the Challenger's objection is quoted as written.
Audio and alignment are cached to disk by a hash of the script, so a demo re-run costs nothing and
works offline once warmed (invariant 4).
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx

AUDIO_DIR = Path(__file__).resolve().parents[3] / "var" / "briefings"
API = "https://api.elevenlabs.io/v1/text-to-speech"
# Harper, documentary read. Override with ELEVENLABS_VOICE_ID (CSWOX3djBEY4mlYbaQ2U is Ben's own).
DEFAULT_VOICE = "Fihx1nL7DQV0DEuFJSG1"
MODEL = "eleven_turbo_v2_5"


@dataclass(frozen=True)
class Segment:
    """One spoken sentence and the part of the screen it talks about."""
    anchor: str   # "score" | "facts" | "flip" | "challenge" | "action"
    text: str


def _money(x: float) -> str:
    return f"${x:,.0f}"


def script_for(case: dict[str, Any], sensitivity: dict[str, Any] | None) -> list[Segment]:
    """Sentences read straight off the case view. Deterministic: same case, same script."""
    d = case["decision"]
    receipt = case.get("receipt")
    segs = [Segment("score", f"The renter quote for {case['title']}." if receipt
                    else f"Case {case['caseId']}, {case['title']}.")]

    if receipt:                                    # a renter quote prices in dollars, not points
        biggest = max(receipt["lines"], key=lambda ln: abs(ln["dollars"]))
        segs.append(Segment("score", f"The price is {receipt['annual']:.2f} dollars a year, "
                                      f"starting from a base of {_money(receipt['base'])}."))
        segs.append(Segment("facts", f"The line that moves it most is {biggest['label'].lower()}, "
                                      f"{'adding' if biggest['dollars'] > 0 else 'taking off'} "
                                      f"{_money(abs(biggest['dollars']))}."))
        segs.append(Segment("facts", f"That comes from {biggest['source'].split(';')[0]}."))
        return segs

    score = case.get("score")
    if score:
        band = {"accept": "above the accept line", "decline": "below the decline line",
                "open": "straddling the refer line"}.get(d["kind"], "")
        segs.append(Segment("score", f"The guideline scores it {score['lo']} to {score['hi']}, {band}."))
    else:
        segs.append(Segment("score", "No guideline covers this line, so the desk routes it rather than scoring it."))

    missing = [f["label"] for f in case.get("facts", []) if f.get("provenance") == "missing"]
    if missing:
        segs.append(Segment("facts", f"{len(missing)} facts are missing: {', '.join(missing).lower()}."))

    flip = next((f for f in (sensitivity or {}).get("facts", []) if f.get("movesDecision") and f.get("flip")), None)
    if flip:
        line = flip["flip"]["text"].rstrip(".")
        segs.append(Segment("flip", line[:1].upper() + line[1:] + "."))

    challenge = case.get("challenge") or {}
    if challenge.get("argument"):
        segs.append(Segment("challenge", "The Challenger disagrees."))
        # One sentence only: a 20-second wall of argument loses the room.
        segs.append(Segment("challenge", challenge["argument"].split(". ")[0].rstrip(".") + "."))

    action = next((a for a in case.get("actions", []) if a.get("status") in {"sent", "proposed"}), None)
    if action:
        what = action.get("label") or action["key"].replace("_", " ")
        verb = "has already" if action["status"] == "sent" else "wants to"
        segs.append(Segment("action", f"The desk {verb} {what.lower()} by {action.get('channel', 'email')}."))
    return segs


def _segment_times(segments: list[Segment], alignment: dict[str, Any]) -> list[dict[str, Any]]:
    """Map each sentence to its audio window using the per-character timestamps."""
    starts = alignment["character_start_times_seconds"]
    ends = alignment["character_end_times_seconds"]
    n = len(starts)
    marks, cursor = [], 0
    for seg in segments:
        lo = min(cursor, n - 1)
        cursor = min(cursor + len(seg.text) + 1, n)   # +1 for the space joining sentences
        hi = min(cursor, n) - 1
        marks.append({"anchor": seg.anchor, "text": seg.text,
                       "startSec": round(starts[lo], 2), "endSec": round(ends[max(hi, lo)], 2)})
    return marks


def build(case_id: str, case: dict[str, Any], sensitivity: dict[str, Any] | None) -> dict[str, Any]:
    """Synthesise (or reuse) the briefing. Raises RuntimeError when no key is configured."""
    segments = script_for(case, sensitivity)
    text = " ".join(s.text for s in segments)
    voice = os.environ.get("ELEVENLABS_VOICE_ID", DEFAULT_VOICE)
    # The voice is part of the identity of the audio: changing it must miss the cache.
    digest = hashlib.sha256(f"{MODEL}|{voice}|{text}".encode()).hexdigest()[:16]
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    meta_path, audio_path = AUDIO_DIR / f"{digest}.json", AUDIO_DIR / f"{digest}.mp3"
    if meta_path.is_file() and audio_path.is_file():
        return {**json.loads(meta_path.read_text()), "cached": True}

    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        raise RuntimeError("ELEVENLABS_API_KEY is not set")
    resp = httpx.post(f"{API}/{voice}/with-timestamps", timeout=90,
                       headers={"xi-api-key": key},
                       json={"text": text, "model_id": MODEL,
                             "voice_settings": {"stability": 0.45, "similarity_boost": 0.75}})
    resp.raise_for_status()
    body = resp.json()
    audio_path.write_bytes(base64.b64decode(body["audio_base64"]))
    out = {
        "caseId": case_id, "script": text, "voiceId": voice, "model": MODEL,
        "audio": f"{digest}.mp3", "durationSec": round(body["alignment"]["character_end_times_seconds"][-1], 2),
        "marks": _segment_times(segments, body["alignment"]),
    }
    meta_path.write_text(json.dumps(out))
    return {**out, "cached": False}


def demo() -> None:
    """Self-check with no network: the marks cover every segment, in order, without gaps."""
    segs = [Segment("score", "Case 138."), Segment("facts", "Two facts are missing.")]
    text = " ".join(s.text for s in segs)
    alignment = {"character_start_times_seconds": [i * 0.1 for i in range(len(text))],
                  "character_end_times_seconds": [(i + 1) * 0.1 for i in range(len(text))]}
    marks = _segment_times(segs, alignment)
    assert [m["anchor"] for m in marks] == ["score", "facts"]
    assert marks[0]["startSec"] == 0.0 and marks[0]["endSec"] < marks[1]["startSec"] + 0.01
    assert marks[1]["endSec"] <= round(len(text) * 0.1, 2) + 0.01
    print("briefing marks ok:", marks)


if __name__ == "__main__":
    demo()
