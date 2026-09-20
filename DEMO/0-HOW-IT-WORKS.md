# How it actually works

Plain English, no code. Read this once and you can answer almost anything.

---

## 1. The score: where the number comes from

There is **no machine learning in the score**. It is arithmetic over a rules file you can open and
read: `rules/property_2025.yaml`. That file is a transcription of Federato's own 2025 appetite
guidelines.

### Step 1: eight facts, each put in a band

Every submission is judged on eight facts. For each one, the guideline says which values are
**target**, which are **acceptable**, and everything else is **not acceptable**.

| Fact | Target | Acceptable | Everything else |
|---|---|---|---|
| Line of business | — | property | routed to another desk |
| Submission type | — | new business | renewal |
| Primary state | OH PA MD CO CA FL | those plus NC SC GA VA UT | not acceptable |
| Total insured value | $50M to $100M | up to $150M | over $150M |
| Premium | $75K to $100K | $50K to $175K | outside that |
| Year built | after 2010 | after 1990 | 1990 or earlier |
| Construction | — | over half the value in masonry, non-combustible or steel | else |
| Losses, last 5 years | — | under $100,000 | $100,000 or more |

Bands score **target = 2 points, acceptable = 1, not acceptable = 0**, and the total is expressed
out of 100.

Only four of the eight facts have a target band at all (state, insured value, premium, year built).
The other four can at best be acceptable. So the maximum is 12 points, not 16, and one point is
8.33 on the 100 scale.

Case 138 scores: line acceptable (8.33), new business (8.33), Florida is target (16.67), insured
value acceptable (8.33), premium not acceptable (0), built 2023 is target (16.67), masonry
non-combustible (8.33), no losses (8.33). That is 9 of 12, so **75**.

### Step 2: a range, not a number, because some facts are unknown

This is the part that makes Pixie different. A submission usually arrives with holes. Case 138 has
no premium on file.

Most systems treat a blank as a zero, or guess. We do neither. **An unknown fact scores every band
it could possibly be in at once**, which produces a low end and a high end. That is why the case
shows a range rather than a single number: the low end is the score if the unknowns turn out badly,
the high end if they turn out well.

So the interval width is literally "how much we do not know yet".

### Step 3: the hard-fail cap

Some facts are disqualifying on their own: wrong state, too old, too much loss history. If one of
those is **known** to be not acceptable, the whole score is capped at 30, both ends. The case is
dead regardless of everything else.

If that fact is only estimated or missing, it drags the **low** end to 30 but leaves the high end
alone. A guess can never kill a case by itself. That is the hatched bar on the waterfall: case 138's
premium is an estimate that fails the band, so the low end falls from 75 to 30 while the high end
stays at 75. The case is now 30 to 75, and the whole argument is about the premium.

### Step 4: hazard, from real maps

Now the location. For each site we look up five public datasets:

- **FEMA flood zones** (via the Esri copy, because FEMA blocks Canadian IPs)
- **USGS earthquakes**, historical events near the site
- **US Forest Service wildfire** hazard potential
- **Open-Meteo**, the last two years of wind gusts and heavy rain at those coordinates
- plus **Nominatim** to check the address resolves where the record claims

Each becomes a multiplier around 1.0. Above 1.0 means worse than average and **subtracts** points;
below 1.0 **adds** them. They are combined, capped, and converted by a fixed formula worth at most
±15 points. On case 138 the FEMA lookup finds the site outside a mapped flood hazard area, which is
favourable, so it adds 2.05 points.

**This is where the map data enters the score.** It is not decoration.

### Step 5: portfolio concentration

How much are we already carrying next door? We take every active property policy within 30 km of
this site (excluding the same insured), add up their insured value, and subtract points for it, up
to 10. Case 138 loses 2.3 points for the $57.3M of active property around it.

This is an Elastic query in production, with an identical in-memory version as the fallback.

### Step 6: the decision

Two lines: **45** and **70**.

- High end below 45 → **decline**
- Low end at or above 70 → **accept**
- The range crosses a line → **open**, meaning nobody can honestly decide yet

Case 138 ends at 30 to 75 after hazard and portfolio. It crosses 45, so it is open, and the agents
go and try to close the gap.

You can check every step of this yourself: the waterfall on the case page is exactly these numbers,
and the page tells you whether they reconcile with the final score.

### How the queue is ranked

Open cases first, then by the midpoint of the interval (highest first), then by value at stake. So
the thing at the top is the biggest live decision, not the loudest row.

---

## 2. Where the data comes from

| Source | What it gives | Where it shows |
|---|---|---|
| **Federato's API** | The book: submissions, insureds, policies, locations, buildings, claims, brokers. 12 resources, 2,264 records | Every fact on a case |
| **FEMA / USGS / USFS / Open-Meteo** | Flood, quake, wildfire, wind and rain at a site | The hazard multipliers |
| **Toronto Police, City of Toronto** | Break-and-enter counts, fire station locations, basement-flooding study areas | The renter price |
| **Elastic** | Our own book, indexed: past risks and what they cost | "We wrote 3 like this" |
| **Google Maps, through Gemini** | What is physically near an address | The advisory card on the phone |

All the external lookups are cached to disk. 350 files. The demo works with the internet off.

---

## 3. The agents: what they are for

The engine already produces the score. So what do six agents do? **They decide what to go and find
out.** They never compute a number.

| Agent | Its job |
|---|---|
| **Lead** | Reads the triage, decides how deep to go, hands out the questions, makes the final call |
| **Intake** | Writes queries against Federato to fill in missing facts. Estimated case 138's premium from 27 comparable bound policies |
| **Hazard** | Picks which map layers are worth fetching for this address |
| **Portfolio** | Asks the exposure index what we already hold nearby |
| **Appetite** | Checks the case against the guideline and flags where it fails |
| **Challenger** | Argues against the Lead's draft. Names the risks of being wrong, and what would change its mind. The Lead must answer it before the decision stands |

