# API fixtures

Fixtures keep the demo reproducible and are never presented as live provider responses.

- eval/desk_run.json contains the recorded desk events, model call counts, cost, and elapsed time used by replay.
- eval/backtest.json contains the deterministic backtest output.
- Case and quote fixtures support tests and explicit local fallback states.

The interface labels replay, fixture, cache, memory, and live paths. Add the same label to any new fixture-backed feature.
