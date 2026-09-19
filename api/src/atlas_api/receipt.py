"""A5: the receipt card. A small PNG summarising one case -- insured/address, decision, the
price or score interval, the 2-3 factors that moved it, and the action taken -- for Linq's
`media` message part. Pure-Python (Pillow, the one new dependency this lane adds; no headless
browser, no font files on disk: Pillow 10.1+ ships a usable default bitmap font).

Content only, never invented: every string here is read off the case's own computed `factors`/
`receipt`/`decision`/`explanation` (already verify_numbers-checked upstream), so the card can't
say a number the engine didn't produce.
"""

from __future__ import annotations

import hashlib
import io
import os
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

MEDIA_DIR = Path(__file__).resolve().parents[3] / "var" / "linq_media"
W, H = 640, 360
GREEN = (39, 128, 74)
RED = (176, 42, 42)
AMBER = (176, 121, 18)
INK = (32, 32, 32)
MUTE = (110, 108, 102)
LINE = (214, 209, 199)
PAPER = (250, 248, 244)
_COLOR = {"approve": GREEN, "accept": GREEN, "quoted": GREEN,
          "decline": RED, "refer": AMBER, "referred": AMBER, "open": MUTE, "routed": MUTE}


def _font(size: int) -> ImageFont.ImageFont:
    return ImageFont.load_default(size=size)


def render_receipt(case_id: str, title: str, decision_kind: str, headline: str,
                    factors: list[str], action_text: str) -> tuple[bytes, str]:
    """Draws the card and writes it to MEDIA_DIR. Returns (png_bytes, filename); the filename is
    a content hash, so the same facts always reuse the same file instead of piling up var/."""
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    color = _COLOR.get(decision_kind, INK)
    d.rectangle([0, 0, W, 10], fill=color)
    d.text((24, 30), "Pixie", font=_font(18), fill=MUTE)
    d.text((24, 54), title[:42], font=_font(26), fill=INK)
    d.text((24, 96), decision_kind.replace("_", " ").upper(), font=_font(28), fill=color)
    d.text((24, 134), headline, font=_font(22), fill=INK)
    d.line([(24, 172), (W - 24, 172)], fill=LINE)
    y = 186
    d.text((24, y), "What moved it:", font=_font(15), fill=MUTE)
    y += 24
    for f in factors[:3] or ["no single factor decided it"]:
        d.text((32, y), f"- {f}"[:64], font=_font(16), fill=INK)
        y += 24
    d.line([(24, y + 6), (W - 24, y + 6)], fill=LINE)
    d.text((24, y + 18), action_text[:80], font=_font(15), fill=MUTE)
    d.text((24, H - 26), f"{case_id} · illustrative, not an offer", font=_font(12), fill=MUTE)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    data = buf.getvalue()
    filename = hashlib.sha256(data).hexdigest()[:20] + ".png"
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    path = MEDIA_DIR / filename
    if not path.exists():
        path.write_bytes(data)
    return data, filename


def _top_factors(case_view: dict[str, Any]) -> list[str]:
    receipt = case_view.get("receipt")
    if receipt and receipt.get("lines"):
        ranked = sorted(receipt["lines"], key=lambda ln: abs(ln.get("dollars", 0)), reverse=True)
        return [f"{ln['label']} {'+' if ln.get('dollars', 0) >= 0 else ''}{ln.get('dollars', 0):.2f}"
                for ln in ranked[:3]]
    factors = case_view.get("factors") or []
    # ponytail: "constraining" = doesn't still allow all three bands; good enough to rank without a model
    constraining = [f for f in factors if len(f.get("possible") or []) < 3 and f.get("valueText")]
    pool = constraining or [f for f in factors if f.get("valueText")]
    return [f"{f['fact'].replace('_', ' ')}: {f['valueText']}" for f in pool[:3]]


def receipt_for_case(case_view: dict[str, Any]) -> tuple[bytes, str]:
    """Build the card straight from a stored CaseView (property or tenant -- both shapes match)."""
    title = str(case_view.get("title") or case_view.get("caseId") or "?")
    decision = case_view.get("decision") or {}
    kind = decision.get("kind", "open")
    receipt = case_view.get("receipt")
    score = case_view.get("score")
    if receipt and receipt.get("annual") is not None:
        headline = f"${receipt['annual']:,.2f} / yr"
    elif score:
        headline = f"Score {score['lo']:.0f}-{score['hi']:.0f}"
    else:
        headline = kind.capitalize()
    because = decision.get("because") or []
    action_text = because[0] if because else (case_view.get("explanation") or "")[:80]
    return render_receipt(str(case_view.get("caseId", "?")), title, kind, headline,
                          _top_factors(case_view), action_text)


def public_url(filename: str) -> str:
    base = (os.environ.get("PUBLIC_URL") or "").rstrip("/")
    return f"{base}/media/{filename}"
