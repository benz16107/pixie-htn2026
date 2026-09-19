# Grounding: "Atlas", Federato underwriting desk + Intact consumer app (Hack the North 2026)

## Clock and constraints
- Now Sat Sep 19 ~17:10 EDT. Submission edits close Sun 08:00. Sponsor judging Sun 09:45-11:45. **~5 minutes per demo**; one person can visit ~6-7 booths.
- **SOLO builder** using Claude Code and Codex in parallel (2-3 coding agents at once). Strong in ML, backend, 3D/frontend. Machine: MacBook (32 GB) for building, iPhone for Expo Go.
- Only ONE project can be submitted. Prizes already ticked on Devpost (only these can win): Federato, Intact, Rox, OpenAI, Huawei openJiuwen, Linq, Sentry, Composio, Elastic, Expo, Gemini (MLH), ElevenLabs (MLH), plus others that don't fit (Shopify, Baseten, Backboard, Browserbase, Tiger Data, MongoDB, Huawei OMNI, RBC, Zip). Verbatim prize texts: /Users/ben/Code/hackathons/htn-2026/TRACKS.md

## Ben's LOCKED product decisions (do not relitigate; design the best version of these)
1. Federato first, Intact second, ONE shared risk engine.
2. **Multi-agent underwriting desk** (Lead underwriter + Intake + Appetite + Hazard + Portfolio) with a **visible trace per agent** (swimlane UI). Custom orchestrator is fine (Huawei openJiuwen: JiuwenSwarm "encouraged, though this isn't required"; judged on multi-agent collaboration quality, scenario creativity, demo completeness, technical implementation, reusability).
3. **Four real-world actions:** Composio (email the broker requesting missing data), Linq (iMessage the underwriter the top applications; reply "approve 3"/"refer 2" writes the decision), Gemini Maps grounding ("what's around this address" card), ElevenLabs (spoken queue briefing). Priority in that order.
4. **Intact consumer side = Expo app** (Expo Go, no native build): Toronto tenant quote, address -> hex risk map -> 3 questions -> instant approve/refer from the SAME engine -> "why this price" receipt -> "View as underwriter" opens the same case on web.
5. **Demo wow:** (a) backtest of the desk against the human underwriters' real decisions; (b) plain-English question box that shows the Federato query the Intake agent writes.

## Federato challenge (their guide, /Users/ben/Code/hackathons/htn-2026/federato/docs/*.txt; read STUDENT_PROJECT_GUIDELINES.txt, APPETITE_GUIDELINES.txt, QUERY_REQUEST_BODY.txt, API_DOCUMENTATION.txt)
- Task: score each submission against appetite guidelines; reason about which data to request from the API; rank; explain every decision in plain English.
- Tiers: MVP (query API, apply appetite with logic, rank, brief explanations, 50+ submissions). Strong (agent constructs queries dynamically; detailed explanations; edge cases: missing fields, API issues). Exceptional (traceable agentic reasoning; adapts, e.g. deepens analysis for high-value; explains contradictions; polished actionable UI). Bonus: 1-2 external APIs that visibly change ranking + explain how.
- Priorities stated: (1) agentic reasoning, (2) explanations, (3) UI polish. Pitfalls: hardcoding queries, ignoring schema discovery, no explanations, dot-paths on arrays (use $elemMatch), references without $expand, over-investing in enrichment.
- Underwriters check: appetite guidelines, outside risk data (flood zones, climate, business health), portfolio context ("are we already exposed to this risk?").
- API: token POST https://auth.product.federato.ai/oauth/token (client_credentials, audience https://product.federato.ai/core-api), 4 h tokens. POST https://product.federato.ai/integrations-api/handlers/federato-hack-north?outputOnly=true with {"action":"schema"} or {"action":"query","payload":{resource, where, expand, unwind, filter, over, select, sort, pagination}} (Mongo-flavored; aggregations $sum/$avg/$min/$max/$count/$countDistinct; errors come as "[CODE] message" strings). Credentials in /Users/ben/Code/hackathons/htn-2026/atlas/.env. Schema saved: /Users/ben/Code/hackathons/htn-2026/federato/schema.json; full data pulled: federato/data/*.json.

