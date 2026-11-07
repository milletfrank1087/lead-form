import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@/styles/wizard.css";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useSearchParams } from "react-router-dom";
import { LegalModal } from "@/components/wizard/LegalModal";
import { IconArrow, IconChevronLeft, IconCheck } from "@/components/wizard/icons";
import type { LegalKey } from "@/components/wizard/legal";
import {
  ChannelStep,
  CoverStep,
  CreditStep,
  DetailsStep,
  DoneScreen,
  PartStep,
  ReadyStep,
  type StepCtx,
} from "@/components/wizard/Steps";
import { brand } from "@/config/brand";
import { resolveCampaign } from "@/lib/campaign";
import { submitApplication } from "@/lib/submit-application";
import { normalizeTelegramHandle } from "@/lib/telegram";
import { clearDraft, loadDraft, saveDraft } from "@/lib/wizard/draft";
import {
  buildLeadMessage,
  buildWhatsappMessage,
  detectEnv,
  whatsappHref,
} from "@/lib/wizard/handoff";
import { STEPS, type Errors, type FieldKey, type WizardData } from "@/lib/wizard/options";
import { errorFor, fieldsForStep, splitName, validateFields } from "@/lib/wizard/validate";
import { detectZone } from "@/lib/wizard/zone";

/** The button reads "Submitting…" for at least this long, so a fast response never just flickers. */
const MIN_BUSY_MS = 500;
/** How long the "Application received" wipe stays up before the confirmation screen replaces it. */
const OVERLAY_MS = 1150;

type Phase = "form" | "submitting" | "sent" | "done";
type Direction = "fwd" | "back";

const reducedMotion = (): boolean =>
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const pad = (n: number) => String(n).padStart(2, "0");

/** Entries this page adds to history carry `wz: <step>`; they are merged into whatever the router stored. */
const historyState = (wz: number) => ({ ...((window.history.state as object | null) ?? {}), wz });
const currentWz = (): number | null => {
  const wz = (window.history.state as { wz?: unknown } | null)?.wz;
  return typeof wz === "number" ? wz : null;
};

