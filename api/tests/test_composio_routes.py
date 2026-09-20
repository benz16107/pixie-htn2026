"""A7: the Composio HTTP surface (composio_routes.py) -- dry by default, idempotent, never touches
the network in tests. `client` mirrors test_app.py's own fixture (fresh tmp DB, one startup). The
project's own .env sets ATLAS_ACTIONS=live (gmail really is connected), so every test that wants
dry behaviour forces it, exactly like test_actions.py and test_app.py already do."""

import os
import time

import pytest
from fastapi.testclient import TestClient

from atlas_api.app import app
from atlas_api.case_store import CaseStore
from atlas_api.events import DecisionP, DeskEvent


@pytest.fixture(scope="module")
def client(tmp_path_factory) -> TestClient:
    os.environ["ATLAS_DB"] = str(tmp_path_factory.mktemp("db") / "composio.sqlite")
    with TestClient(app) as c:
        yield c


def test_status_reports_toolkit_connections(client, monkeypatch):
    monkeypatch.delenv("COMPOSIO_GOOGLECALENDAR_ACCOUNT", raising=False)
    resp = client.get("/composio/status").json()
    assert resp["toolkits"]["gmail"] is True          # connected for this project
    assert resp["toolkits"]["googlecalendar"] is False  # not connected yet


def test_review_book_dry_mode_composes_and_is_idempotent(client, monkeypatch):
    monkeypatch.delenv("ATLAS_ACTIONS", raising=False)
    first = client.post("/composio/cases/138/review/book").json()
    assert first["status"] == "dry" and "SUB-138" in first["summary"]
    second = client.post("/composio/cases/138/review/book").json()
    assert second.get("deduped")


def test_decision_log_requires_a_final_decision(client):
    resp = client.post("/composio/cases/141/decision/log")
    assert resp.status_code == 409


def test_decision_log_after_a_recorded_referral(client, monkeypatch):
    monkeypatch.delenv("ATLAS_ACTIONS", raising=False)
    from atlas_api.app import get_store

    store: CaseStore = get_store()
    e = DeskEvent.make("143", "rtest-decision", "lead", DecisionP(
        text="Refer: needs a second look.", verdict="refer_with_subjectivity",
        explanation="Refer: needs a second look.", verified=True), t0=time.time() - 2)
    store.append(e)

    out = client.post("/composio/cases/143/decision/log").json()
    assert out["status"] == "dry" and out["row"][2] == "refer_with_subjectivity"
    again = client.post("/composio/cases/143/decision/log").json()
    assert again.get("deduped")


def test_defects_file_one_per_issue_on_a_case_with_data_quality_issues(client, monkeypatch):
    monkeypatch.delenv("ATLAS_ACTIONS", raising=False)
    out = client.post("/composio/cases/134/defects/file").json()
    assert out["filed"] and all(f["status"] == "dry" for f in out["filed"])
    again = client.post("/composio/cases/134/defects/file").json()
    assert all(f.get("deduped") for f in again["filed"])


def test_defects_file_reports_not_connected_when_live(client, monkeypatch):
    monkeypatch.setenv("ATLAS_ACTIONS", "live")
    monkeypatch.delenv("COMPOSIO_LINEAR_ACCOUNT", raising=False)
    monkeypatch.delenv("COMPOSIO_NOTION_ACCOUNT", raising=False)
    out = client.post("/composio/cases/126/defects/file").json()
    assert out["filed"] and out["filed"][0]["status"] == "not_connected"
    assert "connect" in out["filed"][0]["detail"]


def test_broker_reply_check_dry_mode(client, monkeypatch):
    monkeypatch.delenv("ATLAS_ACTIONS", raising=False)
    out = client.post("/composio/cases/138/broker-reply/check").json()
    assert out["status"] == "dry" and "benz16107+broker@gmail.com" in out["detail"]


def test_broker_reply_replay_applies_the_captured_reply_and_reset_undoes_it(client, monkeypatch):
    """The whole booth moment end to end: replay, the case re-scores, /demo/reset puts it back."""
    monkeypatch.delenv("ATLAS_ACTIONS", raising=False)
    from atlas_api.app import get_store

    store: CaseStore = get_store()
    before = [e.kind for e in store.tail("138")]

    out = client.post("/composio/cases/138/broker-reply/check?replay=true").json()
    assert out["path"] == "replay" and out["status"] == "applied"
    assert out["facts"]["premium"] == 92400.0
    assert [e.kind for e in store.tail("138")] == before + ["finding", "assessment"]

    again = client.post("/composio/cases/138/broker-reply/check?replay=true").json()
    assert again["deduped"] and again["after"] == out["after"]
    assert [e.kind for e in store.tail("138")] == before + ["finding", "assessment"]

    client.post("/demo/reset")
    assert not [e for e in store.tail("138") if "broker_reply" in e.refs]
    assert not [o for o in store.outbox_for("138") if o["channel"] == "gmail_poll"]

    third = client.post("/composio/cases/138/broker-reply/check?replay=true").json()
    assert third["status"] == "applied" and not third.get("deduped")   # the moment runs again


def test_broker_reply_replay_on_the_wrong_case_is_409(client):
    resp = client.post("/composio/cases/141/broker-reply/check?replay=true")
    assert resp.status_code == 409 and "138" in resp.json()["detail"]


def test_unknown_case_is_404(client):
    assert client.post("/composio/cases/9999/review/book").status_code == 404
