# Demo-day runbook

Everything Ben needs to bring Pixie up, keep it up, and recover in front of a judge.
Written 2026-09-19 against what is actually running on this laptop. Ports and URLs verified.

## 1. What has to be running

| Piece | Port | Start it | Check |
|---|---|---|---|
| API (FastAPI) | 8000 | `cd api && uv run uvicorn atlas_api.app:app --host 0.0.0.0 --port 8000` | `curl -s localhost:8000/health` |
| Web (Next, production build) | 3100 | `cd web && npm run build && npm run start -- --port 3100` | open `localhost:3100/queue` |
| Phone app (Expo) | 8081 | `cd app && npx expo start --lan --port 8081` | Expo Go on Ben's phone |
| Public tunnel (Linq webhooks) | — | `cloudflared tunnel --url http://localhost:8000` | `curl -s $PUBLIC_URL/health` |

Order matters only in one place: start the API before the web build's first page load, or the
server-rendered pages come back empty.

If a port is stuck, `lsof -ti tcp:<port> | xargs kill -9`. `pkill -f "next start"` does not match
the process; use the lsof form.

The tunnel URL changes every time cloudflared restarts. `python3 scripts/retunnel.py` starts a new
one and repoints `.env`, `app/.env` and the Sentry uptime monitor; repointing the Linq webhook in
Linq's own dashboard is the one manual step. Without it, inbound iMessage replies go nowhere.

**This network does not resolve `trycloudflare.com` hostnames.** A local `curl` to the tunnel fails
with "could not resolve host" while the tunnel is perfectly healthy for the outside world. Check it
the way the script does: `dig +short <host> @1.1.1.1`, then `curl --resolve <host>:443:<ip>`. For the
same reason the phone app points at the laptop's LAN address (`app/.env`), not the tunnel; swap in
the commented tunnel line only if the phone is on cellular.

## 2. The five minutes

1. `/live`, press **Run the demo**. Replay is the default: it plays a recorded run of case 138 with
   no model calls, so nothing can stall. **Run live** does the real thing (about 60 s, $0.07).
2. `/cases/138`: the score waterfall, then the **Decision space** tab for the same decision in 3D
   (drag the premium slider and the case walks across the accept boundary), then the Challenger.
   **Read this case** plays the briefing in Ben's voice and the screen highlights what is being said.
3. The phone for the renter quote.
4. `/backtest` for the honest numbers, including what enrichment did and did not change.

Case 138 is the case to open. It is the only one whose decision space has shape: the others fail on
state or loss history, which no number can move, so their terrain is a flat plate under the decline
line. Say that rather than clicking into it and hoping.

Speed control is 1x / 2x / 4x in the top bar. Keys 1-6 jump between sections. Space runs the sweep.

## 3. When something breaks

| Symptom | Do this |
|---|---|
| A page 500s | The API restarted. Wait 10 s and reload; the proxy answers 503 with a reason while it boots. |
| The live run stalls | Switch to **Run the demo** (replay). Every recorded run is in SQLite and needs no network. |
| Wi-Fi dies | Everything except the sponsor calls runs locally. Enrichment reads from `cache/layers` (350 files), briefings from `var/briefings`, precedent falls back to in-memory when Elastic is unreachable. |
| The desk state looks wrong | `curl -X POST localhost:8000/demo/reset` puts the queue back to its opening state. |
| Expo Go cannot connect | Phone and laptop must share Wi-Fi. Restart with `EXPO_TOKEN=... npx expo start --lan`. |
| Elastic is down | `backend: "memory"` appears on the precedent and insights panels. Say so; the numbers are the same book. |

## 4. Answers to the questions that will come

- **"Are these real prices?"** No. The renter receipt says illustrative on its face, and
  `packs/toronto/PRICING.md` documents every constant. It is a documented model, not an Intact quote.
- **"Is this real data?"** It is Federato's own synthetic snapshot, which is what the challenge
  ships. The Toronto layers are real open data from the City of Toronto and Toronto Police.
- **"Did the model make up these numbers?"** No number in the product comes from a model. Every
  value carries its provenance, and `verify_numbers` string-checks each model sentence against the
  tool-computed facts before it is shown. Point at the ✓ next to the explanation.
- **"Lakeside Medical Group Group?"** That duplicate word is in Federato's own `Insured.json`. We
  print what they sent.
- **"What does enrichment actually change?"** It moved all 38 intervals and reranked 5 of 6 open
  cases, and changed 0 decision tiers, because the declines are structural hard fails that outside
  data cannot move. That is in `/backtest`, pre-registered before the first run.

## 5. Before judging

- [ ] `cd api && SENTRY_DSN_API= uv run pytest -q` green
- [ ] `cd web && npm run build` green, then serve the production build, not `next dev`
- [ ] `curl -X POST localhost:8000/demo/reset`
- [ ] Warm the briefings: hit `/cases/{id}/briefing` for 138, 126, 141, 134, 133, 143 and the
      Toronto case once each (they cache to disk). Changing `ELEVENLABS_VOICE_ID` invalidates them.
- [ ] Check the tunnel: `PUBLIC_URL` in `.env`, `EXPO_PUBLIC_API_URL` in `app/.env`, and the Sentry
      uptime monitor all point at the cloudflared URL. If cloudflared restarted, all three are stale.
- [ ] Phone on the same Wi-Fi, Expo Go open, screen brightness up
- [ ] Backup video recorded and on the laptop, not in the cloud
