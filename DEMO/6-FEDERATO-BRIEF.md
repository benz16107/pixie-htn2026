# Federato: who they are, and how to talk to them

Everything here was checked against their own site and documents. Getting a detail wrong in front
of the people who built the product is worse than saying less.

## They are a software company, not an insurer

Follow one building. A company owns a warehouse in Miami worth $2M and needs it insured.

| Who | What they do |
|---|---|
| **The insured** | The warehouse owner. Pays a premium, wants cover |
| **The broker** | The middleman. Shops that warehouse to several insurers. Brown & Brown, Ryan Specialty |
| **The carrier** | The actual insurance company. Takes the risk, pays the claim. QBE, Nationwide, Palomar |
| **The underwriter** | An employee at the carrier. Opens the submission and says yes, no, or "send me more" |
| **Federato** | Sells software to the carrier, used all day by the underwriter |

Federato never meets the warehouse owner, never carries risk, never pays a claim. B2B software:
their customer is an insurance company, their user is an underwriter, they charge a licence.

## What they cover

From their solutions page: *"Whether you write commercial lines, specialty, or E&S, Federato adapts
to your product structure and carrier relationships."*

- **Commercial lines** — insuring businesses. Property is one line; so are commercial auto, general
  liability, workers' comp, cyber
- **Specialty** — marine, aviation, event cancellation, anything needing a specialist
- **E&S, excess and surplus** — risks the standard market will not take. (E&S is *excess and
  surplus*, not errors and omissions. Do not mix these up in the room.)