const Apply = () => {
  const [searchParams] = useSearchParams();
  const [campaign] = useState(() => resolveCampaign(searchParams.get("campaign")));
  const [referralCode] = useState(() =>
    (searchParams.get("ref") || searchParams.get("referral") || "").toUpperCase(),
  );
  const env = useMemo(() => detectEnv(), []);
  const tzDetected = useMemo(() => detectZone(), []);

  const [data, setData] = useState<WizardData>(() => {
    const draft = loadDraft();
    return draft.timezone || !tzDetected ? draft : { ...draft, timezone: tzDetected };
  });
  const dataRef = useRef(data);

  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  const [dir, setDir] = useState<Direction>("fwd");
  const [errors, setErrors] = useState<Errors>({});
  const [phase, setPhase] = useState<Phase>("form");
  const phaseRef = useRef<Phase>("form");
  const [legal, setLegal] = useState<LegalKey | null>(null);
  const [announce, setAnnounce] = useState("");

  const cardRef = useRef<HTMLDivElement>(null);
  const priorHeight = useRef(0);

  const setPhaseBoth = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  /* ------------------------------------------------------------------ page chrome ---------- */

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.classList.add("wz-active");
    return () => document.documentElement.classList.remove("wz-active");
  }, []);

  // Keep what has been typed, so a webview that reloads the page does not lose it.
  useEffect(() => {
    if (phase === "form") saveDraft(data);
  }, [data, phase]);

  /* ------------------------------------------------------------------ step changes --------- */

  const showStep = useCallback((next: number, direction: Direction) => {
    priorHeight.current = cardRef.current?.getBoundingClientRect().height ?? 0;
    stepRef.current = next;
    setDir(direction);
    setStep(next);
    setErrors({});
  }, []);

  const settle = useCallback((index: number, track: boolean) => {
    const id = STEPS[index].id;
    if (track) {
      if (id === "credit" || id === "part" || id === "ready") window.FunnelMonitor?.stage("qualification");
      if (id === "channel") window.FunnelMonitor?.stage("contact_method");
      window.Tracking?.trackFormEvent("step_viewed", id);
    }
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
    window.setTimeout(() => document.getElementById("stepTitle")?.focus({ preventScroll: true }), 60);
  }, []);

  // Let the card grow or shrink between steps instead of jumping.
  useLayoutEffect(() => {
    const card = cardRef.current;
    const before = priorHeight.current;
    priorHeight.current = 0;
    if (!card || before < 40 || reducedMotion()) return undefined;
    const after = card.getBoundingClientRect().height;
    if (Math.abs(after - before) < 3) return undefined;
    card.style.height = `${before}px`;
    void card.offsetHeight;
    card.style.transition = "height .42s cubic-bezier(.16,1,.3,1)";
    card.style.height = `${after}px`;
    const timer = window.setTimeout(() => {
      card.style.height = "";
      card.style.transition = "";
    }, 460);
    return () => {
      window.clearTimeout(timer);
      card.style.height = "";
      card.style.transition = "";
    };
  }, [step, phase]);

  /* Every step is its own history entry, so Android Back / the iOS edge swipe inside an ad app's
     browser goes to the previous step instead of closing the whole browser and losing the form. */
  useEffect(() => {
    let previousRestoration: ScrollRestoration | null = null;
    try {
      previousRestoration = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
      window.history.replaceState(historyState(0), "");
    } catch {
      // History can be restricted in some webviews: the buttons still work without it.
    }

    const onPop = (event: PopStateEvent) => {
      const wz = (event.state as { wz?: unknown } | null)?.wz;
      if (typeof wz !== "number") return;
      if (phaseRef.current === "done") {
        // Submitted: step back through the old form entries in one go, then stop at the entry before them,
        // so one more Back leaves the page rather than showing a form that has already been sent.
        if (wz > 0) window.history.back();
        return;
      }
      if (phaseRef.current !== "form") return;
      const target = Math.max(0, Math.min(STEPS.length - 1, wz));
      if (target === stepRef.current) return;
      const direction: Direction = target < stepRef.current ? "back" : "fwd";
      showStep(target, direction);
      settle(target, false);
    };

    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      try {
        if (previousRestoration) window.history.scrollRestoration = previousRestoration;
      } catch {
        // Nothing to restore.
      }
    };
  }, [showStep, settle]);

  /* ------------------------------------------------------------------ fields --------------- */

  const set = useCallback(<K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    const next = { ...dataRef.current, [key]: value };
    dataRef.current = next;
    setData(next);

    // Fields that are showing an error clear (or update) as soon as the value changes.
    setErrors((current) => {
      const keys = Object.keys(current) as FieldKey[];
      if (!keys.length) return current;
      const out: Errors = {};
      keys.forEach((k) => {
        const message = errorFor(k, next);
        if (message) out[k] = message;
      });
      return out;
    });

    if ((key === "legalName" || key === "email" || key === "mobile") && value) {
      window.Tracking?.fireFormStartedOnce();
      window.FunnelMonitor?.stage("personal_info");
    }
    if (key === "creditBand" && value) {
      window.FunnelMonitor?.stage("qualification");
      window.Tracking?.trackFormEvent("qualification_selected", `credit:${String(value)}`);
    }
    if (key === "availSpeed" && value) {
      window.Tracking?.trackFormEvent("availability_selected", `speed:${String(value)}`);
    }
    if (key === "contactPref" && value) {
      window.FunnelMonitor?.stage("contact_method");
      window.Tracking?.trackFormEvent("contact_method_selected", `preferred: ${String(value)}`);
    }
  }, []);

  /** Validate a field when the person leaves it, but only if they typed something: empty fields are
   *  reported when they press Continue, not the moment they tab past. */
  const blur = useCallback((key: FieldKey) => {
    const d = dataRef.current;
    if (!String(d[key]).trim()) return;
    const message = errorFor(key, d);
    setErrors((current) => {
      if (message) return current[key] === message ? current : { ...current, [key]: message };
      if (!(key in current)) return current;
      const copy = { ...current };
      delete copy[key];
      return copy;
    });
  }, []);

  /* ------------------------------------------------------------------ navigation ----------- */

  const focusInvalid = (key: FieldKey) => {
    window.requestAnimationFrame(() => {
      const control =
        document.getElementById(`in-${key}`) ?? document.querySelector<HTMLInputElement>(`input[name="${key}"]`);
      const target = (control?.closest(".opt, .consent") as HTMLElement | null) ?? control;
      if (target) {
        target.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
        target.classList.remove("nudge");
        void target.offsetWidth;
        target.classList.add("nudge");
      }
      control?.focus({ preventScroll: true });
    });
  };

  const reportInvalid = (stepId: string, found: Errors, first: FieldKey) => {
    window.Tracking?.trackFormEvent("validation_error", `step:${stepId} missing: ${Object.keys(found).join(", ")}`);
    // Only the last step marks the funnel as "validation_error": earlier steps would hide how far people got.
    if (stepId === "channel") window.FunnelMonitor?.stage("validation_error");
    setAnnounce(`${found[first] ?? "Please check this step"}.`);
  };

  const advance = () => {
    const next = Math.min(stepRef.current + 1, STEPS.length - 1);
    try {
      window.history.pushState(historyState(next), "");
    } catch {
      // Without history the on-screen buttons still work.
    }
    showStep(next, "fwd");
    settle(next, true);
  };

  const goBack = () => {
    if (phaseRef.current !== "form" || stepRef.current === 0) return;
    // Going through history keeps the browser's own Back button in step with ours.
    if (currentWz() === stepRef.current) {
      window.history.back();
      return;
    }
    const target = stepRef.current - 1;
    showStep(target, "back");
    settle(target, false);
  };

  const submit = async () => {
    const d = dataRef.current;

    // Check everything once more: whatever the server would reject must never get this far, because
    // the form carries on to its success screen even when the server says no.
    const all = STEPS.flatMap((s) => fieldsForStep(s.id, d));
    const found = validateFields(all, d);
    const firstBad = all.find((k) => found[k]);
    if (firstBad) {
      const index = STEPS.findIndex((s) => fieldsForStep(s.id, d).includes(firstBad));
      if (index !== stepRef.current) {
        showStep(index, "back");
        settle(index, false);
      }
      const here = fieldsForStep(STEPS[index].id, d);
      const visible: Errors = {};
      here.forEach((k) => {
        if (found[k]) visible[k] = found[k];
      });
      setErrors(visible);
      reportInvalid(STEPS[index].id, visible, firstBad);
      focusInvalid(firstBad);
      return;
    }

    setPhaseBoth("submitting");
    setAnnounce("Submitting your application");
    const startedAt = Date.now();
    const { firstName, lastName } = splitName(d.legalName);

    try {
      await submitApplication({
        firstName,
        lastName,
        email: d.email.trim(),
        phone: d.mobile,
        city: "",
        state: "",
        // The server insists on a value; the wizard no longer asks about employment.
        employed: "not-collected",
        creditScore: d.creditBand,
        message: buildLeadMessage(d),
        referralCode,
        contactPref: d.contactPref,
        // Only sent for Telegram; a handle typed and then abandoned for another method is not.
        telegramHandle: d.contactPref === "telegram" ? normalizeTelegramHandle(d.telegramHandle) : "",
        campaign,
      });
    } catch (error) {
      // Same behaviour as the page this replaces: carry on to the confirmation even if sending failed.
      console.error("submitApplication failed", error);
    }

    await sleep(Math.max(0, MIN_BUSY_MS - (Date.now() - startedAt)));
    clearDraft();
    setPhaseBoth("sent");
    await sleep(reducedMotion() ? 150 : OVERLAY_MS);
    setPhaseBoth("done");
    setAnnounce("Application received. We'll be in touch.");
    window.scrollTo({ top: 0, behavior: "auto" });
    window.setTimeout(() => document.getElementById("stepTitle")?.focus({ preventScroll: true }), 60);
  };

  const next = () => {
    if (phaseRef.current !== "form") return;
    const id = STEPS[stepRef.current].id;
    const d = dataRef.current;
    const keys = fieldsForStep(id, d);
    const found = validateFields(keys, d);
    const first = keys.find((k) => found[k]);
    if (first) {
      setErrors(found);
      reportInvalid(id, found, first);
      focusInvalid(first);
      return;
    }
    setErrors({});
    if (id === "channel") {
      void submit();
      return;
    }
    advance();
  };

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    next();
  };

  const onFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    const target = event.target as HTMLInputElement;
    if (target.tagName === "INPUT" && target.type !== "radio" && target.type !== "checkbox") {
      event.preventDefault();
      next();
    }
  };

  /* ------------------------------------------------------------------ render --------------- */

  const ctx: StepCtx = { data, errors, set, blur, openLegal: setLegal, tzDetected };
  const def = STEPS[step];
  const isCover = def.id === "cover";
  const flowTotal = STEPS.length - 1; // the cover is not a numbered step
  const flowPos = isCover ? 0 : step;
  const done = phase === "done";
  const pct = done ? 100 : isCover ? 0 : (flowPos / flowTotal) * 100;

  const waMessage = useMemo(() => buildWhatsappMessage(data), [data]);
  const waHref = useMemo(() => whatsappHref(waMessage, env), [waMessage, env]);

  const nextLabel =
    phase === "submitting"
      ? "Submitting…"
      : def.id === "channel"
        ? "Submit application"
        : step === 0
          ? "Start application"
          : "Continue";

  const body = (() => {
    switch (def.id) {
      case "cover":
        return <CoverStep />;
      case "details":
        return <DetailsStep {...ctx} />;
      case "credit":
        return <CreditStep {...ctx} />;
      case "part":
        return <PartStep {...ctx} />;
      case "ready":
        return <ReadyStep {...ctx} />;
      default:
        return <ChannelStep {...ctx} />;
    }
  })();

  return (
    <div className="wz">
      <div className="app">
        <aside className="rail">
          <div className="rail-brand">
            <img src={brand.logoSrc} alt="" />
            <div>
              <span className="w">{brand.shortName}</span>
              <span className="t">Partner App</span>
            </div>
          </div>
          <nav aria-label="Application steps">
            <ol className="rail-steps">
              {STEPS.filter((s) => s.id !== "cover").map((s, i) => {
                const flowIdx = i + 1;
                const state = done
                  ? "done"
                  : isCover
                    ? "todo"
                    : flowIdx < step
                      ? "done"
                      : flowIdx === step
                        ? "active"
                        : "todo";
                return (
                  <li key={s.id} data-state={state}>
                    <span className="dot" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                    <span className="nm">{s.label}</span>
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="rail-foot">
            {["LLC formed in your name", "You never pay us anything", "No soft or hard credit check"].map((t) => (
              <div className="assure" key={t}>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="stage">
          <header className="topbar">
            <div className="brand">
              <img src={brand.logoSrc} alt="" />
              <b>{brand.shortName}</b>
            </div>
            <div className="counter" aria-hidden="true" style={{ visibility: isCover || done ? "hidden" : undefined }}>
              <span className="cur">{pad(flowPos)}</span>
              <span>/</span>
              <span className="tot">{pad(flowTotal)}</span>
            </div>
          </header>

          <div
            className="progress"
            role="progressbar"
            aria-label="Application progress"
            aria-valuemin={0}
            aria-valuemax={flowTotal}
            aria-valuenow={done ? flowTotal : flowPos}
            aria-valuetext={
              done ? "Application received" : isCover ? "Welcome screen" : `Step ${flowPos} of ${flowTotal}: ${def.label}`
            }
          >
            <i style={{ width: `${pct}%` }} />
          </div>

          <main className="viewport">
            <div className="card" ref={cardRef}>
              {done ? (
                <DoneScreen
                  data={data}
                  env={env}
                  waMessage={waMessage}
                  waHref={waHref}
                  onWhatsappTap={() =>
                    window.Tracking?.trackFormEvent(
                      "whatsapp_cta_tapped",
                      env.inApp ? `in-app:${env.app}` : env.isIOS || env.isAndroid ? "mobile-browser" : "desktop",
                    )
                  }
                  onCopy={(ok) =>
                    window.Tracking?.trackFormEvent("whatsapp_message_copied", ok ? "ok" : "manual-fallback")
                  }
                />
              ) : (
                <form noValidate autoComplete="on" onSubmit={onFormSubmit} onKeyDown={onFormKeyDown}>
                  <section key={step} className={`step active dir-${dir}`}>
                    {body}
                  </section>
                </form>
              )}
            </div>
          </main>

          {!done && (
            <footer className="nav">
              <button type="button" className="btn btn-ghost" hidden={step === 0} disabled={phase !== "form"} onClick={goBack}>
                <IconChevronLeft className="chev" />
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={phase !== "form"}
                aria-busy={phase === "submitting" ? true : undefined}
                onClick={next}
              >
                <span>{nextLabel}</span>
                {phase === "form" && <IconArrow className="arrow" />}
              </button>
            </footer>
          )}
        </div>
      </div>

      {/* The "application received" wipe. Its mark is mounted only while it shows, so the rings and the
          tick draw every time instead of finishing unseen at page load. */}
      <div className={`send${phase === "sent" ? " on" : ""}`} aria-hidden={phase !== "sent"}>
        <div className="send-in">
          {phase === "sent" && (
            <div className="ring">
              <span />
              <span />
              <span />
              <div className="core">
                <IconCheck />
              </div>
            </div>
          )}
          <span className="send-label">Application received</span>
        </div>
      </div>

      <LegalModal doc={legal} onClose={() => setLegal(null)} />

      <div className="sr-only" aria-live="polite">
        {announce}
      </div>
    </div>
  );
};

export default Apply;
