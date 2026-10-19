(function () {
  let allLeads = [];
  let allEvents = [];
  let activeRange = 'all';
  let activeStatus = 'ALL';
  let searchQuery = '';
  let pollTimer = null;

  function getStoredPassword() {
    try {
      return sessionStorage.getItem('fynex_dash_pw') || '';
    } catch {
      return '';
    }
  }

  function setStoredPassword(pw) {
    try {
      if (pw) sessionStorage.setItem('fynex_dash_pw', pw);
      else sessionStorage.removeItem('fynex_dash_pw');
    } catch {}
  }

  function authHeaders(extra = {}) {
    const pw = getStoredPassword();
    return pw ? { ...extra, 'x-dashboard-password': pw } : { ...extra };
  }

  function showAuthGate(showError = false) {
    const gate = document.getElementById('authGateModal');
    const err = document.getElementById('authErrorMsg');
    const input = document.getElementById('dashboardPasswordInput');
    if (gate) {
      gate.classList.remove('hidden');
      gate.classList.add('flex');
    }
    if (err) {
      err.classList.toggle('hidden', !showError);
    }
    if (input) {
      setTimeout(() => input.focus(), 50);
    }
  }

  function hideAuthGate() {
    const gate = document.getElementById('authGateModal');
    const err = document.getElementById('authErrorMsg');
    if (gate) {
      gate.classList.add('hidden');
      gate.classList.remove('flex');
    }
    if (err) err.classList.add('hidden');
  }

  const CREDIT_LABELS = {
    '750_plus': '750+ (Excellent)',
    '700_749': '700–749 (Good)',
    '650_699': '650–699 (Fair)',
    '620_649': '620–649',
    'under_620': 'Under 620',
    'not_sure': 'Not Sure',
  };

  function escapeHtml(val) {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatRelativeTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return `${Math.max(0, diffSec)}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function isWithinRange(iso, range) {
    if (range === 'all') return true;
    if (!iso) return false;
    const ts = new Date(iso).getTime();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (range === 'today') return ts >= startOfToday;
    if (range === 'yesterday') {
      const startOfYesterday = startOfToday - 86400000;
      return ts >= startOfYesterday && ts < startOfToday;
    }
    if (range === '7d') return ts >= Date.now() - 7 * 86400000;
    if (range === '30d') return ts >= Date.now() - 30 * 86400000;
    if (range === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return ts >= startOfMonth;
    }
    return true;
  }

  function getFilteredLeads() {
    return allLeads.filter((lead) => {
      if (!isWithinRange(lead.createdAt, activeRange)) return false;
      if (activeStatus !== 'ALL' && (lead.status || 'NEW') !== activeStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const hay = [
          lead.leadId,
          lead.firstName,
          lead.lastName,
          `${lead.firstName || ''} ${lead.lastName || ''}`,
          lead.email,
          lead.phone,
          lead.city,
          lead.state,
          lead.campaign,
          lead.referralCode,
          lead.contactPref,
          lead.creditScore,
          lead.location,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderIntegrationBadges(tracking) {
    const el = document.getElementById('integrationBadges');
    if (!el || !tracking) return;
    const pills = [
      { label: 'Meta CAPI', ok: tracking.metaConfigured },
      { label: 'TikTok API', ok: tracking.tiktokConfigured },
      { label: 'Supabase DB', ok: tracking.supabaseConfigured },
    ];
    el.innerHTML = pills
      .map(
        (p) =>
          `<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            p.ok
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }">${p.label}: ${p.ok ? 'ON' : 'OFF'}</span>`
      )
      .join('');
  }

  function renderKPIs(leads) {
    const total = leads.length;
    const employedCount = leads.filter((l) => l.employed === 'yes').length;
    const employedPct = total > 0 ? Math.round((employedCount / total) * 100) : 0;
    const highCredit = leads.filter(
      (l) => l.creditScore === '750_plus' || l.creditScore === '700_749'
    ).length;
    const midCredit = leads.filter(
      (l) => l.creditScore === '650_699' || l.creditScore === '620_649'
    ).length;
    const withReferral = leads.filter((l) => l.referralCode && l.referralCode.trim()).length;

    const whatsappCount = leads.filter((l) => l.contactPref === 'whatsapp').length;
    const emailCount = leads.filter((l) => l.contactPref === 'email').length;
    const telegramCount = leads.filter((l) => l.contactPref === 'telegram').length;

    const qualifiedCount = leads.filter((l) => l.status === 'QUALIFIED').length;
    const contactedCount = leads.filter((l) => l.status === 'CONTACTED').length;
    const capiCount = leads.filter((l) => l.capiSent).length;

    const rangeEvents = allEvents.filter((e) => isWithinRange(e.createdAt, activeRange));
    const uniqueVisitors = new Set(rangeEvents.map((e) => e.visitorId).filter(Boolean)).size;
    const startedFormCount = rangeEvents.filter((e) => e.eventType === 'form_started').length;
    const abandonCount = rangeEvents.filter((e) => e.eventType === 'form_abandon').length;

    document.getElementById('kpiTotalLeads').textContent = String(total);
    document.getElementById('kpiEmployedRate').textContent = `${employedPct}% employed`;
    document.getElementById('kpiHeroSubtext').textContent = `${highCredit} high-credit (700+) · ${withReferral} with referral code`;
    document.getElementById('kpiWhatsappCount').textContent = String(whatsappCount);
    document.getElementById('kpiEmailCount').textContent = String(emailCount);
    document.getElementById('kpiTelegramCount').textContent = String(telegramCount);

    document.getElementById('funnelVisitors').textContent = String(Math.max(uniqueVisitors, total));
    document.getElementById('funnelStartedSub').textContent = `${startedFormCount} started form`;
    document.getElementById('funnelHighCredit').textContent = String(highCredit);
    document.getElementById('funnelMidCredit').textContent = String(midCredit);
    document.getElementById('funnelQualified').textContent = String(qualifiedCount);
    document.getElementById('funnelContacted').textContent = String(contactedCount);
    document.getElementById('funnelCapiSent').textContent = String(capiCount);
    document.getElementById('funnelAbandons').textContent = String(abandonCount);
  }

  function renderLeadsTable(leads) {
    const tbody = document.getElementById('leadsTableBody');
    document.getElementById('tableCountBadge').textContent = String(leads.length);

    if (!leads.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-12 text-xs text-[#8898AA]">No applications match the active filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = leads
      .map((lead) => {
        const fullName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown';
        const cityState = [lead.city, lead.state].filter(Boolean).join(', ') || '—';
        const creditBadge = CREDIT_LABELS[lead.creditScore] || lead.creditScore || '—';
        const isHighCredit =
          lead.creditScore === '750_plus' || lead.creditScore === '700_749';
        const channelColor =
          lead.contactPref === 'whatsapp'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : lead.contactPref === 'telegram'
            ? 'bg-sky-50 text-sky-700 border-sky-200'
            : 'bg-indigo-50 text-indigo-700 border-indigo-200';
        const sec = lead.timeToSubmitMs
          ? `${Math.round(lead.timeToSubmitMs / 1000)}s`
          : '—';

        return `<tr data-lead-id="${escapeHtml(lead.leadId)}">
          <td class="sticky-col">
            <div class="font-semibold text-[#061B31]">${escapeHtml(fullName)}</div>
            <div class="text-[11px] text-[#64748D] mt-0.5 flex items-center gap-1.5">
              <span>Applicant: ${escapeHtml(cityState)}</span>
              <span class="copy-pill" data-copy="${escapeHtml(lead.leadId)}" title="Click to copy ID">${escapeHtml(lead.leadId)}</span>
            </div>
          </td>
          <td>
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-1.5">
                <span class="copy-pill" data-copy="${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="copy-pill" data-copy="${escapeHtml(lead.phone)}">${escapeHtml(lead.phone)}</span>
                <span class="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${channelColor}">${escapeHtml(lead.contactPref || 'email')}</span>
              </div>
            </div>
          </td>
          <td>
            <div class="text-xs font-medium text-[#061B31]">${escapeHtml(lead.location || 'Unknown')}</div>
            <div class="text-[11px] text-[#64748D] tabular-numbers">${escapeHtml(lead.device || 'desktop')} · ${escapeHtml(lead.ip || '')}</div>
          </td>
          <td>
            <div class="flex flex-col gap-1">
              <span class="inline-flex w-fit text-[11px] font-semibold px-2 py-0.5 rounded ${
                isHighCredit
                  ? 'bg-[#EDF9F3] text-[#00875A]'
                  : 'bg-amber-50 text-amber-700'
              }">${escapeHtml(creditBadge)}</span>
              <span class="text-[11px] text-[#64748D]">Employed: <strong>${escapeHtml((lead.employed || '').toUpperCase())}</strong></span>
            </div>
          </td>
          <td>
            <div class="text-xs font-semibold text-[#061B31]">${escapeHtml(lead.campaign || 'direct')}</div>
            <div class="text-[11px] text-[#64748D]">
              ${lead.referralCode ? `Ref: <span class="font-mono text-[#2563EB]">${escapeHtml(lead.referralCode)}</span>` : 'No referral code'}
            </div>
          </td>
          <td>
            <div class="flex items-center gap-1">
              <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                lead.metaCapiOk ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }">Meta ${lead.metaCapiOk ? '✓' : '–'}</span>
              <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                lead.tiktokCapiOk ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }">TT ${lead.tiktokCapiOk ? '✓' : '–'}</span>
            </div>
            <div class="text-[11px] text-[#8898AA] tabular-numbers mt-0.5">Time: ${escapeHtml(sec)}</div>
          </td>
          <td>
            <select class="inline-select status-select" data-lead-id="${escapeHtml(lead.leadId)}">
              ${['NEW', 'CONTACTED', 'QUALIFIED', 'ARCHIVED']
                .map(
                  (st) =>
                    `<option value="${st}" ${(lead.status || 'NEW') === st ? 'selected' : ''}>${st}</option>`
                )
                .join('')}
            </select>
          </td>
          <td>
            <div class="text-xs text-[#061B31] tabular-numbers">${formatRelativeTime(lead.createdAt)}</div>
            <div class="text-[10px] text-[#8898AA] tabular-numbers">${escapeHtml(new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</div>
          </td>
          <td class="text-right">
            <div class="inline-flex items-center gap-1.5">
              <button class="view-lead-btn text-xs font-medium text-[#2563EB] hover:underline px-2 py-1" data-lead-id="${escapeHtml(lead.leadId)}">Inspect</button>
              <button class="delete-lead-btn text-xs font-medium text-[#DF1B41] hover:underline px-1.5 py-1" data-lead-id="${escapeHtml(lead.leadId)}">Delete</button>
            </div>
          </td>
        </tr>`;
      })
      .join('');
  }

  function renderEventsTable() {
    const tbody = document.getElementById('eventsTableBody');
    const rangeEvents = allEvents
      .filter((e) => isWithinRange(e.createdAt, activeRange))
      .slice(0, 60);
    document.getElementById('eventsCountBadge').textContent = String(rangeEvents.length);

    if (!rangeEvents.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-xs text-[#8898AA]">No funnel events recorded in this timeframe.</td></tr>`;
      return;
    }

    tbody.innerHTML = rangeEvents
      .map((ev) => {
        const badgeColor =
          ev.eventType === 'lead_submitted'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : ev.eventType === 'form_abandon' || ev.eventType === 'validation_error'
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-blue-50 text-blue-700 border-blue-200';
        return `<tr>
          <td class="tabular-numbers text-xs text-[#64748D]">${formatRelativeTime(ev.createdAt)}</td>
          <td><span class="text-[11px] font-semibold px-2 py-0.5 rounded border ${badgeColor}">${escapeHtml(ev.eventType)}</span></td>
          <td class="tabular-numbers text-xs font-mono text-[#061B31]">${escapeHtml((ev.visitorId || '').slice(0, 14))}</td>
          <td class="text-xs text-[#64748D]">${escapeHtml(ev.location || 'Unknown')} · ${escapeHtml(ev.device || '')}</td>
          <td class="text-xs text-[#061B31]">${escapeHtml(ev.details || '')}</td>
        </tr>`;
      })
      .join('');
  }

  function renderAll() {
    const leads = getFilteredLeads();
    renderKPIs(leads);
    renderLeadsTable(leads);
    renderEventsTable();
  }

  async function fetchDashboard() {
    const icon = document.getElementById('refreshIcon');
    if (icon) icon.classList.add('animate-spin');
    try {
      const res = await fetch('/api/dashboard', { headers: authHeaders() });
      if (res.status === 401) {
        showAuthGate(false);
        return false;
      }
      hideAuthGate();
      const data = await res.json();
      allLeads = Array.isArray(data.leads) ? data.leads : [];
      allEvents = Array.isArray(data.events) ? data.events : [];
      renderIntegrationBadges(data.tracking);
      renderAll();
      return true;
    } catch (e) {
      console.error('Failed to load dashboard:', e);
      return false;
    } finally {
      if (icon) icon.classList.remove('animate-spin');
    }
  }

  function openLeadModal(leadId) {
    const lead = allLeads.find((l) => l.leadId === leadId);
    if (!lead) return;
    document.getElementById('modalTitle').textContent = `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
    document.getElementById('modalSubtitle').textContent = `${lead.leadId} · Submitted ${new Date(lead.createdAt).toLocaleString()}`;

    const rows = [
      ['Email', lead.email],
      ['Phone', lead.phone],
      ['Applicant City / State', [lead.city, lead.state].filter(Boolean).join(', ') || '—'],
      ['Currently Employed', lead.employed],
      ['Credit Score Tier', CREDIT_LABELS[lead.creditScore] || lead.creditScore],
      ['Preferred Contact Channel', lead.contactPref],
      ['Campaign', lead.campaign || 'direct'],
      ['Referral Code', lead.referralCode || '—'],
      ['Message / Notes from Applicant', lead.message || '—'],
      ['GeoIP Location', lead.location || '—'],
      ['Client IP & Device', `${lead.ip || '—'} (${lead.device || '—'})`],
      ['CAPI Event ID', lead.eventId || '—'],
      ['Meta _fbp / _fbc', `${lead.fbp || '—'} / ${lead.fbc || '—'}`],
      ['TikTok _ttp / ttclid', `${lead.ttp || '—'} / ${lead.ttclid || '—'}`],
      ['UTM Source / Medium / Campaign', [lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(' / ') || '—'],
      ['Source URL', lead.sourceUrl || '—'],
    ];

    document.getElementById('modalBody').innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${rows
          .map(
            ([label, val]) => `
          <div class="p-3 rounded-lg bg-[#F8FAFD] border border-[#E5EDF5]">
            <div class="text-[10px] font-semibold uppercase tracking-wider text-[#8898AA]">${escapeHtml(label)}</div>
            <div class="text-xs font-medium text-[#061B31] mt-1 break-all">${escapeHtml(val || '—')}</div>
          </div>`
          )
          .join('')}
      </div>
    `;

    const modal = document.getElementById('leadModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function exportCsv() {
    const leads = getFilteredLeads();
    const headers = [
      'leadId',
      'status',
      'createdAt',
      'firstName',
      'lastName',
      'email',
      'phone',
      'city',
      'state',
      'employed',
      'creditScore',
      'contactPref',
      'campaign',
      'referralCode',
      'message',
      'ip',
      'location',
      'device',
      'metaCapiOk',
      'tiktokCapiOk',
    ];
    const csvRows = [
      headers.join(','),
      ...leads.map((l) =>
        headers
          .map((h) => `"${String(l[h] ?? '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fynex-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  document.addEventListener('DOMContentLoaded', () => {
    fetchDashboard();
    pollTimer = setInterval(fetchDashboard, 8000);

    const authForm = document.getElementById('authGateForm');
    if (authForm) {
      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('dashboardPasswordInput');
        const pw = (input?.value || '').trim();
        if (!pw) return;
        try {
          const res = await fetch('/api/dashboard/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pw }),
          });
          if (!res.ok) {
            setStoredPassword('');
            showAuthGate(true);
            return;
          }
          setStoredPassword(pw);
          if (input) input.value = '';
          hideAuthGate();
          await fetchDashboard();
        } catch {
          showAuthGate(true);
        }
      });
    }

    const lockBtn = document.getElementById('lockDashboardBtn');
    if (lockBtn) {
      lockBtn.addEventListener('click', async () => {
        setStoredPassword('');
        await fetch('/api/dashboard/logout', { method: 'POST' }).catch(() => {});
        allLeads = [];
        allEvents = [];
        renderAll();
        showAuthGate(false);
      });
    }

    document.getElementById('refreshBtn').addEventListener('click', fetchDashboard);
    document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);

    document.getElementById('resetDataBtn').addEventListener('click', async () => {
      if (!confirm('Clear all stored applications and funnel events?')) return;
      await fetch('/api/dashboard/reset', {
        method: 'POST',
        headers: authHeaders(),
      });
      fetchDashboard();
    });

    document.getElementById('dateFilterGroup').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-range]');
      if (!btn) return;
      activeRange = btn.dataset.range;
      document.querySelectorAll('#dateFilterGroup button').forEach((b) => {
        b.className = b === btn ? 'stripe-pill active' : 'stripe-pill inactive';
      });
      document.getElementById('activeRangeBadge').textContent = btn.textContent;
      renderAll();
    });

    document.getElementById('statusFilterGroup').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-status]');
      if (!btn) return;
      activeStatus = btn.dataset.status;
      document.querySelectorAll('#statusFilterGroup button').forEach((b) => {
        b.className = b === btn ? 'stripe-pill active' : 'stripe-pill inactive';
      });
      renderAll();
    });

    const searchInput = document.getElementById('globalSearch');
    const clearBtn = document.getElementById('clearSearchBtn');
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim();
      clearBtn.classList.toggle('hidden', !searchQuery);
      renderAll();
    });
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearBtn.classList.add('hidden');
      renderAll();
    });

    document.getElementById('leadsTableBody').addEventListener('click', async (e) => {
      const copyEl = e.target.closest('[data-copy]');
      if (copyEl) {
        const text = copyEl.getAttribute('data-copy');
        if (text && navigator.clipboard) {
          navigator.clipboard.writeText(text);
          const orig = copyEl.textContent;
          copyEl.textContent = 'Copied!';
          setTimeout(() => {
            copyEl.textContent = orig;
          }, 900);
        }
        return;
      }

      const viewBtn = e.target.closest('.view-lead-btn');
      if (viewBtn) {
        openLeadModal(viewBtn.getAttribute('data-lead-id'));
        return;
      }

      const delBtn = e.target.closest('.delete-lead-btn');
      if (delBtn) {
        const id = delBtn.getAttribute('data-lead-id');
        if (!confirm(`Delete lead ${id}?`)) return;
        await fetch(`/api/leads/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: authHeaders(),
        });
        fetchDashboard();
      }
    });

    document.getElementById('leadsTableBody').addEventListener('change', async (e) => {
      const select = e.target.closest('.status-select');
      if (!select) return;
      const leadId = select.getAttribute('data-lead-id');
      const status = select.value;
      await fetch(`/api/leads/${encodeURIComponent(leadId)}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      });
      fetchDashboard();
    });

    document.getElementById('closeModalBtn').addEventListener('click', () => {
      const modal = document.getElementById('leadModal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });
  });
})();
