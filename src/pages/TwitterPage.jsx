import FindSimilar from '../components/FindSimilar';
import { CrmButton } from '../components/CrmButton';
import React, { useState } from 'react';

const TOPIC_OPTIONS = [
  'Building / Launching', 'Raising / Fundraising', 'Hiring / Team',
  'Testnet / Devnet', 'Mainnet Launch', 'New Protocol',
  'DeFi', 'Betting / Gambling', 'Social Betting', 'Prediction Markets',
  'Gaming', 'NFT / Collectibles', 'Social / Consumer',
  'Infrastructure', 'Bridge / Cross-chain', 'AI + Crypto', 'DAO',
  'Exchange / Marketplace', 'Options / Derivatives', 'Stablecoins',
];

const FOLLOWER_OPTIONS = [
  { label: 'Any size', value: 0 },
  { label: '100+ followers', value: 100 },
  { label: '500+ followers', value: 500 },
  { label: '1K+ followers', value: 1000 },
  { label: '5K+ followers', value: 5000 },
];

const ENGAGEMENT_OPTIONS = [
  { label: 'Any engagement', value: 0 },
  { label: '3+ likes', value: 3 },
  { label: '10+ likes', value: 10 },
  { label: '25+ likes', value: 25 },
  { label: '100+ likes', value: 100 },
];

function buildKeywords(topics) {

  const keywordMap = {
    'Building / Launching': ['building', 'just launched', 'shipping'],
    'Raising / Fundraising': ['pre-seed', 'raising round', 'seed round', 'looking for investors'],
    'Hiring / Team': ['hiring', 'founding engineer', 'looking for cofounder'],
    'Testnet / Devnet': ['testnet live', 'devnet launch', 'testnet'],
    'Mainnet Launch': ['mainnet launch', 'deployed mainnet', 'live on mainnet'],
    'New Protocol': ['new protocol', 'protocol launch', 'introducing our'],
    'DeFi': ['defi protocol', 'liquidity pool', 'yield farming', 'amm'],
    'Betting / Gambling': ['betting protocol', 'onchain betting', 'crypto casino', 'sportsbook'],
    'Social Betting': ['social betting', 'parlay', 'prop bet', 'picks platform'],
    'Prediction Markets': ['prediction market', 'polymarket', 'binary outcome', 'event market'],
    'Gaming': ['web3 game', 'onchain gaming', 'crypto game', 'play to earn'],
    'NFT / Collectibles': ['nft launch', 'nft collection', 'digital collectible'],
    'Social / Consumer': ['social app', 'consumer crypto', 'social protocol', 'socialfi'],
    'Infrastructure': ['crypto infra', 'rpc provider', 'indexer', 'sequencer', 'rollup'],
    'Bridge / Cross-chain': ['bridge launch', 'cross-chain', 'interoperability', 'relay'],
    'AI + Crypto': ['ai agent', 'ai crypto', 'crypto llm', 'depin ai'],
    'DAO': ['dao launch', 'onchain governance', 'dao tooling'],
    'Exchange / Marketplace': ['dex launch', 'orderbook', 'trading platform', 'exchange'],
    'Options / Derivatives': ['options protocol', 'perpetual', 'derivatives', 'perps dex'],
    'Stablecoins': ['stablecoin launch', 'pegged dollar', 'stablecoin protocol'],
  };

  const keywords = [];
  for (const topic of topics) {
    const mapped = keywordMap[topic] || [topic.toLowerCase()];
    keywords.push(...mapped);
  }
  return [...new Set(keywords)].slice(0, 16);
}

