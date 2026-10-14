const STORAGE_KEY = "lead-form:campaign";

const readStoredCampaign = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const storeCampaign = (campaign: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, campaign);
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). Attribution is best-effort.
  }
};

/**
 * Resolves the marketing campaign for this visit.
 * A `?campaign=` URL value wins and is remembered; otherwise the remembered one is used, then "default".
 */
export const resolveCampaign = (fromUrl: string | null): string => {
  if (fromUrl) {
    storeCampaign(fromUrl);
    return fromUrl;
  }
  return readStoredCampaign() || "default";
};
