# One page per track

For each: what to open, the one thing only this project can say, the number with its n, and the
limitation to name before the judge finds it. Full five-minute scripts are in `../docs/PITCHES.md`.

## Federato
- **Open** `/cases/138`, then `/ask`
- **Only we can say** every fact knows how it got here. TIV reached this case through
  `Insured.hq → Location 19 → Buildings[35]`, and the case says so on the row.
- **Number** 17 of 27 bound property policies fail the 2025 guideline on premium alone (n=27)
- **Limit** the snapshot is synthetic and it is theirs; live token minting needs their credentials

## Intact
- **Open** the phone, then `/queue`
- **Only we can say** the renter and the underwriter are the same system. A quote we should not
  auto-price becomes a referral in the underwriter's queue.
- **Number** the receipt is 4 lines and they sum exactly to $214.80 a year
- **Limit** the prices are invented and documented as such; no fairness audit has been run

## Rox
- **Open** `/queue`, then cases 126 and 141
- **Only we can say** the defects are in Federato's data as delivered, not planted. Same insured,
  two brokers, two submissions.
- **Number** 16 of the 22 queue rows carry at least one data defect
- **Limit** we detect and report them; we do not repair the upstream record

## OpenAI
- **Open** `/openai/runtime`, then `/cases/138`
- **Only we can say** the guardrail caught our own agent. It quoted $35,716,000 that no tool had
  computed, on its first live run.
- **Number** the engine matches a hand-written answer key 8 of 8 with no model call (n=8)
- **Limit** we do not use the Evals API; it shuts down in November, so the eval runs locally

## Sentry
- **Open** the Sentry dashboard, then `/live`
- **Only we can say** we alert when an agent's own words disagree with our numbers, not just when
  the process crashes.
- **Number** one desk run puts 53 transactions into the project, one root span per decision with
  cost and tokens on it
- **Limit** the real story is that the API's DSN pointed at a project that does not exist in the
  org, so nothing arrived at all until we found it

## Elastic
- **Open** `/cases/138` sidebar, then the panel under `/queue`
- **Only we can say** "we wrote three like this and here is what they cost", answered by a hybrid
  search with a reranker, not by a model.
- **Number** 127 documents in the precedent index, 14 of them declines
- **Limit** every answer falls back to an in-memory twin when the cluster is unreachable, and the
  badge says `[memory]` when it does. Point at the badge.

## Composio
- **Open** `curl -XPOST 'http://macserver:8000/composio/cases/138/broker-reply/check?replay=true'`,
  then `/cases/138`
- **Only we can say** the loop closes. The broker's reply becomes a Known fact with the message id
  as its source, and case 138 re-scores from 30-75 open to 92-92 accept.
- **Number** 138's interval collapses to a point on one $92,400 premium the broker wrote, accepted
  only because the model could quote it verbatim
- **Limit** the replay reads a captured email and a recorded extraction, and says `"path":"replay"`
  so it can never pass as live; only Gmail is connected, the other toolkits answer `not_connected`

## Linq
- **Open** your phone
- **Only we can say** a tapback is a decision. Thumbs-up on the digest writes an approval into the
  case file under the underwriter's name.
- **Number** a renter quote sent and delivered inside iMessage, $186.86 a year for 1100 Queen St W
- **Limit** we receive tapbacks; we have never sent one

## Gemini
- **Open** the phone quote screen
- **Only we can say** the model reads the room and the code does the arithmetic. It returns items
  with values; Python sums them and clamps the range.
- **Number** the "what's around you" card cites the nearest fire station, the rail corridor and a
  gas station, with Google Maps citations
- **Limit** no dry path; without a key the card says unavailable rather than showing invented text

## Expo
- **Open** the phone
- **Only we can say** the reduce-motion paths are real, so the demo still works with accessibility
  settings on
- **Number** six screens, four native capabilities: camera, haptics, print/share, audio
- **Limit** Expo Go only, no native build, so no mobile crash reporting

## Backboard
- **Open** `curl http://macserver:8000/cases/141/memory`, then add `?live=true`
- **Only we can say** the desk remembers across cases and the boundary is mechanical: memory can
  change which questions get asked, never a number or a tier. The response carries that sentence.
- **Number** running 126 then 141 recalls the near-duplicate, naming the insured, the broker and
  `duplicate_account`, and `sources` says which store each line came from
- **Limit** live on 2026-09-20 with credits: memory writes, memory search, document upload to
  INDEXED, and System One typed judgements (`typesafe/jev-1.13.0`). Still not working: the guideline
  citation. Backboard's chat 401s on the OpenAI key held in the dashboard, and even on a working
  provider its document search returns no paragraph. The recall on `/cases/141/memory` without
  `?live=true` is ours, not theirs.
