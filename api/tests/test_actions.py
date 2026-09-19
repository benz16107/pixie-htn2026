"""T11 + A7: the outbox is idempotent, the broker email carries only the flipper facts, and the
Composio actions built on it (broker-reply watch, calendar hold, Sheets audit, Linear/Notion
tickets, and the guarded agent tools) are each idempotent and dry-run-able without network."""

import asyncio
import time

from atlas_api.actions import (
    FINAL_VERDICTS,
    apply_broker_reply,
    book_referral_review,
    check_broker_reply,
    file_data_quality_ticket,
    log_decision_to_sheet,
    request_broker_info,
)
from atlas_api.case import World
from atlas_api.case_store import CaseStore
from atlas_api.engine import DEFAULT_RULES_DIR, Open, RulesFile, assess
from atlas_api.events import DecisionP, DeskEvent

RULES = RulesFile.load(DEFAULT_RULES_DIR / "property_2025.yaml")

def test_request_broker_info_is_idempotent_and_lists_only_flippers(tmp_path, monkeypatch):
    monkeypatch.delenv("ATLAS_ACTIONS", raising=False)   # dry: composes, sends nothing
    store = CaseStore.open(tmp_path / "o.sqlite")
    case = World.load().case("SUB-138")
    a = assess(case, RULES)

    first = request_broker_info(store, case, a, RULES, "Lumen Data Works Inc")
    assert first["status"] == "dry" and first["facts"] == ["premium"]
    assert "Grace Moreau" in first["body"] and "$50,000-$175,000" in first["body"]
    assert "Pixie" in first["subject"] and "Pixie underwriting desk" in first["body"]
    assert "year built" not in first["body"] and first["to"].endswith("+broker@gmail.com")

    events = [e.kind for e in store.tail("138")]
    assert events == ["action", "action_result"]
    second = request_broker_info(store, case, a, RULES, "Lumen Data Works Inc")
    assert second.get("deduped") and len(store.outbox_for("138")) == 1
    assert [e.kind for e in store.tail("138")] == events   # no new events either


# ---- A7: close the loop on the broker reply -----------------------------------------------------

def test_apply_broker_reply_writes_known_premium_and_narrows_interval(tmp_path):
    store = CaseStore.open(tmp_path / "reply.sqlite")
    case = World.load().case("SUB-138")
    a = assess(case, RULES)
    assert isinstance(a.decision, Open) and "premium" in {f.fact for f in a.decision.flippers}

    out = apply_broker_reply(store, case, a, RULES, "run1", "msg-1", {"premium": "$120,000"})
    assert out["status"] == "applied" and out["facts"]["premium"] == 120000.0
    assert out["before"] != out["after"]   # the interval actually moved

    kinds = [e.kind for e in store.tail("138")]
    assert kinds == ["finding", "assessment"]
    finding = store.tail("138")[0]
    assert finding.payload.fact == "premium" and finding.payload.value == 120000.0
    assert finding.payload.source == "broker email, message msg-1"

    # idempotent: a second poll that finds the same message id is a no-op, even with a different value
    again = apply_broker_reply(store, case, a, RULES, "run1", "msg-1", {"premium": "$999,000"})
    assert again.get("deduped")
    assert [e.kind for e in store.tail("138")] == kinds


def test_apply_broker_reply_with_no_parseable_value_records_no_new_facts(tmp_path):
    store = CaseStore.open(tmp_path / "reply2.sqlite")
    case = World.load().case("SUB-138")
    a = assess(case, RULES)
    out = apply_broker_reply(store, case, a, RULES, "run1", "msg-2", {"premium": ""})
    assert out["status"] == "no_new_facts" and store.tail("138") == []


def test_check_broker_reply_dry_mode_composes_search_only(tmp_path, monkeypatch):
    monkeypatch.delenv("ATLAS_ACTIONS", raising=False)
    store = CaseStore.open(tmp_path / "reply3.sqlite")
    case = World.load().case("SUB-138")
    a = assess(case, RULES)
    request_broker_info(store, case, a, RULES, "Lumen Data Works Inc")   # seeds the outbox with requested facts

    out = asyncio.run(check_broker_reply(store, case, a, RULES))
    assert out["status"] == "dry" and out["facts"] == ["premium"]
    assert "benz16107+broker@gmail.com" in out["detail"] and "submission 138" in out["detail"]


def test_check_broker_reply_live_applies_a_verified_extraction(tmp_path, monkeypatch):
    monkeypatch.delenv("ATLAS_ACTIONS", raising=False)   # dry while seeding the outbox: no real send
    store = CaseStore.open(tmp_path / "reply4.sqlite")
    case = World.load().case("SUB-138")
    a = assess(case, RULES)
    request_broker_info(store, case, a, RULES, "Lumen Data Works Inc")

    monkeypatch.setenv("ATLAS_ACTIONS", "live")
    monkeypatch.setenv("COMPOSIO_GMAIL_ACCOUNT", "ca_test")
    monkeypatch.setattr("atlas_api.actions.search_broker_replies",
                        lambda case_no, max_results=5: [{"messageId": "m-9", "threadId": "t-9",
                                                          "messageText": "The premium is $88,000 flat."}])

    async def fake_extract(message_text, facts):
        return [{"fact": "premium", "value": "$88,000", "quote": "$88,000"}]

    monkeypatch.setattr("atlas_api.actions.extract_broker_facts", fake_extract)

    out = asyncio.run(check_broker_reply(store, case, a, RULES))
    assert out["status"] == "applied" and out["facts"]["premium"] == 88000.0
    assert out["messageId"] == "m-9"