They sell to **carriers** and to **MGAs** (managing general agents, who underwrite on someone
else's balance sheet). **Not personal lines** — no home or car insurance for consumers. That is
Intact's world, which is why they are two separate tracks and why spanning both is unusual.

Commercial property is just the line they handed students, because they needed one concrete
guideline table. Their best-documented customer, **HDVI**, insures small trucking fleets off live
telematics and got quoting down from a week to half a day with 30+ configured rules.

## Their product

An **underwriting workstation**. The carrier's data lands in one place and every submission is
scored against **appetite** — the written statement of what the carrier wants to write this year —
so the queue is ordered by what deserves attention rather than who emailed most recently.

Two things worth knowing, because they change what you claim:

**Their score has two axes: appetite fit and winnability.** Winnability is "will we actually win
this if we quote it", derived from broker behaviour. Their scoring is a hybrid: a configured rules
engine for appetite, traditional ML with SHAP values for winnability, and an LLM only for the prose.

The hackathon dataset has **no broker behavioural signal at all**, so you cannot reproduce half
their quadrant. Say so; it shows you read the product:

> "You score two things, appetite and winnability. The hackathon data has no signal for
> winnability, so I went deep on the appetite axis instead and asked what happens when the facts
> behind it are missing."

**Control Tower** is their name for editing appetite live, so the book re-steers as strategy
changes. We built our own version — `/guideline` — after learning this. Show it rather than
conceding it.

## Do not overstate

- Palomar, Ryan Specialty, Acrisure, Accelerant and Brown & Brown are **logos on the homepage**.
  Only Velocity Risk, HDVI, QBE, Frederick Mutual and Propeller have written case studies. Name one
  of those five or none.
- Federato has **zero independent reviews** on G2, Capterra, TrustRadius and Gartner. G2's page
  says "hasn't been reviewed yet." Every public figure about their results comes from them.
- Their "rules for the numbers, model for the prose" split is **their published architecture too**.
  Do not present the split as your insight. The *guard* that string-checks model output against
  computed values is yours; the split is not.

## What is genuinely yours, and what is table stakes

**Table stakes in 2026.** Appetite scoring to triage a queue, public hazard enrichment,
chain-of-thought explanations, human-as-final-authority. Cytora, Kalepa, Send and Federato all ship
these. Duck Creek bought Send in July, so the agent layer is consolidating industry-wide.

**Published, not invented here.** The adversarial critic. arXiv 2602.13213, Roy & Singh, January
2026: 500 expert-validated cases, hallucination 11.3% → 3.8%, accuracy 92% → 96%. Credit it:

> "The adversarial critic isn't my invention. There's a paper from January with 500 validated cases
> showing it cuts hallucination from 11% to under 4%. I built it because the evidence says it
> works. Where mine differs is that the critic isn't free-form: it's grounded in a deterministic
> sensitivity analysis, so it can only argue from facts the engine actually computed."

**Genuinely yours, as far as the research found.**

1. **The interval.** A live score that widens because *named* facts are missing. Every commercial
   vendor found outputs a point score, a category, or a confidence label. The maths has lineage
   (imprecise credibility theory in actuarial science, conformal prediction in ML) but applied to
   claims and loss prediction, not to risk selection. Lead with this.
2. **The what-if tied to the boundary.** Not "here is your score" but "here is the number where it
   changes", and a band with two edges.
3. **One engine, two products.** The same code prices a renter's policy on a phone.
4. **A backtest that prints its own miss.** PR-2026-1081, $629,200 on $58,800 of premium.
5. **The bounded override**, from Dietvorst: experts abandon a model that errs unless they can
   adjust it, and a small bounded adjustment is enough to keep them using it.

## The line to close on

> "Your platform tells an underwriter *what* to look at. Pixie tells them *why*, and what single
> fact would change the answer — and no number on the screen ever came from a language model."

## The vocabulary

The pipeline everything hangs off: **submission → quote → bind → policy → claim.** Most submissions
die before binding.

| Term | Plain meaning |
|---|---|
| **Hit ratio** | Of the submissions you quoted, what fraction actually bound. Quote 100, bind 20 = 20%. A sales close rate. Quoting is expensive, so a low hit ratio means you are working the wrong files |
| **High-appetite bound quotes** | Read backwards: *bound* = it became a policy, *quote* = you made an offer, *high-appetite* = the kind of risk you wanted. "5.5× more high-appetite bound quotes" means more of the *right* business won, not just more business |
| **Carrier** | The insurance company |
| **Broker** | The middleman between customer and insurer |
| **Insured** | The customer |
| **Premium** | What the customer pays. The insurer's revenue |
| **Appetite** | What the carrier wants to write this year. Strategy, written down |
| **In / out of appetite** | Does this submission match that strategy |
| **TIV** | Total insured value. What you lose if it is destroyed |
| **Line of business** | The product: property, auto, cyber, liability |
| **Loss history** | What this customer has already claimed. Five years is the standard window |
| **Loss ratio** | Claims paid ÷ premium collected. Over 1.0 you lost money. One policy in the backtest ran 10.70 |
| **Incurred** | Claims paid plus claims expected but not yet paid |
| **Referral** | Send it to a human instead of auto-deciding |
| **Subjectivity** | "Yes, but only if you fix X first" — sprinklers, a re-inspection |
| **Concentration** | How much you already insure in one place. Fifty buildings on one street and one hurricane ruins you |
| **Peril** | The specific bad thing: flood, wind, wildfire, quake |
| **Book** | Everything you currently insure |
| **MGA** | Underwrites on behalf of a carrier; someone else's balance sheet carries the risk |
| **RiskOps** | Federato's own coinage: "tools and workflows that help underwriters make smarter, faster decisions using data and AI" |
| **FDE** | Forward deployed engineer. Federato's people who configure the platform at a carrier. Their brief says this challenge "mirrors the work Federato's FDE team does daily" |

## What they asked for, and what you added

Their spec: **score → rank → explain**. You did all three, then added what they did not ask for:

- a range instead of a number when facts are missing
- an agent that argues against the decision
- a guard that stops a model stating a number
- a guideline you can edit live and watch the book re-score

Their own "Exceptional" bar says *"explanations address contradictions transparently"* — which is
exactly what the Challenger and the conflicts panel do.
