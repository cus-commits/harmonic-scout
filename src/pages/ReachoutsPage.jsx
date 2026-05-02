import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env?.VITE_API_URL || 'https://pigeon-api.up.railway.app';

const PLATFORM_META = {
  twitter:  { icon: '𝕏',  label: 'Twitter / X', color: 'bo',      gradient: 'from-bo/20 to-bo/5' },
  discord:  { icon: '💬', label: 'Discord',      color: 'boro',    gradient: 'from-boro/20 to-boro/5' },
  linkedin: { icon: '💼', label: 'LinkedIn',     color: 'bo',      gradient: 'from-bo/20 to-bo/5' },
  gmail:    { icon: '📧', label: 'Gmail',        color: 'rose',    gradient: 'from-rose/20 to-rose/5' },
  telegram: { icon: '✈️', label: 'Telegram',     color: 'sm',      gradient: 'from-sm/20 to-sm/5' },
  other:    { icon: '📋', label: 'Other',        color: 'accent',  gradient: 'from-accent/20 to-accent/5' },
};

const CONNECT_FIELDS = {
  gmail: {
    title: 'Connect Gmail (OAuth2)',
    fields: [
      { key: 'clientId', label: 'Google Client ID', placeholder: 'xxxx.apps.googleusercontent.com' },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'GOCSPX-...', type: 'password' },
      { key: 'refreshToken', label: 'Refresh Token', placeholder: '1//0...', type: 'password' },
    ],
    help: 'Create a Google Cloud project → Enable Gmail API → OAuth consent screen → Create OAuth2 credentials. Use Google OAuth Playground to get a refresh token with gmail.readonly scope.',
    mode: '24/7 server polling',
  },
  telegram: {
    title: 'Connect Telegram Bot',
    fields: [
      { key: 'botToken', label: 'Bot Token', placeholder: '123456:ABC-DEF...', type: 'password' },
    ],
    help: 'Message @BotFather on Telegram → /newbot → copy the token. Forward messages to this bot or add it to groups to track.',
    mode: '24/7 server polling',
  },
  twitter: {
    title: 'Connect Twitter / X (Session)',
    fields: [
      { key: 'ct0', label: 'ct0 Cookie', placeholder: 'abc123...', type: 'password' },
      { key: 'authToken', label: 'auth_token Cookie', placeholder: 'abc123...', type: 'password' },
    ],
    help: 'Open x.com → DevTools → Application → Cookies → copy "ct0" and "auth_token". Sessions last ~months.',
    mode: '24/7 server polling (free)',
    warning: 'Uses internal Twitter API. No cost but sessions can expire.',
  },
  discord: {
    title: 'Connect Discord (User Token)',
    fields: [
      { key: 'userToken', label: 'User Token', placeholder: 'mfa.abc123...', type: 'password' },
    ],
    help: 'Open discord.com → DevTools → Network → find any request → copy the "Authorization" header value.',
    mode: '24/7 server polling',
    warning: 'Self-bots violate Discord TOS. Risk of account ban. Use at your own risk.',
  },
  linkedin: {
    title: 'Connect LinkedIn (Session)',
    fields: [
      { key: 'liAt', label: 'li_at Cookie', placeholder: 'AQE...', type: 'password' },
      { key: 'jsessionid', label: 'JSESSIONID Cookie', placeholder: 'ajax:123...', type: 'password' },
    ],
    help: 'Open linkedin.com → DevTools → Application → Cookies → copy "li_at" and "JSESSIONID" (remove quotes). Sessions expire in ~1-2 weeks.',
    mode: '24/7 server polling',
    warning: 'LinkedIn aggressively detects automation. Sessions expire frequently.',
  },
};

