/** A collapsed summary that opens in place. Native details, so it works without JavaScript. */
export function Fold({
  title,
  count,
  summary,
  children,
  brief,
}: {
  title: string;
  count?: string;
  summary: string;
  children?: React.ReactNode;
  brief?: string;
}) {
  return (
    <details data-brief={brief} className="group border-t border-rule py-2.5 first:border-t-0">
      <summary className="flex cursor-pointer list-none items-baseline gap-2 [&::-webkit-details-marker]:hidden">
        <span className="kicker">{title}</span>
        {count && <span className="num text-[11px] text-dim">{count}</span>}
        <span aria-hidden className="ml-auto font-mono text-[11px] text-dim transition-transform duration-150 group-open:rotate-90">
          {"›"}
        </span>
      </summary>
      <p className="mt-1 text-[11.5px] leading-snug text-dim group-open:hidden">{summary}</p>
      <div className="mt-2 hidden max-h-[320px] overflow-auto group-open:block">{children}</div>
    </details>
  );
}
