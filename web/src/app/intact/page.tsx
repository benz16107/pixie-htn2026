import { LifecycleStory, type LifecycleProduct, type LifecycleStage } from "@/components/intact/LifecycleStory";

const products: LifecycleProduct[] = ["home", "auto"];
const stages: LifecycleStage[] = ["quote", "decide", "protect", "recover"];

function isProduct(value: string | string[] | undefined): value is LifecycleProduct {
  return typeof value === "string" && products.includes(value as LifecycleProduct);
}

function isStage(value: string | string[] | undefined): value is LifecycleStage {
  return typeof value === "string" && stages.includes(value as LifecycleStage);
}

export default async function IntactHome({ searchParams }: PageProps<"/intact">) {
  const params = await searchParams;
  const initialProduct = isProduct(params.product) ? params.product : "home";
  const initialStage = isStage(params.stage) ? params.stage : "quote";
  const expoUrl = process.env.NEXT_PUBLIC_EXPO_URL ?? "http://macserver:8081";
  const crashClipUrl = process.env.NEXT_PUBLIC_CRASHCLIP_URL ?? "https://crashclip.vercel.app";
  const expoBase = expoUrl.replace(/\/$/, "");

  return (
    <main className="intact-page intact-lifecycle-page">
      <div
        hidden
        dangerouslySetInnerHTML={{
          __html:
            "<!-- THESIS: Insurance should be one continuous relationship from shopping through recovery, instead of a quote funnel that ends at purchase. OWN-WORLD: The established Intact blue-grey field, deep teal type, vermilion actions, ruled service-paper structure, and real product captures. STORY: Choose Home or Auto, move through Quote, Decide, Protect, and Recover, then open the working proof at every stage. FIRST VIEWPORT: A compact proposition and product switch sit above a four-stop lifecycle rail; the active stop expands into one editorial stage with its proof beside it and the main action inside the copy column. FORM: A user-pinned lifecycle presentation, first of five structures considered; stage-rail slideshow with no seed because the brief fixed the form. -->",
        }}
      />
      <LifecycleStory
        initialProduct={initialProduct}
        initialStage={initialStage}
        expoUrl={expoUrl}
        autoCompareUrl={`${expoBase}/auto-compare`}
        homeInventoryUrl={`${expoBase}/home-inventory`}
        crashClipUrl={crashClipUrl}
      />
    </main>
  );
}
