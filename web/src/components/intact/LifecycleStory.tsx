"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type KeyboardEvent } from "react";
import styles from "./LifecycleStory.module.css";

export type LifecycleProduct = "home" | "auto";
export type LifecycleStage = "quote" | "decide" | "protect" | "recover";

type StageCopy = {
  title: string;
  summary: string;
  detail: string;
  action: string;
  actionHint: string;
};

const STAGES: { key: LifecycleStage; label: string; promise: string }[] = [
  { key: "quote", label: "Quote", promise: "Know the starting price" },
  { key: "decide", label: "Decide", promise: "Test the choices" },
  { key: "protect", label: "Protect", promise: "Reduce preventable loss" },
  { key: "recover", label: "Recover", promise: "Bring evidence forward" },
];

const COPY: Record<LifecycleProduct, Record<LifecycleStage, StageCopy>> = {
  home: {
    quote: {
      title: "Start with a price you can inspect.",
      summary: "The working tenant flow turns an address and a short coverage review into a sourced, itemised estimate.",
      detail: "No name or email is required in the demo. Location factors and coverage choices stay visible instead of disappearing inside one total.",
      action: "Open the consumer quote",
      actionHint: "Working Expo tenant demo",
    },
    decide: {
      title: "See which choice changes the answer.",
      summary: "A renter can compare coverage choices. If a fact needs review, the same receipt reaches an advisor.",
      detail: "Confirmed facts stay separate from hypothetical changes. The live desk shows the quote, decision reason, and referral handoff.",
      action: "Open quote decisions",
      actionHint: "Working web desk",
    },
    protect: {
      title: "Turn known home risks into a short plan.",
      summary: "After a tenant estimate, the relationship continues with practical protection tasks tied to the home and season.",
      detail: "This prevention preview demonstrates the interaction. It does not claim that completing a task changes a premium or guarantees coverage.",
      action: "Try the prevention preview",
      actionHint: "Interactive on this page",
    },
    recover: {
      title: "Prepare the home evidence before you need it.",
      summary: "A tenant can review a room inventory, save a protection record, and choose what to share after property damage.",
      detail: "The working Expo demo uses bundled living-room items and requires review before save. It does not change contents coverage.",
      action: "Open home inventory",
      actionHint: "Working Expo demo",
    },
  },
  auto: {
    quote: {
      title: "Compare the car and the coverage together.",
      summary: "The working Auto estimator compares vehicle, garaging, use, and driver facts before a customer commits to a car.",
      detail: "Try a Corolla, CX-5, or IONIQ 5 in the Expo app. Its deterministic results use synthetic inputs and remain illustrative.",
      action: "Open the Auto estimator",
      actionHint: "Working Expo demo",
    },
    decide: {
      title: "Make the trade-offs visible before purchase.",
      summary: "A customer can test one change at a time, such as deductible, annual use, or selected vehicle.",
      detail: "The inline comparison holds the driver and current vehicle steady while one hypothetical input changes.",
      action: "Open Auto what-if flow",
      actionHint: "Working Expo demo",
    },
    protect: {
      title: "Keep the relationship useful between renewals.",
      summary: "An opt-in driving context score combines driving events with coarse route zones for coaching during the trip.",
      detail: "A Live Activity and iOS widget can flag school-zone or dense-intersection context. This prototype does not change a real premium.",
      action: "View sourced route context",
      actionHint: "Bundled synthetic fixture",
    },
    recover: {
      title: "Collect better evidence when a crash happens.",
      summary: "Drivers can report an incident while nearby witnesses contribute independent, time-and-place verified footage.",
      detail: "Pixie Recover is powered by the live CrashClip prototype. It packages corroborated evidence for the insurer without deciding fault.",
      action: "Open Pixie Recover",
      actionHint: "Live CrashClip prototype",
    },
  },
};

const PREVENTION: Record<LifecycleProduct, string[]> = {
  home: ["Test the leak sensor", "Review sewer backup coverage", "Photograph the electrical panel"],
  auto: [],
};

const ROUTE_CONTEXTS = [
  { label: "School approach", score: 72, tone: "school" },
  { label: "Dense intersection + building corridor", score: 68, tone: "dense" },
  { label: "Lower-complexity corridor", score: 90, tone: "lower" },
] as const;

