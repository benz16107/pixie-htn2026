# Start here

Everything for demo day is in this folder. Five files, read in order. The deeper write-ups live in
`../docs/`, but you do not need them at a booth.

## What Pixie is, in two sentences

A commercial property submission arrives. A deterministic engine scores it into a range, six agents
decide what to look up and argue the case, and every number on screen carries where it came from.
The same engine, pointed at a different rules file and a Toronto data pack, prices a renter policy
on a phone, and anything it should not auto-price lands in the same underwriter's queue.

## Where it runs

Everything runs on **macserver at home**. Your laptop and phone reach it over Tailscale. Nothing
moves, nothing needs reconfiguring when you join the venue's Wi-Fi.

| Device | Turn on | Open |
|---|---|---|
| Laptop | Tailscale | `http://macserver:3100/live` (or `http://100.95.223.110:3100/live`) |
| Phone | Tailscale | Expo Go → `exp://100.95.223.110:8081` |

If a page does not load, ssh into macserver and run:

    ~/Code/hackathons/htn-2026/atlas/start.sh

It starts whatever is down and prints every URL. Then see `5-IF-IT-BREAKS.md`.

## Before the first judge

- [ ] Tailscale on, on both the laptop and the phone
- [ ] `curl -X POST http://macserver:8000/demo/reset` (puts the queue back to its opening state)
- [ ] Open the four tabs: `/live`, `/cases/138`, `/queue`, `/backtest`
- [ ] Phone unlocked, Expo Go open, brightness up
- [ ] Backup video on the laptop, not in the cloud

## The five-minute demo

Three screens. Do not show more unless asked.

**1. `/live` — press "Run the demo."** (about a minute)
> "A $2.1 million property submission from Florida. Watch what the desk had to find out."

It replays a real recorded run, so nothing can stall. Point at the agents as they work, and at the
cost meter: 15 model calls, about seven cents.

**2. `/cases/138` — why.**
> "Every bar is one rule from the guideline, and hovering gives you the rule text and the source."

Then drag the premium slider:
> "Below fifty thousand we decline. Between fifty and a hundred and seventy-five thousand we can
> write it. Above that we decline again, because it is priced outside the band."

Then the panel on the right:
> "This is the Challenger. It argues against our own decision, and the lead has to answer it before
> the decision is final."

**3. The phone — the other half.**
> "Same engine, different rules file. A renter gets a price with a reason for every dollar, four
> lines that sum to two hundred and fourteen dollars eighty a year. If it is a risk we should not
> auto-price, it lands in that same underwriter's queue."

**Close with the line that matters:**
> "No number on any screen came from a model. Every one carries where it came from, and a guard
> checks each sentence against the computed facts before you see it. On its first live run that
> guard caught our own lead agent quoting a thirty-five million dollar figure no tool had produced."

## If you only remember one thing

The claim is not "our score is right". The claim is **"you can see exactly why, and check it"**.
