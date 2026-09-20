# Demo runbook

## Start

From the repository root:

```bash
./start.sh
```

Expected services:

| Service | Port | Check |
| --- | ---: | --- |
| API | 8000 | `curl -fsS http://localhost:8000/health` |
| Web production build | 3100 | `curl -fsS http://localhost:3100/queue` |
| Expo | 8081 | Open the printed Expo Go URL |

Serve the production Next.js build during judging. A development server can introduce cross-origin asset failures when the laptop opens the server-hosted app.

## Before judging

1. Open `/queue`, `/cases/138`, `/guideline`, `/backtest`, and `/intact`.
2. Confirm the product switch moves between the Federato and Intact experiences.
3. On the phone, finish one prepared renter quote and leave the receipt open.
4. Keep replay selected on the live desk unless the judge explicitly wants a live model run.
5. Open the relevant provider console before a Sentry, Elastic, or Backboard pitch.

## Verify

```bash
cd api && SENTRY_DSN_API= uv run pytest -q
cd web && npm run build
cd app && npx tsc --noEmit
```

A physical phone cannot reach `localhost` on the server. Set `EXPO_PUBLIC_API_URL` to the server's reachable HTTP or HTTPS address before starting Expo.

## Recovery

If the commercial model run is slow, stop it and use replay. If Elastic is unavailable, point out the `[memory]` backend label and explain that the same query contract has a local implementation. If the phone loses the API, use the Intact overview to explain the handoff, then show the saved receipt screenshot. If a guideline rehearsal changed the queue, use the reset control before the next judge.

Do not claim a live provider call when the screen shows replay, cache, fixture, or memory.