const WHAT_IF: Record<LifecycleProduct, { label: string; result: string }[]> = {
  home: [
    { label: "Current details", result: "The confirmed facts stay attached to the estimate." },
    { label: "Add sewer backup", result: "Only this coverage choice changes in the comparison." },
    { label: "Change deductible", result: "The customer sees the trade-off before continuing." },
  ],
  auto: [
    { label: "Current setup", result: "Everyday city driving, driveway parking, and the current vehicle stay as the baseline." },
    { label: "Lower annual use", result: "Annual use changes to under 10,000 km while the vehicle and driver stay fixed." },
    { label: "Higher deductible", result: "Only the deductible changes in this illustrative comparison." },
  ],
};

function updateLocation(product: LifecycleProduct, stage: LifecycleStage) {
  const url = new URL(window.location.href);
  url.searchParams.set("product", product);
  url.searchParams.set("stage", stage);
  window.history.replaceState({}, "", url);
}

function QuoteProof({ product }: { product: LifecycleProduct }) {
  if (product === "auto") {
    return (
      <div className={styles.autoQuoteProof} aria-label="Auto estimator preview">
        <div className={styles.autoQuoteHead}>
          <span>Working Auto estimator</span>
          <strong>Compare before you choose</strong>
          <p>Hold the driver profile steady, then see how the vehicle changes the estimate.</p>
        </div>
        <div className={styles.vehicleList}>
          {["Toyota Corolla", "Mazda CX-5", "Hyundai IONIQ 5"].map((vehicle, index) => (
            <div key={vehicle}>
              <span>0{index + 1}</span>
              <strong>{vehicle}</strong>
              <small>{index === 0 ? "Sedan" : index === 1 ? "SUV" : "Electric"}</small>
            </div>
          ))}
        </div>
        <p className={styles.autoDisclosure}>Synthetic vehicles and deterministic illustrative estimates. No quote or offer of insurance.</p>
      </div>
    );
  }
  return (
    <div className={styles.phoneProof} aria-label="Consumer quote app preview">
      <div className={styles.phoneCrop}>
        <Image
          src="/intact/quote-address.png"
          alt="Pixie tenant quote asking for a Toronto address"
          fill
          sizes="(max-width: 760px) 82vw, 360px"
          priority
        />
      </div>
    </div>
  );
}

function DecisionProof({ product }: { product: LifecycleProduct }) {
  const options = WHAT_IF[product];
  const [selected, setSelected] = useState(0);
  return (
    <div className={styles.decisionProof}>
      <div className={styles.proofHeading}>
        <span>Illustrative what-if</span>
        <strong>Change one fact</strong>
      </div>
      <div className={styles.decisionBody}>
        <div className={styles.choiceRail} role="group" aria-label={`${product} what-if example`}>
          {options.map((option, index) => (
            <button
              type="button"
              key={option.label}
              className={selected === index ? styles.choiceActive : undefined}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              <span>{option.label}</span>
              <small>{selected === index ? "Selected" : "Test this"}</small>
            </button>
          ))}
        </div>
        <div className={styles.decisionResult} aria-live="polite">
          <span>What changes</span>
          <p>{options[selected].result}</p>
          <small>No hypothetical value overwrites a confirmed fact.</small>
        </div>
      </div>
    </div>
  );
}

