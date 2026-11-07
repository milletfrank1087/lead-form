import { brand } from "@/config/brand";
import { CREDIT_BANDS, type Speed, type WizardData } from "./options";
import { fmtHour, zoneOffset } from "./zone";

/**
 * Everything about getting a person from the confirmation screen into WhatsApp.
 *
 * This traffic comes from Facebook and TikTok ads, so the in-app browser (a webview the ad app embeds)
 * is the normal case. What that means in practice (see the research notes in the PR description):
 *  - a scripted redirect (setTimeout + location.assign) is NOT honoured to launch another app, on iOS
 *    or on Android, so we never use one;
 *  - a real tap on a real <a href> is the one thing every platform honours, so the handoff is a button;
 *  - on iOS the ad apps keep wa.me inside the webview, so the fallback is "open in browser" plus a
 *    copy-the-message button, and we say so on screen rather than leave a button that looks dead.
 */

export type InApp = "facebook" | "instagram" | "tiktok" | "messenger" | "other";

export type Env = {
  isAndroid: boolean;
  isIOS: boolean;
  app: InApp | null;
  inApp: boolean;
};

/** Display names for the hint text. */
export const APP_NAME: Record<InApp, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  messenger: "Messenger",
  other: "this app",
};

/**
 * App tokens first (they are stable); the generic Android `; wv)` marker is only a backstop because
 * current Facebook builds no longer send it. Messenger's UA also carries FBAN/FBAV, so it is tested first.
 */
export function detectEnv(
  ua: string = typeof navigator !== "undefined" ? navigator.userAgent || "" : "",
  maxTouchPoints: number = typeof navigator !== "undefined" ? navigator.maxTouchPoints || 0 : 0,
): Env {
  const isAndroid = /Android/i.test(ua);
  // iPadOS 13+ reports a Macintosh UA but has a touch screen.
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1);

  let app: InApp | null = null;
  if (/MessengerForiOS|Orca-Android|FBAN\/Messenger/i.test(ua)) app = "messenger";
  else if (/Instagram/i.test(ua)) app = "instagram";
  else if (/musical_ly|trill_|AppName\/ultralite|BytedanceWebview|TikTok/i.test(ua)) app = "tiktok";
  else if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) app = "facebook";
  else if (/Snapchat|LinkedInApp|Pinterest|Line\/|; wv\)/i.test(ua)) app = "other";
  // Backstop for apps we have not named: real iOS browsers (Safari, Chrome, Firefox, Edge, Opera) all
  // carry a "Safari/" token, while embedded WKWebViews do not.
  else if (isIOS && !/Safari\//i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)) app = "other";

  return { isAndroid, isIOS, app, inApp: app !== null };
}

export function whatsappDigits(): string {
  return brand.whatsappNumber.replace(/\D/g, "");
}

export function hasWhatsapp(): boolean {
  return whatsappDigits().length >= 8;
}

/** "13183147693" -> "+1 (318) 314-7693" */
export function displayWhatsappNumber(): string {
  const d = whatsappDigits();
  if (d.length === 11 && d.startsWith("1")) {
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return `+${d}`;
}

const SPEED_IN_MESSAGE: Record<Speed, string> = {
  "1h": "within 1 hour",
  day: "same day",
  "24h": "within 24 hours",
};

function hoursText(d: WizardData): string {
  return d.availFrom && d.availTo ? `${fmtHour(d.availFrom)}–${fmtHour(d.availTo)}` : "";
}

/**
 * The first WhatsApp message, pre-written so the person only presses send. Plain multi-line text on
 * purpose: a human can read it, route it and open the file without asking a follow-up.
 */
export function buildWhatsappMessage(d: WizardData): string {
  const band = CREDIT_BANDS.find((b) => b.v === d.creditBand)?.t ?? "";
  const speed = d.availSpeed ? SPEED_IN_MESSAGE[d.availSpeed] : "";
  const hours = hoursText(d);
  const offset = d.timezone ? zoneOffset(d.timezone) : "";
  const availability = [speed, hours].filter(Boolean).join(", ");

  return [
    "Hi Fynex — I've just submitted my partner application.",
    "",
    d.legalName.trim() || null,
    d.email.trim() || null,
    band ? `Credit band: ${band}` : null,
    availability ? `Availability: ${availability}${offset ? ` ${offset}` : ""}` : null,
    "",
    "I'm ready for the document steps whenever you are.",
  ]
    .filter((line): line is string => line !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

/**
 * Stored in the lead's `message` column. The server has no columns for availability, and the CRM
 * truncates `message` to 300 characters, so this stays short and readable by a person or by Maya.
 */
export function buildLeadMessage(d: WizardData): string {
  const speed = d.availSpeed ? `responds ${SPEED_IN_MESSAGE[d.availSpeed]}` : "";
  const hours = hoursText(d) ? `reachable ${hoursText(d)}` : "";
  const offset = d.timezone ? zoneOffset(d.timezone) : "";
  const zone = d.timezone ? `${d.timezone}${offset ? ` (${offset})` : ""}` : "";
  const bits = [speed, hours, zone].filter(Boolean).join(", ");
  return bits ? `Verification availability: ${bits}.`.slice(0, 300) : "";
}

/**
 * The href for the WhatsApp button.
 *  - Android in-app browsers drop https links into themselves, so they get an intent:// URL (with the
 *    https link as its own fallback if WhatsApp is not installed).
 *  - Everywhere else wa.me is WhatsApp's documented universal link / app link, which launches the app
 *    straight from a real tap on iOS Safari and Android Chrome.
 */
export function whatsappHref(message: string, env: Env): string {
  const digits = whatsappDigits();
  const text = encodeURIComponent(message);
  const web = `https://wa.me/${digits}?text=${text}`;
  if (env.isAndroid && env.inApp) {
    const fallback = encodeURIComponent(web);
    return `intent://send?phone=${digits}&text=${text}#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=${fallback};end`;
  }
  return web;
}

/** Clipboard write that survives webviews where the async API is missing or blocked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px";
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
