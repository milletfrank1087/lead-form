import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createJourneyLog } from './lib/logger.js';
import { visitors, getClientInfo, getOrCreateVisitor } from './lib/visitors.js';
import {
  trackEvent,
  trackLead,
  getTrackingConfig,
  isTrackingEnabled,
  getRecentCapiEvents,
} from './lib/tracking/index.js';
import {
  isSupabaseConfigured,
  hydrateStoreFromSupabase,
  upsertLeadInSupabase,
  deleteLeadInSupabase,
  logEventInSupabase,
  resetSupabaseTables,
} from './lib/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'leads.json');

const store = {
  leads: [],
  events: [],
};

function normalizeLeadForUi(lead) {
  const metaCapiOk =
    lead.metaCapiOk !== undefined ? lead.metaCapiOk : lead.capiMeta === '✓';
  const tiktokCapiOk =
    lead.tiktokCapiOk !== undefined ? lead.tiktokCapiOk : lead.capiTiktok === '✓';
  return {
    ...lead,
    ip: lead.ip || lead.ipAddress || null,
    ipAddress: lead.ipAddress || lead.ip || null,
    eventId: lead.eventId || lead.leadEventId || null,
    leadEventId: lead.leadEventId || lead.eventId || null,
    metaCapiOk,
    tiktokCapiOk,
    capiSent: Boolean(metaCapiOk || tiktokCapiOk || lead.capiSent),
  };
}

function loadLocalLeads() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (Array.isArray(raw)) {
        store.leads = raw.map(normalizeLeadForUi);
      } else if (raw && Array.isArray(raw.leads)) {
        store.leads = raw.leads.map(normalizeLeadForUi);
        if (Array.isArray(raw.events)) store.events = raw.events;
      }
    }
  } catch (err) {
    console.warn('[Store] Failed to read leads.json:', err.message);
  }
}

function saveLocalLeads() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ leads: store.leads, events: store.events.slice(0, 500) }, null, 2),
      'utf8'
    );
  } catch (err) {
    console.warn('[Store] Failed to write leads.json:', err.message);
  }
}

loadLocalLeads();

const JourneyLog = createJourneyLog({ market: 'US' });

function resolveVisitor(req) {
  const clientInfo = getClientInfo(req);
  const { visitor, isNew } = getOrCreateVisitor(
    clientInfo.ipAddress,
    clientInfo.clientLocation,
    clientInfo.userAgent
  );
  return { visitor, isNew, clientInfo };
}

