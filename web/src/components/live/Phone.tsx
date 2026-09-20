"use client";
import type { Quote } from "./types";

export type DigestState = { text: string; status: string; caseIds: string[] } | null;

/** A phone-shaped mirror so the judge sees the phone side without picking one up. Drawn as a hairline, like a figure in a report. */
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
      <div className="flex gap-4 text-[12px]" role="tablist" aria-label="Phone mirror">
        {(["digest", "quote"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`underline-offset-[5px] decoration-1 transition-colors duration-150 ${tab === t ? "underline" : "text-dim hover:text-ink"}`}
          >
            {t === "digest" ? "Digest" : "Renter quote"}
          </button>
        ))}
      </div>
      <div className="mx-auto flex min-h-0 w-[196px] flex-1 flex-col rounded-[22px] border border-ink bg-paper p-2.5">
        <div aria-hidden className="mx-auto mb-2 h-[3px] w-9 rounded-full bg-ink" />
        {tab === "digest" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto text-[10.5px] leading-[1.4]">
            <p className="folio text-[9px]">iMessage, Pixie desk</p>
            {digest ? <div className="whitespace-pre-line rounded-[10px] rounded-bl-[3px] bg-faint px-2 py-1.5">{digest.text}</div> : <p className="text-dim">No digest sent yet.</p>}
            {reply && (
              <>
                <div className="ml-6 rounded-[10px] rounded-br-[3px] bg-ink px-2 py-1 text-paper">{reply.replace(/^.*?:\s*/, "")}</div>
                <div className="rounded-[10px] rounded-bl-[3px] bg-faint px-2 py-1.5">{reply}</div>
              </>
            )}
            <button onClick={onSend} disabled={sending} className="btn btn-quiet mt-auto !px-1.5 !py-1 !text-[10px]">
              {sending ? "Sending…" : digest ? "Send it again" : "Send the digest"}
            </button>
            {digest && <p className="text-center text-[9px] text-dim">{digest.status} to Ben&apos;s phone</p>}
          </div>
        ) : quote ? (
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto text-[10.5px] leading-[1.4]">
            <p className="folio text-[9px]">Pixie, renter quote</p>
            <p className="font-medium">{quote.address}</p>
            <p className="display-num text-[22px] leading-none">
              ${quote.annual.toFixed(2)}
              <span className="ml-1 font-sans text-[10px] font-normal text-dim">a year</span>
            </p>
            <p className="text-dim">about ${quote.monthly.toFixed(2)} a month</p>
            <p className="sc">{quote.decision.kind}</p>
            <ul className="mt-1 border-t border-ink pt-1">
              <li className="flex justify-between">
                <span>Base</span>
                <span className="num">${quote.receipt.base.toFixed(2)}</span>
              </li>
              {quote.receipt.lines.map((l) => (
                <li key={l.label} className="flex justify-between gap-2 border-t border-faint py-[2px]">
                  <span className="min-w-0 truncate" title={l.source}>
                    {l.label}
                    {l.capped && <span className="sc ml-1 text-[8px]">cap</span>}
                  </span>
                  <span className="num shrink-0">
                    {l.dollars >= 0 ? "+" : "−"}${Math.abs(l.dollars).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[9px] text-dim">{quote.label}</p>
          </div>
        ) : (
          <p className="p-2 text-[10.5px] text-dim">Switch to Toronto renter to price an address.</p>
        )}
      </div>
      <p className="text-center text-[10px] text-dim">{tab === "digest" ? "Mirror of the iMessage thread" : "Mirror of the renter app"}, same API as the phone</p>
    </div>
  );
}
