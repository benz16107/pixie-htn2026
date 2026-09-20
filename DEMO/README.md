# Pixie judging guide

Updated 2026-09-20 after the website audit. This folder is the current demo script. Older pitch notes in `docs/` are implementation history, not the script to read at the booth.

Start with [the five-minute rehearsal](1-START-HERE.md), then open only the [track card](4-PER-TRACK.md) for your next judge. Each card has the opening line, timed clicks, service internals, proof, limitations and fallback.

- [How the system works](0-HOW-IT-WORKS.md) explains the insurance terms and the boundaries between code and models.
- [Every screen](2-SCREENS.md) tells you what to show and what to skip.
- [Questions and stronger wording](3-QUESTIONS.md) prepares you for objections without invented claims.
- [Recovery](5-IF-IT-BREAKS.md) has the startup commands and failure paths.
- [Federato context](6-FEDERATO-BRIEF.md) explains the underwriting workflow.
- [Website audit](7-WEBSITE-AUDIT.md) records the fixes, verification and remaining work.

Five minutes means one problem, one sponsor workflow, one result, one honest limitation. Spend roughly three minutes on that sponsor's service. Do not tour all twelve integrations at every table.

Best prepared technical stories: Federato, OpenAI, Elastic and Composio's captured broker reply. Expo and Intact need a phone rehearsal. Sentry needs a real trace open. Linq needs the correct phone thread. Backboard needs a provider-labelled response. Gemini needs warmed inputs or a working model. Huawei is conditional because this code does not use openJiuwen.