function timeSince(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const hours = Math.floor((now - d) / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function SingleSelect({ options, selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const label = typeof opt === 'string' ? opt : opt.label;
        const active = selected === label;
        return (
          <button
            key={label}
            onClick={() => onChange(label)}
            className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${
              active
                ? 'bg-accent/15 border-accent/40 text-accent font-medium'
                : 'bg-surface/50 border-border/30 text-muted hover:border-border/60'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function MultiSelect({ options, selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onChange(active ? selected.filter((s) => s !== opt) : [...selected, opt])}
            className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${
              active
                ? 'bg-accent/15 border-accent/40 text-accent font-medium'
                : 'bg-surface/50 border-border/30 text-muted hover:border-border/60'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function TweetCard({ tweet, addFavorite, isFavorited }) {
  const signalColors = {
    HIGH: 'bg-green-500/15 text-green-400 border-green-500/30',
    MEDIUM: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    LOW: 'bg-red-500/10 text-red-400/60 border-red-500/20',
  };
  const signalEmoji = { HIGH: '🟢', MEDIUM: '🟡', LOW: '🔴' };
  const sig = tweet.signal || 'LOW';

  return (
    <div className={`rounded-xl border p-3.5 space-y-2 fade-in ${sig === 'HIGH' ? 'border-green-500/40 bg-green-500/5' : sig === 'MEDIUM' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border/40 bg-surface/60'}`}>
      <div className="flex items-start gap-3">
        {tweet.pfp && (
          <img src={tweet.pfp} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-bright text-sm">{tweet.author}</span>
            <span className="text-[10px] text-muted">@{tweet.username}</span>
            {tweet.verified && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25">✓</span>
            )}
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${signalColors[sig]}`}>
              {signalEmoji[sig]} {sig}
            </span>
          </div>
          <span className="text-[10px] text-bright/40">{tweet.followers?.toLocaleString()} followers · {timeSince(tweet.timestamp)}</span>
        </div>
        {tweet.tweetUrl && (
          <a href={tweet.tweetUrl} target="_blank" rel="noopener" className="text-muted hover:text-accent transition-colors flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
        )}
        {addFavorite && (
          <button onClick={() => { const cn = tweet.companyName || tweet.author; const s = isFavorited && isFavorited(cn); if (!s) addFavorite({ name: cn, description: tweet.text?.slice(0, 200), website: tweet.tweetUrl }); }}
            className={`flex-shrink-0 text-base ${isFavorited && isFavorited(tweet.companyName || tweet.author) ? 'text-sky-400' : 'text-muted/40 hover:text-sky-400'}`}>
            {isFavorited && isFavorited(tweet.companyName || tweet.author) ? '★' : '☆'}
          </button>
        )}
      </div>

      <p className="text-xs text-bright leading-relaxed whitespace-pre-wrap">{tweet.text}</p>

      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-surface border-border/40 text-muted">
          ❤️ {tweet.likes}
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-surface border-border/40 text-muted">
          🔁 {tweet.retweets}
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-surface border-border/40 text-muted">
          💬 {tweet.replies}
        </span>
        {tweet.quotes > 0 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-surface border-border/40 text-muted">
            🗨️ {tweet.quotes}
          </span>
        )}
      </div>

      {tweet.urls?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tweet.urls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener" className="text-[10px] text-accent hover:underline truncate max-w-[250px]">
              🔗 {url.replace(/^https?:\/\//, '').slice(0, 40)}
            </a>
          ))}
        </div>
      )}

      {tweet.harmonic && (
        <div className="mt-1 p-2.5 rounded-lg bg-accent/5 border border-accent/20">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold text-accent">📊 Harmonic Data</span>
            {tweet.harmonic.stage && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/25 font-medium">{tweet.harmonic.stage}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted">
            {tweet.harmonic.name && <span>🏢 {tweet.harmonic.name}</span>}
            {tweet.harmonic.fundingTotal ? <span className="text-amber-400 font-medium">💰 ${(tweet.harmonic.fundingTotal / 1e6).toFixed(1)}M raised</span> : <span className="text-green-400">💰 No funding found</span>}
            {tweet.harmonic.lastRound && <span>📋 {tweet.harmonic.lastRound}{tweet.harmonic.lastRoundDate ? ` (${tweet.harmonic.lastRoundDate.slice(0, 7)})` : ''}</span>}
            {tweet.harmonic.headcount && <span>👥 ~{tweet.harmonic.headcount} people</span>}
            {tweet.harmonic.website && (
              <a href={tweet.harmonic.website.startsWith('http') ? tweet.harmonic.website : `https://${tweet.harmonic.website}`} target="_blank" rel="noopener" className="text-accent hover:underline">🌐 {tweet.harmonic.website.replace(/^https?:\/\//, '').slice(0, 30)}</a>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        <FindSimilar addFavorite={addFavorite} isFavorited={isFavorited} companyName={tweet.companyName || tweet.harmonic?.name || tweet.author} />
        <CrmButton company={{ name: tweet.companyName || tweet.author, website: tweet.tweetUrl }} />
      </div>
    </div>
  );
}

export default function TwitterPage({ addFavorite, isFavorited }) {
  const [topics, setTopics] = useState([]);
  const [minFollowers, setMinFollowers] = useState('Any size');
  const [minEngagement, setMinEngagement] = useState('Any engagement');
  const [customKeywords, setCustomKeywords] = useState('');
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);

  // Saved searches
  const STORAGE_KEY = 'twitter_saved_searches';
  const loadSaved = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
  const [savedSearches, setSavedSearches] = useState(loadSaved);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSaveSearch = () => {
    const name = saveName.trim();
    if (!name) return;
    const search = { name, topics, minFollowers, minEngagement, customKeywords, savedAt: Date.now() };
    const updated = [search, ...savedSearches.filter((s) => s.name !== name)].slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSavedSearches(updated);
    setSaveName('');
    setShowSaveInput(false);
  };

  const handleLoadSearch = (search) => {
    setTopics(search.topics || []);
    setMinFollowers(search.minFollowers || 'Any size');
    setMinEngagement(search.minEngagement || 'Any engagement');
    setCustomKeywords(search.customKeywords || '');
    setShowDropdown(false);
  };

  const handleDeleteSearch = (name, e) => {
    e.stopPropagation();
    const updated = savedSearches.filter((s) => s.name !== name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSavedSearches(updated);
  };

  const handleScan = async () => {
    if (topics.length === 0 && !customKeywords.trim()) {
      setResults({ tweets: [], error: 'Pick at least one topic or add custom keywords.' });
      return;
    }

    setScanning(true);
    setResults(null);

    const kwList = buildKeywords(topics);
    if (customKeywords.trim()) {
      customKeywords.split(',').map((k) => k.trim()).filter(Boolean).forEach((k) => kwList.push(k));
    }

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';
      const anthropicKey = localStorage.getItem('scout_anthropic_key') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (anthropicKey && anthropicKey !== '__SERVER__') headers['x-anthropic-key'] = anthropicKey;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const res = await fetch(`${API_BASE}/api/signals/twitter`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          keywords: kwList.slice(0, 16),
          minFollowers: FOLLOWER_OPTIONS.find((o) => o.label === minFollowers)?.value || 0,
          minLikes: ENGAGEMENT_OPTIONS.find((o) => o.label === minEngagement)?.value || 0,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const text = await res.text();
      const dataLine = text.split('\n').find((l) => l.startsWith('data: '));
      if (!dataLine) throw new Error('No data in response');
      const data = JSON.parse(dataLine.slice(6));
      if (data.error) throw new Error(data.error);

      setResults(data);
    } catch (err) {
      console.error('[Twitter] Error:', err);
      setResults({ tweets: [], analysis: null, error: err.message });
    }
    setScanning(false);
  };

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-8 pt-4 pb-24">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-accent" style={{ fontFamily: "'Courier New', monospace" }}>dc</span> X / Twitter Scanner
        </h1>
        <p className="text-muted text-xs mt-1">Find founders and builders on Crypto Twitter</p>
      </div>

      {/* Saved Searches Bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full flex items-center justify-between bg-ink border border-border/40 rounded-lg px-3 py-2 text-xs text-muted hover:border-accent/40 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <span className="opacity-60">📂</span>
              {savedSearches.length > 0 ? `${savedSearches.length} saved searches` : 'No saved searches'}
            </span>
            <span className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {showDropdown && savedSearches.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border/40 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto">
              {savedSearches.map((s) => (
                <button
                  key={s.name}
                  onClick={() => handleLoadSearch(s)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs hover:bg-accent/10 transition-colors group border-b border-border/20 last:border-0"
                >
                  <div className="text-left min-w-0">
                    <span className="text-bright font-medium block truncate">{s.name}</span>
                    <span className="text-muted text-[10px]">
                      {s.topics?.length || 0} topics
                      {s.customKeywords ? ' · +keywords' : ''}
                    </span>
                  </div>
                  <span
                    onClick={(e) => handleDeleteSearch(s.name, e)}
                    className="text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-sm flex-shrink-0"
                  >✕</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {!showSaveInput ? (
          <button
            onClick={() => setShowSaveInput(true)}
            className="flex-shrink-0 px-3 py-2 rounded-lg border border-accent/30 text-accent text-xs font-medium hover:bg-accent/10 transition-colors"
          >
            💾 Save
          </button>
        ) : (
          <div className="flex gap-1.5 flex-shrink-0">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSearch()}
              placeholder="Search name..."
              autoFocus
              className="w-32 bg-ink border border-accent/40 rounded-lg px-2 py-1.5 text-xs text-bright outline-none"
            />
            <button onClick={handleSaveSearch} className="px-2 py-1.5 rounded-lg bg-accent/20 text-accent text-xs font-medium hover:bg-accent/30">✓</button>
            <button onClick={() => { setShowSaveInput(false); setSaveName(''); }} className="px-2 py-1.5 rounded-lg bg-surface text-muted text-xs hover:bg-surface/80">✕</button>
          </div>
        )}
      </div>

      <div className="space-y-4 mb-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-bright">What are you looking for?</h3>
            <button
              onClick={() => setTopics(topics.length === TOPIC_OPTIONS.length ? [] : [...TOPIC_OPTIONS])}
              className="text-[10px] text-accent hover:underline"
            >
              {topics.length === TOPIC_OPTIONS.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <p className="text-[11px] text-muted">Pick topics — we'll build search queries from these</p>
          <MultiSelect options={TOPIC_OPTIONS} selected={topics} onChange={setTopics} />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-bright">Custom keywords (optional)</h3>
          <input
            type="text"
            value={customKeywords}
            onChange={(e) => setCustomKeywords(e.target.value)}
            placeholder="e.g. pump.fun, polymarket clone, sports betting onchain"
            className="w-full bg-ink border border-border/40 rounded-lg px-3 py-2 text-xs text-bright outline-none focus:border-accent/40"
          />
          <p className="text-[10px] text-muted">Comma-separated. These get searched directly on X.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-bright">Min followers?</h3>
            <SingleSelect options={FOLLOWER_OPTIONS} selected={minFollowers} onChange={setMinFollowers} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-bright">Min engagement?</h3>
            <SingleSelect options={ENGAGEMENT_OPTIONS} selected={minEngagement} onChange={setMinEngagement} />
          </div>
        </div>
      </div>

      {/* Scan button */}
      <button
        onClick={handleScan}
        disabled={scanning}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-emerald-400 text-ink font-bold text-sm active:scale-[0.98] transition-all duration-200 disabled:opacity-50 mb-4 shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:brightness-110"
      >
        {scanning ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3 h-3 border-2 border-ink border-t-transparent rounded-full animate-spin" />
            Scanning X / Twitter...
          </span>
        ) : (
          `🔍 Scan X / Twitter ${topics.length > 0 ? `(${topics.length} topics)` : ''}`
        )}
      </button>

      {/* Results */}
      {results && (
        <div className="space-y-3 fade-in">
          {results.error && (
            <div className="text-center py-4">
              <p className="text-red-400 text-sm">{results.error}</p>
            </div>
          )}

          {results.totalRaw > 0 && (
            <p className="text-[10px] text-muted mb-2">
              Fetched {results.totalRaw} tweets
              {results.afterFilter !== results.totalRaw ? ` · ${results.afterFilter} passed filters` : ''}
              {results.tweets?.length < results.afterFilter ? ` · Top ${results.tweets.length} analyzed by Claude` : ''}
            </p>
          )}

          {results.analysis && (
            <div className="glass-card rounded-xl p-4 mb-3">
              <h3 className="text-xs font-bold text-accent mb-2">🤖 Signal Analysis</h3>
              <div className="text-xs text-bright leading-relaxed whitespace-pre-wrap">
                {results.analysis}
              </div>
            </div>
          )}

          {results.tweets?.length > 0 ? (
            <>
              <p className="text-[10px] uppercase tracking-wider text-muted font-medium">
                {results.tweets.length} tweets
              </p>
              <div className="grid grid-cols-1 gap-2">
                {results.tweets.map((t) => (
                  <TweetCard key={t.id} tweet={t} addFavorite={addFavorite} isFavorited={isFavorited} />
                ))}
              </div>
            </>
          ) : !results.error ? (
            <div className="text-center py-8">
              <p className="text-muted text-sm">No tweets found. Try different topics or lower the filters.</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