function HomeProtectProof() {
  const tasks = PREVENTION.home;
  const [done, setDone] = useState<number[]>([]);
  const toggle = (index: number) => setDone((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
  return (
    <div className={styles.protectProof} id="stage-workbench">
      <div className={styles.protectScore} aria-live="polite">
        <span>Prevention preview</span>
        <strong>{done.length} of {tasks.length}</strong>
        <small>tasks recorded</small>
      </div>
      <div className={styles.taskList}>
        {tasks.map((task, index) => {
          const complete = done.includes(index);
          return (
            <button type="button" key={task} aria-pressed={complete} onClick={() => toggle(index)}>
              <span className={styles.taskMark} aria-hidden>{complete ? "✓" : index + 1}</span>
              <span><strong>{task}</strong><small>{complete ? "Recorded for this preview" : "Mark as reviewed"}</small></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProtectProof({ product }: { product: LifecycleProduct }) {
  return product === "auto" ? <AutoContextProof /> : <HomeProtectProof />;
}

function AutoContextProof() {
  return (
    <div className={styles.contextProof} id="stage-workbench">
      <div className={styles.contextHead}>
        <div>
          <span>Opt-in coaching context</span>
          <strong>Behavior 75% + route context 25%</strong>
        </div>
        <small>iOS widget + Live Activity</small>
      </div>
      <div className={styles.routeMap} aria-label="Synthetic route context visualization">
        <span className={styles.routeLine} aria-hidden />
        {ROUTE_CONTEXTS.map((context, index) => (
          <div className={styles.routeStop} key={context.label}>
            <i className={styles[context.tone]} aria-hidden>{index + 1}</i>
            <strong>{context.label}</strong>
            <small>Context {context.score}</small>
          </div>
        ))}
      </div>
      <div className={styles.contextDisclosure}>
        <strong>Coaching only</strong>
        <p>Scores and weights come from <code>api/fixtures/driving_context_demo.json</code>. The synthetic route is discarded after classification and cannot change a quote or premium.</p>
      </div>
    </div>
  );
}

function HomeRecoverProof() {
  return (
    <div className={styles.homeRecoverProof} id="stage-workbench">
      <div className={styles.inventoryHead}>
        <span>Home evidence handoff</span>
        <strong>Living room inventory</strong>
        <small>Bundled demo items · review required</small>
      </div>
      <ol className={styles.inventoryFlow}>
        <li><b>1</b><span><strong>Capture</strong><small>Start with the room and common items.</small></span></li>
        <li><b>2</b><span><strong>Review</strong><small>Confirm every item before it is saved.</small></span></li>
        <li><b>3</b><span><strong>Share</strong><small>Choose the evidence that reaches an advisor.</small></span></li>
      </ol>
      <p>No camera permission is used in the bundled demo. Saving the inventory does not change tenant coverage.</p>
    </div>
  );
}

function AutoRecoverProof({ priority }: { priority: boolean }) {
  return (
    <div className={styles.recoverProof}>
      <Image
        src="/intact/crashclip-case.png"
        alt="CrashClip insurer view with a corroborated incident file and three independent perspectives"
        fill
        sizes="(max-width: 760px) 100vw, 720px"
        priority={priority}
      />
      <span>Real prototype capture</span>
    </div>
  );
}

function StageProof({ stage, product, recoverPriority }: { stage: LifecycleStage; product: LifecycleProduct; recoverPriority: boolean }) {
  if (stage === "quote") return <QuoteProof product={product} />;
  if (stage === "decide") return <DecisionProof product={product} />;
  if (stage === "protect") return <ProtectProof product={product} />;
  return product === "home" ? <HomeRecoverProof /> : <AutoRecoverProof priority={recoverPriority} />;
}

export function LifecycleStory({
  initialProduct,
  initialStage,
  expoUrl,
  autoCompareUrl,
  homeInventoryUrl,
  crashClipUrl,
}: {
  initialProduct: LifecycleProduct;
  initialStage: LifecycleStage;
  expoUrl: string;
  autoCompareUrl: string;
  homeInventoryUrl: string;
  crashClipUrl: string;
}) {
  const [product, setProduct] = useState(initialProduct);
  const [stage, setStage] = useState(initialStage);
  const stageIndex = STAGES.findIndex((item) => item.key === stage);
  const copy = COPY[product][stage];
  const actionHref = stage === "quote"
    ? product === "auto" ? autoCompareUrl : expoUrl
    : stage === "decide"
      ? product === "auto" ? autoCompareUrl : "/intact/quotes"
      : stage === "protect"
        ? "#stage-workbench"
        : product === "auto" ? crashClipUrl : homeInventoryUrl;
  const external = stage === "quote" || (stage === "decide" && product === "auto") || stage === "recover";
  const panelKey = useMemo(() => `${product}-${stage}`, [product, stage]);

  const selectProduct = (next: LifecycleProduct) => {
    setProduct(next);
    updateLocation(next, stage);
  };

  const selectStage = (next: LifecycleStage) => {
    setStage(next);
    updateLocation(product, next);
  };

  const moveStage = (direction: number) => {
    const nextIndex = (stageIndex + direction + STAGES.length) % STAGES.length;
    selectStage(STAGES[nextIndex].key);
  };

  const handleStageKeys = (event: KeyboardEvent<HTMLButtonElement>) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      nextIndex = (stageIndex + 1) % STAGES.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      nextIndex = (stageIndex - 1 + STAGES.length) % STAGES.length;
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      nextIndex = event.key === "Home" ? 0 : STAGES.length - 1;
    }
    if (nextIndex !== null) {
      selectStage(STAGES[nextIndex].key);
      event.currentTarget.parentElement
        ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
        [nextIndex]?.focus();
    }
  };

  return (
    <div className={styles.shell}>
      <header className={styles.intro}>
        <div className={styles.introCopy}>
          <p className={styles.kicker}>Pixie for Intact</p>
          <h1>Insurance that stays useful after the quote.</h1>
          <p>One guided path helps people price a tenant policy or car, understand the decision, protect a home or drive, and recover with better evidence.</p>
        </div>
        <div className={styles.productChooser} aria-label="Choose an insurance route">
          <span>Choose a route</span>
          <div role="group" aria-label="Insurance product">
            <button type="button" aria-pressed={product === "home"} onClick={() => selectProduct("home")}>
              <span>Home</span><small>Tenant + protection</small>
            </button>
            <button type="button" aria-pressed={product === "auto"} onClick={() => selectProduct("auto")}>
              <span>Auto</span><small>Car + driver</small>
            </button>
          </div>
        </div>
      </header>

      <nav className={styles.stageRail} role="tablist" aria-label="Insurance lifecycle">
        {STAGES.map((item, index) => {
          const active = stage === item.key;
          return (
            <button
              type="button"
              role="tab"
              id={`stage-tab-${item.key}`}
              aria-selected={active}
              aria-controls="lifecycle-panel"
              tabIndex={active ? 0 : -1}
              key={item.key}
              onClick={() => selectStage(item.key)}
              onKeyDown={handleStageKeys}
            >
              <span className={styles.stageNumber}>0{index + 1}</span>
              <span className={styles.stageLabel}>{item.label}</span>
              <small>{item.promise}</small>
            </button>
          );
        })}
      </nav>

      <section
        key={panelKey}
        id="lifecycle-panel"
        role="tabpanel"
        aria-labelledby={`stage-tab-${stage}`}
        className={styles.stagePanel}
      >
        <div className={styles.stageCopy}>
          <div>
            <p className={styles.routeLabel}>{product === "home" ? "Tenant + home protection" : "Auto"} · {STAGES[stageIndex].label}</p>
            <h2>{copy.title}</h2>
            <p className={styles.summary}>{copy.summary}</p>
            <p className={styles.detail}>{copy.detail}</p>
          </div>

          <div className={styles.actionBlock}>
            {stage === "protect" ? (
              <a className={styles.primaryAction} href={actionHref}>{copy.action}<span aria-hidden>↓</span></a>
            ) : external ? (
              <a className={styles.primaryAction} href={actionHref} target="_blank" rel="noreferrer">
                {copy.action}<span aria-hidden>↗</span>
              </a>
            ) : (
              <Link className={styles.primaryAction} href={actionHref}>{copy.action}<span aria-hidden>→</span></Link>
            )}
            <small>{copy.actionHint}</small>
            {stage === "quote" ? <p>Prices in the linked demo are illustrative Pixie estimates, not Intact prices or offers of insurance.</p> : null}
          </div>

          <div className={styles.slideControls} aria-label="Lifecycle slide controls">
            <button type="button" onClick={() => moveStage(-1)} aria-label="Previous lifecycle stage">←</button>
            <span aria-live="polite">{stageIndex + 1} / {STAGES.length}</span>
            <button type="button" onClick={() => moveStage(1)} aria-label="Next lifecycle stage">→</button>
          </div>
        </div>

        <div className={styles.proofStage}>
          <StageProof
            stage={stage}
            product={product}
            recoverPriority={initialStage === "recover" && initialProduct === "auto"}
          />
        </div>
      </section>

      <footer className={styles.disclosure}>
        <span>Working proof</span>
        <p>Tenant and Auto estimators, home inventory, and advisor review run on this project. Auto recovery uses a real capture from the separate CrashClip prototype. All prices and coaching outcomes remain illustrative.</p>
      </footer>
    </div>
  );
}
