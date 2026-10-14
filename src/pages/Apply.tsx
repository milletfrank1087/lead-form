import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApplicationReceived } from "@/components/ApplicationReceived";
import { ApplyBackground } from "@/components/ApplyBackground";
import { BackToHomeButton } from "@/components/BackToHomeButton";
import { ContactMethodPicker, type ContactMethod } from "@/components/ContactMethodPicker";
import { SelectField } from "@/components/SelectField";
import { StateCombobox } from "@/components/StateCombobox";
import { brand } from "@/config/brand";
import { resolveCampaign } from "@/lib/campaign";
import { CREDIT_SCORE_OPTIONS, EMPLOYMENT_OPTIONS } from "@/lib/form-options";
import { formatUsPhone } from "@/lib/phone";
import { submitApplication } from "@/lib/submit-application";
import { US_STATES } from "@/lib/us-states";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  employed: string;
  creditScore: string;
  message: string;
  referralCode: string;
  contactPref: ContactMethod | "";
  agree: boolean;
};

const INITIAL_FORM: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  employed: "",
  creditScore: "",
  message: "",
  referralCode: "",
  contactPref: "",
  agree: false,
};

const STATE_OPTIONS = US_STATES.map((state) => ({ value: state, label: state }));

/** The "Submitting..." overlay stays up at least this long, so it never just flickers. */
const MIN_SUBMIT_OVERLAY_MS = 2000;
/** How long the white check-mark flash shows before the "Application Received" screen replaces the form. */
const SUCCESS_FLASH_MS = 650;

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base sm:text-sm text-zinc-900 font-sans placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all hover:border-zinc-300";
const inputErrorClass = "border-red-400 ring-2 ring-red-100 focus:border-red-400";
const labelClass =
  "block text-xs font-semibold text-zinc-500 mb-1.5 font-sans uppercase tracking-widest";
const sectionLabelClass = "text-[10px] font-semibold text-zinc-400 uppercase tracking-widest font-sans";
const cardClass = "bg-white rounded-2xl border border-zinc-100 shadow-sm p-7 space-y-5";

