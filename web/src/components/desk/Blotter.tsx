"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { DeclinesInsight } from "@/lib/api";
import type { Row } from "@/lib/live";
import { DeclinesPanel } from "../BookInsights";
import { BandScale, DecisionChip, IntervalBar, IssueTag, money, THRESHOLDS, type Thresholds } from "../bits";
import { QueueTable, whyLine, type Ranked } from "../QueueTable";
import { StatusBar } from "./Kbd";
import { useKeys } from "./keys";

type Extras = { deskVerdict?: string; challengeRisks?: number };

/** Three numbers, not five: the split between the two books reads better as a sentence. */
const TILES = (rows: (Row & Extras)[]) => [
  { label: "submissions", value: String(rows.length), note: "rows in view" },
  { label: "still undecided", value: String(rows.filter((r) => r.decision.kind === "open").length), note: "one more fact would settle each of these" },
  { label: "value at stake", value: money(rows.reduce((n, r) => n + r.valueAtStake, 0)), note: "total insured value in view" },
];

export function Blotter({ rows, view, declines, t = THRESHOLDS }: { rows: (Row & Extras)[]; view: "open" | "all"; declines: DeclinesInsight | null; t?: Thresholds }) {
  const router = useRouter();
  const [here, setHere] = useState<Ranked | null>(null);
  const [filter, setFilter] = useState("");
  const onCursor = useCallback((r: Ranked | null) => setHere(r), []);
  const desk = rows.filter((r) => r.region !== "toronto").length;

  useKeys(
    (e) => {
      if (e.key === "o") return router.push("/queue?view=open"), true;
      if (e.key === "A") return router.push("/queue?view=all"), true;
      return false;
    },
    [router],
  );

  return (
    <main className="grid h-[calc(100vh-30px)] grid-rows-[46px_minmax(0,1fr)_26px] overflow-hidden">
      <header className="flex items-stretch border-b border-edge bg-land">
        <h1 className="sr-only">Submission blotter</h1>
        {TILES(rows).map((t) => (
          <div key={t.label} className="flex flex-col justify-center border-r border-rule px-4" title={t.note}>
            <span className="kicker">{t.label}</span>
            <span className="num text-[19px] font-medium leading-[21px] text-ink">{t.value}</span>
          </div>
        ))}
        <p className="cond hidden max-w-[52ch] flex-1 items-center px-4 text-[12px] leading-snug text-dim xl:flex">
          Ranked by score, the undecided first. {desk} on the commercial property book, {rows.length - desk} Toronto renter referrals.
        </p>
        <div className="ml-auto flex items-stretch border-l border-rule" role="group" aria-label="Which submissions">
          {(
            [
              ["open", "open"],
              ["all", "everything"],
            ] as const
          ).map(([v, label]) => (
            <Link
              key={v}
              href={`/queue?view=${v}`}
              aria-current={v === view ? "page" : undefined}
              className={`flex items-center px-4 text-[11px] uppercase tracking-[0.1em] transition-colors duration-150 ${
                v === view ? "bg-raise text-ochre shadow-[inset_0_-2px_0_var(--color-ochre)]" : "text-dim hover:bg-raise hover:text-ink"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_356px]">
        <div className="min-h-0 border-r border-edge">
          <QueueTable rows={rows} view={view} onCursor={onCursor} filter={filter} setFilter={setFilter} t={t} />
        </div>
        {/* One scroll, not two: at 800px tall a split column cut the preview off mid-sentence. */}
        <aside className="min-h-0 overflow-y-auto" aria-label="The row under the cursor">
          <Preview r={here} t={t} />
          {declines && (
            <div className="border-t border-edge">
              <DeclinesPanel d={declines} />
            </div>
          )}
        </aside>
      </div>

      <StatusBar
        left={
          <>
            <span className="text-ochre">BLOTTER</span>
            <span>showing {view === "open" ? "open submissions" : "every submission"}</span>
            {here && (
              <span className="truncate text-ink">
                #{here.caseId} {here.insured}
              </span>
            )}
          </>
        }
      />
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-rule py-1">
      <span className="kicker w-[74px] shrink-0">{label}</span>
      <span className="min-w-0 flex-1 text-[11px]">{children}</span>
    </div>
  );
}

/** The cursor row, opened out. Nothing here is fetched: it is the blotter row's own fields. */
function Preview({ r, t }: { r: Ranked | null; t: Thresholds }) {
  if (!r)
    return (
      <div className="px-6 py-10 text-center text-[11px] text-faint">The row under the cursor opens out here.</div>
    );
  const moved = !!r.deskVerdict && r.deskVerdict.replace(/d$/, "") !== r.decision.kind.replace(/d$/, "");
  const straddle = "straddles" in r.decision ? r.decision.straddles : null;
  const why = whyLine(r);

  return (
    <div className="px-3.5 py-2.5">
      <p className="flex items-baseline gap-2">
        <span className="num text-[11px] text-dim">#{r.caseId}</span>
        <span className="ml-auto">
          <DecisionChip decision={r.decision} large />
        </span>
      </p>
      <h2 className="cond mt-0.5 text-[20px] font-semibold leading-[1.15] text-ink">{r.insured}</h2>
      <p className="mt-0.5 text-[11px] text-dim">
        {r.line} · {r.state} · {r.status}
        {r.label ? ` · ${r.label.toLowerCase()}` : ""}
      </p>

      {r.score && r.decision.kind !== "routed" ? (
        <div className="mt-3">
          <p className="flex items-baseline justify-between">
            <span className="kicker">{r.override ? "Engine score" : "Score range"}</span>
            <span className="num text-[20px] font-medium leading-none text-ink">
              {r.score.lo}–{r.score.hi}
            </span>
          </p>
          <div className="mt-1.5">
            <IntervalBar score={r.score} t={t} />
          </div>
          <BandScale t={t} className="mt-1" />
          {straddle !== null && <p className="mt-1 text-[11px] text-ochre">The range crosses the line at {straddle}, so one more fact settles it.</p>}
        </div>
      ) : (
        <p className="mt-3 border border-dashed border-edge px-2 py-3 text-center text-[11px] text-faint">
          No guideline scores this line, so there is no interval to read.
        </p>
      )}

      <div className="mt-3">
        <Field label="at stake">
          <span className="num">{money(r.valueAtStake)}</span>
        </Field>
        {r.enrichmentDelta !== null && (
          <Field label="outside data">
            <span className="num">
              {r.enrichmentDelta > 0 ? "+" : r.enrichmentDelta < 0 ? "−" : "±"}
              {Math.abs(r.enrichmentDelta)}
            </span>{" "}
            <span className="text-dim">points from the flood, wildfire and weather lookups</span>
          </Field>
        )}
        <Field label="desk">
          {moved ? (
            <span className="text-ochre">
              went with {r.deskVerdict!.replaceAll("_", " ")}, against the rules&rsquo; {r.decision.kind}
            </span>
          ) : (
            <span className="text-dim">agreed with the rules</span>
          )}
        </Field>
        {r.override && (
          <Field label="underwriter">
            <span className="num text-ink">
              {r.override.points > 0 ? "+" : "−"}
              {Math.abs(r.override.points)}
            </span>{" "}
            <span className="text-ink">
              → {r.override.score.lo}–{r.override.score.hi}, {r.override.decision.kind}
            </span>
            <span className="block text-faint" title={r.override.reason}>
              &ldquo;{r.override.reason}&rdquo;
            </span>
          </Field>
        )}
        <Field label="challenger">
          {r.challengeRisks ? (
            <span className="text-rust">{r.challengeRisks} risks raised</span>
          ) : (
            <span className="text-dim">has not run on this case</span>
          )}
        </Field>
        <Field label="deep dive">
          <span className={r.deepDived ? "text-moss" : "text-dim"}>{r.deepDived ? "yes, specialists were spent here" : "no, decided at triage"}</span>
        </Field>
      </div>

      {why && (
        <div className="mt-3">
          <p className="kicker">What it turns on</p>
          <p className="cond mt-0.5 text-[13px] leading-snug">{why}</p>
        </div>
      )}

      {r.issues.length > 0 && (
        <div className="mt-3">
          <p className="kicker">Data issues</p>
          <ul className="mt-1 space-y-1">
            {r.issues.map((i, n) => (
              <li key={`${i.kind}${n}`} className="flex items-baseline gap-2 text-[11px]">
                <IssueTag kind={i.kind} severity={i.severity} />
                <span className="text-dim">{i.kind.replaceAll("_", " ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href={`/cases/${r.caseId}`}
        className="mt-3 flex items-center justify-center border border-edge bg-raise py-1.5 text-[11px] uppercase tracking-[0.12em] text-ink transition-colors duration-150 hover:border-ochre hover:text-ochre"
      >
        open the case
      </Link>
    </div>
  );
}