function recordFunnelEvent(visitor, eventType, details, extra = null, capiStatus = null) {
  const locationStr = JourneyLog.formatLocation(visitor) || 'Unknown';
  const ev = {
    eventType,
    visitorId: visitor?.id || null,
    ip: visitor?.ip || null,
    ipAddress: visitor?.ip || null,
    location: locationStr,
    country: visitor?.country || null,
    device: visitor?.device || 'desktop',
    details: details || '',
    capiMeta: capiStatus?.meta || null,
    capiTiktok: capiStatus?.tiktok || null,
    extra: extra || null,
    createdAt: new Date().toISOString(),
  };
  store.events.unshift(ev);
  if (store.events.length > 500) store.events.length = 500;
  logEventInSupabase(ev);
  return ev;
}

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// First-party _fbp cookie middleware for resilient CAPI deduplication
app.use((req, res, next) => {
  if (!req.cookies._fbp) {
    const fbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 10000000000)}`;
    res.cookie('_fbp', fbp, {
      maxAge: 90 * 24 * 60 * 60 * 1000,
      httpOnly: false,
      sameSite: 'Lax',
    });
    req.fbp = fbp;
  } else {
    req.fbp = req.cookies._fbp;
  }
  next();
});

// Slow/error API & 404 scanner middleware
const NOISE_PATHS = ['/favicon.ico', '/robots.txt', '/apple-touch-icon'];
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const isApi = req.path.startsWith('/api/');
    const isNoise =
      NOISE_PATHS.some((p) => req.path.startsWith(p)) || req.path.endsWith('.map');

    if (isApi && (status >= 400 || duration > 3000)) {
      JourneyLog.system(
        status >= 500 ? '🚨' : '⚠️',
        `${req.method} ${req.path} -> ${status} (${duration}ms)`
      );
    } else if (!isApi && status === 404 && !isNoise) {
      JourneyLog.scannerHit();
    }
  });
  next();
});

function buildPixelScripts() {
  const { fbPixelId, tiktokPixelId, enabled } = getTrackingConfig();
  if (!enabled) return '';

  let scripts = '';
  if (fbPixelId) {
    scripts += `
  <!-- Meta Pixel Code -->
  <script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${fbPixelId}');
  </script>
  <noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=${fbPixelId}&ev=PageView&noscript=1"
  /></noscript>`;
  }

  if (tiktokPixelId) {
    scripts += `
  <!-- TikTok Pixel Code -->
  <script>
  !function (w, d, t) {
    w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
    var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
    ;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
    ttq.load('${tiktokPixelId}');
    ttq.page();
  }(window, document, 'ttq');
  </script>`;
  }
  return scripts;
}

// =============================================================================
// API ROUTES
// =============================================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    leadsCount: store.leads.length,
    visitorsCount: visitors.size,
    supabaseConfigured: isSupabaseConfigured(),
    trackingEnabled: isTrackingEnabled(),
  });
});

app.get('/api/config', (req, res) => {
  const { visitor, clientInfo } = resolveVisitor(req);
  const campaign = req.query.campaign || '';
  const ref = req.query.ref || '';
  const utm = [req.query.utm_source, req.query.utm_medium, req.query.utm_campaign]
    .filter(Boolean)
    .join('/');
  const sourceUrl =
    req.get('Referer') ||
    `${req.protocol}://${req.get('host')}/apply${
      campaign ? `?campaign=${encodeURIComponent(String(campaign))}` : ''
    }`;

  JourneyLog.newVisitor(visitor, sourceUrl, null);
  recordFunnelEvent(
    visitor,
    'page_visit',
    [campaign ? `campaign:${campaign}` : null, ref ? `ref:${ref}` : null, utm ? `utm:${utm}` : null]
      .filter(Boolean)
      .join(' · ') || 'Visited application page'
  );

  res.cookie('visitor_id', visitor.id, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: false,
    sameSite: 'Lax',
  });

  res.json({
    visitorId: visitor.id,
    ip: visitor.ip,
    location: clientInfo.clientLocation || {
      city: visitor.city,
      region: visitor.region,
      country: visitor.country,
      countryCode: visitor.country,
    },
    device: visitor.device,
    visitCount: visitor.eventCount,
    fbp: req.fbp,
    ...getTrackingConfig(),
  });
});

app.get('/api/tracking/config', (req, res) => {
  res.json(getTrackingConfig());
});

app.post('/api/track', async (req, res) => {
  try {
    const { visitor, clientInfo } = resolveVisitor(req);
    const { eventName, eventId, customData = {}, tracking = {} } = req.body || {};
    if (!eventName) {
      return res.status(400).json({ error: 'eventName is required' });
    }

    const effectiveEventId =
      eventId || tracking.eventId || `${eventName}_${Date.now()}`;
    const sourceUrl =
      tracking.sourceUrl ||
      req.get('Referer') ||
      `${req.protocol}://${req.get('host')}/apply`;

    const eventData = {
      eventId: effectiveEventId,
      sourceUrl,
      contentName: customData.content_name || 'Fynex Partner Application',
      contentCategory: customData.content_category || 'partner-lead',
      contentType: customData.content_type || 'lead',
      status: customData.status,
    };

    const userData = {
      emailHash: tracking.emailHash || null,
      fbp: tracking.fbp || req.fbp,
      fbc: tracking.fbc || req.cookies?._fbc || null,
      ttp: tracking.ttp || req.cookies?._ttp || null,
      ttclid: tracking.ttclid || null,
      externalId: visitor.id,
    };

    const statusObj = await trackEvent(eventName, eventData, userData, clientInfo);
    if (eventName !== 'PageView' && eventName !== 'ViewContent') {
      JourneyLog.event(visitor, eventName, eventName, statusObj);
    }

    res.json({ success: true, eventId: effectiveEventId, capi: statusObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/track/form-event', (req, res) => {
  const { visitor } = resolveVisitor(req);
  const { eventType, details, extra } = req.body || {};

  JourneyLog.formEvent(visitor, eventType || 'form_event', details || '', null);
  recordFunnelEvent(visitor, eventType || 'form_event', details || '', extra || null);
  res.json({ success: true });
});

app.post('/api/client/error', (req, res) => {
  const { visitor } = resolveVisitor(req);
  const issue = req.body || {};
  const sig = `${issue.type || 'ERROR'}:${issue.message || ''}:${issue.line || 0}`;
  JourneyLog.clientError(visitor.id, sig, `${issue.type || 'ERROR'}: ${issue.message || ''}`);
  recordFunnelEvent(visitor, 'client_error', `${issue.type || 'ERROR'}: ${issue.message || ''}`);
  res.json({ ok: true });
});

