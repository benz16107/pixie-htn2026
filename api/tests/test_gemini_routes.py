"""Gemini routes: no network. The Gemini client is monkeypatched with a canned fake so these run
offline and fast; they check the part invariant 1 cares about (code computes every dollar figure)
and that repeated calls hit the disk cache instead of the model."""

import json
import os

import pytest
from fastapi.testclient import TestClient

from atlas_api import gemini_routes as gr
from atlas_api.app import app
from atlas_api.gemini_routes import InventoryItem, _totals_from_items


def test_totals_from_items_sum_in_code_not_in_the_model() -> None:
    items = [
        InventoryItem(category="furniture", item="Sofa", quantity=1,
                      estimated_value_low_cad=400, estimated_value_high_cad=900, confidence=0.8),
        InventoryItem(category="electronics", item="Laptop", quantity=2,
                      estimated_value_low_cad=600, estimated_value_high_cad=1200, confidence=0.9),
    ]
    lines, low, high, suggested = _totals_from_items(items)
    assert low == 400 + 2 * 600
    assert high == 900 + 2 * 1200
    assert suggested == gr.CONTENTS_MIN  # $2,450 midpoint is below the $10,000 pricing-table floor
    assert lines[1].low == 1200 and lines[1].high == 2400


def test_suggested_contents_value_is_clamped_to_the_pricing_range() -> None:
    tiny = [InventoryItem(category="other", item="Sock", quantity=1,
                          estimated_value_low_cad=1, estimated_value_high_cad=2, confidence=0.5)]
    huge = [InventoryItem(category="furniture", item="Everything", quantity=1,
                          estimated_value_low_cad=900_000, estimated_value_high_cad=900_000, confidence=0.5)]
    assert _totals_from_items(tiny)[3] == gr.CONTENTS_MIN
    assert _totals_from_items(huge)[3] == gr.CONTENTS_MAX


class _Part:
    def __init__(self, data: bytes) -> None:
        self.inline_data = type("D", (), {"data": data})


class _Content:
    def __init__(self, data: bytes) -> None:
        self.parts = [_Part(data)]


class _Candidate:
    def __init__(self, grounding_metadata=None, audio: bytes | None = None) -> None:
        self.grounding_metadata = grounding_metadata
        if audio is not None:
            self.content = _Content(audio)


class _FakeResponse:
    def __init__(self, text: str = "", candidates=None, executable_code: str = "", code_execution_result: str = "") -> None:
        self.text = text
        self.candidates = candidates or []
        self.executable_code = executable_code
        self.code_execution_result = code_execution_result


class _FakeModels:
    def __init__(self) -> None:
        self.calls = 0
        self.next: _FakeResponse | None = None

    def generate_content(self, **kwargs):
        self.calls += 1
        assert self.next is not None
        return self.next


class _FakeClient:
    def __init__(self) -> None:
        self.models = _FakeModels()


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ATLAS_DB", str(tmp_path / "atlas.sqlite"))
    monkeypatch.setattr(gr, "TTS_CACHE_DIR", tmp_path / "gemini_tts")
    gr._store.cache_clear()
    fake = _FakeClient()
    monkeypatch.setattr(gr, "_client", lambda: fake)
    with TestClient(app) as c:
        yield c, fake
    gr._store.cache_clear()


def test_inventory_route_prices_in_code_and_caches(client) -> None:
    c, fake = client
    fake.models.next = _FakeResponse(text=json.dumps({"items": [
        {"category": "furniture", "item": "Desk", "quantity": 1,
         "estimated_value_low_cad": 150, "estimated_value_high_cad": 350, "confidence": 0.7},
    ]}))
    photo = ("photo.jpg", b"\xff\xd8\xff\xe0fake-jpeg-bytes", "image/jpeg")

    r1 = c.post("/gemini/inventory", files=[("photos", photo)])
    assert r1.status_code == 200, r1.text
    body = r1.json()
    assert body["totalLow"] == 150 and body["totalHigh"] == 350
    assert body["cached"] is False
    assert fake.models.calls == 1

    r2 = c.post("/gemini/inventory", files=[("photos", photo)])
    assert r2.json()["cached"] is True
    assert fake.models.calls == 1  # served from cache, no second model call


def test_context_route_never_returns_a_price_and_caches(client) -> None:
    c, fake = client
    chunk = type("C", (), {"maps": type("M", (), {"title": "Toronto Fire Station 24", "uri": "https://maps.google/x"})()})
    grounding = type("G", (), {"grounding_chunks": [chunk]})()
    fake.models.next = _FakeResponse(text="The nearest fire hall is about 0.6 km away.", candidates=[_Candidate(grounding)])

    r = c.get("/gemini/context", params={"lat": 43.6532, "lng": -79.3832})
    body = r.json()
    assert "price" not in body["note"].lower() and "premium" not in body["note"].lower()
    assert body["citations"] == [{"title": "Toronto Fire Station 24", "uri": "https://maps.google/x"}]
    assert body["grounded"] is True

    r2 = c.get("/gemini/context", params={"lat": 43.6532, "lng": -79.3832})
    assert r2.json()["cached"] is True
    assert fake.models.calls == 1


def test_speech_route_caches_wav_to_disk(client) -> None:
    c, fake = client
    silence = b"\x00\x00" * 1000
    fake.models.next = _FakeResponse(candidates=[_Candidate(audio=silence)])

    r1 = c.get("/gemini/speech", params={"text": "Your quote is approved."})
    assert r1.status_code == 200
    assert r1.headers["content-type"] == "audio/wav"
    assert fake.models.calls == 1
    assert len(list(gr.TTS_CACHE_DIR.glob("*.wav"))) == 1

    r2 = c.get("/gemini/speech", params={"text": "Your quote is approved."})
    assert r2.content == r1.content
    assert fake.models.calls == 1  # second read came from the cached .wav


def test_verify_route_trusts_python_not_the_models_prose(client) -> None:
    """Gemini's own printed claim says the numbers don't match; code_execution_result is only
    shown for transparency. `matches` must still come from summing in Python, per invariant 1."""
    c, fake = client
    fake.models.next = _FakeResponse(
        executable_code="print(sum([100.0, 20.0]))",
        code_execution_result="Sum: 120.00\nEquals 999.00: False",
    )
    r = c.post("/gemini/verify", json={"base": 100.0, "lines": [{"label": "X", "dollars": 20.0}], "total": 120.0})
    body = r.json()
    assert body["matches"] is True  # 100 + 20 == 120, regardless of what the fake model's text claims
    assert "sum(" in body["code"]
    assert fake.models.calls == 1

    r2 = c.post("/gemini/verify", json={"base": 100.0, "lines": [{"label": "X", "dollars": 20.0}], "total": 120.0})
    assert r2.json()["cached"] is True
    assert fake.models.calls == 1
