"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { DeclinesInsight } from "@/lib/api";
import type { Row } from "@/lib/live";
import { DeclinesPanel } from "../BookInsights";
import { DecisionChip, IntervalBar, IssueTag, money } from "../bits";
import { QueueTable, whyLine, type Ranked } from "../QueueTable";
import { StatusBar } from "./Kbd";
import { useKeys } from "./keys";

type Extras = { deskVerdict?: string; challengeRisks?: number };

const TILES = (rows: (Row & Extras)[]) => {
  const desk = rows.filter((r) => r.region !== "toronto");
  return [
    { label: "in view", value: String(rows.length), note: "submissions" },
    { label: "undecided", value: String(rows.filter((r) => r.decision.kind === "open").length), note: "the interval still straddles a threshold" },
    { label: "desk", value: String(desk.length), note: "property guideline" },
    { label: "referrals", value: String(rows.length - desk.length), note: "Toronto renters" },
    { label: "at stake", value: money(rows.reduce((n, r) => n + r.valueAtStake, 0)), note: "total TIV in view" },
  ];
};

export function Blotter({ rows, view, declines }: { rows: (Row & Extras)[]; view: "open" | "all"; declines: DeclinesInsight | null }) {
  const router = useRouter();
  const [here, setHere] = useState<Ranked | null>(null);
  const [filter, setFilter] = useState("");
  const onCursor = useCallback((r: Ranked | null) => setHere(r), []);

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
          <div key={t.label} className="flex flex-col justify-center border-r border-rule px-3.5" title={t.note}>
            <span className="kicker">{t.label}</span>
            <span className="num text-[17px] font-medium leading-[19px] text-ink">{t.value}</span>
          </div>
        ))}
        <p className="cond hidden max-w-[42ch] flex-1 items-center px-4 text-[12px] leading-snug text-dim xl:flex">
          Ranked by the midpoint of each score interval, open cases first.
        </p>
        <div className="ml-auto flex items-stretch border-l border-rule" role="group" aria-label="Which submissions">
          {(
            [
              ["open", "open", "o"],
              ["all", "everything", "A"],
            ] as const
          ).map(([v, label, k]) => (
            <Link
              key={v}
              href={`/queue?view=${v}`}
              aria-current={v === view ? "page" : undefined}
              className={`flex items-center gap-1.5 px-3.5 text-[11px] uppercase tracking-[0.1em] transition-colors duration-150 ${
                v === view ? "bg-raise text-ochre shadow-[inset_0_-2px_0_var(--color-ochre)]" : "text-dim hover:bg-raise hover:text-ink"
              }`}
            >
              {label}
              <kbd aria-hidden className={`key ${v === view ? "key-on" : ""}`}>
                {k}
              </kbd>
            </Link>
          ))}
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_356px]">
        <div className="min-h-0 border-r border-edge">
          <QueueTable rows={rows} view={view} onCursor={onCursor} filter={filter} setFilter={setFilter} />
        </div>
        <aside className="flex min-h-0 flex-col overflow-hidden" aria-label="The row under the cursor">
          <Preview r={here} />
          {declines && (
            <div className="min-h-0 shrink-0 overflow-auto border-t border-edge">
              <DeclinesPanel d={declines} />
            </div>
          )}
        </aside>
      </div>

      <StatusBar
        left={
          <>
            <span className="text-ochre">BLOTTER</span>
            <span>view: {view === "open" ? "open submissions" : "everything"}</span>
            {here && <span className="text-ink">cursor: #{here.caseId}</span>}
          </>
        }
        keys={[
          ["j k", "move"],
          ["Enter", "open"],
          ["/", "filter"],
          ["?", "keys"],
        ]}
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
function Preview({ r }: { r: Ranked | null }) {
  if (!r)
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-[11px] text-faint">
        Move the cursor with <kbd className="key mx-1">j</kbd> and <kbd className="key mx-1">k</kbd> to read a row here.
      </div>
    );
  const moved = !!r.deskVerdict && r.deskVerdict.replace(/d$/, "") !== r.decision.kind.replace(/d$/, "");
  const straddle = "straddles" in r.decision ? r.decision.straddles : null;
  const why = whyLine(r);

  return (
    <div className="min-h-0 flex-1 overflow-auto px-3.5 py-2.5">
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
            <span className="kicker">Score interval</span>
            <span className="num text-[20px] font-medium leading-none text-ink">
              {r.score.lo}–{r.score.hi}
            </span>
          </p>
          <div className="mt-1.5">
            <IntervalBar score={r.score} />
          </div>
          <p className="mt-1 flex justify-between text-[9px] uppercase tracking-[0.08em] text-faint">
            <span>decline &lt;45</span>
            <span>refer 45–70</span>
            <span>accept ≥70</span>
          </p>
          {straddle !== null && <p className="mt-1 text-[11px] text-ochre">The interval straddles {straddle}, so one fact still settles it.</p>}
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
          <Field label="enrichment">
            <span className="num">
              {r.enrichmentDelta > 0 ? "+" : r.enrichmentDelta < 0 ? "−" : "±"}
              {Math.abs(r.enrichmentDelta)}
            </span>{" "}
            <span className="text-dim">points from the external layers</span>
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
        className="mt-3 flex items-center justify-center gap-2 border border-edge bg-raise py-1.5 text-[11px] uppercase tracking-[0.12em] text-ink transition-colors duration-150 hover:border-ochre hover:text-ochre"
      >
        open the case <kbd className="key">Enter</kbd>
      </Link>
    </div>
  );
}
