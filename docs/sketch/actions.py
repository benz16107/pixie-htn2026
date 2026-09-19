"""Real-world actions: one outbox, four channels. Priority: Composio > Linq > Gemini > ElevenLabs.

Every action is an OutboxItem with an idempotency key, so a retried desk run, a double-clicked button
or a replayed demo never sends twice. Every send is dry-run-able (ATLAS_ACTIONS=dry|live) and every state
change is a DeskEvent (kind='action') so it shows in the Lead's lane.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

Channel = Literal["composio_gmail", "linq_imessage", "gemini_maps", "elevenlabs_tts"]
Status = Literal["proposed", "sent", "failed", "skipped_duplicate", "dry_run"]


@dataclass(frozen=True)
class OutboxItem:
    key: str                       # sha256(channel, case_id|digest_id, template id, facts hash)
    channel: Channel
    case_ids: tuple[str, ...]
    rendered: dict[str, Any]       # subject/body/text; numbers verified against facts before render
    status: Status
    external_id: str | None        # gmail message id / linq message id / mp3 path
    error: str | None


class Outbox:
    """cache/outbox.jsonl. submit() returns the existing item if the key was already sent."""
    def submit(self, item: OutboxItem) -> OutboxItem: raise NotImplementedError
    def get(self, key: str) -> OutboxItem | None: raise NotImplementedError


# ---- 1. Composio: request missing data from the broker ---------------------------------------------

def request_broker_info(case_id: str, flippers: list[Any], contact_name: str, demo_inbox: str) -> OutboxItem:
    """Template email listing exactly the Missing/Estimated facts that could flip the decision, why each
    matters ("premium decides between target and not acceptable"), and a reply-by. Sent via
    composio.tools.execute("GMAIL_SEND_EMAIL", user_id=COMPOSIO_USER_ID,
        connected_account_id=COMPOSIO_GMAIL_ACCOUNT,   # explicit: known multi-account routing trap
        arguments={recipient_email: demo_inbox, subject, body}).
    Contact emails in the data are synthetic, so recipient = demo_inbox; greeting uses contact_name."""
    raise NotImplementedError


def poll_broker_replies(since: str) -> list[dict]:
    """STRETCH: GMAIL_FETCH_EMAILS for replies with 'SUB-138' in subject; a reply with a premium becomes a
    Finding(Known, source='broker email <id>') -> interval collapses live. Cut first in the Composio lane."""
    raise NotImplementedError


# ---- 2. Linq: iMessage digest out, decisions in ---------------------------------------------------

@dataclass(frozen=True)
class Digest:
    id: str                        # "D-0919-2310"
    items: tuple[tuple[int, str], ...]   # (1, "SUB-138"), (2, "SUB-143"), ... the index -> case map is stored
    text: str


class LinqClient:
    """Base path + auth scheme from config, verified at setup (v3: /v3/chats, Authorization: Bearer;
    partner v2: /api/partner/v2/chats/{id}/chat_messages, X-LINQ-INTEGRATION-TOKEN)."""
    def send(self, to_handle: str, text: str) -> str: raise NotImplementedError      # returns message id


def send_digest(to_handle: str, top: list[Any]) -> Digest:
    """Top N (default 3) cases by the desk: '1) Lumen Data Works, FL, 54-81, needs premium. 2) ...
    Reply approve 1 / refer 2 / why 3'."""
    raise NotImplementedError


@dataclass(frozen=True)
class InboundCommand:
    verb: Literal["approve", "refer", "decline", "why", "unknown"]
    index: int | None
    raw: str
    sender: str


def parse_inbound(raw_payload: dict) -> InboundCommand | None:
    """1) ALWAYS append raw payload to cache/linq_inbound.jsonl first (shape unverified).
    2) Verify webhook-signature (Standard Webhooks, HMAC-SHA256 over id.timestamp.body) when a secret is set.
    3) Tolerant extraction: event_type=='message.received', data.parts[type=text].value, sender_handle.handle.
    4) Regex r'^(approve|refer|decline|why)\\s+(\\d+)$' (case-insensitive). Only allow-listed senders."""
    raise NotImplementedError


def apply_command(cmd: InboundCommand, digest: Digest) -> Any:
    """approve/refer/decline -> DeskEvent(actor='human', kind='decision') on that case; SSE pushes it to
    the web queue. 'why N' -> reply with the case's verified explanation. Idempotent by message id."""
    raise NotImplementedError


# ---- 3. Gemini: grounding with Google Maps ('what's around this address') ---------------------------

@dataclass(frozen=True)
class SurroundingsCard:
    site_id: str
    summary: str                   # model text; shown as quoted, never parsed into numbers
    places: tuple[dict, ...]       # PlaceCitation: name, maps URL
    subjectivity: str | None       # e.g. "inspect: fuel station adjacent" chosen from a closed list by the Hazard agent


def surroundings(site_id: str, lat: float, lng: float, question: str) -> SurroundingsCard:
    """client.interactions.create(model=GEMINI_MODEL, input=question, tools=[{type: google_maps, latitude, longitude}]).
    Cached by (site_id, question). If the region blocks the tool, card says 'unavailable' and nothing else changes."""
    raise NotImplementedError


# ---- 4. ElevenLabs: spoken briefing / read my quote -----------------------------------------------

def speak(text: str, voice_id: str, purpose: Literal["queue_briefing", "quote_receipt"]) -> str:
    """text_to_speech.convert(model_id='eleven_flash_v2_5'); mp3 cached at cache/tts/<sha(text)>.mp3.
    Text is built from verified facts only. Returns a URL path. A pre-rendered mp3 ships in the repo."""
    raise NotImplementedError
