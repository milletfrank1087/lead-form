/**
 * Choices offered by the apply wizard.
 *
 * The `v` values are what the backend and the CRM store, so they must not change:
 *  - credit bands are the same strings the old form sent as `creditScore`;
 *  - channels must be one of email | whatsapp | telegram, or the CRM will not route the lead
 *    for outreach at all (leads_sync.py).
 */

export type CreditBand = "750+" | "700-749" | "600-699" | "below-600";
export type Speed = "1h" | "day" | "24h";
export type Channel = "whatsapp" | "telegram" | "email";

export const CREDIT_BANDS: readonly { v: CreditBand; t: string; s: string }[] = [
  { v: "750+", t: "750+", s: "Excellent" },
  { v: "700-749", t: "700–749", s: "Very good" },
  { v: "600-699", t: "600–699", s: "Good" },
  { v: "below-600", t: "Below 600", s: "Still building" },
];

/**
 * Speed labels only. The old "rate tier" framing is gone: pay is per completed check, so this now
 * ranks how close to the front of the queue a responder sits, not what a monthly rate is.
 */
export const SPEEDS: readonly { v: Speed; t: string; s: string; tier: string }[] = [
  { v: "1h", t: "Within 1 hour", s: "I'm usually near my phone", tier: "First in line" },
  { v: "day", t: "Same day", s: "I'll get to it that day", tier: "Next in line" },
  { v: "24h", t: "Within 24 hours", s: "Next day is fine", tier: "Standard" },
];

/** WhatsApp is listed first and carries the fastest reply chip on purpose. */
export const CHANNELS: readonly { v: Channel; t: string; s: string; eta: string; hot?: boolean }[] = [
  { v: "whatsapp", t: "WhatsApp", s: "Fastest — usually within 30 min", eta: "15–30 min", hot: true },
  { v: "telegram", t: "Telegram", s: "We reply in 1–2 hours", eta: "1–2 hrs" },
  { v: "email", t: "Email", s: "We reply within 24 hours", eta: "24 hrs" },
];

export const SPEED_PHRASE: Record<Speed, string> = {
  "1h": "within an hour",
  day: "the same day",
  "24h": "within 24 hours",
};

export const SPEED_SHORT: Record<Speed, string> = {
  "1h": "an hour",
  day: "that same day",
  "24h": "24 hours",
};

export const TIER_PHRASE: Record<Speed, string> = {
  "1h": "first in line",
  day: "next in line",
  "24h": "at the standard pace",
};

export const HOURS: readonly { v: string; t: string }[] = Array.from({ length: 24 }, (_, h) => {
  const ap = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { v: `${String(h).padStart(2, "0")}:00`, t: `${h12}:00 ${ap}` };
});

/** Zones a US-based applicant might need. A detected zone is added on top when it is not here. */
export const ZONES: readonly string[] = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Puerto_Rico",
];

export type StepId = "cover" | "details" | "credit" | "part" | "ready" | "channel";

export const STEPS: readonly { id: StepId; label: string; eyebrow: string }[] = [
  { id: "cover", label: "Welcome", eyebrow: "Be the American" },
  { id: "details", label: "Your details", eyebrow: "01 / Details" },
  { id: "credit", label: "Credit", eyebrow: "02 / Credit" },
  { id: "part", label: "Your part", eyebrow: "03 / Availability" },
  { id: "ready", label: "Your documents", eyebrow: "04 / Documents" },
  { id: "channel", label: "Reach you", eyebrow: "05 / Reach you" },
];

export type WizardData = {
  legalName: string;
  email: string;
  mobile: string;
  contactPref: Channel | "";
  /** Typed as the user wrote it; normalised with normalizeTelegramHandle() on submit. */
  telegramHandle: string;
  creditBand: CreditBand | "";
  creditConsent: boolean;
  availSpeed: Speed | "";
  availFrom: string;
  availTo: string;
  timezone: string;
  /** True once the person picked a zone themselves instead of keeping the detected one. */
  tzManual: boolean;
  readyAck: boolean;
};

export const EMPTY_DATA: WizardData = {
  legalName: "",
  email: "",
  mobile: "",
  contactPref: "",
  telegramHandle: "",
  creditBand: "",
  creditConsent: false,
  availSpeed: "",
  availFrom: "09:00",
  availTo: "18:00",
  timezone: "",
  tzManual: false,
  readyAck: false,
};

export type FieldKey =
  | "legalName"
  | "email"
  | "mobile"
  | "contactPref"
  | "telegramHandle"
  | "creditBand"
  | "creditConsent"
  | "availSpeed"
  | "readyAck";

export type Errors = Partial<Record<FieldKey, string>>;