## Federato data facts (verified by pulling everything)
- Resources: Submission, Policy, Insured, Location, Building, Claim, Coverage, ExposureUnit, Broker, Contact, Underwriter, Endorsement. Field lists: see schema.json.
- 158 submissions (lines: property 38, health 36, cgl 21, auto 20, cyber 18, excess 15, lpl 10). 113 are status "bound" and each has a Policy (premium, target_premium, technical_premium, business_type new/renewal, exposure_units -> Location -> Building, claims, coverages). 45 have NO policy: declined 14 (with decline_reason = human ground truth), lost 10, and the OPEN QUEUE of 21 (received 7, cleared 7, quoted 7; lines: property 6, cgl 5, health 5, auto 3, lpl 1, cyber 1).
- Open-queue submissions lack premium and direct building links: TIV must come via Insured.hq (Location) -> buildings; premium missing -> estimate from comparable bound policies' technical_premium/TIV AND request from broker (Contact has email).
- 70 Locations, ALL US (CA 19, TX 9, TN 8, FL 7, IL 5, AZ 4, WA 4, CO 4, NJ 4, MO 2, MA 2, GA 2). Each has latitude, longitude, county, zip, hazard_tags (flood 31, wildfire 23, hail 17, tornado 15, earthquake 14, winter_storm 8, hurricane 6, wind 5), protection_class 1-10.
- 129 Buildings: tiv $0.9M-$45.3M, year_built 1948-2024 (71 pre-1990), construction_type (Fire Resistive 21, Frame 19, Non-Combustible 19, Masonry Non-Combustible 17, Joisted Masonry 15, Modified Fire Resistive 15, Wood Frame 14, Steel Frame 9), sprinklered, roof_year (26 missing), stories, sq ft.
- 76 active policies ($62.4M premium) = the existing portfolio. 179 claims (causes incl. water_damage, maternity, surgical, catastrophic_claim, rear_end: many lines).
- Insured websites are fake (.example.com). Insured has sic/naics, revenue, employees, year_founded.

## 2025 appetite guideline (commercial property)
| Factor | Acceptable | Target | Not acceptable |
| Submission type | New business | | Renewal |
| Line | Property | | All other lines |
| Primary risk state | OH PA MD CO CA FL NC SC GA VA UT | OH PA MD CO CA FL | All other states |
| TIV | up to $150M | $50M-$100M | over $150M |
| Total premium | $50K-$175K | $75K-$100K | under $50K or over $175K |
| Building age | newer than 1990 | newer than 2010 | older than 1990 |
| Construction | >50% JM, non-combustible/steel, or masonry non-combustible | | >50% other types |
| Loss value (5 yr) | under $100,000 | | over $100,000 |
Required data points: account name, primary risk state, line of business, effective/expiration dates, TIV, construction type, building year, premium, five-year loss history.

## Verified external hazard sources (all tested live, free, no key)
- Flood: Esri Living Atlas copy of FEMA NFHL (FEMA's own server blocks Canadian IPs): https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Flood_Hazard_Reduced_Set_gdb/FeatureServer/0/query?geometry=LON,LAT&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE,ZONE_SUBTY,SFHA_TF,esri_symbology&returnGeometry=false&f=json -> Miami Beach "AE, 1% annual chance, SFHA T"; empty = outside mapped hazard area.
- OpenFEMA: DisasterDeclarationsSummaries by state/county; FimaNfipClaims by county (deprecated after Oct 15 2026, still works).
- Earthquake: USGS fdsnws event query, count of M4+ within 50 km over 30 yr (LA 71, Tampa 0).
- Wildfire: USFS Wildfire Hazard Potential ImageServer identify (NoData in dense urban areas by design).
- Wind/storm proxy: Open-Meteo archive daily wind_gusts_10m_max, precipitation_sum. NOAA has no point API (gap).
- Geocode check: Nominatim reverse (1 req/s, User-Agent required).
All lookups should run once and cache to disk.

## Intact side (consumer, Canada)
- Intact brief + 5 criteria in TRACKS.md (functional prototype reimagining how people get car/tenant insurance; complete or partial quoting experience; UX + accessibility; README with problem, AI use, user journey, assumptions/limitations; built at the hackathon).
- Toronto data pack and fairness guardrails already researched: /Users/ben/Code/hackathons/htn-2026/intact/GEO-PLAN.md (TPS break-ins/auto theft/collisions to mid-2026 as points offset to intersections; fire stations, hydrants, basement flooding, floodline; speed cameras removed Nov 2025; loss-matched crime types only; capped factors x0.92-x1.10 each, location total x0.85-x1.25; fairness audit). Earlier consumer-flow and pricing-honesty work: /Users/ben/Code/hackathons/htn-2026/intact/PLAN.md.
- Personal lines are underwritten automatically at quote time (instant approve, refer odd cases), so the consumer side is "the same engine, instant decision".

## Existing drafts to improve on (not to copy blindly)
- /Users/ben/Code/hackathons/htn-2026/federato/PLAN.md (my current plan incl. LOCKED section, scoring rules, timeline, demo).
- /Users/ben/Code/hackathons/htn-2026/rbc/DESIGN.md (the "no number from a model" discipline, verify-before-display, interval thinking) is the house style.
- Integration facts (OpenAI Agents SDK, Sentry, Linq, Composio, ElevenLabs, Gemini Maps grounding, Expo Go maps, Elastic geohex, H3): /Users/ben/Code/hackathons/htn-2026/federato/INTEGRATIONS.md (being written now; read it if present, and verify anything you rely on that isn't there).

## Repo scaffold (already created, no feature code)
/Users/ben/Code/hackathons/htn-2026/atlas/: api/ (uv, Python 3.12, FastAPI, src/atlas_api/), web/ (Next.js app router, TS, Tailwind), app/ (Expo tabs template), packs/us, packs/toronto, data/federato -> federato data, docs/federato -> docs, .env (Federato creds; other keys coming).
