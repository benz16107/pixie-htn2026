#!/usr/bin/env python3
"""Exercise the Backboard integration against the live API and print what each call did.

    cd api && uv run python ../scripts/backboard_check.py          # needs BACKBOARD_API_KEY in .env

Not a pytest: the suite stays network-free. This is the reproducible evidence behind every claim in
docs/BACKBOARD.md -- run it and paste the output. It writes one memory line for a fake case
("case CHECK"), reads it back, asks for a guideline paragraph and runs one System One judgement, and
reports plainly when a call is refused (no credits, unknown model) instead of pretending it passed.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api" / "src"))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / ".env")

from atlas_api import memory  # noqa: E402

MEMO = memory.CaseMemo(case_id="CHECK", insured="Lakeside Medical", broker="Apex Brokers",
                       state="TX", business="new", issues=("duplicate_account",))

MESSAGE = ("Hi - following up on the Lakeside Medical building in Houston. Can you confirm the "
           "sprinkler upgrade is on file? We also sent this risk through Apex last week.")


async def main() -> int:
    print(f"BACKBOARD_API_KEY set: {bool(memory.enabled())}  (offline={memory.offline()})")
    if not memory.enabled():
        print("nothing to check; see docs/BACKBOARD.md")
        return 1

    client = memory._client()
    aid = await memory.assistant_id(client)
    print(f"\n0. assistant: {aid}")
    try:
        print("   memory stats:", await client.get_memory_stats(aid))
    except Exception as exc:
        print("   memory stats unavailable:", type(exc).__name__, exc)
    await memory._close(client)

    print(f"\n1. remember(): {MEMO.line()}")
    print("   stored:", await memory.remember(MEMO))

    print("\n2. recall() + guideline citation")
    rec = await memory.recall(MEMO, cite_guideline=True)
    print("   source:", rec.source, "|", rec.detail or "-")
    for line in rec.lines:
        print("   -", line)
    print("   guideline:", (rec.guideline[:300] + "...") if rec.guideline else "(none returned)")

    print("\n3. System One typed judgement over an inbound broker message")
    judgements, detail = await memory.judge(
        {"case_id": "CHECK", "channel": "email", "message": MESSAGE,
         "facts_the_desk_is_missing": ["premium", "year_built"]},
        memory.broker_questions(["premium", "year_built"]))
    print("   model/detail:", detail)
    for j in judgements:
        print(f"   - {j.question}: {j.answer}  p={j.probability} confidence={j.confidence}")
    if not judgements:
        print("   no typed answers came back; the line above is the reason, verbatim from the API")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
