import {
  CHANNELS,
  CREDIT_BANDS,
  EMPTY_DATA,
  HOURS,
  SPEEDS,
  type WizardData,
} from "./options";

/**
 * Keeps what someone has typed in sessionStorage, so a webview that reloads the page (iOS does this
 * after the ad app has been in the background for a while) does not send them back to a blank form.
 *
 * Consents are deliberately NOT stored: they must be ticked again on purpose. Storage can be missing
 * or throw (private mode, blocked cookies), so every call is best-effort.
 */

const KEY = "fynex:apply-draft:v1";

const STRING_KEYS = ["legalName", "email", "mobile", "telegramHandle", "timezone"] as const;

export function loadDraft(): WizardData {
  const base: WizardData = { ...EMPTY_DATA };
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Record<string, unknown>;
    if (!saved || typeof saved !== "object") return base;

    STRING_KEYS.forEach((k) => {
      const v = saved[k];
      if (typeof v === "string" && v.length <= 120) base[k] = v;
    });
    if (CHANNELS.some((c) => c.v === saved.contactPref)) base.contactPref = saved.contactPref as WizardData["contactPref"];
    if (CREDIT_BANDS.some((c) => c.v === saved.creditBand)) base.creditBand = saved.creditBand as WizardData["creditBand"];
    if (SPEEDS.some((s) => s.v === saved.availSpeed)) base.availSpeed = saved.availSpeed as WizardData["availSpeed"];
    if (HOURS.some((h) => h.v === saved.availFrom)) base.availFrom = saved.availFrom as string;
    if (HOURS.some((h) => h.v === saved.availTo)) base.availTo = saved.availTo as string;
    if (typeof saved.tzManual === "boolean") base.tzManual = saved.tzManual;
  } catch {
    // Unreadable draft: start clean.
  }
  return base;
}

export function saveDraft(d: WizardData): void {
  try {
    const { creditConsent: _c, readyAck: _r, ...persisted } = d;
    void _c;
    void _r;
    window.sessionStorage.setItem(KEY, JSON.stringify(persisted));
  } catch {
    // Best-effort only.
  }
}

export function clearDraft(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Best-effort only.
  }
}
