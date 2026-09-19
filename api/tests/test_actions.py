"""T11: the outbox is idempotent and the broker email carries only the flipper facts."""

from atlas_api.actions import request_broker_info
from atlas_api.case import World
from atlas_api.case_store import CaseStore
from atlas_api.engine import DEFAULT_RULES_DIR, RulesFile, assess

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
