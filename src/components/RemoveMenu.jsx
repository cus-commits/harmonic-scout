import React, { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';

// Shared X-with-menu component for search result cards.
// Backburn = global, hits Airtable + backburn registry (gone for everyone in every search).
// Hide for me = per-user, hits /api/hide-for-user (only that user's future searches skip it).
//
// Props:
//   company:     { name, id?, harmonic_id?, website?, description?, sector? }
//   onHidden:    optional callback invoked after either action so the parent can drop the card
//   variant:     'icon' (default — small X) | 'icon-lg' (larger X)
export default function RemoveMenu({ company, onHidden, variant = 'icon' }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const crmUser = (typeof window !== 'undefined' ? localStorage.getItem('crm_user') : '') || '';

  const companyName = company?.name || company?.company || '';
  if (!companyName) return null;

  const harmonicId = company?.harmonic_id || company?.id || null;
  const website = company?.website || company?.url || '';

  const finish = () => {
    setBusy(false);
    setOpen(false);
    if (onHidden) try { onHidden(company); } catch (e) {}
  };

  const handleHide = async () => {
    if (!crmUser) { alert('Please claim your name first (bottom of the nav bar)'); return; }
    setBusy(true);
    // Local cache so the card disappears immediately on this page even before refresh
    try {
      const k = `pf_user_hidden_${crmUser.toLowerCase()}`;
      const cur = JSON.parse(localStorage.getItem(k) || '[]');
      if (!cur.includes(companyName.toLowerCase())) {
        cur.push(companyName.toLowerCase());
        localStorage.setItem(k, JSON.stringify(cur.slice(-5000)));
      }
    } catch (e) {}
    try {
      await fetch(`${API_BASE}/api/hide-for-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, personId: crmUser, harmonicId, website }),
      });
    } catch (e) {}
    finish();
  };

  const handleBackburn = async () => {
    setBusy(true);
    // Local cache (used by isDismissed() in CrmButton.jsx)
    try {
      const dismissed = JSON.parse(localStorage.getItem('crm_dismissed') || '[]');
      if (!dismissed.includes(companyName.toLowerCase())) {
        dismissed.push(companyName.toLowerCase());
        localStorage.setItem('crm_dismissed', JSON.stringify(dismissed));
      }
    } catch (e) {}
    try {
      await fetch(`${API_BASE}/api/vetting/backburn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          personId: crmUser || 'unknown',
          harmonicId,
          website,
          description: company?.description || '',
          sector: company?.sector || (Array.isArray(company?.tags) ? company.tags.slice(0, 3).join(', ') : ''),
        }),
      });
    } catch (e) {}
    window.dispatchEvent(new Event('crm-updated'));
    finish();
  };

  const xSize = variant === 'icon-lg' ? 18 : 14;

  return (
    <div className="relative inline-flex">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="text-muted/35 hover:text-rose transition-colors p-0.5 -m-0.5"
        title="Hide or backburn this company"
        disabled={busy}
      >
        <svg width={xSize} height={xSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[180]" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full right-0 mt-1 z-[181] bg-card border border-border/30 rounded-lg py-1 min-w-[160px]"
            style={{ boxShadow: '0 10px 28px rgba(0,0,0,0.55)' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); handleHide(); }}
              className="w-full text-left px-3 py-2 text-[11px] text-muted/70 hover:text-bright hover:bg-bright/5 transition-colors"
              disabled={busy}
            >
              👁‍🗨 Hide for me
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleBackburn(); }}
              className="w-full text-left px-3 py-2 text-[11px] text-rose/75 hover:text-rose hover:bg-rose/5 transition-colors border-t border-border/10"
              disabled={busy}
            >
              🔥 Backburn (everyone)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Local-storage filter so cards already hidden by THIS user disappear instantly on render
// (server-side filter still catches them on next fetch — this is just an immediate UX win).
export function isLocallyHidden(companyName) {
  if (!companyName || typeof window === 'undefined') return false;
  const user = (localStorage.getItem('crm_user') || '').toLowerCase();
  if (!user) return false;
  try {
    const list = JSON.parse(localStorage.getItem(`pf_user_hidden_${user}`) || '[]');
    return list.includes(companyName.toLowerCase());
  } catch (e) { return false; }
}
