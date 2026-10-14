export type Option = { value: string; label: string };

export const EMPLOYMENT_OPTIONS: readonly Option[] = [
  { value: "employed-full", label: "Employed Full-Time" },
  { value: "employed-part", label: "Employed Part-Time" },
  { value: "self-employed", label: "Self-Employed / Business Owner" },
  { value: "other", label: "Other" },
];

export const CREDIT_SCORE_OPTIONS: readonly Option[] = [
  { value: "750+", label: "750+ — Excellent" },
  { value: "700-749", label: "700–749 — Very Good" },
  { value: "600-699", label: "600–699 — Good" },
  { value: "below-600", label: "Below 600" },
];
