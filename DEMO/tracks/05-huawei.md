# Huawei openJiuwen: five-minute demo

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md)

## Context and angle

This is the weakest service-fit story. Pixie implements bounded multi-agent collaboration on the OpenAI Agents SDK and its own scheduler. It does not import or execute openJiuwen, JiuwenSwarm or WorkSwarm. Do not describe it as an openJiuwen integration. Enter this track only if the actual judging rules accept an orchestration concept without using their framework.

Opening: "We made specialist collaboration visible and bounded, so an underwriter can inspect why a case changed."

## Prepare

First resolve track eligibility with the organisers. If service usage is required, skip this track. If the conceptual demo is eligible, open `/live` on a recorded case with ask/answer and conflict events.

## Timed script

| Time | Show and say |
|---|---|
| 0:00-0:40 | State the implementation honestly: OpenAI Agents SDK with a custom scheduler. Explain the collaboration problem. |
| 0:40-1:45 | Show one addressed question and answer in the event lanes. Explain typed payloads and the per-case append-only ledger. |
| 1:45-2:50 | Show the code-set depth floor and bounded ask rounds. A case that code settles does not need a model conversation. |
| 2:50-4:10 | Show a computed conflict and the allowed resolution options. Explain what the Lead can choose and what it cannot override. |
| 4:10-5:00 | Discuss what a future openJiuwen adapter would replace. Label this as a proposed port, not completed work. |

## Service detail to know

`events.py` supplies typed event payloads and `CaseFile.fold()`. `desk.py` schedules the roles and bounded asks. Conflict detection compares structured findings; the Lead chooses from allowed options. Content-hash event ids support idempotent storage. These are architectural choices in Pixie, not proof of Huawei SDK capabilities.

## Evidence

Code: `api/src/atlas_api/events.py`, `desk.py`, `challenger.py`, `case_store.py`. Tests: `test_events.py`, `test_desk.py`, `test_challenger.py`.

## Limitation to say

"We have not used openJiuwen. This demonstrates the orchestration idea, subject to whether your track accepts it."

## If it fails

If SDK usage is mandatory, spend the time on a stronger track instead. There is no honest fallback that turns another SDK into openJiuwen.

## Likely question

Where is the openJiuwen call? "There is none in this build." Do not evade this question with a lanes screenshot.
