import type { CaseView, DeskEvent, Interval, QueueRow } from "@/contract";
import { parseHazard, parseSkip, prettyBands, signed } from "./format";

export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
/** The browser talks to the API through the same-origin proxy in app/api/atlas. */
export const PROXY = "/api/atlas";

export type CaseState = {
  row: QueueRow;
  status: "waiting" | "working" | "settled";
  events: DeskEvent[];
  score: Interval;
  modelSteps: number;
  costUsd?: number;
  ms?: number;
  /** Cases the desk decided in code alone never open an event stream. */
  codeOnly: boolean;
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Model-driven steps: everything an agent wrote, excluding the deterministic system log. */
export const isModelStep = (e: DeskEvent) => e.actor !== "system" && e.kind !== "tool_call" && e.kind !== "run_stats";

/** Bookkeeping the desk writes for itself: useful as numbers, noise as cards. */
export const isPlumbing = (e: DeskEvent) => e.kind === "run_stats";

export function foldScore(events: DeskEvent[], fallback: Interval): Interval {
  const last = [...events].reverse().find((e) => e.kind === "assessment" && e.body.score);
  return (last?.body.score as Interval | undefined) ?? fallback;
}

export type Chat = { id: string; who: string; line: string; tone: "plain" | "ask" | "answer" | "conflict" | "decision" };

/** One readable English line per event worth reading aloud. Silent on plumbing. */
export function chatLine(e: DeskEvent): Chat | null {
  const b = e.body;
  const text = prettyBands(str(b.text));
  const who = e.actor.charAt(0).toUpperCase() + e.actor.slice(1);
  const mk = (line: string, tone: Chat["tone"] = "plain"): Chat => ({ id: e.id, who, line, tone });
  switch (e.kind) {
    case "plan":
      return mk(text.replace(/^Deep dive \((\w+)\):\s*/i, (_, d) => `is going deep (${d}). `));
    case "ask":
      return mk(`asks ${e.to}: “${str(b.question) || text}”`, "ask");
    case "answer":
      return mk(`answers ${e.to}: ${text}`, "answer");
    case "estimate":
      return mk(`estimates ${text}`);
    case "finding": {
      if (b.skipped) {
        const s = parseSkip(str(b.skipped), text);
        return mk(`skipped the ${s.peril.toLowerCase()} lookup: ${s.reason}`);
      }
      if (/\(x[\d.]+,\s*[+-]?[\d.]+\s*pts\)/i.test(text)) {
        const h = parseHazard(text);
        return mk(`found ${h.peril.toLowerCase()}: ${h.sentence} (×${h.multiplier?.toFixed(2)}, ${signed(h.points ?? 0)} pts)`);
      }
      return mk(`found ${text}`);
    }
    case "assessment":
      return mk(text.replace(/^Re-assessed:/, "re-scored").replace(/^Triage/, "triaged"));
    case "conflict":
      return mk(`flags a conflict: ${text}`, "conflict");
    case "resolution": {
      const [, choice = "", why = ""] = text.match(/->\s*([a-z_]+):\s*(.*)$/i) ?? [];
      return mk(`resolves it by ${choice.replaceAll("_", " ")}. ${why}`, "decision");
    }
    case "decision":
      return mk(text, "decision");
    case "action":
      return mk(`${text} (${str(b.status)})`, "decision");
    case "query_retry":
      return mk(`had a query rejected: ${str(b.error).replace(/^\[\w+\]\s*/, "")}, and rewrote it`);
    case "note":
      return mk(text);
    case "run_stats":
    case "tool_call":
      return null;
    default:
      return text ? mk(text) : null;
  }
}

/** The broker email the desk proposed, composed from the case and the run's own events. */
export function brokerEmail(c: CaseView | null, events: DeskEvent[]) {
  const facts = events
    .filter((e) => e.kind === "action")
    .flatMap((e) => (Array.isArray(e.body.facts) ? (e.body.facts as string[]) : []));
  const asked = facts.length ? facts : c?.decision.kind === "open" ? c.decision.flippers.map((f) => f.fact) : [];
  const broker = events
    .map((e) => str(e.body.text).match(/"name":\s*"([^"]+)"/)?.[1] ?? "")
    .find((n) => n.length > 0);
  const premium = c?.facts.find((f) => f.id === "premium");
  const tiv = c?.facts.find((f) => f.id === "tiv");
  return {
    to: broker ? `${broker} (submission broker)` : "the submitting broker",
    subject: `Submission ${c?.caseId ?? ""} ${c?.title ?? ""}: ${asked.join(", ") || "open items"}`,
    body: [
      `We are reviewing ${c?.title ?? "this submission"} (${c?.caseId ?? ""}).`,
      tiv ? `TIV reads ${tiv.display} from ${tiv.source}.` : "",
      premium ? `We have no premium on file; our own comparables put it at ${premium.display}.` : "",
      asked.length ? `Please confirm: ${asked.join(", ")}.` : "",
      "Once that lands the file can be priced against the 2025 property guideline.",
    ].filter(Boolean),
  };
}

/** The iMessage digest, built from the live queue. */
export function digestText(rows: QueueRow[]) {
  const open = rows.filter((r) => r.decision.kind === "open").slice(0, 3);
  const lines = open.map(
    (r, i) => `${i + 1}. ${r.insured} · ${r.line} ${r.state} · ${r.score.lo}-${r.score.hi} · $${(r.valueAtStake / 1e6).toFixed(1)}M`,
  );
  return {
    lines: lines.length ? lines : ["Nothing open on the desk right now."],
    head: `Pixie desk · ${rows.length} submissions, ${rows.filter((r) => r.decision.kind === "open").length} open`,
    foot: "Reply approve 1, refer 1, or why 1.",
  };
}
