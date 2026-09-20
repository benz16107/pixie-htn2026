# Intact video script, first draft

Target length: about three minutes, including pauses and cuts. This is an editing target, not a claimed submission limit. Check the final Devpost requirements before exporting.

Open [the Intact presentation](http://macserver:3112/intact/present). This is a website slideshow for recording and for judges to explore. The Expo app stays a consumer app.

The deck uses the Federato deck's slide/demo switch, remembered position, and keyboard navigation, with Pixie's warm consumer palette. Actual product captures accompany the script. Capture the final video at 1920 × 1080; record the phone separately and cut to a readable close-up rather than filming a tiny phone beside the browser.

## Recording controls

- Left/Right or Space moves between slides. Home/End jumps to the beginning/end.
- N opens the narration and shot list. Close it before recording.
- R toggles the clean recording view. Escape restores controls or returns to the demo.
- P switches between slides and the Intact demo. When opened as an overlay, the underlying demo stays mounted.
- Open demo uses the current slide's working route. Phone routes open the Expo browser preview in another tab, which is a rehearsal aid. Record the actual iPhone separately for the final video.
- Slide links preserve the chapter in the URL. There is no automatic advance; pause for the phone footage.

## Before recording

Keep API port 8000 and Expo port 8081 available. Start the MCP HTTP server on 8010 for the agent segment. Use a driver browser profile and a separate witness profile. Upload one labelled illustration, leave it pending, and have its insurer review ready. Do not use a real person's claim or personal footage.

The static slideshow works without those services. Its screenshots are captured product examples, not live embeds. If Apple signing is unfinished, narrate the widget-preview line as written. If you successfully capture the native widget, replace that sentence with: "In the signed iPhone build, the widget and Live Activity keep the latest drive score visible." Do not imply continuous background tracking.

## 1. One app · 0:00 to 0:15

**Say**

When I am shopping for a car or moving into a new place, I want to understand insurance before I commit. Pixie brings estimates, choices, prevention, and recovery into one consumer app.

**Show**

- Open on this slide for five seconds, then cut to the phone Home screen.
- Switch Home to Auto once. Keep the recording close enough to read.

**Keep accurate**

All prices are illustrative. Home pricing currently covers tenants.

## 2. Your home · 0:15 to 0:40

**Say**

For home insurance, start with what you own. I can photograph belongings, enter their replacement values, and use the total instead of guessing a coverage amount. Then I add an address and a few coverage details to get an itemized tenant estimate.

**Show**

- Show this slide briefly, then record Home → Your belongings.
- Use Try a furnished-room example, or add your own demonstration photo and value.
- Show the room total and Use this total in my estimate.

**Keep accurate**

Values are entered by the customer. There is no automatic object recognition or appraisal.

## 3. Your choices · 0:40 to 1:05

**Say**

A price alone does not explain a policy. Here I can change my deductible and see the estimate respond. The repair-bill example explains what that deductible means in dollars. My existing choices stay unchanged until I save. Every price factor keeps its source.

**Show**

- On the phone choose a Toronto example address, then open Explore price changes first.
- Change the deductible once. Pause on the new monthly estimate.
- Scroll to Try a repair bill and show the customer share.

**Keep accurate**

Keep the API connected for changed tenant inputs. A repair-bill example is arithmetic, not a claim payment promise.

## 4. Your car · 1:05 to 1:25

**Say**

For auto, I want to compare insurance before buying the car. Pixie puts the car payment and an illustrative insurance estimate together, then shows which of three example vehicles fits my monthly budget. The same driver profile makes the comparison consistent.

**Show**

- Switch the phone to Auto and open Compare cars.
- Move the monthly budget slider once and pause on the vehicles that fit.

**Keep accurate**

These are bundled example listings, not a live AutoTrader integration or insurer quotes.

## 5. Your drive · 1:25 to 1:50

**Say**

The experience continues after the estimate. During an opt-in drive, Pixie measures speed changes and hard braking. It evaluates road context separately, so a demanding route is not confused with driving behaviour. The score is coaching only. The app also includes widget and Live Activity previews.

**Show**

- Open Auto → Insights → Drive score and run the Toronto sample.
- Show Driving and Road context separately.
- If the signed iPhone build works, replace the preview shot with a real Home Screen widget and Lock Screen recording.

**Keep accurate**

Current GPS tracking is foreground-only. Widgets require a signed native build; do not present the in-app preview as native proof.

## 6. Your community · 1:50 to 2:25

**Say**

After an incident, the driver can record what happened and request another perspective. A bystander can contribute a photo or clip. The insurer reviews those same files, with their hashes and declared metadata. Accepted witness contributions earn a simulated credit. Here, two dollars can go toward Home, Auto, or a split. It is one shared balance, and no real insurer discount is connected.

**Show**

- Cut to the phone Community screen, then the driver incident with an open witness request.
- Use a separate witness device or browser profile to show the contributed file.
- Cut to the web Insurer tab, accept the file with a note, then cut back to witness Home or Compare.
- Move the credit to Auto. Show the before, credit, and simulated next-payment rows.

**Keep accurate**

Use illustrated or consented test material. A hash proves byte integrity, not authenticity or fault. Pending uploads earn no credit.

## 7. Your agent · 2:25 to 2:45

**Say**

Customers can also reach these tools through an AI agent. This page makes one MCP request visible: the chosen tool, its inputs, and the sourced result. Deterministic code calculates the price. An agent can choose the tool and explain the answer without inventing the premium.

**Show**

- Show the slide, then open the MCP demo.
- Use Tenant estimate. Change the contents amount and click Run live agent request.
- Hold the shot on the result and its source lines.

**Keep accurate**

The web demonstration selects a preset tool; it is not an autonomous planning agent. No full customer profile is exposed.

## 8. The result · 2:45 to 3:00

**Say**

Pixie makes insurance easier to explore and easier to understand. The phone helps the customer take the next step. The insurer gets the evidence. And the same controlled tools remain available through an agent.

**Show**

- Return to this slide. Leave it on screen for the closing sentence.
- Keep the prototype limitations visible for the final three seconds.

**Keep accurate**

Tenant Home pricing only. Auto examples and credits are illustrative. No real policy binding or claim submission.

## Edit and submission notes

Use the slides for the opening idea and transitions. Most of the runtime should show a real interaction. Narration explains why the action matters; do not read every button. Keep the cursor still during a cut to the phone. Use the displayed values from your take rather than reciting a hardcoded quote.

For the gallery, capture the opening, inventory, price-choice, witness-credit, and MCP slides in recording view. Add real native widget evidence only after verifying it on an iPhone. Caption all examples as prototype data. The current captures and their provenance are listed in `web/public/intact/presentation/README.md`.

Narration and recording cues also live in `web/src/app/intact/present/slides.ts`. Update both when revising this draft.
