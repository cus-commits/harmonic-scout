import React, { useState, useEffect } from 'react';

// Daily Gmail needs-reply digest, written to Supabase by needs-reply-sweep.py
// on the droplet (cron 12:00 UTC). Read via token-gated RPC; only senders Mark
// has previously corresponded with survive the backend contact filter.
// "hide" = per-user (crm_user), "burn" = removed for all users (figurative
// backburn — does NOT touch the CRM Backburn stage).
const SB_URL = 'https://abnilsekuwoergkhupci.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibmlsc2VrdXdvZXJna2h1cGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNzc2NDgsImV4cCI6MjA5Mzg1MzY0OH0.Qzl4P6iPkUqwNoxrWIfjTMQCBxBcm8qxKOAeQI2F7wY';
const NR_TOKEN = '8edf021e297eb96ed1cc22435f341fdb';

const URGENCY_DOT = { high: 'bg-red-400', normal: 'bg-accent', low: 'bg-muted/50' };

const ago = (iso) => {
  if (!iso) return '';
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 36e5);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

export default function NeedsReplyPanel() {
  const [items, setItems] = useState([]);
  const user = typeof window !== 'undefined' ? localStorage.getItem('crm_user') || '' : '';

  useEffect(() => {
    fetch(`${SB_URL}/rest/v1/rpc/get_needs_reply`, {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: NR_TOKEN, viewer: user || '_' }),
    }).then(r => r.json()).then(d => { if (Array.isArray(d)) setItems(d); }).catch(() => {});
  }, [user]);

  const hide = (id, global) => {
    if (!global && !user) { alert('Claim your identity on the home page first so hides stick to you.'); return; }
    if (global && !window.confirm('Backburn this email for EVERYONE? It disappears for all users.')) return;
    fetch(`${SB_URL}/rest/v1/rpc/hide_needs_reply`, {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: NR_TOKEN, p_thread_id: id, viewer: user || '_', global_hide: !!global }),
    }).catch(() => {});
    setItems(prev => prev.filter(it => it.id !== id));
  };

  if (!items.length) return null;

  return (
    <div className="mb-4 p-3.5 rounded-[14px] border border-accent/15" style={{ background: 'rgba(210, 180, 140, 0.04)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent inline-block" />
          <span className="font-mono text-[9.5px] font-bold tracking-[0.16em] uppercase text-accent/75">📬 Needs reply</span>
          <span className="font-mono text-[9px] text-accent/40">{items.length} waiting{items[0]?.detected_at ? ` · swept ${ago(items[0].detected_at)}` : ''}</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {items.map(it => (
          <div key={it.id} className="flex items-center gap-1.5">
            <a href={it.gmail_link} target="_blank" rel="noopener noreferrer"
              className="flex-1 min-w-0 flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] border border-border/[0.06] hover:border-accent/20 transition-all"
              style={{ background: 'rgba(38, 35, 32, 0.4)' }}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${URGENCY_DOT[it.urgency] || URGENCY_DOT.normal}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-bright leading-tight truncate">{it.summary}</div>
                <p className="text-[10.5px] text-bright/42 mt-0.5 truncate">
                  {it.sender} · {it.subject}
                  <span className="font-mono text-[9.5px] text-bright/30 font-medium ml-1.5">{ago(it.last_msg_at)}</span>
                </p>
              </div>
              <span className="font-mono text-[9px] text-accent/50 flex-shrink-0">OPEN →</span>
            </a>
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button onClick={() => hide(it.id, false)} title="Hide for me"
                className="font-mono text-[9px] px-1.5 py-0.5 rounded-md border border-border/20 text-muted/50 hover:text-bright hover:border-border/40 transition-colors">hide</button>
              <button onClick={() => hide(it.id, true)} title="Backburn: remove for everyone"
                className="font-mono text-[9px] px-1.5 py-0.5 rounded-md border border-red-400/25 text-red-400/60 hover:text-red-400 hover:border-red-400/50 transition-colors">burn</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
