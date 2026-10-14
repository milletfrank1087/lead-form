import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

export const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

export function isSupabaseConfigured() {
  return Boolean(supabase);
}

function leadToRow(l) {
  return {
    lead_id: l.leadId,
    status: l.status || 'NEW',
    first_name: l.firstName || '',
    last_name: l.lastName || '',
    full_name: l.fullName || `${l.firstName || ''} ${l.lastName || ''}`.trim(),
    email: l.email || '',
    phone: l.phone || '',
    city: l.city || null,
    state: l.state || null,
    employed: l.employed || '',
    credit_score: l.creditScore || '',
    message: l.message || null,
    referral_code: l.referralCode || null,
    contact_pref: l.contactPref || 'email',
    campaign: l.campaign || 'default',
    visitor_id: l.visitorId || null,
    ip_address: l.ipAddress || null,
    location: l.location || null,
    country: l.country || null,
    region: l.region || null,
    device: l.device || null,
    user_agent: l.userAgent || null,
    utm_source: l.utmSource || null,
    utm_medium: l.utmMedium || null,
    utm_campaign: l.utmCampaign || null,
    utm_content: l.utmContent || null,
    utm_term: l.utmTerm || null,
    fbclid: l.fbclid || null,
    fbp: l.fbp || null,
    fbc: l.fbc || null,
    ttclid: l.ttclid || null,
    ttp: l.ttp || null,
    lead_event_id: l.leadEventId || null,
    capi_meta: l.capiMeta || null,
    capi_tiktok: l.capiTiktok || null,
    time_to_submit_ms:
      l.timeToSubmitMs !== undefined && l.timeToSubmitMs !== null
        ? Number.parseInt(l.timeToSubmitMs, 10)
        : null,
    notes: l.notes || null,
    created_at: l.createdAt || new Date().toISOString(),
    updated_at: l.updatedAt || new Date().toISOString(),
  };
}

function rowToLead(r) {
  return {
    leadId: r.lead_id,
    status: r.status || 'NEW',
    firstName: r.first_name || '',
    lastName: r.last_name || '',
    fullName: r.full_name || `${r.first_name || ''} ${r.last_name || ''}`.trim(),
    email: r.email || '',
    phone: r.phone || '',
    city: r.city || '',
    state: r.state || '',
    employed: r.employed || '',
    creditScore: r.credit_score || '',
    message: r.message || '',
    referralCode: r.referral_code || '',
    contactPref: r.contact_pref || 'email',
    campaign: r.campaign || 'default',
    visitorId: r.visitor_id || null,
    ipAddress: r.ip_address || null,
    location: r.location || null,
    country: r.country || null,
    region: r.region || null,
    device: r.device || null,
    userAgent: r.user_agent || null,
    utmSource: r.utm_source || null,
    utmMedium: r.utm_medium || null,
    utmCampaign: r.utm_campaign || null,
    utmContent: r.utm_content || null,
    utmTerm: r.utm_term || null,
    fbclid: r.fbclid || null,
    fbp: r.fbp || null,
    fbc: r.fbc || null,
    ttclid: r.ttclid || null,
    ttp: r.ttp || null,
    leadEventId: r.lead_event_id || null,
    capiMeta: r.capi_meta || null,
    capiTiktok: r.capi_tiktok || null,
    timeToSubmitMs: r.time_to_submit_ms ?? null,
    notes: r.notes || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at || r.created_at,
  };
}

export async function hydrateStoreFromSupabase() {
  if (!supabase) return null;
  try {
    const { data: leadRows, error: leadErr } = await supabase
      .from('lead_form_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2000);

    if (leadErr) {
      console.error('[supabase] hydrate leads error:', leadErr.message);
      return null;
    }

    return {
      leads: (leadRows || []).map(rowToLead),
    };
  } catch (err) {
    console.error('[supabase] hydrate exception:', err.message);
    return null;
  }
}

export async function upsertLeadInSupabase(lead) {
  if (!supabase || !lead?.leadId) return;
  try {
    const { error } = await supabase
      .from('lead_form_applications')
      .upsert(leadToRow(lead), { onConflict: 'lead_id' });
    if (error) {
      console.error('[supabase] upsert lead error:', error.message);
    }
  } catch (err) {
    console.error('[supabase] upsert lead exception:', err.message);
  }
}

export async function deleteLeadInSupabase(leadId) {
  if (!supabase || !leadId) return;
  try {
    const { error } = await supabase
      .from('lead_form_applications')
      .delete()
      .eq('lead_id', leadId);
    if (error) {
      console.error('[supabase] delete lead error:', error.message);
    }
  } catch (err) {
    console.error('[supabase] delete lead exception:', err.message);
  }
}

export async function logEventInSupabase(evt) {
  if (!supabase || !evt?.eventType) return;
  try {
    const { error } = await supabase.from('lead_form_events').insert({
      visitor_id: evt.visitorId || null,
      event_type: evt.eventType,
      step: evt.step || null,
      details: evt.details ? String(evt.details).slice(0, 500) : null,
      ip_address: evt.ipAddress || null,
      location: evt.location || null,
      country: evt.country || null,
      device: evt.device || null,
      source_url: evt.sourceUrl || null,
      campaign: evt.campaign || null,
      capi_meta: evt.capiMeta || null,
      capi_tiktok: evt.capiTiktok || null,
      extra: evt.extra || null,
    });
    if (error) {
      console.error('[supabase] insert event error:', error.message);
    }
  } catch (err) {
    console.error('[supabase] insert event exception:', err.message);
  }
}

export async function resetSupabaseTables() {
  if (!supabase) return { ok: true, supabase: false };
  try {
    await Promise.all([
      supabase.from('lead_form_applications').delete().neq('lead_id', '__NONE__'),
      supabase.from('lead_form_events').delete().gte('id', 0),
    ]);
    return { ok: true, supabase: true };
  } catch (err) {
    console.error('[supabase] reset tables error:', err.message);
    return { ok: false, error: err.message };
  }
}
