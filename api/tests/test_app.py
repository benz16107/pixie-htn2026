"""T5 accept tests. See docs/PLAN.md section 2 and docs/sketch/contract.ts."""

import time

import pytest
from fastapi.testclient import TestClient

from atlas_api.app import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    with TestClient(app) as c:  # runs the startup event once, populating the CaseStore
        yield c


def test_health(client):
    assert client.get("/health").json() == {"ok": True}


def test_queue_open_returns_21_rows_under_500ms(client):
    t0 = time.monotonic()
    resp = client.get("/queue?view=open")
    elapsed_ms = (time.monotonic() - t0) * 1000
    assert resp.status_code == 200
    rows = resp.json()
    commercial = [row for row in rows if row["line"] != "tenant"]
    assert len(commercial) == 21
    assert elapsed_ms < 500

    row = rows[0]
    assert set(row) == {"caseId", "insured", "line", "state", "status", "valueAtStake",
                         "score", "decision", "issues", "deepDived", "enrichmentDelta"}
    assert set(row["score"]) == {"lo", "hi"}
    assert row["decision"]["kind"] in {"accept", "refer", "decline", "approve", "open", "routed"}


def test_queue_all_returns_158_rows(client):
    rows = client.get("/queue?view=all").json()
    assert len([row for row in rows if row["line"] != "tenant"]) == 158


def test_queue_decision_variants_match_contract_shape(client):
    rows = client.get("/queue?view=all").json()
    by_kind = {r["decision"]["kind"]: r["decision"] for r in rows}
    assert "routed" in by_kind
    assert set(by_kind["routed"]) == {"kind", "to", "because"}
    assert "open" in by_kind
    assert set(by_kind["open"]) == {"kind", "straddles", "flippers"}
    assert "decline" in by_kind
    assert set(by_kind["decline"]) == {"kind", "because", "by"}


def test_case_138_view(client):
    resp = client.get("/cases/138")
    assert resp.status_code == 200
    view = resp.json()
    assert view["caseId"] == "138"
    assert view["title"] == "Lumen Data Works Inc"
    fact_ids = {f["id"] for f in view["facts"]}
    assert {"tiv", "premium", "business_type", "primary_admin"} <= fact_ids
    tiv_fact = next(f for f in view["facts"] if f["id"] == "tiv")
    assert tiv_fact["display"] == "$2,073,000"
    assert tiv_fact["provenance"] == "known"
    premium_fact = next(f for f in view["facts"] if f["id"] == "premium")
    assert premium_fact["provenance"] == "missing"
    assert premium_fact["resolver"] == "broker"
    assert view["decision"]["kind"] == "open"
    assert view["explanationVerified"] is True


def test_case_not_found_is_404(client):
    assert client.get("/cases/999999").status_code == 404


def test_backtest_route_serves_generated_report(client):
    report = client.get("/backtest")
    assert report.status_code == 200
    assert report.json()["b4"]["factors"][0]["declines"] == 17


def test_cors_allows_web_localhost(client):
    resp = client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert resp.headers.get("access-control-allow-origin") == "http://localhost:3000"