function timeSince(dateStr) {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function PlatformCard({ platform, info, onConnect, onDisconnect, credentials }) {
  const meta = PLATFORM_META[platform];
  const [expanded, setExpanded] = useState(false);
  const [formData, setFormData] = useState({});
  const [connecting, setConnecting] = useState(false);
  const [connectResult, setConnectResult] = useState(null);
  const config = CONNECT_FIELDS[platform];

  const colorMap = {
    bo: 'text-bo border-bo/20',
    boro: 'text-boro border-boro/20',
    rose: 'text-rose border-rose/20',
    sm: 'text-sm border-sm/20',
    accent: 'text-accent border-accent/20',
  };
  const colors = colorMap[meta.color];
  const isConnected = info.connected && !info.error;

  const handleConnect = async () => {
    setConnecting(true);
    setConnectResult(null);
    try {
      const resp = await fetch(`${API_BASE}/api/reachouts/connect/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await resp.json();
      if (resp.ok) {
        setConnectResult({ ok: true, message: data.message });
        setFormData({});
        setTimeout(() => { setExpanded(false); setConnectResult(null); }, 2000);
        onConnect();
      } else {
        setConnectResult({ ok: false, message: data.error });
      }
    } catch (e) {
      setConnectResult({ ok: false, message: e.message });
    }
    setConnecting(false);
  };

  const handleDisconnect = async () => {
    await fetch(`${API_BASE}/api/reachouts/disconnect/${platform}`, { method: 'POST' });
    onDisconnect();
  };

  return (
    <div className={`glass-card bg-gradient-to-br ${meta.gradient} border ${colors.split(' ')[1]} transition-all`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{meta.icon}</span>
            <div>
              <p className={`text-sm font-bold ${colors.split(' ')[0]}`}>{meta.label}</p>
              <p className="text-[10px] text-muted/50">
                {isConnected && info.mode && <span className="text-sm/60">{info.mode} · </span>}
                {isConnected ? `Synced ${timeSince(info.lastSync)}` : info.error ? 'Error' : 'Not connected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className={`min-w-[36px] h-9 flex items-center justify-center rounded-xl font-bold text-lg ${
                info.unread > 0 ? `bg-white/10 ${colors.split(' ')[0]}` : 'bg-white/5 text-muted/40'
              }`}>
                {info.unread}
              </div>
            ) : (
              <span className="text-[10px] text-muted/30 bg-white/5 px-2 py-1 rounded">offline</span>
            )}
          </div>
        </div>

        {info.error && (
          <p className="text-[10px] text-rose/70 mt-1">{info.error}</p>
        )}

        {info.unread > 0 && (
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-[10px] text-bright/60">{info.unread} unread</span>
          </div>
        )}

        <div className="flex items-center gap-2 mt-2">
          {config && (
            <button onClick={() => setExpanded(!expanded)}
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                isConnected
                  ? 'border-sm/20 text-sm/60 hover:text-sm'
                  : 'border-accent/20 text-accent hover:bg-accent/10'
              }`}>
              {isConnected ? (expanded ? 'Hide' : 'Settings') : (expanded ? 'Cancel' : 'Connect')}
            </button>
          )}
          {isConnected && (
            <button onClick={handleDisconnect}
              className="text-[10px] px-2 py-0.5 rounded border border-rose/20 text-rose/50 hover:text-rose transition-colors">
              Disconnect
            </button>
          )}
        </div>
      </div>

      {expanded && config && (
        <div className="px-4 pb-4 pt-1 border-t border-border/[0.06]">
          <p className="text-[10px] font-bold text-bright/60 mb-2">{config.title}</p>
          {config.warning && (
            <p className="text-[9px] text-accent/60 bg-accent/5 px-2 py-1 rounded mb-2">
              ⚠️ {config.warning}
            </p>
          )}
          <div className="space-y-2">
            {config.fields.map(f => (
              <div key={f.key}>
                <label className="text-[9px] text-muted/50 block mb-0.5">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  placeholder={f.placeholder}
                  value={formData[f.key] || ''}
                  onChange={e => setFormData(d => ({ ...d, [f.key]: e.target.value }))}
                  className="w-full bg-ink/60 border border-border/30 rounded-lg px-2 py-1.5 text-[11px] text-bright font-mono outline-none focus:border-accent/40"
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
          <p className="text-[9px] text-muted/30 mt-2 leading-relaxed">{config.help}</p>
          {config.mode && (
            <p className="text-[9px] text-sm/40 mt-1">Mode: {config.mode}</p>
          )}
          {connectResult && (
            <p className={`text-[10px] mt-2 ${connectResult.ok ? 'text-sm' : 'text-rose'}`}>
              {connectResult.message}
            </p>
          )}
          <button onClick={handleConnect} disabled={connecting}
            className="mt-2 w-full text-[11px] px-3 py-2 rounded-lg bg-accent/20 text-accent font-bold disabled:opacity-40 transition-colors hover:bg-accent/30">
            {connecting ? 'Connecting...' : isConnected ? 'Reconnect' : 'Connect'}
          </button>
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
      {msg.senderAvatar ? (
        <img src={msg.senderAvatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5 bg-ink/60" />
      ) : (
        <span className="text-lg mt-0.5 flex-shrink-0">{meta.icon}</span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-bright truncate">{msg.senderName}</p>
          {msg.unread && !msg.markedRead && (
            <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
          )}
          <span className="text-[9px] text-muted/40 ml-auto flex-shrink-0">{timeSince(msg.timestamp)}</span>
        </div>
        <p className="text-[11px] text-muted/60 truncate mt-0.5">{msg.lastMessage}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-muted/40`}>
            {meta.icon} {meta.label}
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
  const [credentials, setCredentials] = useState({});
  const [filter, setFilter] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [manualForm, setManualForm] = useState(false);
  const [manualData, setManualData] = useState({ platform: 'other', senderName: '', lastMessage: '', url: '' });

  const fetchData = useCallback(async () => {
    try {
      const [sumResp, msgResp, credResp] = await Promise.all([
        fetch(`${API_BASE}/api/reachouts/summary`),
        fetch(`${API_BASE}/api/reachouts/messages?${filter !== 'all' ? `platform=${filter}&` : ''}${showUnreadOnly ? 'unreadOnly=true' : ''}`),
        fetch(`${API_BASE}/api/reachouts/credentials`),
      ]);
      const [sumData, msgData, credData] = await Promise.all([sumResp.json(), msgResp.json(), credResp.json()]);
      setSummary(sumData);
      setMessages(msgData.messages || []);
      setCredentials(credData);
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
      <div className="max-w-[1080px] mx-auto px-4 pt-8 pb-24">
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-muted text-sm">Loading reachouts...</span>
        </div>
      </div>
    );
  }

  const totalUnread = summary?.totalUnread || 0;
  const connectedCount = Object.values(credentials).filter(c => c.connected).length;

  return (
    <div className="max-w-[1080px] mx-auto px-7 pt-6 pb-28 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-xl font-semibold text-bright flex items-center gap-2">
            📡 Reachouts
            {totalUnread > 0 && (
              <span className="text-sm px-2 py-0.5 rounded-full bg-accent/20 text-accent font-bold">
                {totalUnread} unread
              </span>
            )}
          </h1>
          <p className="text-xs text-muted/50 mt-1">
            {connectedCount > 0
              ? `${connectedCount} platform${connectedCount !== 1 ? 's' : ''} connected — polling 24/7`
              : 'Connect platforms below to start tracking DMs'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setManualForm(!manualForm)}
            className="text-xs px-3 py-1.5 rounded-lg border border-accent/20 text-accent hover:bg-accent/10 transition-colors">
            + Manual
          </button>
          <button onClick={() => setShowSetup(!showSetup)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              showSetup ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border/30 text-muted hover:text-bright'
            }`}>
            {showSetup ? 'Hide Setup' : 'Connect Platforms'}
          </button>
        </div>
      </div>

      {/* Platform setup cards */}
      {showSetup && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {Object.entries(PLATFORM_META).filter(([k]) => k !== 'other').map(([platform, meta]) => (
            <PlatformCard
              key={platform}
              platform={platform}
              info={summary?.summary?.[platform] || {}}
              credentials={credentials[platform]}
              onConnect={fetchData}
              onDisconnect={fetchData}
            />
          ))}
        </div>
      )}

      {/* Quick status row (when setup is hidden) */}
      {!showSetup && summary && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {Object.entries(summary.summary).filter(([_, info]) => info.connected || info.unread > 0).map(([platform, info]) => {
            const meta = PLATFORM_META[platform];
            return (
              <div key={platform} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface/30 border border-border/[0.06]">
                <span className="text-sm">{meta.icon}</span>
                {info.unread > 0 ? (
                  <span className="text-[10px] font-bold text-accent">{info.unread}</span>
                ) : (
                  <span className="text-[10px] text-sm/50">0</span>
                )}
                {info.connected && <div className="w-1 h-1 rounded-full bg-sm/40" />}
              </div>
            );
          })}
          {connectedCount === 0 && (
            <p className="text-[10px] text-muted/40">No platforms connected — click "Connect Platforms" above</p>
          )}
        </div>
      )}

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
            showUnreadOnly ? 'border-accent/30 text-accent bg-accent/10' : 'border-border/20 text-muted/50'
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
              {connectedCount === 0 ? 'Connect platforms above to start tracking' : 'Waiting for new messages...'}
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageRow key={msg.conversationId} msg={msg} onMarkRead={markRead} />
          ))
        )}
      </div>
    </div>
  );
}
