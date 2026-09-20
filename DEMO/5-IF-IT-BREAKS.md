# Recovery during rehearsal or judging

## First response at the table

"That provider is not answering, so I will show the captured result and explain which steps still run locally."

Switch within ten seconds. Use the next row's fallback, then continue the pitch. Do not debug credentials in front of a judge.

| Failure | Recovery | What to say |
|---|---|---|
| Live agent run errors or stalls | Stop it, select **Case run**, then `e` to finish the recording | "This is the recorded run; it makes no new model calls." |
| Guideline fails to load | Click **retry**. If still unavailable, show the filed rule and recorded diff | "The editable rule API is unavailable." |
| Queue/case API unavailable | Retry the error page or open `/live` for the labelled bundled recording | "This is a bundled sample, not the current book." |
| Action says dry/not connected/failed | Show the status; use the captured broker reply if relevant | "The connector did not send a message." |
| Elastic badge says memory | Continue with local precedent and show implementation evidence | "These are the same book records through the local fallback, not a live cluster query." |
| Backboard returns no citation | Show provider memory or the typed judgement already captured | "Document upload succeeded, but citation retrieval is still unreliable." |
| Gemini fails on a new photo/address | Use the exact previously warmed input or the manual quote questions | "New inputs need a working model; we are not fabricating a response." |
| Map background blank | Use case/receipt numbers and the table | "The risk data is cached; the base-map tiles need the network." |
| Expo cannot reach API | Check phone Tailscale and EXPO_PUBLIC_API_URL, reopen Expo Go | "The app is connected to the same server as the desk." Only say this once verified. |
| Laptop cannot reach macserver | Check Tailscale; use `http://100.95.223.110:3100`. Otherwise play the local video | "The server is at home; this is the recording." |
| Linq reply does nothing | Use the prepared phone thread and recorded send result | "The inbound path depends on the current public webhook URL." |

## On macserver before judging

```sh
ssh macserver
cd ~/Code/hackathons/htn-2026/atlas
./start.sh
```

`start.sh` starts missing services. It does not restart already-running processes or deploy edited code. It now prefers the working Node 22 installation and adds `~/.local/bin` for uv. Do not use `next dev` for the Tailscale demo.

Read health without sending anything:

```sh
curl -fsS http://localhost:8000/health
curl -fsS http://localhost:8000/composio/status
curl -fsS http://localhost:8000/openai/runtime
```

Logs: `/tmp/pixie-api.log`, `/tmp/pixie-web.log`, `/tmp/pixie-build.log`, `/tmp/pixie-expo.log`. Check listeners with `lsof -nP -iTCP:8000 -iTCP:3100 -iTCP:8081 -sTCP:LISTEN`. Restart only the process you intend to replace, never every Node or Python process on the machine.

After editing web code, rebuild and restart its production server:

```sh
export PATH="$HOME/.nvm/versions/node/v22.22.3/bin:$HOME/.local/bin:$PATH"
cd ~/Code/hackathons/htn-2026/atlas/web
npm run build
npm run start -- --hostname 0.0.0.0 --port 3100
```

The last command requires the old listener to have stopped. For the API, use `uv run uvicorn atlas_api.app:app --host 0.0.0.0 --port 8000` from `api/`. API changes also need a restart. `ATLAS_API_URL` can point a web server at a separate backend for isolated testing; browsers keep using the same-origin proxy.

Linq's webhook and receipt media must use the actual `PUBLIC_URL` in the current environment. Do not assume an old Cloudflare or Tailscale URL still works. `scripts/retunnel.py` changes tunnel configuration; use it deliberately during setup, not as the first response to every failure.

## Reset scope

**reset demo** restores the filed rule and clears demo case actions, replies and overrides. **reset this case** affects only the chosen case and preserves the active guideline. Neither resets provider history or cancels an already-running agent task. Resetting also clears local action deduplication, so a subsequent send can produce another real message.

The cache lives on macserver. It reduces dependence on outside providers; it does not make the laptop independent of macserver. Keep a local recording.
