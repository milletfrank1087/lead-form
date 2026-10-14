/**
 * Everything brand-specific on the page lives here (plus /public/logo.png and the <title> in index.html),
 * so the identity can be replaced in one place.
 *
 * These values reproduce the page this project was modelled on. If you are not that company, replace
 * them (and the logo) with your own before publishing anything.
 */
export const brand = {
  name: "Fynex Network",
  shortName: "Fynex",
  legalEntity: "FynexNetwork LLC",
  copyrightYear: 2026,
  logoSrc: "/logo.png",
} as const;
