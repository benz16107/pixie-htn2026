"""atlas.actions: the three real-world actions, all idempotent by event key, all recorded as events.

Priority (LOCKED): 1 Composio broker email, 2 Linq iMessage digest + reply loop, 3 Gemini places card.
Every perform() writes an action_result event; a second perform() with the same key returns the stored result
without calling the provider (the demo may click twice; the judge's phone gets one text).
"""
from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import BaseModel

from .case import CaseStore, CaseView, Event, Kind

ActionKind = Literal["request_info", "notify", "places_card"]


class ActionP(BaseModel):
    kind: ActionKind
    to: str | None                       # email or phone; None for places
    body: str                            # rendered text (email body / iMessage); numbers checked
    subject: str | None = None


class ActionResultP(BaseModel):
    ok: bool
    provider: Literal["composio", "linq", "gemini", "cache"]
    external_id: str | None = None
    artifact: str | None = None          # path to json card
    error: str | None = None


class Actions:
    def __init__(self, store: CaseStore, *, composio_key: str | None, composio_user: str, gmail_account_id: str | None,
                 linq_token: str | None, linq_chat_id: str | None,
                 gemini_key: str | None, gemini_model: str, artifacts: Path): ...

    @classmethod
    def from_env(cls, store: CaseStore) -> "Actions":
        raise NotImplementedError        # any missing key disables that action (status='unavailable'), never crashes

    def perform(self, ev: Event) -> Event:
        """Dispatch by payload.kind; idempotent by ev.key via store lookup of an action_result with refs=[ev.id]."""
        raise NotImplementedError

    # -- 1. Composio: email the broker for the missing required fields ------------------------------------
    def request_info(self, v: CaseView) -> ActionP:
        """Renders the email from appetite.missing_required + estimate events: 'we estimated premium at $X from
        6 comparable policies; please confirm premium, roof year for buildings 30 and 31'. To: case.contact.email.
        Sent via composio.tools.execute('GMAIL_SEND_EMAIL', user_id, connected_account_id=..., arguments)."""
        raise NotImplementedError

    # -- 2. Linq: digest out, decision in ---------------------------------------------------------------
    def notify_digest(self, top: list[CaseView]) -> ActionP:
        """One iMessage: 'Atlas queue 09:40: 1) Lakeside Medical TX property $35.7M refer (age) 2) ... Reply
        approve N / refer N / decline N'. POST /api/partner/v2/chats/{chat_id}/chat_messages, header
        X-LINQ-INTEGRATION-TOKEN. Sandbox cap 100/day: the digest is one message, replies are acks."""
        raise NotImplementedError

    def inbound_linq(self, raw: dict) -> Event | None:
        """Webhook handler. FIRST store the raw payload as an inbound event (shape unverified per INTEGRATIONS.md),
        THEN parse the text with r'(approve|refer|decline)\\s+(\\d+)' against the last digest's numbering, post a
        decision event (actor=underwriter, by='underwriter') on that case, and ack by iMessage. Unknown text -> ack
        with the three verbs. Idempotent by message id."""
        raise NotImplementedError

    # -- 3. Gemini Maps grounding: the 'what's around this address' card ------------------------------------
    def places_card(self, lat: float, lng: float, question: str) -> ActionResultP:
        """interactions.create(model=gemini_model, tools=[{type: 'google_maps', latitude, longitude}]).
        Stores {text, citations:[{name, url}]} as the artifact; the UI shows Maps sources directly under the text
        (a Google display requirement). points=0 always; it is context for the underwriter, not a score input."""
        raise NotImplementedError



if __name__ == "__main__":
    # check: inbound_linq({'text': 'approve 2', ...}) after a digest of 3 cases posts a decision on the 2nd case and a
    # second identical payload posts nothing new.
    raise SystemExit("TODO")
