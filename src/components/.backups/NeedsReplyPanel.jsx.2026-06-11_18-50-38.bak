import React, { useState, useEffect } from 'react';

// Daily Gmail needs-reply digest, written to Supabase by needs-reply-sweep.py
// on the droplet (cron 12:00 UTC). Read via token-gated RPC.
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

  useEffect(() => {
    fetch(`${SB_URL}/rest/v1/rpc/get_needs_reply`, {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: NR_TOKEN }),
    }).then(r => r.json()).then(d => { if (Array.isArray(d)) setItems(d); }).catch(() => {});
  }, []);

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
          <a key={it.id} href={it.gmail_link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] border border-border/[0.06] hover:border-accent/20 transition-all"
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
        ))}
      </div>
    </div>
  );
}