app.post('/api/client/report', (req, res) => {
  const { visitor } = resolveVisitor(req);
  const report = req.body || {};
  if (report.funnelStage) {
    JourneyLog.funnelExit(report.funnelStage);
  }
  if (
    report.funnelStage &&
    report.funnelStage !== 'submitted' &&
    report.funnelStage !== 'landing'
  ) {
    const details = `stage:${report.funnelStage} (${Math.round((report.durationMs || 0) / 1000)}s)`;
    JourneyLog.formEvent(visitor, 'form_abandon', details, null);
    recordFunnelEvent(visitor, 'form_abandon', details, report);
    saveLocalLeads();
  }
  res.json({ ok: true });
});

async function handleCreateLead(req, res) {
  try {
    const { visitor, clientInfo } = resolveVisitor(req);
    const body = req.body || {};
    const {
      firstName,
      lastName,
      email,
      phone,
      city = '',
      state = '',
      employed,
      creditScore,
      message = '',
      referralCode = '',
      contactPref,
      campaign = 'direct',
      timeToSubmitMs = null,
      tracking = {},
    } = body;

    if (!firstName || !lastName || !email || !phone || !employed || !creditScore || !contactPref) {
      JourneyLog.formEvent(
        visitor,
        'validation_error',
        'Missing required application fields on POST /api/leads',
        null
      );
      return res.status(400).json({ error: 'Please complete all required application fields.' });
    }

    const leadId = `LEAD-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
    const eventId =
      tracking.eventId || `Lead_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const sourceUrl =
      tracking.sourceUrl ||
      req.get('Referer') ||
      `${req.protocol}://${req.get('host')}/apply`;
    const fbp = tracking.fbp || req.fbp || null;
    const fbc = tracking.fbc || req.cookies?._fbc || null;
    const ttp = tracking.ttp || req.cookies?._ttp || null;
    const ttclid = tracking.ttclid || null;

    const capiStatus = await trackLead(
      {
        leadId,
        visitorId: visitor.id,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: String(email).trim().toLowerCase(),
        phone: String(phone).trim(),
        city: String(city).trim(),
        state: String(state).trim(),
        employed: String(employed).trim(),
        creditScore: String(creditScore).trim(),
        contactPref: String(contactPref).trim(),
      },
      {
        eventId,
        sourceUrl,
        fbp,
        fbc,
        ttp,
        ttclid,
      },
      clientInfo
    );

    const metaCapiOk = capiStatus?.meta === '✓';
    const tiktokCapiOk = capiStatus?.tiktok === '✓';
    const capiSent = metaCapiOk || tiktokCapiOk;

    const nowIso = new Date().toISOString();
    const locationLabel =
      [visitor.city, visitor.region, visitor.country].filter(Boolean).join(', ') || 'Unknown';

    const leadRecord = normalizeLeadForUi({
      leadId,
      status: 'NEW',
      createdAt: nowIso,
      updatedAt: nowIso,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      fullName: `${String(firstName).trim()} ${String(lastName).trim()}`.trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone).trim(),
      city: String(city).trim(),
      state: String(state).trim(),
      employed: String(employed).trim(),
      creditScore: String(creditScore).trim(),
      contactPref: String(contactPref).trim(),
      referralCode: String(referralCode).trim(),
      message: String(message).trim(),
      campaign: String(campaign || 'direct').trim(),
      visitorId: visitor.id,
      ip: visitor.ip,
      ipAddress: visitor.ip,
      location: locationLabel,
      country: visitor.country || null,
      region: visitor.region || null,
      device: visitor.device,
      userAgent: clientInfo.userAgent,
      fbp,
      fbc,
      fbclid: tracking.fbclid || null,
      ttp,
      ttclid,
      utmSource: tracking.utmSource || null,
      utmMedium: tracking.utmMedium || null,
      utmCampaign: tracking.utmCampaign || null,
      utmContent: tracking.utmContent || null,
      utmTerm: tracking.utmTerm || null,
      referrer: tracking.referrer || clientInfo.referer || 'Direct',
      sourceUrl,
      eventId,
      leadEventId: eventId,
      capiMeta: capiStatus?.meta || null,
      capiTiktok: capiStatus?.tiktok || null,
      capiSent,
      metaCapiOk,
      tiktokCapiOk,
      timeToSubmitMs: typeof timeToSubmitMs === 'number' ? timeToSubmitMs : null,
      notes: '',
    });

    store.leads.unshift(leadRecord);
    saveLocalLeads();
    await upsertLeadInSupabase(leadRecord);

    JourneyLog.leadSubmitted(visitor, leadRecord, capiStatus);
    if (typeof timeToSubmitMs === 'number') {
      JourneyLog.attempt(visitor.device, 'submitted', timeToSubmitMs);
    }
    recordFunnelEvent(
      visitor,
      'lead_submitted',
      `${leadRecord.firstName} ${leadRecord.lastName} · ${leadRecord.email} · credit:${leadRecord.creditScore} · pref:${leadRecord.contactPref}`,
      null,
      capiStatus
    );

    res.status(201).json({
      success: true,
      leadId,
      eventId,
      capi: {
        meta: metaCapiOk,
        tiktok: tiktokCapiOk,
        status: capiStatus,
      },
    });
  } catch (err) {
    console.error('[API /api/leads] Error:', err);
    res.status(500).json({ error: 'Internal server error while saving application.' });
  }
}

