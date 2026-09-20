# If it breaks

Work top to bottom. Most of it is one command on macserver:

    ssh macserver
    ~/Code/hackathons/htn-2026/atlas/start.sh

That starts whatever is down, leaves what is up alone, keeps the machine awake, warns if it is on
battery, and prints every URL.

| What you see | What it is | What to do |
|---|---|---|
| A page will not load at all | Tailscale is off, or macserver is asleep | Turn Tailscale on. If still nothing, ssh in and run `start.sh` |
| A page returns 500 | The API restarted under it | Wait ten seconds and reload |
| `macserver:3100` does not resolve | MagicDNS | Use `http://100.95.223.110:3100` |
| The live run stalls | A live model call is hanging | Press **Run the demo** instead. Replay needs no network |
| The queue looks wrong after a judge clicked around | State from the last demo | `curl -X POST http://macserver:8000/demo/reset` |
| Precedent says `[memory]` not `[elastic]` | The cluster is unreachable | Say so out loud. The numbers are the same book, read from a local copy |
| The phone cannot reach anything | Tailscale off on the phone, or Expo Go lost the bundle | Turn Tailscale on, reopen `exp://100.95.223.110:8081` |
| A reply to the digest text does nothing | Linq's webhook is pointed at a dead URL | It should be `https://macserver.tailb51682.ts.net/webhooks/linq`. Fix it in the Linq dashboard |
| Wi-Fi at the venue is dead | The laptop cannot reach macserver | Nothing recovers this. Play the backup video |
| Home power or internet is out | macserver is gone | Backup video. Say plainly that the live system is at home |

## The two sentences that save a bad moment

> "That is the live path and it is not answering right now, so let me show you the recorded run
> instead. It is the same case and the same numbers."

> "I do not know. It is in our own notes as unverified, and I would rather say that than guess."

## What cannot break

The recorded runs, the enrichment layers, the briefings and the precedent fallback are all on disk
on macserver. With the internet down but the tailnet up, the whole demo still plays. Only the live
model runs and the sponsor calls need the outside world.
