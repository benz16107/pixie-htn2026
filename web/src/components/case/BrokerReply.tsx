"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type BrokerReply as Reply } from "@/lib/api";
import { usd } from "@/lib/explain";
import { humanize } from "@/lib/format";
import capture from "@/fixtures/broker-reply-138.json";

/**
 * The case closing itself. The desk asked the broker for a fact; this checks whether the answer
 * arrived, verifies it against the email's own words, folds it in as Known, and the interval moves.
 *
 * Two paths, and the badge never guesses which one ran: it reads the API's `path` field and nothing
 * else. `replay` re-runs the whole loop over a captured reply with the network untouched; `live`
 * searches Ben's real Gmail. A replay that could be mistaken for a live call is the one thing this
 * panel must never do.
 */

const BADGE: Record<string, { label: string; note: string; tone: string }> = {
  replay: { label: "REPLAY", note: "captured email, no network used", tone: "border-ochre bg-ochre text-paper" },
  live: { label: "LIVE GMAIL", note: "the real inbox was searched", tone: "border-moss bg-moss text-paper" },
  dry: { label: "DRY RUN", note: "nothing was sent or read", tone: "border-edge bg-land text-dim" },
};

const value = (v: number | string) => (typeof v === "number" ? usd(v) : v);
/** The desk truncates a score to display it; this must show the same two numbers as the readout above. */
const at = (n: number) => Math.trunc(n);

/** The sentence the API checked, when the reply is the capture this build ships. */
function quoteFor(r: Reply): string {
  if (r.quote) return r.quote;
  if (r.path !== "replay" || r.messageId !== capture.messageId) return "";
  const quotes = capture.quotes as Record<string, string>;
  const fact = Object.keys(r.facts ?? {}).find((f) => quotes[f]);
  return fact ? quotes[fact] : "";
}

export function BrokerReply({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [replay, setReplay] = useState(true);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Reply | null>(null);

  const check = async () => {
    setBusy(true);
    const r = await api.brokerReply(caseId, replay);
    setRes(r);
    setBusy(false);
    if (r.status === "applied" && !r.deduped) router.refresh();
  };

  const undo = async () => {
    setBusy(true);
    await api.demoReset();
    setRes(null);
    setBusy(false);
    router.refresh();
  };

  const badge = BADGE[res?.path ?? ""];
  const quote = res ? quoteFor(res) : "";
  const moved = res?.status === "applied" && !res.deduped && !!res.before && !!res.after;
  const btn =
    "shrink-0 border px-2 text-[10px] uppercase leading-[19px] tracking-[0.08em] transition-colors duration-150 disabled:border-rule disabled:text-faint";

  return (
    <section aria-labelledby="br-h" className="mt-1.5 border-y border-rule px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="br-h" className="kicker shrink-0">
          The broker&rsquo;s reply
        </h2>
        <div className="flex shrink-0 border border-rule" role="group" aria-label="Where to look for the reply">
          {(
            [
              [true, "captured email"],
              [false, "real inbox"],
            ] as const
          ).map(([on, label]) => (
            <button
              key={label}
              onClick={() => setReplay(on)}
              aria-pressed={replay === on}
              className={`px-1.5 text-[10px] leading-[19px] transition-colors duration-150 ${
                replay === on ? "bg-raise text-ochre" : "text-faint hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={check} disabled={busy} className={`${btn} border-ochre text-ochre hover:bg-ochre hover:text-paper`}>
          {busy ? "checking…" : "check for a reply"}
        </button>
        {res && (
          <button onClick={undo} disabled={busy} className={`${btn} border-edge text-dim hover:border-ink hover:text-ink`}>
            undo
          </button>
        )}
        {badge && (
          <span className="ml-auto flex shrink-0 items-baseline gap-1.5">
            <span className={`border px-1.5 text-[9px] font-medium uppercase leading-[15px] tracking-[0.1em] ${badge.tone}`}>{badge.label}</span>
            <span className="text-[10px] text-faint">{badge.note}</span>
          </span>
        )}
      </div>

      {res && (
        <div role="status" className="mt-1.5">
          {quote && (
            <p className="cond border-l-2 border-moss bg-moss/[0.07] py-1 pl-2.5 text-[13px] leading-snug text-ink">
              &ldquo;{quote}&rdquo;
              <span className="mt-0.5 block text-[10px] text-faint">the broker&rsquo;s own words, checked against the message before any number moved</span>
            </p>
          )}

          {res.facts && Object.keys(res.facts).length > 0 && (
            <ul className="mt-1">
              {Object.entries(res.facts).map(([fact, v]) => (
                <li key={fact} className="flex flex-wrap items-baseline gap-x-2 text-[11px]">
                  <span className="text-dim">{humanize(fact)}</span>
                  <b className="num font-medium text-ink">{value(v)}</b>
                  <span className="rounded-sm border border-moss/50 bg-moss/10 px-1 text-[9px] uppercase leading-[13px] tracking-[0.06em] text-moss">known</span>
                  <span className="num text-[10px] text-faint">broker email, message {res.messageId}</span>
                </li>
              ))}
            </ul>
          )}

          {moved ? (
            <p className="mt-1 flex items-baseline gap-2.5">
              <span className="num text-[24px] font-medium leading-[26px] text-dim">
                {at(res.before!.lo)}–{at(res.before!.hi)}
              </span>
              <span aria-hidden className="text-[14px] text-faint">
                →
              </span>
              <span className="num text-[24px] font-medium leading-[26px] text-moss">
                {at(res.after!.lo)}–{at(res.after!.hi)}
              </span>
              <span className="text-[11px] text-dim">the score range closed on one number</span>
            </p>
          ) : (
            res.deduped && <p className="mt-1 text-[11px] text-dim">The score range did not move.</p>
          )}

          {res.detail && <p className="cond mt-1 text-[12px] leading-snug text-dim">{res.detail}</p>}
        </div>
      )}
    </section>
  );
}
