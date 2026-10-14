import crypto from 'node:crypto';

// Log line format (shared with Paypal donate & GFM New Cloaked):
//   TIME      MKT VISITOR   STEP          WHAT HAPPENED                                  FLAGS
//   14:22:10  US  v-23f7d3  ✅ LEAD       Daniel W. · (512) 555-0147 · Austin, TX · 700-749 · 19s   ⚠ Meta ✗
// The visitor id (v-xxxxxx) identifies the whole journey across PageView -> Form -> Qualification -> Lead.
// Tracking status is only printed when it failed. Routine steps are counted into an hourly summary.

export const EVENT_CONFIG = {
  PageView: { icon: '👀', step: 'visit' },
  ViewContent: { icon: '👀', step: 'visit' },
  InitiateCheckout: { icon: '✏️', step: 'form' },
  Contact: { icon: '📱', step: 'contact' },
  Lead: { icon: '✅', step: 'LEAD', hidden: true },
  CompleteRegistration: { icon: '✅', step: 'LEAD', hidden: true },
};

export const FORM_EVENT_CONFIG = {
  form_started: { icon: '✏️', step: 'form', msg: 'started filling personal info' },
  qualification_selected: { icon: '📋', step: 'qualify', msg: 'selected qualification details' },
  contact_method_selected: { icon: '📱', step: 'contact', msg: 'selected preferred contact method' },
  validation_error: { icon: '⚠️', step: 'invalid', msg: 'form validation failed' },
  form_abandon: { icon: '🏃', step: 'abandon', msg: 'left application before submitting' },
  submit_error: { icon: '❌', step: 'error', msg: 'lead submission error' },
};

const recentLogLines = [];

export function getTimestamp() {
  return new Date().toLocaleTimeString('en-GB', {
    hour12: false,
    timeZone: 'Europe/Athens',
  });
}

export function generateVisitorId(ip) {
  const hash = crypto
    .createHash('md5')
    .update(String(ip || 'unknown'))
    .digest('hex');
  return `v-${hash.substring(0, 6)}`;
}

export function isLocalIP(ip) {
  if (!ip) return true;
  return (
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip === 'unknown'
  );
}

// "Daniel Whitaker" -> "Daniel W."
export function shortName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length || /^(anonymous|unknown|=|-|—)$/i.test(parts[0])) return '';
  return parts.length > 1
    ? `${parts[0]} ${parts[parts.length - 1][0]}.`
    : parts[0];
}

export function duration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const s = Math.round(ms / 1000);
  return s < 60
    ? `${s}s`
    : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

// Only failures are shown: "⚠ Meta ✗" / "⚠ TikTok ✗"
export function trackingFlags(status) {
  if (!status) return '';
  const bad = [];
  if (status.meta && status.meta !== '✓' && status.meta !== '-')
    bad.push(`Meta ${status.meta}`);
  if (status.tiktok && status.tiktok !== '✓' && status.tiktok !== '-')
    bad.push(`TikTok ${status.tiktok}`);
  return bad.length ? `⚠ ${bad.join(', ')}` : '';
}

export function sourceOf(url) {
  try {
    const u = new URL(url);
    const src = (u.searchParams.get('utm_source') || '').toLowerCase();
    if (src === 'ig' || src.includes('insta')) return 'Instagram ad';
    if (
      u.searchParams.get('fbclid') ||
      src === 'fb' ||
      src.includes('facebook')
    )
      return 'Facebook ad';
    if (u.searchParams.get('ttclid') || src === 'tiktok' || src === 'tt')
      return 'TikTok ad';
    const camp = u.searchParams.get('campaign') || u.searchParams.get('utm_campaign');
    if (src) return src;
    if (camp && camp !== 'default') return `campaign:${camp}`;
  } catch (_) {}
  return 'direct';
}

