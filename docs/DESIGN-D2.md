# Design D2: the printed report

## The idea

An underwriting decision is a document someone signs, so the desk is set as a printed report rather than a dashboard. A case reads top to bottom as a written argument: the decision as one sentence, the facts with their sources, how the score was built, the case against, the precedent, the record, and a signature block where the actions live. Colour is withheld until it means one exact thing: red marks a missing fact, a decline, a not-acceptable band, or a threshold; everything else is ink and grey on paper.

## Type

- Display: Bodoni Moda (variable, optical sizing on). Titles, section heads, the decision sentence in italic, and every large numeral (the score interval, the what-if value, the risk numbers). A Didone reads as a masthead and a ledger at once, and its italic makes "Open." and "Decline," read as a verdict rather than a status.
- Text: Schibsted Grotesk, one family for body, tables, running head and small capitals. It was cut for a newspaper group, so it holds up at 12 to 15 px in dense tables. Its `tnum` feature widens punctuation, so tabular figures are reserved for the display face; the grotesk uses lining figures.
- No third family. `font-mono` now means real code only (the tool-call JSON popovers in the lanes).
- Scale: 44 / 27 / 20 display, 15.5 body in the argument column (66ch measure), 13.5 tables, 12.5 asides, 10.5 small caps at 0.09em.

## Colour

- Paper `#f4f3ef`, ink `#1a1a19`, grey `#63625c`, hairline `#c4c3bd`, faint `#e8e7e2`, red `#a62b1f`.
- Red is the only chroma and it carries one meaning: something is wrong or a limit is crossed. Decline words, `missing` provenance marks, not-acceptable band dots, the 45 and 70 threshold marks, negative waterfall bars, deductions, the `decline` cliff in the decision space, conflict cards, declined precedents, loss ratios over 1.
- Accept is ink, not green. Estimated facts are italic, not amber. Routed is grey.
- The old cartographic token names are aliased to the new ones in `globals.css`, so components I did not rewrite (the 3D decision space, the maps) inherit the world.

## Layout and rules

- One 12-column grid, 1320 max width, 32 px margins, a running head with the wordmark, the section, and the edition, and a colophon with privacy and terms.
- Rules instead of boxes: an ink rule above every section and under every table head and foot, a faint rule between rows. No radius, no shadows, no fills except the ink buttons. The phone mirror keeps its rounded frame because it is a drawing of a phone.
- Tables are set like tables in a book: small-cap heads, right-aligned numbers, sources as a grey column.
- Motion: the interval narrows as evidence lands, lane cards arrive as their events do, the case marker travels the station line. Everything else is a colour change. Reduced motion drops the transforms and keeps the fades.

## Honesty signals kept

Provenance mark on every fact (known / est. / missing), "every number checked against the facts", "the steps reconcile with the score", "numbers verified" on the Challenger, "lines sum exactly" on the receipt, `[elastic]` / `[memory]` on every Elastic-fed figure, the pre-registration hash on the backtest, and "not real customers" in the colophon.

## What I would do next

1. Print stylesheet: the page is already a report, so `@media print` should hide the running head links, expand the script, and paginate the sections. A judge could hold the case in their hand.
2. The live desk keeps the old four-column arrangement under the new type; a second pass would set the lanes as a printed timeline with the chatter as marginalia.
3. Schibsted's small capitals are synthesized from uppercase; a face with true small caps (or Bodoni Moda's for the folios) would sit better.
4. A `whatif` slider for business type, the second fact the sensitivity says moves the decision.

## Screenshots

`web/screenshots/d2-queue.png`, `d2-queue-focus.png`, `d2-case-138.png`, `d2-case-138-full.png`, `d2-case-138-whatif.png`, `d2-case-138-space.png`, `d2-case-134.png`, `d2-case-tenant.png`, `d2-live.png`, `d2-live-focus.png`, `d2-live-settled.png`, `d2-live-backtest.png`, `d2-live-renter.png`, `d2-map.png`, `d2-ask.png`, `d2-backtest.png`.
