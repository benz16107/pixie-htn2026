"""A7: the Composio HTTP surface (composio_routes.py) -- dry by default, idempotent, never touches
the network in tests. `client` mirrors test_app.py's own fixture (fresh tmp DB, one startup). The
project's own .env sets ATLAS_ACTIONS=live (gmail really is connected), so every test that wants
dry behaviour forces it, exactly like test_actions.py and test_app.py already do."""

import os

import pytest
from fastapi.testclient import TestClient

from atlas_api.app import app


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


def test_broker_reply_check_dry_mode(client, monkeypatch):
    monkeypatch.delenv("ATLAS_ACTIONS", raising=False)
    out = client.post("/composio/cases/138/broker-reply/check").json()
    assert out["status"] == "dry" and "benz16107+broker@gmail.com" in out["detail"]


def test_unknown_case_is_404(client):
    assert client.post("/composio/cases/9999/broker-reply/check").status_code == 404