A case that code can already decide gets **no model call at all**. Fifteen of the twenty-two rows in
the queue are like that.

**The guard.** Before any model sentence reaches the screen, we check every number in it against the
numbers the tools actually computed. If it invented one, the sentence is replaced with a template
and Sentry gets an alert. On its first live run this caught our own Lead quoting $35,716,000 that no
tool had produced.

---

## 4. The two apps

**The website is the underwriter's desk.** The queue of submissions, one page per case explaining
the decision, a live view of the agents working, a map of the book, a plain-English query box, and
the backtest.

**The phone app is the customer side.** A renter types an address, answers three questions, and gets
a price with a receipt: base rate, then a line per factor, each naming its source. Same engine,
different rules file, different data pack. If the risk should not be auto-priced, the quote becomes a
referral in the underwriter's queue on the website. That is the connection: one system, two ends.

**Renter pricing** works the same way but in dollars: a $150 base, then multipliers for contents
value, break-ins near that block, distance to the nearest fire hall, and whether it sits in a
basement-flooding study area. Every multiplier is capped, and the total location effect is clamped
between ×0.85 and ×1.25 so one bad block cannot triple someone's premium. The constants are invented
and documented as invented.

---

## 5. What each sponsor service actually does here

| Service | Its real job in the product | Remove it and... |
|---|---|---|
| **Federato** | The data the whole thing runs on | there is no product |
| **Elastic** | Answers "have we written this before" and "how much do we hold nearby" | falls back to an in-memory copy, marked `[memory]` on screen |
| **OpenAI** | Runs the six agents that decide what to look up | no agents; the engine still scores |
| **Sentry** | One trace per decision, and the alert when an agent invents a number | you lose the proof that the guard works |
| **Composio** | Sends the broker email and reads the reply back in as a fact | the loop never closes |
| **Linq** | The underwriter triages and decides by iMessage | no decisions away from the desk |
| **Gemini** | Reads a room photo into an item list; names what is near an address | renters guess their contents value |
| **Expo** | The phone app itself | no customer side |
| **Backboard** | Remembers across cases, so the desk recognises a near-duplicate | each case starts from nothing |

---

## 6. The backtest, and why "nothing changed" is the honest headline

The backtest asks whether the whole system was any good, by running it against what really
happened. Four measurements, all written down and committed to git **before** the first run, so the
metric could not be quietly changed afterwards. The commit hash is printed on the page.

- **B1** — take the 27 bound property policies, group by what the desk would have said. Do the
  declines have worse loss ratios than the accepts? Declines came out at 1.81.
- **B2** — 11 policies a human declined for an underwriting reason. Does the desk decline them too,
  and for the *same* reason?
- **B3** — score every case with the map data on, then off. Does it change any decisions?
- **B4** — how many bound policies would the guideline reject? 17 of 27, on premium alone. The
  humans wrote a lot of business outside their own written guideline.

### B3 confuses people, including us. Three different things can change:

1. the **decision tier** (decline / open / accept)
2. the **score interval** (the numbers themselves)
3. the **rank** (position in the queue)

B3 asked only about the first, and the answer was **zero**. No case changed decision because of
flood, quake, wildfire or wind data.

**Why.** Those cases are declined on state, building age or loss history. Each of those is a hard
fail: one alone caps the score at 30, below the decline line. Hazard data moves a score by at most
±15. It is a job applicant with no work visa: improve the interview score all you like, they still
cannot be hired.

**What did change:** all 38 scored cases had their interval move, median 7.2 points, and 5 of the 6
open cases changed position in the queue. Nobody's yes/no flipped, but the numbers and the order
did, and the order is what an underwriter with twenty files and time for five actually acts on.

**Why we left the zero on the page.** When a measurement comes back null the temptation is to
change what you measure until it looks good. Because B3's definition was committed first, the page
still leads with "0 tiers changed", explains why, and adds the sub-metrics clearly marked as added
afterwards with the reason. A judge who has seen a lot of demos notices that.

**The named miss.** Policy PR-2026-1081 was fully in appetite the day it arrived, so the desk would
have accepted it. It went on to incur $629,200 on $58,800 of premium. It is printed in red under
the B1 table.

## 7. Two things the underwriter can do to the machine

**Edit the guideline** (`/guideline`). The carrier's appetite is a document on screen. Change a
threshold or a band, apply, and the whole book re-scores in about 60 ms with a diff: how many cases
changed, which declines became open, how much value moved into the queue. This is our version of
what Federato calls Control Tower. Reset puts it back.

**Nudge the score** (on a case). Move the interval by up to ±5 points with a written reason. The
engine's numbers stay untouched beside it, the adjustment is labelled as the human's, it lands in
the same audit trail, and it is undoable. Ask for more than 5 and it refuses: *"larger disagreements
belong in the decision itself, not in the score."*

Both exist because of evidence, not taste. Dietvorst's work is the best-replicated finding in this
area: experts abandon a model after seeing it err, even when the model beats them by a wide margin,
and letting them adjust the output by even a small bounded amount brings them back.

## 8. The one-paragraph version

A submission arrives. Code scores it against a written guideline, and because some facts are
missing, the score is a range rather than a number. Public map data and our own book move that range.
If the range crosses a decision line, six agents go and find out what would settle it, argue about
it, and hand the underwriter a case with the reason, the counter-argument, and a drafted email.
Nothing a model says reaches the screen without being checked against the numbers the code computed.
The same engine, given a different rules file, prices a renter's policy on a phone.
