"""AUDIT 3.1: the waterfall must reconcile with the engine, and what-if must stay pure and fast."""

import time

import pytest

from atlas_api.case import Known, World
from atlas_api.engine import DEFAULT_RULES_DIR, RulesFile, assess, estimate_premium
from atlas_api.explain import (explain_payload, reconciles, sensitivity, tenant_waterfall,
                               toronto_percentiles, waterfall, whatif)
from atlas_api.layers import LayersPack

RULES = RulesFile.load(DEFAULT_RULES_DIR / "property_2025.yaml")


@pytest.fixture(scope="module")
def world() -> World:
    return World.load()


@pytest.mark.parametrize("case_id", ["138", "126", "143", "133", "134"])
def test_waterfall_sums_exactly_to_the_interval(world, case_id):
    case = world.case(f"SUB-{case_id}")
    hazard = {"1:fema_flood": 1.15, "1:usgs_earthquakes": 1.03}
    a = assess(case, RULES, LayersPack(hazard))
    steps = waterfall(case, a, RULES, _hazard_events(case_id, hazard))
    assert reconciles(steps, a)
    assert abs(sum(s.points_lo for s in steps) - a.score.lo) < 1e-6
    assert abs(steps[-1].running_hi - a.score.hi) < 1e-6
    assert any(s.kind == "factor" and s.rule for s in steps)


def _hazard_events(case_id, multipliers):
    import time as _t

    from atlas_api.events import DeskEvent, FindingP
    return [DeskEvent.make(case_id, "t", "hazard",
                            FindingP(text=f"flood: x{m}", fact=f"hazard.{k}", multiplier=m, provenance="external",
                                     score_delta=0.0, source="test", layer=k.split(":")[1]), t0=_t.time())
            for k, m in multipliers.items()]


def test_cap_step_is_explicit_and_labelled(world):
    case = world.case("SUB-143")          # WA: a known hard fail, so the cap bites on both ends
    a = assess(case, RULES)
    steps = waterfall(case, a, RULES)
    caps = [s for s in steps if s.kind == "cap"]
    assert caps and all(s.capped for s in caps)
    assert "hard-fail" in caps[0].rule and reconciles(steps, a)


def test_whatif_is_pure_and_fast(world):
    case = world.case("SUB-138")
    before = assess(case, RULES).decision
    t0 = time.perf_counter()
    out = whatif(case, RULES, {"premium": 80_000, "sprinklered": True})
    elapsed_ms = (time.perf_counter() - t0) * 1000
    assert elapsed_ms < 50
    assert out["after"]["decision"]["kind"] == "accept" and out["decisiveOverride"] == "premium"
    premium_change = next(c for c in out["changed"] if c["fact"] == "premium")
    assert premium_change["after"] == ["target"] and "not_acceptable" in premium_change["before"]
    assert any("sprinklered" in n for n in out["notes"])
    assert assess(case, RULES).decision == before        # the case itself is untouched


def test_sensitivity_names_the_flip_point(world):
    case = world.case("SUB-138")
    out = sensitivity(case, RULES)
    premium = next(r for r in out["facts"] if r["fact"] == "premium")
    assert premium["movesDecision"] and premium["flip"]["at"] == 50_000
    assert "premium at or above $50,000 flips" in premium["flip"]["text"]
    assert out["facts"][0]["spread"] >= out["facts"][-1]["spread"]     # ranked by how much it moves



def test_tenant_waterfall_reconciles_with_the_receipt():
    view = {"caseId": "TQ-test", "decision": {"kind": "approve"},
            "facts": [{"id": "hex", "display": "892b986cb0bffff"}],
            "receipt": {"base": 100.0, "annual": 115.5, "label": "Illustrative.",
                        "lines": [{"label": "Break-ins near you", "multiplier": 1.05, "dollars": 5.0,
                                   "capped": False, "source": "TPS"},
                                  {"label": "Sewer backup add-on", "dollars": 10.5, "capped": False,
                                   "source": "answer"}]}}
    out = tenant_waterfall(view, {})
    assert out["reconciles"] and out["steps"][-1]["runningDollars"] == 115.5
    assert out["steps"][0]["kind"] == "base" and out["steps"][2]["kind"] == "flat"


def test_toronto_percentiles_read_the_pack():
    import json
    from pathlib import Path
    scores_path = Path(__file__).resolve().parents[2] / "packs" / "toronto" / "hex_scores.json"
    scores = json.loads(scores_path.read_text())
    cell = next(iter(scores["cells"]))
    out = toronto_percentiles(cell, scores)
    assert 0 <= out["break-ins_near_you"]["percentile"] <= 100
    assert "percentile for break-ins" in out["break-ins_near_you"]["text"]
    assert toronto_percentiles("not-a-cell", scores) == {}