const Apply = () => {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);
  const [booting, setBooting] = useState(true);
  const [showErrors, setShowErrors] = useState(false);
  const [searchParams] = useSearchParams();
  const [campaign] = useState(() => resolveCampaign(searchParams.get("campaign")));

  const isComplete = () =>
    !!(
      form.firstName &&
      form.lastName &&
      form.email &&
      form.phone &&
      form.employed &&
      form.creditScore &&
      form.contactPref &&
      form.agree
    );

  /** Red highlight, shown only after the first submit attempt. */
  const hasError = (key: keyof FormState) => showErrors && !form[key];

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => {
      const next = { ...previous, [key]: value };
      if (
        (key === "firstName" ||
          key === "lastName" ||
          key === "email" ||
          key === "phone" ||
          key === "city" ||
          key === "state") &&
        value
      ) {
        window.Tracking?.fireFormStartedOnce();
        window.FunnelMonitor?.stage("personal_info");
      }
      if (key === "employed" || key === "creditScore") {
        window.FunnelMonitor?.stage("qualification");
        const emp = key === "employed" ? String(value) : previous.employed;
        const cred = key === "creditScore" ? String(value) : previous.creditScore;
        if (emp && cred) {
          window.Tracking?.trackFormEvent(
            "qualification_selected",
            `${emp} · credit:${cred}`,
          );
        }
      }
      if (key === "contactPref" && value) {
        window.FunnelMonitor?.stage("contact_method");
        window.Tracking?.trackFormEvent(
          "contact_method_selected",
          `preferred: ${String(value)}`,
        );
      }
      return next;
    });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    const refParam = searchParams.get("ref") || searchParams.get("referral");
    if (refParam) {
      setForm((prev) =>
        prev.referralCode ? prev : { ...prev, referralCode: refParam.toUpperCase() },
      );
    }
  }, [searchParams]);

  // White cover that is dropped right after mount, then fades out (avoids a flash of unstyled content).
  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowErrors(true);
    if (!isComplete()) {
      const missing: string[] = [];
      if (!form.firstName) missing.push("firstName");
      if (!form.lastName) missing.push("lastName");
      if (!form.email) missing.push("email");
      if (!form.phone) missing.push("phone");
      if (!form.employed) missing.push("employed");
      if (!form.creditScore) missing.push("creditScore");
      if (!form.contactPref) missing.push("contactPref");
      if (!form.agree) missing.push("agree");
      window.FunnelMonitor?.stage("validation_error");
      window.Tracking?.trackFormEvent(
        "validation_error",
        `missing: ${missing.join(", ")}`,
      );
      return;
    }

    setSubmitting(true);
    const startedAt = Date.now();

    try {
      await submitApplication({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        city: form.city,
        state: form.state,
        employed: form.employed,
        creditScore: form.creditScore,
        message: form.message,
        referralCode: form.referralCode,
        contactPref: form.contactPref,
        campaign,
      });
    } catch (error) {
      // Same behaviour as the original page: carry on to the success screen even if sending failed.
      console.error("submitApplication failed", error);
    }

    const overlayTimeLeft = Math.max(0, MIN_SUBMIT_OVERLAY_MS - (Date.now() - startedAt));
    window.setTimeout(() => {
      setSubmitting(false);
      setShowSuccessFlash(true);
      window.setTimeout(() => {
        setSubmitted(true);
        setShowSuccessFlash(false);
      }, SUCCESS_FLASH_MS);
    }, overlayTimeLeft);
  };

  return (
    <div className="min-h-screen relative bg-white text-zinc-900 font-sans selection:bg-primary/20 selection:text-primary">
      <ApplyBackground />

      {submitting && (
        <div
          className="fixed inset-0 z-[9999] bg-primary flex flex-col items-center justify-center gap-8"
          style={{ animation: "fadeInOverlay 0.25s ease-out both" }}
        >
          <div className="relative flex items-center justify-center">
            <div className="absolute w-40 h-40 rounded-full border-2 border-white/20 animate-[ping_2s_ease-out_infinite]" />
            <div className="absolute w-32 h-32 rounded-full border border-white/30 animate-[spin_3s_linear_infinite]" />
            <div className="absolute w-24 h-24 rounded-full border border-white/20 animate-[spin_2s_linear_infinite_reverse]" />
            <div className="relative w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-2xl">
              <img src={brand.logoSrc} alt={brand.shortName} className="w-10 h-10 object-contain rounded-full" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-white text-lg font-semibold font-manrope tracking-tight">
              Submitting your application…
            </p>
            <p className="text-white/60 text-sm font-sans mt-1">This will only take a moment</p>
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="w-2 h-2 rounded-full bg-white/70"
                style={{ animation: `bounceDot 1.2s ease-in-out ${index * 0.2}s infinite` }}
              />
            ))}
          </div>
        </div>
      )}

      <header
        className="sticky top-0 z-50 w-full border-b border-zinc-100 bg-white/80 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={brand.logoSrc}
              alt={brand.name}
              className="h-7 w-7 object-contain rounded-full ring-1 ring-zinc-300"
            />
            <span className="text-sm font-semibold tracking-widest uppercase text-zinc-900">{brand.name}</span>
          </Link>
          <BackToHomeButton size="sm" />
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 pt-10 pb-20 sm:pb-24">
        {submitted ? (
          <ApplicationReceived contactPref={form.contactPref} />
        ) : (
          <>
            <div className="mb-14 text-center">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-zinc-900 font-manrope leading-tight mb-5">
                Apply to partner
                <br />
                with{" "}
                <span className="inline-flex items-center gap-2 align-middle">
                  <svg
                    width="44"
                    height="44"
                    viewBox="0 0 44 44"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="inline-block shrink-0 drop-shadow-sm"
                    style={{ transform: "rotate(20deg)" }}
                    aria-hidden="true"
                  >
                    <rect width="44" height="44" rx="12" fill="#2563EB" />
                    <line x1="22" y1="11" x2="33" y2="30" stroke="white" strokeWidth="1.8" strokeOpacity="0.5" strokeLinecap="round" />
                    <line x1="22" y1="11" x2="11" y2="30" stroke="white" strokeWidth="1.8" strokeOpacity="0.5" strokeLinecap="round" />
                    <line x1="11" y1="30" x2="33" y2="30" stroke="white" strokeWidth="1.8" strokeOpacity="0.5" strokeLinecap="round" />
                    <circle cx="22" cy="11" r="3.5" fill="white" />
                    <circle cx="11" cy="30" r="3.5" fill="white" />
                    <circle cx="33" cy="30" r="3.5" fill="white" />
                  </svg>
                  <span className="text-primary">{`${brand.name}.`}</span>
                </span>
              </h1>
              <p className="text-zinc-500 text-lg leading-relaxed font-sans max-w-md mx-auto">
                All applications are reviewed within 24 hours and kept strictly confidential.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className={cardClass}>
                <p className={sectionLabelClass}>Personal Information</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>
                      First Name <span className="text-primary">*</span>
                    </label>
                    <input
                      required
                      value={form.firstName}
                      onChange={(event) => setField("firstName", event.target.value)}
                      placeholder="John"
                      className={`${inputClass} ${hasError("firstName") ? inputErrorClass : ""}`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Last Name <span className="text-primary">*</span>
                    </label>
                    <input
                      required
                      value={form.lastName}
                      onChange={(event) => setField("lastName", event.target.value)}
                      placeholder="Smith"
                      className={`${inputClass} ${hasError("lastName") ? inputErrorClass : ""}`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Email Address <span className="text-primary">*</span>
                  </label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => setField("email", event.target.value)}
                    placeholder="john@example.com"
                    className={`${inputClass} ${hasError("email") ? inputErrorClass : ""}`}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    US Phone Number <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400 font-sans select-none pointer-events-none">
                      +1
                    </span>
                    <input
                      required
                      type="tel"
                      value={form.phone}
                      onChange={(event) => setField("phone", formatUsPhone(event.target.value))}
                      placeholder="(555) 000-0000"
                      className={`${inputClass} pl-10 ${hasError("phone") ? inputErrorClass : ""}`}
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>City</label>
                    <input
                      value={form.city}
                      onChange={(event) => setField("city", event.target.value)}
                      placeholder="Los Angeles"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>State</label>
                    <StateCombobox
                      value={form.state}
                      onChange={(value) => setField("state", value)}
                      options={STATE_OPTIONS}
                      placeholder="Select a state…"
                      searchPlaceholder="Search states…"
                      emptyText="No states found."
                    />
                  </div>
                </div>
              </div>

              <div className={cardClass}>
                <p className={sectionLabelClass}>Qualification Details</p>

                <SelectField
                  label="Employment Status"
                  required
                  value={form.employed}
                  onChange={(value) => setField("employed", value)}
                  options={EMPLOYMENT_OPTIONS}
                  placeholder="Select your status…"
                  error={hasError("employed")}
                />

                <SelectField
                  label="Approximate Credit Score"
                  required
                  value={form.creditScore}
                  onChange={(value) => setField("creditScore", value)}
                  options={CREDIT_SCORE_OPTIONS}
                  placeholder="Select a range…"
                  error={hasError("creditScore")}
                />

                <div>
                  <label className={labelClass}>Additional Message (Optional)</label>
                  <textarea
                    value={form.message}
                    onChange={(event) => setField("message", event.target.value)}
                    rows={4}
                    placeholder="Tell us a little about yourself and why you're interested…"
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Referral Code (Optional)</label>
                  <input
                    value={form.referralCode}
                    onChange={(event) => setField("referralCode", event.target.value.toUpperCase())}
                    placeholder="e.g. A1B2C3"
                    className={`${inputClass} uppercase`}
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-7 space-y-4">
                <div>
                  <p className={`${sectionLabelClass} mb-1`}>
                    Preferred Contact Method <span className="text-primary">*</span>
                  </p>
                  <p className="text-xs text-zinc-400 font-sans">How should we get back to you?</p>
                </div>
                <ContactMethodPicker
                  value={form.contactPref}
                  onChange={(value) => setField("contactPref", value)}
                  error={hasError("contactPref")}
                />
              </div>

              <div className="flex items-start gap-3 px-1">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={form.agree}
                  aria-labelledby="agree-label"
                  onClick={() => setField("agree", !form.agree)}
                  className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                    form.agree
                      ? "bg-primary border-primary"
                      : hasError("agree")
                        ? "border-red-400 bg-red-50"
                        : "border-zinc-300 bg-white"
                  }`}
                >
                  {form.agree && (
                    <svg
                      viewBox="0 0 12 12"
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </button>
                <p id="agree-label" className="text-xs text-zinc-400 leading-relaxed font-sans">
                  {`I confirm all information is accurate and I agree to ${brand.name}'s `}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="group/btn w-full inline-flex items-center justify-center rounded-full bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-300 relative disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 pl-8 pr-4 py-4 text-base font-medium font-sans text-white flex items-center gap-2 min-w-[200px] justify-center">
                  {submitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting…
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </span>
                {!submitting && (
                  <span className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white mr-3 shrink-0 shadow-sm group-hover/btn:shadow-md transition-all duration-300">
                    <svg
                      className="w-3.5 h-3.5 text-primary group-hover/btn:translate-x-0.5 transition-transform duration-200"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                )}
              </button>
            </form>
          </>
        )}
      </main>

      <footer className="relative z-10 border-t border-zinc-100 py-8">
        <div className="max-w-2xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-400 font-sans">
          <p>{`© ${brand.copyrightYear} ${brand.legalEntity}. All rights reserved.`}</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-zinc-900 transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-zinc-900 transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>

      {booting && <div className="fixed inset-0 z-[9999] bg-white" />}
      {!booting && (
        <div
          className="fixed inset-0 z-[9999] bg-white pointer-events-none"
          style={{ animation: "fadeOutWhite 0.2s ease-out forwards" }}
        />
      )}

      {showSuccessFlash && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
          style={{ animation: "flashIn 0.65s ease-out forwards" }}
        >
          <div style={{ animation: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both" }}>
            <div className="relative w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-2xl">
              <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-30" />
              <svg
                viewBox="0 0 24 24"
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 30,
                  strokeDashoffset: 30,
                  animation: "drawCheck 0.35s ease-out 0.25s forwards",
                }}
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Apply;
