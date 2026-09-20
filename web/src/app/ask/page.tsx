import { AskBox } from "@/components/AskBox";
import { api } from "@/lib/api";

export default function AskPage() {
  return (
    <main className="mx-auto max-w-[1320px] px-8 pt-12">
      <p className="folio">Ask, over the Federato query API</p>
      <h1 className="display display-lg mt-3">Ask the book a question.</h1>
      <p className="measure mb-10 mt-4 text-[15px] leading-[1.55] text-dim">
        Intake turns the question into a Federato query. A lint pass catches array dot-paths and unexpanded references
        before the call, and API errors go back to Intake for a rewrite. Every attempt stays visible.
      </p>
      <AskBox canned={api.askCanned} />
    </main>
  );
}