app.post('/api/leads', handleCreateLead);
app.post('/api/apply', handleCreateLead);

app.get('/api/dashboard', (req, res) => {
  const trackingCfg = getTrackingConfig();
  res.json({
    leads: store.leads,
    events: store.events,
    capiEvents: getRecentCapiEvents(),
    logs: JourneyLog.getRecentLogs(),
    visitorsCount: visitors.size,
    tracking: {
      metaConfigured: Boolean(trackingCfg.fbPixelId && process.env.FB_ACCESS_TOKEN),
      tiktokConfigured: Boolean(trackingCfg.tiktokPixelId && process.env.TIKTOK_ACCESS_TOKEN),
      supabaseConfigured: isSupabaseConfigured(),
    },
    serverTime: new Date().toISOString(),
  });
});

app.patch('/api/leads/:leadId', async (req, res) => {
  const { leadId } = req.params;
  const { status, notes } = req.body || {};
  const lead = store.leads.find((l) => l.leadId === leadId);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }
  if (status) lead.status = status;
  if (typeof notes === 'string') lead.notes = notes;
  lead.updatedAt = new Date().toISOString();
  saveLocalLeads();
  await upsertLeadInSupabase(lead);
  res.json({ success: true, lead });
});

app.delete('/api/leads/:leadId', async (req, res) => {
  const { leadId } = req.params;
  const idx = store.leads.findIndex((l) => l.leadId === leadId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Lead not found' });
  }
  store.leads.splice(idx, 1);
  saveLocalLeads();
  await deleteLeadInSupabase(leadId);
  res.json({ success: true });
});

app.post('/api/dashboard/reset', async (req, res) => {
  store.leads = [];
  store.events = [];
  visitors.clear();
  saveLocalLeads();
  await resetSupabaseTables();
  res.json({ success: true });
});

// =============================================================================
// DASHBOARD & SPA HTML SERVING WITH PIXEL INJECTION
// =============================================================================

function serveDashboard(req, res) {
  const distDash = path.join(__dirname, 'dist', 'dashboard.html');
  const pubDash = path.join(__dirname, 'public', 'dashboard.html');
  const target = fs.existsSync(distDash) ? distDash : pubDash;
  res.sendFile(target);
}

app.get('/dashboard', serveDashboard);
app.get('/admin', serveDashboard);

const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(__dirname, 'public');

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { index: false }));
}
app.use(express.static(publicDir, { index: false }));

function serveSpaHtml(req, res) {
  const distIndex = path.join(distDir, 'index.html');
  const rootIndex = path.join(__dirname, 'index.html');
  const htmlPath = fs.existsSync(distIndex) ? distIndex : rootIndex;
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html.replace('<!-- TRACKING_PIXELS_PLACEHOLDER -->', buildPixelScripts());
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

app.get(['/', '/apply', '/terms', '/privacy'], serveSpaHtml);

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  serveSpaHtml(req, res);
});

async function startServer() {
  if (isSupabaseConfigured()) {
    const hydrated = await hydrateStoreFromSupabase();
    if (hydrated && Array.isArray(hydrated.leads) && hydrated.leads.length > 0) {
      store.leads = hydrated.leads.map(normalizeLeadForUi);
      saveLocalLeads();
    }
  }
  const trackingCfg = getTrackingConfig();
  const trackingSummary = [
    trackingCfg.fbPixelId ? `Meta(${trackingCfg.fbPixelId})` : null,
    trackingCfg.tiktokPixelId ? `TikTok(${trackingCfg.tiktokPixelId})` : null,
    isSupabaseConfigured() ? 'Supabase(ON)' : null,
  ]
    .filter(Boolean)
    .join(' + ') || 'Disabled';

  app.listen(PORT, () => {
    JourneyLog.startup(PORT, 'Fynex Partner Lead Funnel', 'EN', trackingSummary);
  });
}

startServer();
