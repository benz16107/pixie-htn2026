"use client";
import type { Quote } from "./types";

export type DigestState = { text: string; status: string; caseIds: string[] } | null;

/** A phone-shaped mirror so the judge sees the phone side without picking one up. */
export function Phone({
  tab,
  setTab,
  digest,
  onSend,
  sending,
  reply,
  quote,
}: {
  tab: "digest" | "quote";
  setTab: (t: "digest" | "quote") => void;
  digest: DigestState;
  onSend: () => void;
  sending: boolean;
  reply: string | null;
  quote: Quote | null;
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex gap-1" role="tablist" aria-label="Phone mirror">
        {(["digest", "quote"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-sm border px-2 py-0.5 text-[11px] transition-colors duration-150 ${tab === t ? "border-ochre bg-ochre text-paper" : "border-rule hover:border-edge"}`}
          >
            {t === "digest" ? "Digest" : "Renter quote"}
          </button>
        ))}
      </div>
      <div className="mx-auto flex min-h-0 w-[196px] flex-1 flex-col rounded-[22px] border-[3px] border-dim bg-paper p-2 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]">
        <div aria-hidden className="mx-auto mb-1.5 h-1 w-10 rounded-full bg-edge" />
        {tab === "digest" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto text-[10px] leading-snug">
            <p className="kicker text-[9px]">iMessage · Pixie desk</p>
            {digest ? (
              <div className="whitespace-pre-line rounded-lg rounded-bl-sm bg-land px-2 py-1.5">{digest.text}</div>
            ) : (
              <p className="text-dim">No digest sent yet.</p>
            )}
            {reply && (
              <>
                <div className="ml-6 rounded-lg rounded-br-sm bg-ochre px-2 py-1 text-paper">{reply.replace(/^.*?:\s*/, "")}</div>
                <div className="rounded-lg rounded-bl-sm bg-land px-2 py-1.5">{reply}</div>
              </>
            )}
            <button
              onClick={onSend}
              disabled={sending}
              className="mt-auto truncate rounded-sm border border-edge px-1.5 py-1 text-[10px] transition-colors duration-150 hover:bg-land disabled:opacity-60"
            >
              {sending ? "Sending…" : digest ? "Send it again" : "Send the digest"}
            </button>
            {digest && <p className="text-center text-[9px] text-moss">{digest.status} to Ben&apos;s phone</p>}
          </div>
        ) : quote ? (
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto text-[10px] leading-snug">
            <p className="kicker text-[9px]">Pixie · renter quote</p>
            <p className="font-semibold">{quote.address}</p>
            <p className="font-serif text-[20px] leading-none">
              ${quote.annual.toFixed(2)}
              <span className="ml-1 font-sans text-[10px] text-dim">a year</span>
            </p>
            <p className="text-dim">about ${quote.monthly.toFixed(2)} a month</p>
            <p className={`num w-fit rounded-sm px-1 text-[9px] uppercase ${quote.decision.kind === "approve" ? "bg-moss text-paper" : "bg-ochre-soft"}`}>
              {quote.decision.kind}
            </p>
            <ul className="mt-1 border-t border-rule pt-1">
              <li className="flex justify-between">
                <span>Base</span>
                <span className="num">${quote.receipt.base.toFixed(2)}</span>
              </li>
              {quote.receipt.lines.map((l) => (
                <li key={l.label} className="flex justify-between gap-2 border-t border-dashed border-rule py-[2px]">
                  <span className="min-w-0 truncate" title={l.source}>
                    {l.label}
                    {l.capped && <span className="ml-0.5 font-mono text-[9px]">[cap]</span>}
                  </span>
                  <span className="num shrink-0">{l.dollars >= 0 ? "+" : "−"}${Math.abs(l.dollars).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[9px] text-dim">{quote.label}</p>
          </div>
        ) : (
          <p className="p-2 text-[10px] text-dim">Switch to Toronto renter to price an address.</p>
        )}
      </div>
      <p className="text-center text-[9px] text-dim">
        {tab === "digest" ? "Mirror of the iMessage thread" : "Mirror of the renter app"} · same API as the phone
      </p>
    </div>
  );
}
