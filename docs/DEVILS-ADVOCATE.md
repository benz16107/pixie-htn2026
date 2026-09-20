# The case against Pixie

Written against our own work, the way the Challenger agent runs against a decision. Every
objection here is one a judge can actually make, with what we say back and what we would do about
it with more time. Where the honest answer is "they are right", it says so.

## The five hardest objections

### 1. "An underwriter would never trust this, and you have no underwriter"

**The objection.** Nobody on this project has written a line of insurance. The guideline, the
bands, the thresholds at 45 and 70 and the hazard multipliers are our reading of Federato's sample,
not a carrier's appetite. A real desk would find the scoring naive in a week.

**What we say.** True, and it is why the product's claim is not "the score is right". It is "the
score is inspectable". Every factor shows its band, its rule text and its source, the interval
widens rather than guesses when a fact is missing, and `/cases/{id}/whatif` recomputes from a
changed fact in front of you. A carrier replaces `rules/property_2025.yaml` with their own
guideline and the whole desk follows, because the engine reads the file rather than embedding it.

**Remedy.** Ship the rules file as the product surface: a guideline editor with a diff against the
last twelve months of decisions, so an underwriter tunes bands and sees what would have changed.

### 2. "The numbers are synthetic, so the backtest proves nothing"

**The objection.** 27 bound property policies, one accept, one loss. A loss ratio of 10.70 on a
single policy is not a result, and the whole book is generated data.

**What we say.** Correct on all counts, and the page says n on every figure. We pre-registered B1
to B4 in `eval/BACKTEST.md` and committed it (5351f23) before the first run, precisely so we could
not tune the metric after seeing it. The one accept that lost $629,200 is printed as a known miss
rather than buried. The claim is the method, not the number.

**Remedy.** Run the same pre-registered design on a carrier's real book. Nothing in the engine
depends on the data being synthetic.

### 3. "Six agents is theatre. A single prompt would do this"

**The objection.** The desk costs about $0.07 and 60 seconds per case for work that a deterministic
scorer already did. The agents do not compute the score; code does. So what are they for?

**What we say.** They decide what to look up, not what the answer is. Intake writes the Federato
query, Hazard picks which layers are worth fetching for this address, Portfolio asks the exposure
index, the Challenger argues the other side, and the Lead has to answer the challenge before the
decision is final. A case with nothing to resolve gets no model call at all: case 133 is decided by
code and skips the desk entirely. That is the opposite of theatre, and it is measurable in the cost
meter on `/live`.

**Remedy.** Publish the ablation: same 21 cases with one prompt, with five agents, and with the
Challenger removed, scored against the answer key. We have the answer key; we have not run it.

### 4. "You automated the easy half and left the hard half to a human"

**The objection.** Every interesting case ends in "refer" or "request more information". The system
declines what is obviously bad and asks a person about everything else.

**What we say.** That is the design, and we would defend it in front of a regulator. A decline is
cheap to reverse and an accept is not, so the asymmetry belongs in the product. What changes is the
cost of the referral: the case arrives with its interval, the fact that would settle it, the
precedent from the book, the counter-argument, and a drafted broker email. The underwriter replies
"1" by iMessage and the decision is written to the case file with their name on it.

**Remedy.** Measure it. Time-to-decision with and without the desk, on the same cases, with a real
underwriter. That is a study, not a hackathon demo.

### 5. "This is a collection of sponsor integrations"

**The objection.** Elastic, Composio, Linq, Sentry, Gemini, Expo, OpenAI, Backboard.
Integration count is not a product.

**What we say.** Fair challenge, so here is the test we applied: does removing it break something a
user does? Elastic answers "have we written this before" and its absence drops us to an in-memory
twin with the same math and a `[memory]` badge. Composio and Linq are how the decision leaves the
building and how the human answer comes back. Sentry is how we prove a model did not invent a
number. Gemini reads a room photo, which is the only way a renter gets a contents value without
guessing. The ones that would not survive that test are named as such in `docs/TRACKS.md`, with a
verified-versus-unverified column, because pretending otherwise is the fastest way to lose a judge.

**Remedy.** None needed for the demo. For a product, three of these collapse into one vendor.

## What we would fix first, in order

1. **The desk has only run on six cases.** The other fifteen show rules-only decisions with no agent
   lanes. A judge who clicks the wrong row sees an empty trace.
2. **Sentry alerts and uptime were never created** (the token lacked the scope).
3. **The fairness question on the renter price is unanswered.** Break-in density correlates with
   income. We cap and shrink every location factor, and we have not audited what the cap does across
   the city.
4. **`ATLAS_ACTIONS=live` on the demo machine** means a stray click sends a real email.

## What would falsify the whole idea

If an underwriter, given the same case, reaches the same decision in the same time without the
desk, then the desk is decoration. We have not run that test, and it is the one that matters. The
honest position at a hackathon is that we built the instrument and the measurement is next.
