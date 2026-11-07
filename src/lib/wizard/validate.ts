import { normalizeTelegramHandle } from "@/lib/telegram";
import type { Errors, FieldKey, StepId, WizardData } from "./options";

/**
 * Validation for the wizard.
 *
 * It has to be at least as strict as POST /api/leads: the server answers 400 when a required field is
 * missing, and the form carries on to its success screen whatever the server says, so anything the
 * client lets through but the server rejects would silently lose the lead. In particular the server
 * needs BOTH a first and a last name.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
/** Letters (any script), combining marks, apostrophes, hyphens, dots and spaces. No digits, no emoji. */
const NAME_CHARS = /^[\p{L}\p{M}][\p{L}\p{M}'’.\-\s]*$/u;

export function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export function errorFor(key: FieldKey, d: WizardData): string {
  switch (key) {
    case "legalName": {
      const name = d.legalName.trim();
      if (!name) return "Enter your full legal name";
      if (!NAME_CHARS.test(name)) return "Use letters only, exactly as on your ID";
      if (name.split(/\s+/).length < 2) return "Add your last name too, exactly as on your ID";
      return "";
    }
    case "email": {
      const email = d.email.trim();
      if (!email) return "Enter your email address";
      return EMAIL.test(email) ? "" : "That email doesn't look right";
    }
    case "mobile": {
      const digits = d.mobile.replace(/\D/g, "");
      if (!digits) return "Enter your mobile number";
      if (digits.length !== 10) return "Enter a 10-digit US number";
      // North American area codes never start with 0 or 1, so this catches most typos.
      return /^[2-9]/.test(digits) ? "" : "That area code doesn't look right";
    }
    case "contactPref":
      return d.contactPref ? "" : "Choose where we should reach you";
    case "telegramHandle": {
      if (d.contactPref !== "telegram") return "";
      if (!d.telegramHandle.trim()) return "Enter your Telegram username";
      // Same rule the server and the CRM apply, so a value accepted here is one they accept.
      return normalizeTelegramHandle(d.telegramHandle)
        ? ""
        : "Use 5–32 letters, numbers or underscores, starting with a letter";
    }
    case "creditBand":
      return d.creditBand ? "" : "Choose a range";
    case "creditConsent":
      return d.creditConsent ? "" : "Please confirm to continue";
    case "availSpeed":
      return d.availSpeed ? "" : "Choose how quickly you can respond";
    case "readyAck":
      return d.readyAck ? "" : "Please confirm these are available";
    default:
      return "";
  }
}

export function fieldsForStep(id: StepId, d: WizardData): FieldKey[] {
  switch (id) {
    case "details":
      return ["legalName", "email", "mobile"];
    case "credit":
      return ["creditBand", "creditConsent"];
    case "part":
      return ["availSpeed"];
    case "ready":
      return ["readyAck"];
    case "channel":
      return d.contactPref === "telegram" ? ["contactPref", "telegramHandle"] : ["contactPref"];
    default:
      return [];
  }
}

export function validateFields(keys: FieldKey[], d: WizardData): Errors {
  const out: Errors = {};
  keys.forEach((k) => {
    const message = errorFor(k, d);
    if (message) out[k] = message;
  });
  return out;
}
