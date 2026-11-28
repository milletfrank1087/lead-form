/**
 * Everything brand-specific on the page lives here (plus /public/logo.png and the <title> in index.html),
 * so the identity can be replaced in one place.
 *
 * These values reproduce the page this project was modelled on. If you are not that company, replace
 * them (and the logo) with your own before publishing anything.
 */
/** The default, used when `VITE_WHATSAPP_NUMBER` is unset. This is the number the onboarding app SENDS
 *  from on the Stateside Partners WhatsApp Business account, "+1 269-240-6135" (`WHATSAPP_PHONE_NUMBER_ID`
 *  1403856056154617). It moved here from "+1 555-422-7372" on 2026-11-27: that number is still CONNECTED
 *  and still receives, but a pending *rename* makes Meta refuse every send on it (131037), so a tap there
 *  reached a number nothing could answer from. The app moved to this one and the form must point at the
 *  same number, from one constant, or candidates land in a chat that never replies. Do not fall back to
 *  any earlier default (15554227372, 19104740901, 13183147693): they are different chats. */
const FALLBACK_WHATSAPP_NUMBER = "12692406135";

/** `VITE_WHATSAPP_NUMBER` wins when it is a usable number (8+ digits); anything else falls back.
 *  Read through import.meta.env so Vite inlines it at build time (the page is a static SPA). */
function readWhatsappNumber(): string {
  const fromEnv = String(import.meta.env.VITE_WHATSAPP_NUMBER ?? "").trim();
  return fromEnv.replace(/\D/g, "").length >= 8 ? fromEnv : FALLBACK_WHATSAPP_NUMBER;
}

export const brand = {
  name: "Stateside Partners",
  shortName: "Stateside",
  legalEntity: "Stateside Partners LLC",
  copyrightYear: 2026,
  logoSrc: "/logo.png",
  /** The role the applicant is being recruited for. Surfaces on the rail; nothing else names it. */
  roleName: "American Verifier",
  /** The one-line hook for the role. Cover eyebrow + title-lead copy lean on this framing. */
  programLine: "Be the American.",
  /**
   * The ONLY place the amount and cadence are written inside the wizard: the confirmation screen
   * imports these. The matching values live in Maya's KB (HQ-06/HQ-11) and in the ad copy.
   */
  pay: "$50 a check",
  payCadence: "every two weeks",
  /**
   * Where the "Start the conversation" button on the confirmation screen sends people (digits only,
   * country code first). Every link and the number printed in the handoff hint come from this one value.
   *
   * This must be the number Maya SENDS from, i.e. the Cloud API phone number on the WhatsApp Business
   * account (`WHATSAPP_PHONE_NUMBER_ID` in the onboarding app, shown on its Channels page as the
   * "display phone number"). If it is any other number, the button opens a chat that nothing answers:
   * the candidate's message lands somewhere Maya never reads, and the 24-hour reply window opens on a
   * number she does not use. Override it per deploy with `VITE_WHATSAPP_NUMBER` rather than editing
   * this file, so the deployed number can be checked against Meta's dashboard without a release.
   *
   * A SECOND number on the same account still receives (that is how the 555 number above stranded
   * people), so `WHATSAPP_PHONE_NUMBER_ID` and this value are two separate settings that must agree.
   * The onboarding app's inbound filter accepts any number on its WhatsApp Business Account, so a
   * person who reaches the other one is still answered - from the number they wrote to.
   */
  whatsappNumber: readWhatsappNumber(),
} as const;
