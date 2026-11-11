/**
 * Everything brand-specific on the page lives here (plus /public/logo.png and the <title> in index.html),
 * so the identity can be replaced in one place.
 *
 * These values reproduce the page this project was modelled on. If you are not that company, replace
 * them (and the logo) with your own before publishing anything.
 */
/** The default, used when `VITE_WHATSAPP_NUMBER` is unset. This is the "+1 (910) 474-0901" business
 *  account that answers as "Phoenix Network" on WhatsApp, which is the brand this page now carries.
 *  The previous default (13183147693) answers as "FynnexNetwork LLC": both exist, and they are not
 *  the same chat. */
const FALLBACK_WHATSAPP_NUMBER = "19104740901";

/** `VITE_WHATSAPP_NUMBER` wins when it is a usable number (8+ digits); anything else falls back.
 *  Read through import.meta.env so Vite inlines it at build time (the page is a static SPA). */
function readWhatsappNumber(): string {
  const fromEnv = String(import.meta.env.VITE_WHATSAPP_NUMBER ?? "").trim();
  return fromEnv.replace(/\D/g, "").length >= 8 ? fromEnv : FALLBACK_WHATSAPP_NUMBER;
}

export const brand = {
  name: "Phoenix Network",
  shortName: "Phoenix",
  legalEntity: "Phoenix Network LLC",
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
   */
  whatsappNumber: readWhatsappNumber(),
} as const;
