# Codex contributions

| When | Task | Commit / PR | Outcome |
|---|---|---|---|
| 2026-09-19 | C1 | This commit (`data: fetch Toronto risk layers`) | Added a rerunnable Toronto fetcher, source and licence notes, a manifest with live row counts, and raw or sampled GeoJSON for five verified layers. |
| 2026-09-19 | C2 | This commit (`data: prefetch US hazard layers`) | Cached five public enrichment sources for all 70 locations; the offline verification used all 350 cache files with zero network requests and no failures. |
| 2026-09-19 | C5 | This commit (`data: build Toronto H3 risk scores`) | Built 5,691 resolution-9 cells with neighbourhood shrinkage, percentile bands, flood-area membership, fire distance, closed map rings, and enforced peril and total caps. |
| 2026-09-19 | C7 | This commit (`feat: add explained tenant quotes`) | Added shared-engine tenant appetite rules, offline geocoding, integer-cent receipts, quote persistence, and quote and map routes matching the web and Expo contracts; the US answer key remained 10/10. |
