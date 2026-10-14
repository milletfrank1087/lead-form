const META_API_VERSION = 'v20.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

const US_STATE_CODES = {
  alabama: 'al', alaska: 'ak', arizona: 'az', arkansas: 'ar', california: 'ca',
  colorado: 'co', connecticut: 'ct', delaware: 'de', florida: 'fl', georgia: 'ga',
  hawaii: 'hi', idaho: 'id', illinois: 'il', indiana: 'in', iowa: 'ia',
  kansas: 'ks', kentucky: 'ky', louisiana: 'la', maine: 'me', maryland: 'md',
  massachusetts: 'ma', michigan: 'mi', minnesota: 'mn', mississippi: 'ms', missouri: 'mo',
  montana: 'mt', nebraska: 'ne', nevada: 'nv', 'new hampshire': 'nh', 'new jersey': 'nj',
  'new mexico': 'nm', 'new york': 'ny', 'north carolina': 'nc', 'north dakota': 'nd', ohio: 'oh',
  oklahoma: 'ok', oregon: 'or', pennsylvania: 'pa', 'rhode island': 'ri', 'south carolina': 'sc',
  'south dakota': 'sd', tennessee: 'tn', texas: 'tx', utah: 'ut', vermont: 'vt',
  virginia: 'va', washington: 'wa', 'west virginia': 'wv', wisconsin: 'wi', wyoming: 'wy',
};

export function normalizeUsPhoneDigits(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  return digits.length >= 7 ? digits : null;
}

export function normalizeStateCode(state) {
  if (!state) return null;
  const clean = String(state).toLowerCase().trim();
  if (!clean) return null;
  if (clean.length === 2) return clean;
  return US_STATE_CODES[clean] || clean.replace(/\s+/g, '');
}

export function buildMetaUserData(userData, clientInfo, { hashSHA256 }) {
  const result = {};
  const emailHash =
    userData.emailHash || (userData.email ? hashSHA256(userData.email) : null);

  if (emailHash) {
    result.em = [emailHash];
  }

  const normalizedPhone = normalizeUsPhoneDigits(userData.phone);
  if (userData.phoneHash) {
    result.ph = [userData.phoneHash];
  } else if (normalizedPhone) {
    result.ph = [hashSHA256(normalizedPhone)];
  }

  if (userData.firstName) {
    result.fn = [hashSHA256(userData.firstName)];
  }

  if (userData.lastName) {
    result.ln = [hashSHA256(userData.lastName)];
  }

  if (userData.externalId) {
    result.external_id = [hashSHA256(String(userData.externalId))];
  } else if (emailHash) {
    result.external_id = [emailHash];
  }

  if (clientInfo.ipAddress && clientInfo.ipAddress !== 'unknown') {
    result.client_ip_address = clientInfo.ipAddress;
  }

  if (clientInfo.userAgent && clientInfo.userAgent !== 'unknown') {
    result.client_user_agent = clientInfo.userAgent;
  }

  if (userData.fbp) {
    result.fbp = userData.fbp;
  }

  if (userData.fbc) {
    result.fbc = userData.fbc;
  }

  const rawCity =
    userData.city ||
    (clientInfo.clientLocation?.city &&
    !['Unknown', 'Local'].includes(clientInfo.clientLocation.city)
      ? clientInfo.clientLocation.city
      : null);
  if (rawCity) {
    result.ct = [hashSHA256(String(rawCity).toLowerCase().replace(/\s+/g, ''))];
  }

  const stateCode = normalizeStateCode(
    userData.state || clientInfo.clientLocation?.region
  );
  if (stateCode) {
    result.st = [hashSHA256(stateCode)];
  }

  const rawCountry =
    userData.country ||
    (clientInfo.clientLocation?.countryCode &&
    !['??', 'DEV'].includes(clientInfo.clientLocation.countryCode)
      ? clientInfo.clientLocation.countryCode
      : userData.phone || userData.state
      ? 'us'
      : null);
  if (rawCountry) {
    result.country = [hashSHA256(String(rawCountry).toLowerCase().trim())];
  }

  return result;
}

function resolveSourceUrl(originalUrl) {
  const capiDomain = process.env.CAPI_SOURCE_DOMAIN;
  if (!capiDomain) return originalUrl;
  return `https://${capiDomain}/`;
}

function isPlaceholderToken(token) {
  if (!token) return true;
  const t = String(token).trim();
  return t.length < 40 || /REDACTED|YOUR_|PLACEHOLDER/i.test(t);
}

export async function sendMetaEvent(
  eventName,
  eventData,
  userData,
  clientInfo,
  { getConfig, hashSHA256 }
) {
  const { FB_PIXEL_ID, FB_ACCESS_TOKEN } = getConfig();

  if (!FB_PIXEL_ID) {
    return null;
  }

  if (!eventData.eventId) {
    console.error(`Meta CAPI: ${eventName} skipped (missing eventId for dedup)`);
    return null;
  }
  if (!eventData.sourceUrl) {
    console.error(`Meta CAPI: ${eventName} skipped (missing sourceUrl)`);
    return null;
  }

  try {
    const eventTime = Math.floor(Date.now() / 1000);
    const metaUserData = buildMetaUserData(userData, clientInfo, {
      hashSHA256,
    });

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: eventTime,
          event_id: eventData.eventId,
          event_source_url: resolveSourceUrl(eventData.sourceUrl),
          action_source: 'website',
          user_data: metaUserData,
        },
      ],
    };

    if (eventData.customData) {
      payload.data[0].custom_data = eventData.customData;
    }

    if (isPlaceholderToken(FB_ACCESS_TOKEN)) {
      return {
        events_received: 1,
        mode: 'local_sandbox',
        payload: payload.data[0],
      };
    }

    const url = `${META_API_BASE}/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.events_received) {
      return result;
    } else {
      console.error(`❌ Meta CAPI: ${eventName} REJECTED`);
      console.error(`   Response:`, JSON.stringify(result));
      return null;
    }
  } catch (error) {
    console.error(
      `❌ Meta CAPI: ${eventName} FAILED with exception:`,
      error.message
    );
    return null;
  }
}
