"""`atlas` console script. `uv run atlas triage` prints all 158 submissions ranked, with their
interval, decision, and a 2-line reason -- the M1 milestone deliverable (PLAN.md section 1)."""

from __future__ import annotations

import sys

from .case import Estimated, Known, World
from .engine import DEFAULT_RULES_DIR, Decided, Open, RulesFile, assess


def _value_at_stake(case) -> float:
    if isinstance(case.tiv, Known):
        return case.tiv.v
    if isinstance(case.tiv, Estimated):
        return case.tiv.hi
    return 0.0


def _reason_lines(a) -> tuple[str, str]:
    d = a.decision
    if isinstance(d, Decided):
        why = ", ".join(d.because) if d.because else "guideline math"
        return f"{d.kind.capitalize()}: {why}.", f"  score {a.score.lo:.0f}-{a.score.hi:.0f}"
    if isinstance(d, Open):
        flips = ", ".join(f"{f.fact} ({f.resolver})" for f in d.flippers) or "no single flipper"
        return (f"Open, straddles {d.straddles:.0f} (score {a.score.lo:.0f}-{a.score.hi:.0f}).",
                f"  flippers: {flips}")
    return f"Routed to {d.to}.", f"  {d.because}"


def triage() -> None:
    rules = RulesFile.load(DEFAULT_RULES_DIR / "property_2025.yaml")
    world = World.load()

    rows = []
    for sub in world.submissions.values():
        case = world.case(f"SUB-{sub['id']}")
        a = assess(case, rules)
        insured = world.insureds.get(sub["insured"], {})
        state = case.primary_admin.v if isinstance(case.primary_admin, Known) else "?"
        rows.append({
            "id": sub["id"], "insured": insured.get("name", "?"), "line": sub["line_of_business"],
            "state": state, "case": case, "a": a,
        })

    rows.sort(key=lambda r: (-r["a"].score.mid, -_value_at_stake(r["case"])))

    print(f"{'#':>3}  {'case':<8}{'insured':<30}{'line':<10}{'st':<4}{'interval':<12}decision")
    for rank, r in enumerate(rows, start=1):
        a = r["a"]
        interval = f"[{a.score.lo:>3.0f}-{a.score.hi:>3.0f}]"
        kind = (a.decision.kind if isinstance(a.decision, Decided)
                else "open" if isinstance(a.decision, Open) else "routed")
        line1, line2 = _reason_lines(a)
        insured_name = (r["insured"][:26] + "..") if len(r["insured"]) > 28 else r["insured"]
        print(f"{rank:>3}  SUB-{r['id']:<4}{insured_name:<30}{r['line']:<10}{r['state']:<4}{interval:<12}{kind}")
        print(f"     {line1}")
        print(f"{line2}")

    print(f"\n{len(rows)} submissions triaged.")


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == "triage":
        triage()
    else:
        print("usage: atlas triage", file=sys.stderr)
        raise SystemExit(2)


if __name__ == "__main__":
    main()
