/**
 * atlas API contract: what web/ (Next.js) and app/ (Expo) consume. Mirrors the pydantic models 1:1.
 * Generated later by `uv run atlas-api --openapi > web/src/lib/openapi.json`; hand-written here as the spec.
 *
 * Endpoints (FastAPI, api/src/atlas_api/http.py):
 *   GET  /queue?region=us&status=open|history      -> QueueRow[]
 *   GET  /cases/{id}                                -> CaseView
 *   GET  /cases/{id}/events?after=<seq>             -> text/event-stream of Event (SSE; the swimlane tails this)
 *   POST /cases/{id}/run {depth?, mode?}            -> {ok}            (202; watch events)
 *   POST /cases/{id}/actions {kind}                 -> Event (action_result)
 *   POST /ask {question}                            -> AskResult
 *   GET  /portfolio/hexes?res=5&hazard=flood&with=case_id  -> Hex[]   (with= adds the what-if overlay)
 *   GET  /backtest                                  -> BacktestReport (reads web/public/backtest/latest.json)
 *   POST /quote {address|lat,lng, unit, contents, deductible, claims_5y, sewer_backup}  -> QuoteView
 *   GET  /quote/{caseId}                            -> QuoteView
 *   GET  /geocode?q=                                -> {label, lat, lng}[]   (Toronto address points; Nominatim fallback)
 *   POST /webhooks/linq                             -> {ok}  (raw stored first)
 */

export type Region = "us" | "toronto";
export type Actor = "lead" | "intake" | "appetite" | "hazard" | "portfolio" | "underwriter" | "broker" | "system";
export type Verdict = "accept" | "refer" | "decline" | "out_of_guideline";
export type Band = "target" | "acceptable" | "not_acceptable" | "unknown";
export type Depth = "skim" | "standard" | "deep";
export type Kind =
  | "query" | "query_retry" | "finding" | "estimate" | "gap" | "plan" | "ask" | "answer"
  | "conflict" | "decision" | "action" | "action_result" | "inbound" | "note";

export interface Source { kind: "api" | "derived" | "estimated" | "external" | "answer" | "missing"; ref: string; cites: number[] }

export interface Event<P = Payload> {
  id: string; case_id: string; seq: number; ts: string;
  actor: Actor; kind: Kind; subject: string; payload: P; refs: string[]; key: string;
}

export type Payload =
  | { kind: "finding"; factor: string; band?: Band; points?: number; multiplier?: number; cap?: number;
      value?: string | number; evidence: string; source: Source; severity: "info" | "warn" | "block" }
  | { kind: "query"; query: Record<string, unknown>; why: string; rows?: number; ms?: number }
  | { kind: "query_retry"; error: string; fix: string }
  | { kind: "plan"; depth: Depth; proposed_by_code: Depth; reason: string }
  | { kind: "ask"; to: Actor; question: string }
  | { kind: "answer"; text: string }
  | { kind: "conflict"; kind2: "target_vs_fail" | "hazard_vs_appetite" | "portfolio_vs_appetite" | "estimate_vs_stated";
      a: string; b: string; resolution?: string; reason?: string }
  | { kind: "decision"; verdict: Verdict; explanation: string; top_factors: string[]; by: "desk" | "underwriter" | "deterministic" }
  | { kind: "action"; action: "request_info" | "notify" | "places_card"; to?: string; body: string; subject?: string }
  | { kind: "action_result"; ok: boolean; provider: string; external_id?: string; artifact?: string; error?: string }
  | { kind: "inbound"; channel: "linq"; raw: unknown; parsed?: { verb: string; n: number } }
  | { kind: "note"; text: string }
  | { kind: "estimate"; field: string; value: number; method: string; comparables: number[] }
  | { kind: "gap"; field: string; why: string; how_to_fill: string };

export interface Factor { name: string; band: Band; value: string | number | null; source: string; rule: string; event_id: string }
export interface Score { points: number; appetite_points: number; enrichment_delta: number; portfolio_delta: number; hard_fail: boolean; verdict: Verdict }
export interface Lane { actor: Actor; events: Event[] }

export interface CaseView {
  case: { id: string; region: Region; line: string; insured_name: string; submission_status: string | null;
          human_outcome: string | null; contact: { name: string; email: string | null; broker: string } | null;
          locations: { id: number; lat: number; lng: number; state: string | null; hazard_tags: string[]; tiv: number; address: string }[] };
  score: Score;
  factors: Factor[];
  risk_factors: Extract<Payload, { kind: "finding" }>[];
  portfolio: Extract<Payload, { kind: "finding" }> | null;
  gaps: string[];
  conflicts: Event[];
  depth: Depth;
  decision: Extract<Payload, { kind: "decision" }> | null;
  explanation: string;
  lanes: Lane[];               // ordered lead, intake, appetite, hazard, portfolio, underwriter
  actions: Event[];
  updated_seq: number;
}

export interface QueueRow {
  case_id: string; rank: number; points: number; verdict: Verdict; insured: string; line: string; state: string | null;
  tiv: number | null; premium: { value: number | null; source: string }; gaps: number; depth: Depth;
  top_reason: string; enrichment_delta: number; decided_by: "desk" | "underwriter" | "deterministic" | null;
}

export interface AskResult {
  question: string;
  attempts: { query: Record<string, unknown>; issues: string[]; error?: string; rows?: number; ms?: number }[];
  final: Record<string, unknown> | null; rows: { total: number; results: Record<string, unknown>[] } | null; rationale: string;
}

export interface Hex { id: string; center: [number, number]; boundary: [number, number][]; values: Record<string, number> }

export interface ReceiptLine { name: string; dollars: number; reason: string; source: string; capped: boolean; hex_ids: string[] }
export interface QuoteView {
  caseId: string;
  decision: "approve" | "refer";
  refer_reason?: string;
  receipt: { base: number; lines: ReceiptLine[]; total: number; monthly: number; disclaimer: string };
  hexes: Hex[];                // plain polygons; the phone never runs h3
  summary_text: string;        // one sentence for aria-live / VoiceOver
  underwriter_url: string;     // `${WEB}/cases/${caseId}` : View as underwriter
}

export interface BacktestReport {
  n: number; decline_recall: [number, number]; by_reason: Record<string, [number, number]>;
  false_declines: [number, number]; loss_ratio_by_bucket: { top: number; mid: number; bottom: number };
  enrichment_changed_rank: number; out_of_guideline: number; answer_key: [number, number]; note: string;
  cases: { id: number; line: string; human: string; verdict: Verdict; points: number; hard_fail: boolean; lane_hit: boolean | null; loss_ratio: number | null }[];
}

// Expo client (app/lib/api.ts): fetch wrapper with API_URL from app.json extra; no other client-side logic.
export declare const api: {
  quote(req: { address?: string; lat?: number; lng?: number; unit: "basement" | "ground" | "upper"; contents: number;
               deductible: 500 | 1000 | 2500; claims_5y: 0 | 1 | 2; sewer_backup: boolean }): Promise<QuoteView>;
  geocode(q: string): Promise<{ label: string; lat: number; lng: number }[]>;
};
