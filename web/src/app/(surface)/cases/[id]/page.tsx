import { notFound } from "next/navigation";
import { api, type CaseWithReceipt } from "@/lib/api";
import { explainCase, precedentFor, sensitivityOf, surfaceOf, type Challenge } from "@/lib/explain";
import { CaseSurface } from "@/components/surface/CaseSurface";

export default async function CasePage({ params }: PageProps<"/cases/[id]">) {
  const { id } = await params;
  const [c, events, hexes, pins, explain, sens, precedent, surface] = await Promise.all([
    api.case(id),
    api.events(id),
    api.mapBook("all"),
    api.mapPins(),
    explainCase(id),
    sensitivityOf(id),
    precedentFor(id),
    surfaceOf(id),
  ]);
  const percentile = await api.percentile(id);
  if (!c) notFound();
  const view = c as CaseWithReceipt & { challenge?: Challenge; deskVerdict?: string };
  const pin = pins.find((p) => p.caseId === view.caseId);
  const flippers = view.decision.kind === "open" ? view.decision.flippers : [];
  const place = view.facts.find((f) => f.id === "primary_admin" || f.id === "state")?.display;
  const premium = sens?.facts.find((f) => f.fact === "premium" && f.movesDecision) ?? sens?.facts.find((f) => f.movesDecision);
  // Start the slider where the case actually stands: the estimate the desk is working from.
  const dollars =
    (explain?.steps.find((s) => s.key === premium?.fact)?.value ?? "").match(/\$[\d,]+/g)?.map((d) => Number(d.replace(/[$,]/g, ""))) ?? [];
  const startAt = dollars.length
    ? Math.round(dollars.reduce((a, b) => a + b, 0) / dollars.length)
    : Math.round(((premium?.low.value ?? 0) + (premium?.high.value ?? 0)) / 2);
  const verdict = view.deskVerdict?.replaceAll("_", " ");

  return (
    <CaseSurface
      view={view}
      events={events}
      hexes={hexes}
      pin={pin}
      flippers={flippers}
      place={place}
      explain={explain}
      sens={sens}
      precedent={precedent}
      surface={surface}
      percentile={percentile}
      whatIf={premium ? { fact: premium.fact, label: premium.label, start: startAt } : null}
      verdict={verdict}
    />
  );
}
