# The five-minute rehearsal

## Say this first

"Pixie helps an underwriter decide what to investigate before deciding what to insure. Missing facts produce a score interval. Agents gather evidence, and code recomputes the decision."

For renter tracks: "Pixie gives a renter an itemised quote and sends difficult cases into the same underwriting desk. The phone and desk use the same API, with separate rules for renters and commercial property."

## Prepare before judging

Everything runs on macserver. Turn on Tailscale on the laptop and phone. Open `http://macserver:3100/queue`; Expo Go uses `exp://100.95.223.110:8081`. Verify that IP with `tailscale ip -4` on macserver if it changes. The phone must use a reachable `EXPO_PUBLIC_API_URL`, not localhost. A fixture-only phone is not proof of a live Gemini or referral workflow.

1. Click **reset demo** once before rehearsal. It restores the filed guideline and case actions. It cannot unsend emails or texts, and clearing deduplication means the next send can send again.
2. Open three tabs: `/cases/138`, `/live`, and the screen named on your track card. Keep `/backtest` ready for questions.
3. On case 138, inspect the current score and provenance. Recorded estimates, broker replies and guideline edits change the display. Read the screen instead of reciting a memorised value.
4. On `/live`, select **Case run** or press `2`. Confirm the **RECORDED RUN** badge. Press `e` to skip to the end; `[` and `]` seek five seconds through the recording. **Run the demo** runs a short queue/case/actions sequence. It does not send the draft for you.
5. On the phone, complete one quote with a prepared Toronto address. Keep its receipt visible. If using Gemini, warm the exact photo and address you will show.
6. Check the sponsor's status endpoint from its card. Keep a local screen recording on the laptop. A recording on macserver is useless if the laptop cannot reach home.

Use [recovery](5-IF-IT-BREAKS.md) if any step fails. Do not spend the judge's five minutes restarting infrastructure.

## Default commercial demo

| Time | Click | Say |
|---|---|---|
| 0:00-0:35 | Queue, open case 138 | "This submission is incomplete. The useful question is which missing fact could change our decision." |
| 0:35-1:25 | Case 138, Score breakdown and fact rows | "Known, estimated and missing facts are separate. This interval is computed from the guideline. It is not model confidence." Point at the current premium provenance. |
| 1:25-2:20 | Move the premium what-if slider, then **back to what we know** | "This is a hypothetical confirmed premium. The engine recomputes the whole case. A slider does not write a fact into the case." Read the displayed result. |
| 2:20-3:20 | `/live`, **Case run**, then `e` if needed | "This is a recorded run. Here are the specialist findings and the Challenger's objection. We keep the original evidence and the resolution." |
| 3:20-4:25 | The sponsor-specific screen | Follow your track card. For Federato, apply one guideline scenario and show the actual diff. For Composio, apply the captured broker reply. |
| 4:25-5:00 | The result, then stop clicking | "The demo proves an inspectable decision workflow. The rules and prices still need validation before real insurance use." Invite a technical question. |

Do not add the phone to this commercial script unless that track benefits from it. Intact, Expo and Gemini have their own phone-first cards.

## Between judges

Close overlays, return the what-if slider, and click reset demo if you changed stored facts, overrides or guidelines. Check the next card's prerequisites. Reopen the right phone thread before Linq. Do not start a live agent run just before another judge: it can take minutes and alter the case.
