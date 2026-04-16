import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env?.VITE_API_URL || 'https://pigeon-api.up.railway.app';

const PLATFORM_META = {
  twitter:  { icon: '𝕏',  label: 'Twitter / X', color: 'sky',     gradient: 'from-sky-500/20 to-sky-500/5' },
  discord:  { icon: '💬', label: 'Discord',      color: 'indigo',  gradient: 'from-indigo-500/20 to-indigo-500/5' },
  linkedin: { icon: '💼', label: 'LinkedIn',     color: 'blue',    gradient: 'from-blue-500/20 to-blue-500/5' },
  gmail:    { icon: '📧', label: 'Gmail',        color: 'red',     gradient: 'from-red-500/20 to-red-500/5' },
  telegram: { icon: '✈️', label: 'Telegram',     color: 'cyan',    gradient: 'from-cyan-500/20 to-cyan-500/5' },
  other:    { icon: '📋', label: 'Other',        color: 'amber',   gradient: 'from-amber-500/20 to-amber-500/5' },
};

function timeSince(dateStr) {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function PlatformCard({ platform, info }) {
  const meta = PLATFORM_META[platform];
  const colorMap = {
    sky: 'text-sky-400 border-sky-500/20',
    indigo: 'text-indigo-400 border-indigo-500/20',
    blue: 'text-blue-400 border-blue-500/20',
    red: 'text-red-400 border-red-500/20',
    cyan: 'text-cyan-400 border-cyan-500/20',
    amber: 'text-amber-400 border-amber-500/20',
  };
  const colors = colorMap[meta.color];

  return (
    <div className={`glass-card p-4 bg-gradient-to-br ${meta.gradient} border ${colors.split(' ')[1]} transition-all hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <p className={`text-sm font-bold ${colors.split(' ')[0]}`}>{meta.label}</p>
            <p className="text-[10px] text-muted/50">
              {info.connected ? `Synced ${timeSince(info.lastSync)}` : 'Not connected'}
            </p>
          </div>
        </div>
        {info.connected ? (
          <div className={`min-w-[36px] h-9 flex items-center justify-center rounded-xl font-bold text-lg ${
            info.unread > 0 ? `bg-${meta.color}-500/20 ${colors.split(' ')[0]}` : 'bg-white/5 text-muted/40'
          }`}>
            {info.unread}
          </div>
        ) : (
          <span className="text-[10px] text-muted/30 bg-white/5 px-2 py-1 rounded">offline</span>
        )}
      </div>
      {info.unread > 0 && (
        <div className="flex items-center gap-1.5 mt-1">
          <div className={`w-1.5 h-1.5 rounded-full bg-${meta.color}-400 animate-pulse`} />
          <span className="text-[10px] text-bright/60">{info.unread} unread message{info.unread !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}

function MessageRow({ msg, onMarkRead }) {
  const meta = PLATFORM_META[msg.platform] || PLATFORM_META.other;

  return (
    <div className={`flex items-start gap-3 px-4 py-3 border-b border-border/20 transition-colors ${
      msg.unread && !msg.markedRead ? 'bg-white/[0.02]' : 'opacity-60'
    }`}>
      <span className="text-lg mt-0.5 flex-shrink-0">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-bright truncate">{msg.senderName}</p>
          {msg.unread && !msg.markedRead && (
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
          )}
          <span className="text-[9px] text-muted/40 ml-auto flex-shrink-0">{timeSince(msg.timestamp)}</span>
        </div>
        <p className="text-[11px] text-muted/60 truncate mt-0.5">{msg.lastMessage}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`text-[8px] px-1.5 py-0.5 rounded bg-${meta.color}-500/10 text-${meta.color}-300/60`}>
            {meta.label}
          </span>
          {msg.url && (
            <a href={msg.url} target="_blank" rel="noopener"
              className="text-[9px] text-accent/50 hover:text-accent transition-colors">
              Open →
            </a>
          )}
          {msg.unread && !msg.markedRead && (
            <button onClick={() => onMarkRead(msg.conversationId)}
              className="text-[9px] text-muted/40 hover:text-bright ml-auto transition-colors">
              mark read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReachoutsPage() {
  const [summary, setSummary] = useState(null);
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [manualForm, setManualForm] = useState(false);
  const [manualData, setManualData] = useState({ platform: 'other', senderName: '', lastMessage: '', url: '' });

  const fetchData = useCallback(async () => {
    try {
      const [sumResp, msgResp] = await Promise.all([
        fetch(`${API_BASE}/api/reachouts/summary`),
        fetch(`${API_BASE}/api/reachouts/messages?${filter !== 'all' ? `platform=${filter}&` : ''}${showUnreadOnly ? 'unreadOnly=true' : ''}`),
      ]);
      const [sumData, msgData] = await Promise.all([sumResp.json(), msgResp.json()]);
      setSummary(sumData);
      setMessages(msgData.messages || []);
    } catch (e) {
      console.error('Reachouts fetch error:', e);
    }
    setLoading(false);
  }, [filter, showUnreadOnly]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const i = setInterval(fetchData, 15000); return () => clearInterval(i); }, [fetchData]);

  const markRead = async (conversationId) => {
    await fetch(`${API_BASE}/api/reachouts/mark-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationIds: [conversationId] }),
    });
    fetchData();
  };

  const markAllRead = async (platform) => {
    await fetch(`${API_BASE}/api/reachouts/mark-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true, platform }),
    });
    fetchData();
  };

  const addManual = async () => {
    if (!manualData.senderName.trim()) return;
    await fetch(`${API_BASE}/api/reachouts/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manualData),
    });
    setManualData({ platform: 'other', senderName: '', lastMessage: '', url: '' });
    setManualForm(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-24">
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-muted text-sm">Loading reachouts...</span>
        </div>
      </div>
    );
  }

  const totalUnread = summary?.totalUnread || 0;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-bright flex items-center gap-2">
            📡 Reachouts
            {totalUnread > 0 && (
              <span className="text-sm px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                {totalUnread} unread
              </span>
            )}
          </h1>
          <p className="text-xs text-muted/50 mt-1">Multi-platform DM tracker — never miss a message</p>
        </div>
        <button onClick={() => setManualForm(!manualForm)}
          className="text-xs px-3 py-1.5 rounded-lg border border-accent/20 text-accent hover:bg-accent/10 transition-colors">
          + Add Manual
        </button>
      </div>

      {/* Manual entry form */}
      {manualForm && (
        <div className="glass-card p-4 mb-6 space-y-3">
          <p className="text-xs font-bold text-bright/80 uppercase tracking-wider">Log a message manually</p>
          <div className="grid grid-cols-2 gap-2">
            <select value={manualData.platform} onChange={e => setManualData(d => ({ ...d, platform: e.target.value }))}
              className="bg-ink/60 border border-border/30 rounded-lg px-2 py-1.5 text-xs text-bright outline-none">
              {Object.entries(PLATFORM_META).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
            <input type="text" placeholder="Sender name" value={manualData.senderName}
              onChange={e => setManualData(d => ({ ...d, senderName: e.target.value }))}
              className="bg-ink/60 border border-border/30 rounded-lg px-2 py-1.5 text-xs text-bright outline-none" />
          </div>
          <input type="text" placeholder="Message preview (optional)" value={manualData.lastMessage}
            onChange={e => setManualData(d => ({ ...d, lastMessage: e.target.value }))}
            className="w-full bg-ink/60 border border-border/30 rounded-lg px-2 py-1.5 text-xs text-bright outline-none" />
          <input type="text" placeholder="Link / URL (optional)" value={manualData.url}
            onChange={e => setManualData(d => ({ ...d, url: e.target.value }))}
            className="w-full bg-ink/60 border border-border/30 rounded-lg px-2 py-1.5 text-xs text-bright outline-none" />
          <div className="flex gap-2">
            <button onClick={() => setManualForm(false)} className="text-xs px-3 py-1.5 rounded-lg border border-border/30 text-muted">Cancel</button>
            <button onClick={addManual} className="text-xs px-3 py-1.5 rounded-lg bg-accent/20 text-accent font-bold">Add Message</button>
          </div>
        </div>
      )}

      {/* Platform summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {Object.entries(summary.summary).map(([platform, info]) => (
            <PlatformCard key={platform} platform={platform} info={info} />
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1 bg-surface/60 rounded-lg p-0.5 border border-border/20">
          {['all', ...Object.keys(PLATFORM_META)].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[10px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                filter === f ? 'bg-accent/20 text-accent' : 'text-muted/50 hover:text-bright'
              }`}>
              {f === 'all' ? 'All' : PLATFORM_META[f].icon}
            </button>
          ))}
        </div>
        <button onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          className={`text-[10px] px-2.5 py-1 rounded-md border transition-colors ${
            showUnreadOnly ? 'border-amber-400/30 text-amber-300 bg-amber-500/10' : 'border-border/20 text-muted/50'
          }`}>
          {showUnreadOnly ? '● Unread only' : '○ Show all'}
        </button>
        {filter !== 'all' && (
          <button onClick={() => markAllRead(filter)}
            className="text-[10px] px-2.5 py-1 rounded-md border border-border/20 text-muted/50 hover:text-bright ml-auto transition-colors">
            Mark all read
          </button>
        )}
      </div>

      {/* Messages list */}
      <div className="glass-card overflow-hidden">
        {messages.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-2xl mb-2">🕊️</p>
            <p className="text-sm text-muted/50">
              {showUnreadOnly ? 'All caught up — no unread messages' : 'No messages yet'}
            </p>
            <p className="text-[10px] text-muted/30 mt-2">
              Install the Chrome extension or add messages manually
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageRow key={msg.conversationId} msg={msg} onMarkRead={markRead} />
          ))
        )}
      </div>

      {/* Extension install help */}
      <div className="mt-6 glass-card p-4">
        <p className="text-xs font-bold text-bright/70 mb-2">🔌 Chrome Extension Setup</p>
        <ol className="text-[11px] text-muted/60 space-y-1.5 list-decimal list-inside">
          <li>Open <code className="text-accent/60 bg-ink/40 px-1 rounded">chrome://extensions</code></li>
          <li>Enable <strong className="text-bright/60">Developer mode</strong> (top right)</li>
          <li>Click <strong className="text-bright/60">Load unpacked</strong> → select the <code className="text-accent/60 bg-ink/40 px-1 rounded">pigeon-reachouts-extension</code> folder</li>
          <li>Open Twitter, Discord, LinkedIn — the extension scrapes DMs automatically</li>
        </ol>
      </div>
    </div>
  );
}
