"""A5: tapbacks, typing/live-run wiring, receipt images, renter quote over iMessage, read-receipt
status, and the group-thread answer's verify_numbers grounding. All in dry mode (no live Linq
calls, no ATLAS_ACTIONS=live) so these run offline like the rest of the suite."""

import json

from fastapi.testclient import TestClient

from atlas_api.linq import digest_text, extract_reaction, event_kind, parse_command, RUN
from atlas_api.linq_routes import _group_reply
from atlas_api.receipt import receipt_for_case, render_receipt


def test_run_command_parses_like_the_others():
    assert parse_command("run 1") == (RUN, 1)
    assert parse_command("reassess 2") == (RUN, 2)
    assert parse_command("rerun") == (RUN, 1)


def test_event_kind_from_payload_or_header():
    assert event_kind({"event_type": "reaction.added"}, {}) == "reaction.added"
    assert event_kind({}, {"X-Webhook-Event": "message.read"}) == "message.read"
    assert event_kind({}, {}) == ""


def test_extract_reaction_walks_a_doc_only_shape():
    payload = {"event_type": "reaction.added",
               "data": {"direction": "inbound", "message_id": "m1",
                        "reaction": {"operation": "add", "reaction_type": "like"}}}
    assert extract_reaction(payload) == ("like", "m1")
    assert extract_reaction({"event_type": "reaction.added", "data": {}}) is None


def test_render_receipt_is_a_real_png_and_is_content_addressed():
    data, filename = render_receipt("138", "Acme Warehouse", "refer", "Score 42-58",
                                     ["premium: missing"], "referred, broker asked")
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    assert filename.endswith(".png")
    data2, filename2 = render_receipt("138", "Acme Warehouse", "refer", "Score 42-58",
                                      ["premium: missing"], "referred, broker asked")
    assert filename == filename2 and data == data2   # same facts -> same file, no pile-up


def test_reaction_tapback_approves_item_one(tmp_path, monkeypatch):
    monkeypatch.setenv("ATLAS_DB", str(tmp_path / "linq.sqlite"))
    monkeypatch.delenv("ATLAS_ACTIONS", raising=False)
    monkeypatch.setattr("atlas_api.linq.INBOUND_DIR", tmp_path / "inbound")
    from atlas_api.app import app, get_store
    monkeypatch.delenv("LINQ_WEBHOOK_SECRET", raising=False)   # after import: load_dotenv() already ran

    with TestClient(app) as client:
        text, case_ids = digest_text(get_store(), 3)
        assert case_ids
        get_store().cache_set("linq:last_digest", case_ids)

        body = json.dumps({"event_type": "reaction.added",
                           "data": {"direction": "inbound", "message_id": "whatever",
                                    "reaction": {"operation": "add", "reaction_type": "like"}}})
        r = client.post("/webhooks/linq", content=body,
                        headers={"content-type": "application/json"}).json()
        assert r["ok"] and r["reaction"] == ["like", "whatever"] and r["command"] == "accept_with_subjectivity"
        assert "Approved" in r["reply"]
        assert client.get(f"/cases/{case_ids[0]}").json()["decision"]["kind"] == "approve"


def test_dislike_and_question_tapbacks_map_to_refer_and_why(tmp_path, monkeypatch):
    monkeypatch.setenv("ATLAS_DB", str(tmp_path / "linq.sqlite"))
    monkeypatch.delenv("ATLAS_ACTIONS", raising=False)
    monkeypatch.setattr("atlas_api.linq.INBOUND_DIR", tmp_path / "inbound")
    from atlas_api.app import app, get_store
    monkeypatch.delenv("LINQ_WEBHOOK_SECRET", raising=False)

    with TestClient(app) as client:
        _text, case_ids = digest_text(get_store(), 3)
        get_store().cache_set("linq:last_digest", case_ids)

        def react(rtype):
            body = json.dumps({"event_type": "reaction.added",
                               "data": {"direction": "inbound",
                                        "reaction": {"operation": "add", "reaction_type": rtype}}})
            return client.post("/webhooks/linq", content=body,
                               headers={"content-type": "application/json"}).json()

        why = react("question")
        assert why["command"] == "why" and case_ids[0] in why["reply"]

        dislike = react("dislike")
        assert dislike["command"] == "refer_with_subjectivity"
        assert client.get(f"/cases/{case_ids[0]}").json()["decision"]["kind"] == "refer"


def test_renter_quote_dry_and_no_op_without_a_stored_phone(tmp_path, monkeypatch):
    monkeypatch.setenv("ATLAS_DB", str(tmp_path / "linq.sqlite"))
    monkeypatch.delenv("ATLAS_ACTIONS", raising=False)
    from atlas_api.app import app

    with TestClient(app) as client:
        out = client.post("/linq/quote", json={
            "address": "1100 Queen St W", "phone": "+15145550000",
            "contentsValue": 25_000, "unitLevel": "upper", "claims5yr": 0,
        }).json()
        assert out["sent"] is False and out["receiptUrl"].endswith(".png")
        assert out["quote"]["decision"]["kind"] == "approve"

        # dry mode never wrote the phone->case mapping, so a "why" from that number is a no-op
        status = client.get("/linq/digest/status").json()
        assert status == {"sent": False}


def test_group_reply_only_answers_with_grounded_numbers():
    case_view = {
        "caseId": "138", "title": "Acme Warehouse",
        "facts": [{"id": "premium", "label": "Premium", "display": "$42,000", "provenance": "known"}],
        "factors": [{"fact": "premium", "possible": ["target"], "valueText": "$42,000", "provenance": "known"}],
        "explanation": "Open, straddling 50. Score 42-58.",
    }
    from atlas_api.case_store import CaseStore
    import sqlite3

    store = CaseStore(sqlite3.connect(":memory:"))
    store.conn.executescript(
        "CREATE TABLE cases (id TEXT PRIMARY KEY, json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')));"
        "CREATE TABLE cache (key TEXT PRIMARY KEY, json TEXT NOT NULL, ts TEXT NOT NULL DEFAULT (datetime('now')));"
    )
    store.put_case("138", {"queue": {}, "case": case_view})
    store.cache_set("linq:group_case:chat1", "138")

    answer = _group_reply(store, "chat1", "what's the premium?")
    assert answer is not None and "138" in answer
    # whatever it says, every number in it must trace back to the case's own computed facts (the
    # leading "138:" is the case id we looked up by, not a claim, so it's allowed too)
    from atlas_api.desk import verify_numbers
    corpus = ["138"] + [f"{f['label']}: {f['display']}" for f in case_view["facts"]] + [case_view["explanation"]]
    assert verify_numbers(answer, corpus) == []


def test_receipt_for_case_picks_receipt_lines_when_present():
    case_view = {
        "caseId": "TQ-abc", "title": "1100 Queen St W", "decision": {"kind": "approve", "because": []},
        "receipt": {"annual": 612.0, "lines": [
            {"label": "Break-ins near you", "dollars": 12.5}, {"label": "Fire protection", "dollars": -8.0},
            {"label": "Basement flooding", "dollars": 0.0}, {"label": "padding", "dollars": 0.1}]},
    }
    data, filename = receipt_for_case(case_view)
    assert data[:8] == b"\x89PNG\r\n\x1a\n" and filename.endswith(".png")
