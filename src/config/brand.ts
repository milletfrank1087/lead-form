/**
 * Everything brand-specific on the page lives here (plus /public/logo.png and the <title> in index.html),
 * so the identity can be replaced in one place.
 *
 * These values reproduce the page this project was modelled on. If you are not that company, replace
 * them (and the logo) with your own before publishing anything.
 */
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
   * country code first). It is the only WhatsApp number on file and still unverified, so change it
   * here and every link follows.
   */
  whatsappNumber: "13183147693",
} as const;
