# Questions you will get, and the answers

Say the honest half first. Every number here is real; if you are not sure of one, say you are not
sure rather than reaching for it.

## About the numbers

**"Are these real prices?"**
No. The renter receipt says illustrative on its face, and `packs/toronto/PRICING.md` documents
every invented constant. It is a documented model, not an Intact quote.

**"Is this real data?"**
It is Federato's own synthetic snapshot, which is what the challenge ships. The Toronto layers are
real open data: Toronto Police break-and-enter, city fire stations, city basement-flooding study
areas.

**"Did the model make up these numbers?"**
No number in the product comes from a model. Every value carries its provenance, and a guard checks
each model sentence against the computed facts before you see it. On its first live run that guard
caught our own lead agent quoting $35,716,000 from a digest that had never been registered as a
computed fact. We fixed the bug, not the guard.

**"Why does it say Lakeside Medical Group Group?"**
That duplicate word is in Federato's `Insured.json`. We print what they sent.

## About the method

**"Six agents feels like a lot. What do they actually do?"**
They decide what to look up, not what the answer is. Code computes every number. A case with
nothing to resolve gets no model call at all. You can watch the cost meter: 15 calls, $0.057, 55
seconds for case 138.

**"What does the enrichment actually change?"**
Zero decision tiers, and I would rather tell you that than hide it. It moved all 38 intervals, the
median move is 7.2 points, and it reranked 5 of the 6 open cases. The declines are structural hard
fails on state, age and loss history, which outside data cannot move. It is on the backtest page.

**"Isn't the backtest tiny?"**
Yes. 27 bound property policies, one accept, 26 declines. The one accept lost $629,200 on $58,800
of premium, and we print that as a known miss rather than burying it. The claim is the method: B1
to B4 were defined and committed before the first run, so we could not tune them afterwards.

**"You automated the easy half and left the hard half to a human."**
That is the design. A decline is cheap to reverse and an accept is not, so the asymmetry belongs in
the product. What changes is the cost of the referral: the case arrives with its interval, the fact
that would settle it, the precedent from the book, the counter-argument, and a drafted email. The
underwriter replies "1" by iMessage and the decision is written to the file with their name on it.

**"An underwriter would not trust this."**
Probably not yet, and nobody on this project has written a line of insurance. That is why the claim
is not that the score is right, it is that it is inspectable. A carrier swaps in their own guideline
file and the whole desk follows, because the engine reads the file rather than embedding it.

**"This is eleven sponsor APIs in a trenchcoat."**
Fair challenge, so here is the test we applied: does removing it break something a user does?
Elastic answers "have we written this before". Composio and Linq are how the decision leaves the
building and how the human answer comes back. Sentry is how we prove a model did not invent a
number. Gemini reads a room photo, which is the only way a renter gets a contents value without
guessing. The ones that would not survive that test are marked unverified in our own docs.

## About the build

**"Who built this?"**
One person, with AI coding agents working in parallel git worktrees, one agent per lane, merged at
milestones. Every agent had to obey a written invariants file: no number comes from a model,
missing is never a pass, provenance on every value, external lookups cached to disk so the demo
runs offline.

**"What would you do next?"**
Measure it. Same cases, a real underwriter, with and without the desk, timed. If they reach the
same decision in the same time without it, the desk is decoration. We built the instrument; the
measurement is next.

## The three hardest questions, and the honest answer

These came out of our own research pass. If an industry judge is sharp, these are what they ask.

**"Your guard proves the model repeated your number. It does not prove the number is right."**
Correct, and that is the limit of it. The check is for consistency between what the code computed
and what the model said, not for whether the guideline itself is sensible. What makes the number
defensible is separate: it comes from a rules file you can read, and the waterfall shows every step
that produced it, so you can disagree with the rule rather than with the machine.

**"Your Challenger is not independent. That is not effective challenge."**
Also correct. In model-risk terms (SR 11-7), effective challenge means review by someone with
distinct incentives and authority. Our Challenger is another agent in the same system reading the
same facts. What it does buy is narrower and real: it is grounded in a deterministic sensitivity
analysis, so it can only argue from facts the engine computed, and it forces the Lead to answer
before a decision stands. Call it a structured second opinion, not governance.

**"Where does your 'underwriters disagree' claim come from?"**
Be careful here. The widely quoted figure is a 55% median difference between underwriters pricing
the same policy, from the noise audit written up in *Noise*. It is **one unreplicated consultancy
audit** at an unnamed company with no published protocol, and there is no peer-reviewed measurement
of commercial property underwriter agreement. Do not present it as settled science. The better move
is to turn it around: "nobody has measured it at your company. Run this alongside your desk for a
month and it will tell you your own number." That is a first use case, not a weakness.

## If you do not know

"I do not know" beats a guess. Follow it with what you do know and where it is written down:
`docs/TRACKS.md` marks every feature verified or unverified, and `docs/DEVILS-ADVOCATE.md` is our
own list of what is weakest.
