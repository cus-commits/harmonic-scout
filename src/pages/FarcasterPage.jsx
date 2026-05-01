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

const CHANNEL_OPTIONS = [
  'founders', 'base', 'ethereum', 'solana-dev', 'defi',
  'farcaster', 'optimism', 'arbitrum', 'crypto', 'startups',
];

const TIME_OPTIONS = [
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
];

const FOLLOWER_OPTIONS = [
  { label: 'Any size', value: 0 },
  { label: '100+ followers', value: 100 },
  { label: '500+ followers', value: 500 },
  { label: '1K+ followers', value: 1000 },
];

const ENGAGEMENT_OPTIONS = [
  { label: 'Any engagement', value: 0 },
  { label: '3+ likes', value: 3 },
  { label: '10+ likes', value: 10 },
  { label: '20+ likes', value: 20 },
  { label: '50+ likes', value: 50 },
];

function buildKeywords(topics) {
  // If all or most topics selected, don't filter — show everything
  if (topics.length >= TOPIC_OPTIONS.length - 2) return [];

  const keywordMap = {
    'Building / Launching': ['building', 'just launched', 'shipping'],
    'Raising / Fundraising': ['pre-seed', 'raising', 'looking for investors', 'seed round'],
    'Hiring / Team': ['hiring', 'looking for cofounder', 'founding engineer'],
    'Testnet / Devnet': ['testnet', 'devnet live', 'testnet launch'],
    'Mainnet Launch': ['mainnet', 'deployed mainnet', 'live on mainnet'],
    'New Protocol': ['new protocol', 'protocol launch', 'introducing'],
    'DeFi': ['defi', 'liquidity', 'yield', 'amm', 'swap'],
    'Betting / Gambling': ['betting', 'wagering', 'gambling', 'casino', 'sportsbook'],
    'Social Betting': ['social betting', 'parlay', 'picks', 'prop bet'],
    'Prediction Markets': ['prediction market', 'polymarket', 'forecasting', 'binary outcome'],
    'Gaming': ['onchain gaming', 'web3 game', 'gaming', 'play to earn'],
    'NFT / Collectibles': ['nft', 'collectibles', 'digital art', 'mint'],
    'Social / Consumer': ['social app', 'consumer crypto', 'social protocol', 'social fi'],
    'Infrastructure': ['infra', 'rpc', 'indexer', 'sequencer', 'rollup'],
    'Bridge / Cross-chain': ['bridge', 'cross-chain', 'interop', 'relay'],
    'AI + Crypto': ['ai agent', 'ai crypto', 'machine learning', 'llm'],
    'DAO': ['dao', 'governance', 'onchain governance', 'voting'],
    'Exchange / Marketplace': ['exchange', 'marketplace', 'dex', 'orderbook', 'trading'],
    'Options / Derivatives': ['options', 'derivatives', 'perpetual', 'futures', 'perps'],
    'Stablecoins': ['stablecoin', 'usdc', 'usdt', 'pegged', 'dollar'],
  };

  const keywords = [];
  for (const topic of topics) {
    const mapped = keywordMap[topic] || [topic.toLowerCase()];
    keywords.push(...mapped);
  }
  // Dedupe
  return [...new Set(keywords)].slice(0, 8);
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

function CastCard({ cast, addFavorite, isFavorited }) {
  const signalColors = {
    HIGH: 'bg-sm/15 text-sm border-sm/30',
    MEDIUM: 'bg-accent/15 text-accent border-accent/30',
    LOW: 'bg-rose/10 text-rose/60 border-rose/20',
  };
  const signalEmoji = { HIGH: '🟢', MEDIUM: '🟡', LOW: '🔴' };
  const sig = cast.signal || 'LOW';

  return (
    <div className={`rounded-xl border p-3.5 space-y-2 fade-in ${sig === 'HIGH' ? 'border-sm/40 bg-sm/5' : sig === 'MEDIUM' ? 'border-accent/30 bg-accent/5' : 'border-border/40 bg-surface/60'}`}>
      <div className="flex items-start gap-3">
        {cast.pfp && (
          <img src={cast.pfp} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-bright text-sm">{cast.author}</span>
            <span className="text-[10px] text-muted">@{cast.username}</span>
            {cast.channel && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-boro/15 text-boro border border-boro/25">
                /{cast.channel}
              </span>
            )}
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${signalColors[sig]}`}>
              {signalEmoji[sig]} {sig}
            </span>
          </div>
          <span className="text-[10px] text-bright/40">{cast.followers.toLocaleString()} followers · {timeSince(cast.timestamp)}</span>
        </div>
        {addFavorite && (
          <button onClick={() => { const cn = cast.companyName || cast.author; const s = isFavorited && isFavorited(cn); if (!s) addFavorite({ name: cn, description: cast.text?.slice(0, 200), website: cast.url }); }}
            className={`flex-shrink-0 text-base ${isFavorited && isFavorited(cast.companyName || cast.author) ? 'text-bo' : 'text-muted/40 hover:text-bo'}`}>
            {isFavorited && isFavorited(cast.companyName || cast.author) ? '★' : '☆'}
          </button>
        )}
      </div>

      <p className="text-xs text-bright leading-relaxed whitespace-pre-wrap">{cast.text}</p>

      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-surface border-border/40 text-muted">
          ❤️ {cast.likes}
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-surface border-border/40 text-muted">
          🔁 {cast.recasts}
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-surface border-border/40 text-muted">
          💬 {cast.replies}
        </span>
      </div>

      {cast.embeds?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {cast.embeds.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener" className="text-[10px] text-accent hover:underline truncate max-w-[250px]">
              🔗 {url.replace(/^https?:\/\//, '').slice(0, 40)}
            </a>
          ))}
        </div>
      )}

      {cast.harmonic && (
        <div className="mt-1 p-2.5 rounded-lg bg-accent/5 border border-accent/20">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold text-accent">📊 Harmonic Data</span>
            {cast.harmonic.stage && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/25 font-medium">{cast.harmonic.stage}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted">
            {cast.harmonic.name && <span>🏢 {cast.harmonic.name}</span>}
            {cast.harmonic.fundingTotal ? <span className="text-accent font-medium">💰 ${(cast.harmonic.fundingTotal / 1e6).toFixed(1)}M raised</span> : <span className="text-sm">💰 No funding found</span>}
            {cast.harmonic.lastRound && <span>📋 {cast.harmonic.lastRound}{cast.harmonic.lastRoundDate ? ` (${cast.harmonic.lastRoundDate.slice(0, 7)})` : ''}</span>}
            {cast.harmonic.headcount && <span>👥 ~{cast.harmonic.headcount} people</span>}
            {cast.harmonic.website && (
              <a href={cast.harmonic.website.startsWith('http') ? cast.harmonic.website : `https://${cast.harmonic.website}`} target="_blank" rel="noopener" className="text-accent hover:underline">🌐 {cast.harmonic.website.replace(/^https?:\/\//, '').slice(0, 30)}</a>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        <FindSimilar addFavorite={addFavorite} isFavorited={isFavorited} companyName={cast.companyName || cast.harmonic?.name || cast.author} />
        <CrmButton company={{ name: cast.companyName || cast.author, website: cast.url }} />
      </div>
    </div>
  );
}

export default function FarcasterPage({ addFavorite, isFavorited }) {
  const [topics, setTopics] = useState([]);
  const [channels, setChannels] = useState(['founders']);
  const [minFollowers, setMinFollowers] = useState('Any size');
  const [minEngagement, setMinEngagement] = useState('Any engagement');
  const [customKeywords, setCustomKeywords] = useState('');
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);

  // Saved searches
  const STORAGE_KEY = 'farcaster_saved_searches';
  const loadSaved = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
  const [savedSearches, setSavedSearches] = useState(loadSaved);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSaveSearch = () => {
    const name = saveName.trim();
    if (!name) return;
    const search = { name, topics, channels, minFollowers, minEngagement, customKeywords, savedAt: Date.now() };
    const updated = [search, ...savedSearches.filter((s) => s.name !== name)].slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSavedSearches(updated);
    setSaveName('');
    setShowSaveInput(false);
  };

  const handleLoadSearch = (search) => {
    setTopics(search.topics || []);
    setChannels(search.channels || ['founders']);
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
    if (topics.length === 0 && channels.length === 0 && !customKeywords.trim()) {
      setResults({ casts: [], error: 'Pick at least one topic, channel, or add custom keywords.' });
      return;
    }

    setScanning(true);
    setResults(null);

    const kwList = buildKeywords(topics);
    // Add custom keywords
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

      const res = await fetch(`${API_BASE}/api/signals/farcaster`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          keywords: kwList.slice(0, 8),
          channels,
          minFollowers: FOLLOWER_OPTIONS.find((o) => o.label === minFollowers)?.value || 0,
          minEngagement: ENGAGEMENT_OPTIONS.find((o) => o.label === minEngagement)?.value || 0,
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
      console.error('[Farcaster] Error:', err);
      setResults({ casts: [], analysis: null, error: err.message });
    }
    setScanning(false);
  };

  return (
    <div className="min-h-screen max-w-[1080px] mx-auto px-7 pt-6 pb-28 fade-in">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="font-serif italic font-semibold text-accent">dc</span> Farcaster Scanner
        </h1>
        <p className="text-muted text-xs mt-1">Find founders and builders posting in crypto-native social</p>
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
                      {s.topics?.length || 0} topics · {s.channels?.length || 0} channels
                      {s.customKeywords ? ' · +keywords' : ''}
                    </span>
                  </div>
                  <span
                    onClick={(e) => handleDeleteSearch(s.name, e)}
                    className="text-muted hover:text-rose opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-sm flex-shrink-0"
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
            <h3 className="text-sm font-bold text-bright">What signals are you looking for?</h3>
            <button
              onClick={() => setTopics(topics.length === TOPIC_OPTIONS.length ? [] : [...TOPIC_OPTIONS])}
              className="text-[10px] text-accent hover:underline"
            >
              {topics.length === TOPIC_OPTIONS.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <p className="text-[11px] text-muted">Pick topics — we'll search for posts about these</p>
          <MultiSelect options={TOPIC_OPTIONS} selected={topics} onChange={setTopics} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-bright">Which channels to monitor?</h3>
            <button
              onClick={() => setChannels(channels.length === CHANNEL_OPTIONS.length ? [] : [...CHANNEL_OPTIONS])}
              className="text-[10px] text-accent hover:underline"
            >
              {channels.length === CHANNEL_OPTIONS.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <p className="text-[11px] text-muted">Farcaster channels where founders hang out</p>
          <MultiSelect options={CHANNEL_OPTIONS} selected={channels} onChange={setChannels} />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-bright">Custom keywords (optional)</h3>
          <input
            type="text"
            value={customKeywords}
            onChange={(e) => setCustomKeywords(e.target.value)}
            placeholder="e.g. pump.fun, polymarket clone, sports betting app"
            className="w-full bg-ink border border-border/40 rounded-lg px-3 py-2 text-xs text-bright outline-none focus:border-accent/40"
          />
          <p className="text-[10px] text-muted">Comma-separated. These get searched directly on Farcaster.</p>
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
        className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-sm text-ink font-bold text-sm active:scale-[0.98] transition-all duration-200 disabled:opacity-50 mb-4 shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:brightness-110"
      >
        {scanning ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3 h-3 border-2 border-ink border-t-transparent rounded-full animate-spin" />
            Scanning Farcaster...
          </span>
        ) : (
          `🔍 Scan Farcaster ${topics.length > 0 ? `(${topics.length} topics)` : ''}`
        )}
      </button>

      {/* Results */}
      {results && (
        <div className="space-y-3 fade-in">
          {results.error && (
            <div className="text-center py-4">
              <p className="text-rose text-sm">{results.error}</p>
            </div>
          )}

          {results.totalRaw > 0 && (
            <p className="text-[10px] text-muted mb-2">
              Fetched {results.totalRaw} casts from {results.channelsUsed?.length || 0} channels
              {results.afterFilter !== results.totalRaw ? ` · ${results.afterFilter} passed filters` : ''}
              {results.casts?.length < results.afterFilter ? ` · Top ${results.casts.length} analyzed by Claude` : ''}
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

          {results.casts?.length > 0 ? (
            <>
              <p className="text-[10px] uppercase tracking-wider text-muted font-medium">
                {results.casts.length} posts
              </p>
              <div className="grid grid-cols-1 gap-2">
                {results.casts.map((c) => (
                  <CastCard key={c.hash} cast={c} addFavorite={addFavorite} isFavorited={isFavorited} />
                ))}
              </div>
            </>
          ) : !results.error ? (
            <div className="text-center py-8">
              <p className="text-muted text-sm">No posts found. Try different topics, channels, or lower the filters.</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