export function createJourneyLog({ market = 'US' } = {}) {
  const MKT = String(market).toUpperCase().slice(0, 3).padEnd(3);
  const seenVisitors = new Set();
  const newCounters = () => ({
    visits: 0,
    returning: 0,
    formsStarted: 0,
    qualified: 0,
    leads: 0,
    validationErrors: 0,
    abandons: 0,
    tracked: 0,
    trackFail: 0,
    jsErrors: 0,
    jsNew: 0,
    scanner: 0,
    exits: {},
    devices: {},
  });
  const seenClientErrors = new Map();
  let hour = new Date().getHours();
  let c = newCounters();

  function recordLine(entry) {
    recentLogLines.unshift(entry);
    if (recentLogLines.length > 200) recentLogLines.pop();
  }

  function line(visitorId, icon, step, message, flags, meta = {}) {
    const ts = getTimestamp();
    const f = flags ? `   ${flags}` : '';
    const formatted = `${ts}  ${MKT} ${String(visitorId || '--').padEnd(
      9
    )} ${icon} ${String(step).padEnd(10)} ${message}${f}`;
    console.log(formatted);
    recordLine({
      ts,
      market: MKT.trim(),
      visitorId: visitorId || '--',
      icon,
      step,
      message,
      flags: flags || '',
      raw: formatted,
      ip: meta.ip || null,
      location: meta.location || null,
      device: meta.device || null,
    });
  }

  function countTracking(status) {
    if (!status) return;
    c.tracked += 1;
    if (trackingFlags(status)) c.trackFail += 1;
  }

  function flushHour(force) {
    const now = new Date();
    if (!force && now.getHours() === hour) return;
    const label = new Date(
      now.getTime() - (force ? 0 : 60_000)
    ).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      timeZone: 'Europe/Athens',
    });
    if (
      c.visits ||
      c.formsStarted ||
      c.qualified ||
      c.leads ||
      c.validationErrors ||
      c.jsErrors
    ) {
      const metaOk = c.tracked
        ? Math.round((100 * (c.tracked - c.trackFail)) / c.tracked)
        : 100;
      const summaryLine = `── ${label}:00 last hour · ${MKT.trim()} ${
        c.visits
      } visits (${c.returning} returning) · ${c.formsStarted} form starts · ${
        c.qualified
      } qualified · ${c.leads} leads submitted · ${
        c.validationErrors
      } invalid | tracking ok ${metaOk}%`;
      console.log(summaryLine);
      recordLine({
        ts: getTimestamp(),
        market: MKT.trim(),
        visitorId: 'SUMMARY',
        icon: '📊',
        step: 'hourly',
        message: summaryLine,
        flags: '',
        raw: summaryLine,
      });
    }
    hour = now.getHours();
    c = newCounters();
  }
  setInterval(() => flushHour(false), 30_000).unref();

  return {
    market: MKT.trim(),

    formatLocation(visitor) {
      if (!visitor) return '';
      if (visitor.city && !['Unknown', 'Local'].includes(visitor.city)) {
        const city =
          visitor.city.length > 22
            ? visitor.city.slice(0, 21) + '…'
            : visitor.city;
        return visitor.country && visitor.country !== '??'
          ? `${city}, ${visitor.country}`
          : city;
      }
      if (visitor.city === 'Local') return 'Local (DEV)';
      return visitor.country && visitor.country !== '??' ? visitor.country : '';
    },

    event(visitor, eventName, message, capiStatus) {
      const cfg = EVENT_CONFIG[eventName] || { icon: 'ℹ️', step: eventName };
      countTracking(capiStatus);
      if (eventName === 'InitiateCheckout') c.formsStarted += 1;
      if (eventName === 'Contact') c.qualified += 1;
      const flags = trackingFlags(capiStatus);
      if (cfg.hidden && !flags) return;
      const text =
        {
          InitiateCheckout: 'started filling application form',
          Contact: 'selected contact preference',
        }[eventName] || message;
      line(visitor?.id || '--', cfg.icon, cfg.step, text, flags, {
        ip: visitor?.ip,
        location: this.formatLocation(visitor),
        device: visitor?.device,
      });
    },

    newVisitor(visitor, sourceUrl, capiStatus) {
      countTracking(capiStatus);
      const flags = trackingFlags(capiStatus);
      const loc = this.formatLocation(visitor);
      const dev = visitor?.device ? ` · ${visitor.device}` : '';
      if (seenVisitors.has(visitor.id)) {
        c.returning += 1;
        line(
          visitor.id,
          '↺',
          'back',
          `back on the application page${loc ? ' · ' + loc : ''}${dev}`,
          flags,
          { ip: visitor.ip, location: loc, device: visitor.device }
        );
        return;
      }
      seenVisitors.add(visitor.id);
      if (seenVisitors.size > 5000) seenVisitors.clear();
      c.visits += 1;
      line(
        visitor.id,
        '👀',
        'visit',
        `landed from ${sourceOf(sourceUrl)}${loc ? ' · ' + loc : ''}${dev}`,
        flags,
        { ip: visitor.ip, location: loc, device: visitor.device }
      );
    },

    leadSubmitted(visitor, info, capiStatus) {
      countTracking(capiStatus);
      c.leads += 1;
      const who = shortName(info.fullName || `${info.firstName || ''} ${info.lastName || ''}`);
      const parts = [];
      if (who) parts.push(who);
      if (info.phone) parts.push(info.phone);
      const applicantLoc = [info.city, info.state].filter(Boolean).join(', ');
      if (applicantLoc) parts.push(applicantLoc);
      if (info.creditScore) parts.push(`credit:${info.creditScore}`);
      if (info.employed) parts.push(info.employed);
      if (info.contactPref) parts.push(`via ${info.contactPref}`);
      if (visitor?.firstSeen) {
        parts.push(`${duration(Date.now() - visitor.firstSeen)} from landing`);
      }
      line(
        visitor?.id || '--',
        '✅',
        'LEAD',
        parts.join(' · '),
        trackingFlags(capiStatus),
        {
          ip: visitor?.ip,
          location: this.formatLocation(visitor),
          device: visitor?.device,
        }
      );
    },

    formEvent(visitor, eventType, details, capiStatus) {
      const cfg = FORM_EVENT_CONFIG[eventType] || {
        icon: 'ℹ️',
        step: eventType,
        msg: '',
      };
      if (eventType === 'form_started') c.formsStarted += 1;
      if (eventType === 'qualification_selected') c.qualified += 1;
      if (eventType === 'validation_error') c.validationErrors += 1;
      if (eventType === 'form_abandon') c.abandons += 1;
      if (cfg.hidden) return;
      const loc = this.formatLocation(visitor);
      const dev = visitor?.device ? visitor.device : '';
      const isIssue =
        eventType === 'validation_error' ||
        eventType === 'submit_error' ||
        eventType === 'form_abandon';
      const contextSuffix =
        isIssue && (loc || dev)
          ? ` · ${[loc, dev].filter(Boolean).join(' · ')}`
          : '';
      const text = [cfg.msg, details].filter(Boolean).join(' · ') + contextSuffix;
      line(
        visitor?.id || '--',
        cfg.icon,
        cfg.step,
        text,
        trackingFlags(capiStatus),
        {
          ip: visitor?.ip,
          location: loc,
          device: visitor?.device,
        }
      );
    },

    scannerHit() {
      c.scanner += 1;
    },

    funnelExit(stage) {
      c.exits[stage] = (c.exits[stage] || 0) + 1;
    },

    attempt(device, result, ms) {
      const key = device || 'desktop';
      const d =
        c.devices[key] ||
        (c.devices[key] = { n: 0, submitted: 0, slow: 0 });
      d.n += 1;
      if (result === 'submitted') d.submitted += 1;
      if (ms > 20000) d.slow += 1;
    },

    system(emoji, message) {
      line('--', emoji, 'system', message, '');
    },

    clientError(visitorId, signature, text) {
      c.jsErrors += 1;
      const prevCount = seenClientErrors.get(signature) || 0;
      const nextCount = prevCount + 1;
      if (seenClientErrors.size > 500) seenClientErrors.clear();
      seenClientErrors.set(signature, nextCount);
      if (prevCount === 0) c.jsNew += 1;
      const repeatLabel = nextCount > 1 ? ` (repeat #${nextCount})` : '';
      line(visitorId, '🐞', 'browser', `${text}${repeatLabel}`, '');
    },

    flushHour,

    getRecentLogs() {
      return recentLogLines;
    },

    getCounters() {
      return c;
    },

    startup(port, campaign, language, trackingStatus) {
      const w = 79;
      const brand = 'FYNEX NETWORK';
      const bannerCore = `           📋 \x1b[1m${brand}\x1b[0m - Lead Application Server`;
      const visibleLen = brand.length + 38;
      const bannerPad = ' '.repeat(Math.max(0, w - visibleLen));
      console.log('');
      console.log(`\x1b[36m╔${'═'.repeat(w)}╗\x1b[0m`);
      console.log(`\x1b[36m║\x1b[0m${bannerCore}${bannerPad}\x1b[36m║\x1b[0m`);
      console.log(`\x1b[36m╠${'═'.repeat(w)}╣\x1b[0m`);
      console.log(
        `\x1b[36m║\x1b[0m  🌐 Server:   http://localhost:${String(port).padEnd(
          45
        )}\x1b[36m║\x1b[0m`
      );
      console.log(
        `\x1b[36m║\x1b[0m  📋 Campaign: ${String(campaign).padEnd(
          52
        )}\x1b[36m║\x1b[0m`
      );
      console.log(
        `\x1b[36m║\x1b[0m  🌍 Market:   ${`${MKT.trim()} · ${language}`.padEnd(
          52
        )}\x1b[36m║\x1b[0m`
      );
      console.log(
        `\x1b[36m║\x1b[0m  📝 Funnel:   ${'Partner Application (/apply) + Cockpit (/dashboard)'.padEnd(
          52
        )}\x1b[36m║\x1b[0m`
      );
      console.log(
        `\x1b[36m║\x1b[0m  📊 Tracking: ${String(trackingStatus).padEnd(
          52
        )}\x1b[36m║\x1b[0m`
      );
      console.log(`\x1b[36m╠${'═'.repeat(w)}╣\x1b[0m`);
      console.log(
        `\x1b[36m║\x1b[0m  \x1b[2mLog: TIME  MKT VISITOR  STEP  WHAT HAPPENED  (⚠ = tracking/ops problem)\x1b[0m       \x1b[36m║\x1b[0m`
      );
      console.log(`\x1b[36m╚${'═'.repeat(w)}╝\x1b[0m`);
      console.log('');
    },
  };
}
