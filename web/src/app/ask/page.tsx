import { AskBox } from "@/components/AskBox";
import { api } from "@/lib/api";

export default function AskPage() {
  return (
    <main className="px-10 pb-12 pt-7">
      <p className="font-mono text-[11px] text-dim">ASK · FEDERATO QUERY API</p>
      <h1 className="mt-0.5 font-serif text-[32px] font-semibold leading-tight">Ask the book a question</h1>
      <p className="mb-6 mt-1 max-w-[70ch] text-dim">
        Intake turns the question into a Federato query. A lint pass catches array dot-paths and unexpanded references
        before the call, and API errors go back to Intake for a rewrite. Every attempt stays visible.
      </p>
      <AskBox canned={api.askCanned} />
    </main>
  );
}
