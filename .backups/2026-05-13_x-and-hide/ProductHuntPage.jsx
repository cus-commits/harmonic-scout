import FindSimilar from '../components/FindSimilar';
import { CrmButton } from '../components/CrmButton';
import RemoveMenu from '../components/RemoveMenu';
import React, { useState } from 'react';

const TOPIC_OPTIONS = [
  'DeFi', 'Crypto', 'Fintech', 'AI', 'Developer Tools', 'SaaS',
  'Marketplace', 'Payments', 'Gaming', 'Social', 'Productivity',
  'Analytics', 'No-Code', 'API', 'Web3', 'Security',
];

function timeSince(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now - d) / 86400000);
  if (days < 1) return 'today';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function PostCard({ post, addFavorite, isFavorited }) {
  const sig = post.signal || 'LOW';
  const signalColors = {
    HIGH: 'bg-sm/15 text-sm border-sm/30',
    MEDIUM: 'bg-accent/15 text-accent border-accent/30',
    LOW: 'bg-rose/10 text-rose/60 border-rose/20',
  };
  return (
    <div className={`bg-surface/60 border rounded-xl p-3 space-y-2 ${sig === 'HIGH' ? 'border-sm/30' : sig === 'MEDIUM' ? 'border-accent/20' : 'border-border/20'}`}>
      <div className="flex items-start gap-2.5">
        {post.pfp && <img src={post.pfp} alt="" className="w-10 h-10 rounded-lg bg-ink flex-shrink-0" onError={e => { e.target.style.display = 'none'; }} />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${signalColors[sig]}`}>
              {sig === 'HIGH' ? '🟢' : sig === 'MEDIUM' ? '🟡' : '🔴'} {sig}
            </span>
            {post.companyName && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 font-medium">
                🏢 {post.companyName}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-bright mt-0.5">{post.title}</p>
          <p className="text-[11px] text-muted">{post.subtitle}</p>
        </div>
        {addFavorite && (
          <button onClick={() => { const cn = post.companyName || post.title; const s = isFavorited && isFavorited(cn); if (!s) addFavorite({ name: cn, description: post.text?.slice(0, 200), website: post.url }); }}
            className={`flex-shrink-0 text-base ${isFavorited && isFavorited(post.companyName || post.title) ? 'text-bo' : 'text-muted/40 hover:text-bo'}`}>
            {isFavorited && isFavorited(post.companyName || post.title) ? '★' : '☆'}
          </button>
        )}
      </div>
      <p className="text-xs text-bright/80 leading-relaxed">{post.text}</p>
      <div className="flex items-center gap-3 text-[10px] text-muted flex-wrap">
        {post.likes > 0 && <span>⬆️ {post.likes}</span>}
        {post.meta?.comments > 0 && <span>💬 {post.meta.comments}</span>}
        {post.meta?.makers && <span>👤 {post.meta.makers}</span>}
        {post.timestamp && <span className="ml-auto">{timeSince(post.timestamp)}</span>}
      </div>
      {post.url && (
        <a href={post.url} target="_blank" rel="noopener" className="text-[10px] text-accent hover:underline truncate block">
          🔗 {post.url.replace(/^https?:\/\//, '').slice(0, 50)}
        </a>
      )}
      {post.meta?.website && post.meta.website !== post.url && (
        <a href={post.meta.website.startsWith('http') ? post.meta.website : `https://${post.meta.website}`} target="_blank" rel="noopener" className="text-[10px] text-accent hover:underline truncate block">
          🌐 {post.meta.website.replace(/^https?:\/\//, '').slice(0, 40)}
        </a>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        <FindSimilar addFavorite={addFavorite} isFavorited={isFavorited} companyName={post.companyName || post.title} />
        <CrmButton company={{ name: post.companyName || post.title, website: post.url }} />
        <RemoveMenu company={{ name: post.companyName || post.title, website: post.url }} />
      </div>
    </div>
  );
}

export default function ProductHuntPage({ addFavorite, isFavorited }) {
  const [topics, setTopics] = useState([]);
  const [customKeywords, setCustomKeywords] = useState('');
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);

  const handleScan = async () => {
    if (topics.length === 0 && !customKeywords.trim()) {
      setResults({ signals: [], error: 'Pick at least one topic or add custom keywords.' });
      return;
    }
    setScanning(true);
    setResults(null);

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';
      const anthropicKey = localStorage.getItem('scout_anthropic_key') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (anthropicKey) headers['x-anthropic-key'] = anthropicKey;

      const keywords = [...topics.map(t => t.toLowerCase())];
      if (customKeywords.trim()) {
        customKeywords.split(',').map(k => k.trim()).filter(Boolean).forEach(k => keywords.push(k));
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const res = await fetch(`${API_BASE}/api/signals/super`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sectors: [],
          sources: ['producthunt'],
          customKeywords: keywords.join(', '),
          timeRange: 'month',
          minFollowers: 0,
          minEngagement: 0,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const text = await res.text();
      const lines = text.split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(6));
          if (!data.progress) setResults(data);
        } catch (e) {}
      }
    } catch (err) {
      setResults({ signals: [], error: err.message });
    }
    setScanning(false);
  };

  return (
    <div className="min-h-screen max-w-[1080px] mx-auto px-7 pt-6 pb-28 fade-in">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="font-serif italic font-semibold text-accent">dc</span>{' '}
          <span className="text-accent">Product Hunt</span> Scanner
        </h1>
        <p className="text-muted text-xs mt-1">Find new launches and early-stage products</p>
      </div>

      <div className="space-y-4 bg-ink/40 border border-border/20 rounded-2xl p-4 mb-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-bright">Topics</h3>
            <button onClick={() => setTopics(topics.length === TOPIC_OPTIONS.length ? [] : [...TOPIC_OPTIONS])} className="text-[10px] text-accent hover:underline">
              {topics.length === TOPIC_OPTIONS.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TOPIC_OPTIONS.map(t => {
              const active = topics.includes(t);
              return (
                <button key={t} onClick={() => setTopics(active ? topics.filter(x => x !== t) : [...topics, t])}
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${active ? 'bg-accent/15 border-accent/40 text-accent font-medium' : 'bg-surface/50 border-border/30 text-muted hover:border-border/60'}`}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-bright">Custom keywords (optional)</h3>
          <input type="text" value={customKeywords} onChange={e => setCustomKeywords(e.target.value)}
            placeholder="e.g. betting, prediction market, DeFi"
            className="w-full bg-ink border border-border/40 rounded-lg px-3 py-2 text-xs text-bright outline-none focus:border-accent/40" />
        </div>
      </div>

      <button onClick={handleScan} disabled={scanning}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-accent text-ink font-bold text-sm active:scale-[0.98] transition-all duration-200 disabled:opacity-50 mb-4 shadow-lg shadow-accent/20">
        {scanning ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">🐱</span> Scanning Product Hunt...
          </span>
        ) : `🐱 Scan Product Hunt ${topics.length > 0 ? `(${topics.length} topics)` : ''}`}
      </button>

      {results && (
        <div className="space-y-3">
          {results.error && (
            <div className="bg-rose/10 border border-rose/20 rounded-xl p-3">
              <p className="text-rose text-sm">{results.error}</p>
            </div>
          )}
          {results.analysis && (
            <div className="bg-accent/5 border border-accent/15 rounded-xl p-3">
              <p className="text-xs text-bright/90 leading-relaxed whitespace-pre-wrap">{results.analysis}</p>
            </div>
          )}
          {results.signals?.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] text-muted">{results.signals.length} products found</p>
              {results.signals.map(s => <PostCard key={s.id} post={s} addFavorite={addFavorite} isFavorited={isFavorited} />)}
            </div>
          ) : !results.error ? (
            <p className="text-center text-muted text-sm py-6">No products found. Try different topics.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
