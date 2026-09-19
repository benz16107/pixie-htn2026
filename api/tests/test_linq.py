"""T12: tolerant inbound parse, raw logging, and the human decision it writes."""

import base64
import json

from fastapi.testclient import TestClient

from atlas_api.linq import digest_text, extract_text, parse_command


def test_parse_is_tolerant():
    assert parse_command("approve 1") == ("accept_with_subjectivity", 1)
    assert parse_command("Why 3?") == ("why", 3)
    assert parse_command("refer") == ("refer_with_subjectivity", 1)
    assert parse_command("thanks!") is None
    assert extract_text({"event": "message.received",
                         "data": {"message": {"parts": [{"type": "text", "value": "approve 1"}]}}}) == "approve 1"
    assert extract_text({"message": {"text": "why 2"}}) == "why 2"


def test_webhook_logs_raw_and_writes_a_human_decision(tmp_path, monkeypatch):
    monkeypatch.setenv("ATLAS_DB", str(tmp_path / "linq.sqlite"))
    monkeypatch.delenv("ATLAS_ACTIONS", raising=False)
    monkeypatch.delenv("LINQ_WEBHOOK_SECRET", raising=False)   # unsigned test events are accepted only when
                                                               # no signing secret is configured
    monkeypatch.setattr("atlas_api.linq.INBOUND_DIR", tmp_path / "inbound")
    from atlas_api.app import app

    with TestClient(app) as client:
        from atlas_api.app import get_store
        text, case_ids = digest_text(get_store(), 3)
        assert case_ids and "Reply:" in text
        get_store().cache_set("linq:last_digest", case_ids)

        r = client.post("/webhooks/linq", content=json.dumps(
            {"event_type": "message.received", "message": {"parts": [{"type": "text", "value": "approve 1"}]}}),
            headers={"content-type": "application/json"}).json()
        assert r["ok"] and r["command"] == ["accept_with_subjectivity", 1] and "Approved" in r["reply"]
        assert (tmp_path / "inbound").exists() and len(list((tmp_path / "inbound").iterdir())) == 1

        view = client.get(f"/cases/{case_ids[0]}").json()
        assert view["decision"] == {"kind": "approve", "because": ["underwriter reply over Linq"], "by": "human"}
        events = client.get(f"/cases/{case_ids[0]}/events").json()
        assert events[-1]["actor"] == "human" and events[-1]["kind"] == "decision"

        junk = client.post("/webhooks/linq", content=b"not json").json()
        assert junk["ok"] is True and junk["command"] is None

        # with a secret configured, an unsigned (or wrongly signed) event is logged but never acted on
        monkeypatch.setenv("LINQ_WEBHOOK_SECRET", "whsec_" + base64.b64encode(b"k" * 24).decode())
        forged = client.post("/webhooks/linq", content=json.dumps(
            {"message": {"parts": [{"type": "text", "value": "decline 1"}]}}),
            headers={"content-type": "application/json", "webhook-id": "x", "webhook-timestamp": "1",
                     "webhook-signature": "v1,bogus"}).json()
        assert forged["signatureValid"] is False and forged["reply"] is None
        assert client.get(f"/cases/{case_ids[0]}").json()["decision"]["kind"] == "approve"   # unchanged