# ---- A7: book the referral review ---------------------------------------------------------------

def test_book_referral_review_is_idempotent_dry(tmp_path, monkeypatch):
    monkeypatch.delenv("ATLAS_ACTIONS", raising=False)
    store = CaseStore.open(tmp_path / "cal.sqlite")
    case = World.load().case("SUB-138")

    first = book_referral_review(store, case, "Refer: needs a second look.", "Lumen Data Works Inc")
    assert first["status"] == "dry" and "SUB-138" in first["summary"]
    second = book_referral_review(store, case, "Refer: needs a second look.", "Lumen Data Works Inc")
    assert second.get("deduped") and len(store.outbox_for("138")) == 1


def test_book_referral_review_live_stores_event_id_on_the_case(tmp_path, monkeypatch):
    monkeypatch.setenv("ATLAS_ACTIONS", "live")
    monkeypatch.setenv("COMPOSIO_GOOGLECALENDAR_ACCOUNT", "ca_cal")
    monkeypatch.setattr("atlas_api.actions.composio_execute",
                        lambda tool, toolkit, arguments: {"successful": True, "data": {"id": "evt-1"}})
    store = CaseStore.open(tmp_path / "cal2.sqlite")
    case = World.load().case("SUB-138")
    store.put_case("138", {"queue": {}, "case": {"title": "Lumen Data Works Inc"}})

    out = book_referral_review(store, case, "Refer: needs a second look.", "Lumen Data Works Inc")
    assert out["status"] == "sent" and out["eventId"] == "evt-1"
    assert store.get_case("138")["case"]["referralReview"] == {"eventId": "evt-1", "status": "sent"}


# ---- A7: decision audit trail in Sheets ----------------------------------------------------------

def _decision_event(case_id: str, verdict: str) -> DeskEvent:
    e = DeskEvent.make(case_id, "run1", "lead", DecisionP(
        text="d", verdict=verdict, explanation="x", verified=True), t0=time.time() - 2)
    return e


def test_log_decision_to_sheet_is_idempotent_per_decision_event(tmp_path, monkeypatch):
    monkeypatch.delenv("ATLAS_ACTIONS", raising=False)
    store = CaseStore.open(tmp_path / "sheet.sqlite")
    case = World.load().case("SUB-138")
    dec_event = _decision_event("138", "refer_with_subjectivity")
    store.append(dec_event)

    first = log_decision_to_sheet(store, case, dec_event, "Lumen Data Works Inc", (54.0, 79.0), ["premium"])
    assert first["status"] == "dry" and first["row"][2] == "refer_with_subjectivity"
    second = log_decision_to_sheet(store, case, dec_event, "Lumen Data Works Inc", (54.0, 79.0), ["premium"])
    assert second.get("deduped") and len(store.outbox_for("138")) == 1


def test_final_verdicts_are_the_three_human_facing_outcomes():
    assert FINAL_VERDICTS == {"accept_with_subjectivity", "decline", "refer_with_subjectivity"}


# ---- A7: data-quality defect tickets -------------------------------------------------------------

def test_file_data_quality_ticket_one_per_issue_kind_and_reports_what_to_connect(tmp_path, monkeypatch):
    monkeypatch.setenv("ATLAS_ACTIONS", "live")   # neither Linear nor Notion is connected in this env
    store = CaseStore.open(tmp_path / "ticket.sqlite")
    case = World.load().case("SUB-134")   # has a limit_vs_tiv issue (case.py's own fixture assertion)
    issue = next(i for i in case.issues if i.kind == "limit_vs_tiv")

    out = file_data_quality_ticket(store, case, issue, "Some Insured Inc")
    assert out["status"] == "not_connected" and "connect" in out["detail"]
    again = file_data_quality_ticket(store, case, issue, "Some Insured Inc")
    assert again.get("deduped")


def test_file_data_quality_ticket_live_via_linear(tmp_path, monkeypatch):
    monkeypatch.setenv("ATLAS_ACTIONS", "live")
    monkeypatch.setenv("COMPOSIO_LINEAR_ACCOUNT", "ca_linear")
    monkeypatch.setenv("COMPOSIO_LINEAR_TEAM_ID", "team-1")
    monkeypatch.setattr("atlas_api.actions.composio_execute",
                        lambda tool, toolkit, arguments: {"successful": True,
                                                           "data": {"issue": {"url": "https://linear.app/x/1"}}})
    store = CaseStore.open(tmp_path / "ticket2.sqlite")
    case = World.load().case("SUB-134")
    issue = next(i for i in case.issues if i.kind == "limit_vs_tiv")

    out = file_data_quality_ticket(store, case, issue, "Some Insured Inc")
    assert out["status"] == "sent" and out["url"] == "https://linear.app/x/1"

