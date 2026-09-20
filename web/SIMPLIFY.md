# What changed on the night before the demo

Ben asked for a desk that is easier to demo and to use: no printed instructions, fewer things
competing for the eye on any one screen, and labels he can say out loud without explaining them
first. The D1 direction, the density and the discipline are unchanged. No evidence was removed.
Every shortcut still works; the `?` sheet in the top strip is now the only place they are listed.

## Everywhere

Removed the printed key hints. The nav used to carry a keycap on every destination, the status bar
along the bottom of every screen printed four or five shortcuts, and `1` `2` `3`, `w`, `s`, `f`, `o`,
`u`, `Enter` and `A` were each stamped on the control they drove. All of it is gone from the surface
and all of it still works: `?` opens the sheet, which now also lists `/` on the blotter and `f` on a
case. The status bar's right half is empty on purpose, so the left half reads as one line of state.

## /cases/138

Cut the three band chips that sat on every fact row, their colour legend, and the footnote about a
missing fact keeping all three bands open. They were nine-pixel squares that needed a paragraph
before they meant anything, and the waterfall already shows what each rule did to the score. Also
dropped the duplicated status line: the known/estimated/missing counts, the "every number checked"
tick and the precedent backend all appear in their own panels, so the bar now carries the case
number, the insured and which guideline scored it. Renamed the panels for a person who does not sell
insurance: "the book" is now "what we know", "score interval" is "score range (0–100)", the two
views are "how the score was built" and "every possible score", and the waterfall's caption spells
out what a cap does. The bottom deck gained a fourth panel, so nothing else had to move.

**New: the broker's reply.** A strip under the score with two choices, "captured email" or "real
inbox", and one button. Press it and the panel prints the sentence from the broker's own email, the
fact it yielded with the Gmail message id beside it, and the score range moving from 30–75 to 91–91.
A badge reads the API's own `path` field and nothing else: `REPLAY · captured email, no network used`
or `LIVE GMAIL · the real inbox was searched`. A second press says so plainly and shows the range not
moving. "Undo" calls `POST /demo/reset` and puts the case back.

**New: what the desk remembered.** The fourth deck panel, on cases the desk has worked before and
absent entirely on the others. The summary sentence is the headline, each recalled case shows why it
came back with a chip saying whether it came from Pixie's own recall or from Backboard, and the
right column holds the sources (which store, and whether it needs the network) with the advisory
boundary in small type. Model judgements, when there are any, sit in their own dashed box in plain
ink, labelled as the model's, with their probability and confidence, so they can never be mistaken
for an engine number.

## /queue

Five header tiles became three, each one bigger: submissions, still undecided, value at stake. The
desk-versus-referrals split it lost is now a clause in the sentence beside them, where it reads
better than a number with a caption. Dropped the "press A for everything" line under the table and
the "move the cursor with j and k" empty state. The preview and the Elasticsearch panel below it now
share one scrollbar instead of two, which stops the preview being cut off mid-sentence on an 800px
screen. "What the book teaches" used to open with the words `significant_terms`; it now says what
that means first and names the query second.

## /live

The footer's rack of keycaps became one quiet line of prose. The sweep board's heading no longer
repeats the shortcuts, the empty case panel is one short line instead of an instruction, and the
idle caption describes the screen rather than telling you what to press. The controls along the top
were already buttons, so they were left alone.

## /guideline

Each header tile gained a plain second line, so "hard-fail cap 30" now reads "break a hard rule,
score no higher" directly under it, and the same sentence is spelled out on the threshold chart
itself. The five scenarios lost their number keys and read as a list of named changes. The apply,
discard and restore buttons lost theirs too, and the line that used to say "press 1–5 for a
scenario" now says the thing that actually matters: nothing reaches the desk until you apply.

## Two fixes found while simplifying

The what-if slider is priced in dollars, and once the broker answered on premium it could be handed
a non-money fact, giving "what if the submission type were $7,954". It now only ever takes premium,
TIV or loss history, and disappears when none of them can move the decision. The broker-reply panel
also truncates its scores the way the rest of the desk does, so it reads 30–75 → 91–91 rather than
disagreeing with the number above it by a point.
