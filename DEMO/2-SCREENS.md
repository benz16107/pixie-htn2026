# Every screen, and how to drive it

All on `http://macserver:3100`. Laptop needs Tailscale on.

## /live — the desk working

The demo centrepiece. Press **Run the demo** and talk over it.

| Control | What it does |
|---|---|
| Run the demo | Replays a recorded run of case 138. No model calls, cannot stall |
| Run live | Actually runs the agents. About 60 s and $0.07. Only if a judge asks |
| 1× 2× 4× | Replay speed |
| Sweep / Focus | Sweep triages the whole queue at once; Focus walks one case |
| Keys 1-6 | Jump between sections: queue, case run, actions, backtest, Toronto, close |
| Space | Runs the sweep |
| Record this | Starts a Sentry session replay on demand. For the Sentry judges |
| Desk / Renter | Switches the right-hand panel between the commercial desk and the Toronto renter |

The phone panel on the right mirrors the iMessage thread and uses the same API as your actual phone.

## /cases/138 — one case, fully explained

The case to open. It is the only one whose decision space has shape; the others fail on state or
loss history, which no number can move, so their terrain is a flat plate. Say that rather than
clicking into one and hoping.

| Part | What to do |
|---|---|
| Score waterfall | Read left to right. Hover a bar for its rule text and source |
| Waterfall / Decision space tabs | The second is the same decision in 3D. Drag to orbit, arrow keys work too |
| Premium slider | Drag it. The decision changes live, and the flip marker shows where |
| Read this case | Plays the briefing in your cloned voice; the screen rings whatever is being said |
| Script | Lists every sentence with timecodes. Click one to jump. Works with the sound off |
| The case against | The Challenger's argument, its risks, and what would change its mind |
| We wrote N like this | Elastic precedent. The `[elastic]` badge says it came from the index, not memory |
| Folds at the bottom | Facts, factor bands, agent lanes, site and portfolio. They open full width |

## /guideline — the carrier's appetite, editable

The answer to "can it follow our strategy?" Open it, press a scenario, watch the book re-score in
about 60 ms, and read the diff: how many cases changed, which declines became open, how much value
moved into the queue, and which factor moved each one.

| Scenario | What actually happens |
|---|---|
| Open Washington | #143 Aperture Cloud goes decline → open, $26.3M into the queue, rank 4 → 2 |
| Open Texas | **Nothing changes.** 7 cases re-band on state, no decision moves: every Texas case also breaks the loss rule. Press this one for a sceptical judge |
| Tolerate losses to $1.5M | 20 cases re-band, one decline becomes open ($13.4M) |
| Premium floor to $75K | The book's only accept becomes a decline: #81, $18.5M, on a $58,800 premium |
| Soften the hard-fail cap to 50 | 27 declines become open, $1.34B back in the queue |

Press **Reset** (or `POST /demo/reset`) to put the original guideline back. A bad edit is refused
with the reason: setting decline above accept answers "the decline threshold must sit below the
accept threshold; otherwise no case can be open."

## /queue — all 22 submissions

Ranked by score midpoint, open first. Each row says what it is waiting on, how many risks the
Challenger raised, and where the desk overruled the rules ("decline, desk: refer with subjectivity").
16 of the 22 carry a real data defect from Federato's own data. Below the table, "what the book
teaches" is an Elastic significant-terms panel over the declined book.

## /backtest — the honest numbers

Pre-registered before the first run; the commit hash is printed on the page. B4 is the headline, B3
is the one to volunteer before a judge finds it.

## /ask — plain English to a Federato query

Click a cached question. You see what Intake tried, the lint pass, any retry, and the rows. The
three cached questions are the safe path; a fresh question is a live model call.

## /map — the book of business

Hexes are concentration by TIV, pins are submissions. Filter by peril.

## The phone

Address → 3 questions → price. Then: photograph a room and Gemini returns an item list; "what's
around you" names the nearest fire hall and the rail corridor with Google Maps citations; the
receipt shares as a PDF; the quote reads itself aloud.
