from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from packs.toronto.layers import TorontoPack  # noqa: E402


def test_three_demo_addresses_have_different_factors() -> None:
    pack = TorontoPack()
    city_hall = pack.profile_point(43.6503, -79.3869, unit_level="upper")
    ossington = pack.profile_point(43.6434853, -79.4228957, unit_level="upper")
    basement = pack.profile_point(43.6903801, -79.4594893, unit_level="basement")

    signatures = {
        (p.break_ins_multiplier, p.fire_multiplier, p.water_multiplier) for p in (city_hall, ossington, basement)
    }
    assert len(signatures) == 3
    assert basement.basement_flooding_study_area
    assert basement.water_multiplier == 1.10


def test_pack_caps_and_single_event_credibility() -> None:
    pack = TorontoPack()
    rows = pack.cells.values()
    assert all(0.92 <= row["break_ins_multiplier"] <= 1.10 for row in rows)
    assert all(1.00 <= row["fire_multiplier"] <= 1.05 for row in rows)
    assert all(0.85 <= row["total_multiplier"] <= 1.25 for row in rows)
    assert all(row["break_ins_multiplier"] <= 1.03 for row in rows if row["event_count"] == 1)


def test_map_rings_are_closed_lat_lng() -> None:
    hexes = TorontoPack().map_hexes(43.6503, -79.3869, 1)
    assert hexes
    assert all(item["ring"][0] == item["ring"][-1] for item in hexes)
    assert all(-90 <= lat <= 90 and -180 <= lng <= 180 for item in hexes for lat, lng in item["ring"])
