"""T11 + A7: the outbox is idempotent, the broker email carries only the flipper facts, and the
Composio actions built on it (broker-reply watch, calendar hold, Sheets audit, Linear/Notion
tickets, and the guarded agent tools) are each idempotent and dry-run-able without network."""

import asyncio

from atlas_api.actions import apply_broker_reply, check_broker_reply, request_broker_info
from atlas_api.case import World
from atlas_api.case_store import CaseStore
from atlas_api.engine import DEFAULT_RULES_DIR, Open, RulesFile, assess

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

