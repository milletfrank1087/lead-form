export type ApplicationPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  employed: string;
  creditScore: string;
  message: string;
  referralCode: string;
  contactPref: string;
  campaign: string;
};

type TrackingGlobal = {
  generateEventId: (eventName: string) => string;
  getFullTrackingPayload: (eventId?: string) => Record<string, unknown>;
  setUserEmail: (email: string) => Promise<string | null>;
  fireFormStartedOnce: () => string | null;
  trackLeadBrowser: (
    leadMeta?: { creditScore?: string; employed?: string },
    eventId?: string,
  ) => string;
  trackFormEvent: (
    eventType: string,
    details?: string | null,
    extra?: Record<string, unknown> | null,
  ) => void;
};

type FunnelMonitorGlobal = {
  stage: (name: string) => void;
  attempt: (result: string, ms?: number, extra?: Record<string, unknown>) => void;
  getStage: () => string;
  getElapsedMs: () => number;
};

declare global {
  interface Window {
    Tracking?: TrackingGlobal;
    FunnelMonitor?: FunnelMonitorGlobal;
  }
}

export async function submitApplication(payload: ApplicationPayload): Promise<void> {
  const startedAt = Date.now();
  const leadEventId = window.Tracking
    ? window.Tracking.generateEventId("Lead")
    : `Lead_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  if (window.FunnelMonitor) {
    window.FunnelMonitor.stage("submitting");
  }

  if (window.Tracking && payload.email) {
    await window.Tracking.setUserEmail(payload.email);
  }

  const trackingPayload = window.Tracking
    ? window.Tracking.getFullTrackingPayload(leadEventId)
    : { eventId: leadEventId, sourceUrl: window.location.href };

  const timeToSubmitMs = window.FunnelMonitor?.getElapsedMs
    ? window.FunnelMonitor.getElapsedMs()
    : null;

  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      timeToSubmitMs,
      tracking: trackingPayload,
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const errMsg =
      (errBody as { error?: string }).error || `Failed to submit application (${response.status})`;
    if (window.Tracking) {
      window.Tracking.trackFormEvent("submit_error", errMsg);
    }
    if (window.FunnelMonitor) {
      window.FunnelMonitor.attempt("error", Date.now() - startedAt);
    }
    throw new Error(errMsg);
  }

  if (window.Tracking) {
    window.Tracking.trackLeadBrowser(
      { creditScore: payload.creditScore, employed: payload.employed },
      leadEventId,
    );
  }

  if (window.FunnelMonitor) {
    window.FunnelMonitor.stage("submitted");
    window.FunnelMonitor.attempt("submitted", Date.now() - startedAt);
  }
}
