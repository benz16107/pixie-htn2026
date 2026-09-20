# The bounded underwriter override

## What it does

`POST /cases/{id}/override {"points": <signed number>, "reason": "<free text>"}` moves the engine's
score interval by at most five points, recomputes the decision from the moved interval using the
guideline's own thresholds, and writes the whole thing into the case's DeskEvent ledger under the
`human` actor, beside every other decision the desk made. `DELETE /cases/{id}/override` undoes it,
and `POST /demo/reset` clears it along with the other human events.

Nothing the engine computed is overwritten. `GET /cases/{id}` returns the engine's `score` and
`decision` exactly as before and adds an `override` block carrying `engineScore`, `engineDecision`,
the adjusted `score` and `decision`, the points, the reason, who moved it and when. The case page
labels the engine's interval "Engine interval", prints the adjustment as its own line
("Underwriter adjusted +4, sprinkler certificate confirmed by the broker, at 09:56 p.m."), and the
waterfall shows it as a final ink-filled bar behind a dashed divider, tagged HUMAN. Every value the
override produces carries `"provenance": "human"` (AGENTS.md invariant 3): it is a human's number,
and the UI says so wherever it appears.

Refusals, not silent corrections: an adjustment past the bound comes back 400 with the number you
asked for and the number allowed, and nothing is written. An empty reason is a 400 too. A bound that
quietly clamps is not a bound the underwriter can see, and a reason nobody typed is not an audit
trail.

## The evidence

Dietvorst, Simmons and Massey (2015), *Journal of Experimental Psychology: General* 144(1), 114-126,
showed that people abandon an algorithm after watching it err, even when it beats them by a wide
margin: their participants made 15-29% more error than the model in one task and 90-97% more in
another, and still chose themselves over it.

Dietvorst, Simmons and Massey (2018), "Overcoming Algorithm Aversion: People Will Use Imperfect
Algorithms If They Can (Even Slightly) Modify Them," *Management Science* 64(3), 1155-1170, is the
fix this feature implements. Participants who could modify the model's forecast, in one condition by
no more than two percentage points, "were more likely to choose to use the model's forecasts than
those who could not, and as a result, they performed better and earned more money."

Both papers, with quotes and links, are in `docs/research/underwriting-evidence.md` section 2.

Pixie already let a human replace the decision outright over iMessage, and change an *input* through
the what-if slider. Neither is what the 2018 paper tested. This is the missing one: a small, bounded
nudge of the *output*.

## Why the bound exists

`MAX_OVERRIDE_POINTS = 5` in `api/src/atlas_api/override.py` is a product decision, not a law of
nature. Five points is enough to carry a case over a threshold it already sits next to, and too
small to turn a decline into an accept on its own. Dietvorst 2018 got its adoption effect with two
points of movement, so the bound can go lower without losing the benefit the evidence predicts.

The bound is there because the other half of the literature is Hoffman, Kahn and Li (2018),
"Discretion in Hiring," *Quarterly Journal of Economics* 133(2), 765-800: managers who overrode a
hiring test "end up with worse average hires... because they are biased or mistaken, not only
because they have superior private information." Give the expert a free knob and they will use it to
destroy value; give them no knob and they will stop using the system. A bounded, logged, reviewable
adjustment is the only shape both findings support.

## The honest limitation

A bounded nudge is not effective challenge. SR 11-7 and NYDFS Part 500 §32 mean something specific
by that phrase: critical analysis by *independent* parties with the standing and the authority to
make the model owner change the model. An underwriter moving their own case by four points, however
well logged, is none of those things. It is an adoption mechanism with an audit trail, and it should
be described that way in front of a model-risk officer.

Two smaller caveats. The five-point bound is unvalidated: we have not measured what it does to loss
ratio, because we have no outcome data on overridden cases. And an override that is later
contradicted by the engine (a desk re-run that moves the interval) still applies its points on top
of the new number; the case file records both, but nothing re-asks the human whether they still
mean it.
