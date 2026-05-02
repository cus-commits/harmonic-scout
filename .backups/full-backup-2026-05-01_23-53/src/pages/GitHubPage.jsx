import FindSimilar from '../components/FindSimilar';
import { CrmButton } from '../components/CrmButton';
import React, { useState } from 'react';

const SECTOR_OPTIONS = [
  'Betting / Gambling', 'Social Betting', 'Prediction Markets', 'DeFi / DEX',
  'Exchange / Marketplace', 'Options / Derivatives', 'Stablecoins',
  'Bridge / Cross-chain', 'NFT / Digital Assets', 'Social / Messaging', 'Gaming',
  'Payments', 'Wallet / Account', 'Oracle', 'Indexer / Data',
  'RPC / Infrastructure', 'Rollup / L2', 'SDK / Developer Tools',
  'DAO / Governance', 'Identity / Auth', 'Lending / Borrowing',
  'Yield / Staking', 'Privacy', 'AI / ML',
];

const CHAIN_OPTIONS = [
  'Any Chain', 'Solana', 'Ethereum', 'Base', 'Arbitrum', 'Optimism', 'Polygon', 'Cosmos', 'Sui', 'Aptos', 'Bitcoin',
];

const AGE_OPTIONS = [
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 3 months', value: 90 },
  { label: 'Last 6 months', value: 180 },
  { label: 'Last year', value: 365 },
];

const SIZE_OPTIONS = [
  { label: '0-5 stars', value: '0..5' },
  { label: '5-25 stars', value: '5..25' },
  { label: '25-100 stars', value: '25..100' },
  { label: '100-500 stars', value: '100..500' },
  { label: '500-2K stars', value: '500..2000' },
  { label: '2K+ stars', value: '2000..500000' },
  { label: 'Any size', value: '' },
];

function buildQueries(sectors, chains, age, sizes, customKeywords) {
  const queries = [];
  const dateStr = new Date(Date.now() - age * 86400000).toISOString().slice(0, 10);
  
  // Build star filter from selected sizes (take the full range)
  let starsFilter = '';
  if (sizes.length > 0 && !sizes.includes('')) {
    let minStars = Infinity, maxStars = 0;
    for (const s of sizes) {
      const parts = s.split('..');
      if (parts.length === 2) {
        minStars = Math.min(minStars, parseInt(parts[0]) || 0);
        maxStars = Math.max(maxStars, parseInt(parts[1]) || 500000);
      }
    }
    if (minStars < Infinity) starsFilter = ` stars:${minStars}..${maxStars}`;
  }

  const base = `pushed:>${dateStr}${starsFilter}`;
  const chainTerms = chains.filter((c) => c !== 'Any Chain').map((c) => c.toLowerCase());

  // Map sectors to short, effective search terms (GitHub treats spaces as AND)
  const sectorKeywords = {
    'Betting / Gambling': ['betting crypto', 'onchain gambling', 'sportsbook web3'],
    'Social Betting': ['social betting', 'parlay crypto'],
    'Prediction Markets': ['prediction market', 'polymarket'],
    'DeFi / DEX': ['defi protocol', 'dex swap', 'amm liquidity'],
    'Exchange / Marketplace': ['crypto exchange', 'orderbook dex'],
    'Options / Derivatives': ['options protocol crypto', 'perpetual dex'],
    'Stablecoins': ['stablecoin protocol'],
    'Bridge / Cross-chain': ['bridge cross-chain', 'interop relay'],
    'NFT / Digital Assets': ['nft marketplace', 'digital collectibles'],
    'Social / Messaging': ['social crypto', 'web3 social'],
    'Gaming': ['web3 game', 'onchain gaming'],
    'Payments': ['crypto payments', 'web3 pay'],
    'Wallet / Account': ['crypto wallet', 'account abstraction'],
    'Oracle': ['oracle blockchain', 'price feed'],
    'Indexer / Data': ['blockchain indexer', 'onchain data'],
    'RPC / Infrastructure': ['rpc node', 'blockchain infra'],
    'Rollup / L2': ['rollup layer2', 'l2 chain'],
    'SDK / Developer Tools': ['web3 sdk', 'blockchain developer'],
    'DAO / Governance': ['dao governance', 'onchain voting'],
    'Identity / Auth': ['did identity', 'web3 auth'],
    'Lending / Borrowing': ['lending protocol', 'borrow crypto'],
    'Yield / Staking': ['yield farming', 'staking protocol'],
    'Privacy': ['privacy blockchain', 'zero knowledge'],
    'AI / ML': ['ai crypto', 'ml blockchain', 'ai agent web3'],
  };

  // Strategy 1: sector queries without chain (broader results)
  for (const sector of sectors) {
    const terms = sectorKeywords[sector] || [sector.toLowerCase().replace(/\//g, ' ')];
    queries.push(`${terms[0]} ${base}`);
    // Add second keyword variant for more coverage
    if (terms.length > 1) queries.push(`${terms[1]} ${base}`);
  }

  // Strategy 2: chain-specific queries (top sectors × chains)
  if (chainTerms.length > 0 && sectors.length > 0) {
    for (const chain of chainTerms.slice(0, 4)) {
      for (const sector of sectors.slice(0, 3)) {
        const terms = sectorKeywords[sector] || [sector.toLowerCase()];
        const shortTerm = terms[0].split(' ')[0];
        queries.push(`${shortTerm} ${chain} ${base}`);
      }
    }
  }

  // Add custom keywords
  if (customKeywords.trim()) {
    customKeywords.split(',').map((k) => k.trim()).filter(Boolean).forEach((kw) => {
      queries.push(`${kw} ${base}`);
    });
  }

  // Dedupe and cap at 15
  const seen = new Set();
  return queries.filter((q) => {
    if (seen.has(q)) return false;
    seen.add(q);
    return true;
  }).slice(0, 15);
}

function timeSince(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now - d) / 86400000);
  if (days < 1) return 'today';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function MultiSelect({ options, selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const label = typeof opt === 'string' ? opt : opt.label;
        const active = selected.includes(label);
        return (
          <button
            key={label}
            onClick={() => onChange(active ? selected.filter((s) => s !== label) : [...selected, label])}
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

function RepoCard({ repo, addFavorite, isFavorited }) {
  const signalColors = {
    HIGH: 'bg-green-500/15 text-green-400 border-green-500/30',
    MEDIUM: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    LOW: 'bg-red-500/10 text-red-400/60 border-red-500/20',
  };
  const signalEmoji = { HIGH: '🟢', MEDIUM: '🟡', LOW: '🔴' };
  const sig = repo.signal || 'LOW';

  return (
    <div className={`rounded-xl border p-3.5 space-y-2 fade-in ${sig === 'HIGH' ? 'border-green-500/40 bg-green-500/5' : sig === 'MEDIUM' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border/40 bg-surface/60'}`}>
      <div className="flex items-start gap-3">
        {repo.owner_avatar && (
          <img src={repo.owner_avatar} alt="" className="w-8 h-8 rounded-lg flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <a href={repo.url} target="_blank" rel="noopener" className="font-bold text-accent text-sm hover:underline truncate block">
              {repo.name}
            </a>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${signalColors[sig]}`}>
              {signalEmoji[sig]} {sig}
            </span>
          </div>
          <span className="text-[10px] text-muted">{repo.owner} · {repo.owner_type}</span>
        </div>
        {addFavorite && (
          <button onClick={() => { const s = isFavorited && isFavorited(repo.name); if (!s) addFavorite({ name: repo.name, description: repo.description, website: repo.url }); }}
            className={`flex-shrink-0 text-base ${isFavorited && isFavorited(repo.name) ? 'text-sky-400' : 'text-muted/40 hover:text-sky-400'}`}>
            {isFavorited && isFavorited(repo.name) ? '★' : '☆'}
          </button>
        )}
      </div>

      {repo.description && (
        <p className="text-muted text-xs leading-relaxed">{repo.description}</p>
      )}

      {/* Links */}
      <div className="flex flex-wrap gap-2">
        <a href={repo.url} target="_blank" rel="noopener" className="text-[10px] text-accent hover:underline flex items-center gap-1">
          📂 GitHub
        </a>
        {repo.homepage && (
          <a href={repo.homepage.startsWith('http') ? repo.homepage : `https://${repo.homepage}`} target="_blank" rel="noopener" className="text-[10px] text-accent hover:underline flex items-center gap-1">
            🌐 {repo.homepage.replace(/^https?:\/\//, '').slice(0, 35)}
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {repo.language && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-blue-500/15 text-blue-400 border-blue-500/25">
            {repo.language}
          </span>
        )}
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-amber-500/15 text-amber-400 border-amber-500/25">
          ⭐ {repo.stars}
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-surface border-border/40 text-muted">
          🍴 {repo.forks}
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-surface border-border/40 text-muted">
          updated {timeSince(repo.pushed_at)}
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-surface border-border/40 text-muted">
          created {timeSince(repo.created_at)}
        </span>
      </div>

      {repo.topics?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {repo.topics.map((t) => (
            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent/70">{t}</span>
          ))}
        </div>
      )}

      {repo.harmonic && (
        <div className="mt-1 p-2.5 rounded-lg bg-accent/5 border border-accent/20">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold text-accent">📊 Harmonic Data</span>
            {repo.harmonic.stage && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/25 font-medium">{repo.harmonic.stage}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted">
            {repo.harmonic.name && <span>🏢 {repo.harmonic.name}</span>}
            {repo.harmonic.fundingTotal ? <span className="text-amber-400 font-medium">💰 ${(repo.harmonic.fundingTotal / 1e6).toFixed(1)}M raised</span> : <span className="text-green-400">💰 No funding found</span>}
            {repo.harmonic.lastRound && <span>📋 {repo.harmonic.lastRound}{repo.harmonic.lastRoundDate ? ` (${repo.harmonic.lastRoundDate.slice(0, 7)})` : ''}</span>}
            {repo.harmonic.headcount && <span>👥 ~{repo.harmonic.headcount} people</span>}
            {repo.harmonic.website && (
              <a href={repo.harmonic.website.startsWith('http') ? repo.harmonic.website : `https://${repo.harmonic.website}`} target="_blank" rel="noopener" className="text-accent hover:underline">🌐 {repo.harmonic.website.replace(/^https?:\/\//, '').slice(0, 30)}</a>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        <FindSimilar addFavorite={addFavorite} isFavorited={isFavorited} companyName={repo.harmonic?.name || repo.owner || repo.name} />
        <CrmButton company={{ name: repo.harmonic?.name || repo.name, website: repo.url }} />
      </div>
    </div>
  );
}

export default function GitHubPage({ addFavorite, isFavorited }) {
  const [sectors, setSectors] = useState([]);
  const [chains, setChains] = useState(['Any Chain']);
  const [age, setAge] = useState('Last 6 months');
  const [size, setSize] = useState(['0-5 stars', '5-25 stars', '25-100 stars']);
  const [customKeywords, setCustomKeywords] = useState('');
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);

  // Saved searches
  const STORAGE_KEY = 'github_saved_searches';
  const loadSaved = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
  const [savedSearches, setSavedSearches] = useState(loadSaved);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSaveSearch = () => {
    const name = saveName.trim();
    if (!name) return;
    const search = { name, sectors, chains, age, size, customKeywords, savedAt: Date.now() };
    const updated = [search, ...savedSearches.filter((s) => s.name !== name)].slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSavedSearches(updated);
    setSaveName('');
    setShowSaveInput(false);
  };

  const handleLoadSearch = (search) => {
    setSectors(search.sectors || []);
    setChains(search.chains || ['Any Chain']);
    setAge(search.age || 'Last 6 months');
    setSize(search.size || ['0-5 stars', '5-25 stars', '25-100 stars']);
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
    if (sectors.length === 0 && !customKeywords.trim()) {
      setResults({ repos: [], error: 'Pick at least one sector or add custom keywords.' });
      return;
    }

    setScanning(true);
    setResults(null);

    const ageVal = AGE_OPTIONS.find((a) => a.label === age)?.value || 180;
    const sizeVals = size.map((s) => SIZE_OPTIONS.find((o) => o.label === s)?.value).filter((v) => v !== undefined);
    const queryList = buildQueries(sectors, chains, ageVal, sizeVals, customKeywords);

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';
      const anthropicKey = localStorage.getItem('scout_anthropic_key') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (anthropicKey && anthropicKey !== '__SERVER__') headers['x-anthropic-key'] = anthropicKey;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const res = await fetch(`${API_BASE}/api/signals/github`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ queries: queryList }),
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
      console.error('[GitHub] Error:', err);
      setResults({ repos: [], analysis: null, error: err.message });
    }
    setScanning(false);
  };

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-8 pt-4 pb-24">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-accent" style={{ fontFamily: "'Courier New', monospace" }}>dc</span> GitHub Scanner
        </h1>
        <p className="text-muted text-xs mt-1">Find early-stage teams by what they're building on GitHub</p>
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
                      {s.sectors?.length || 0} sectors · {s.chains?.length || 0} chains · {s.age}
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

      {/* Sector selection */}
      <div className="space-y-4 mb-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-bright">What are you looking for?</h3>
            <button
              onClick={() => setSectors(sectors.length === SECTOR_OPTIONS.length ? [] : [...SECTOR_OPTIONS])}
              className="text-[10px] text-accent hover:underline"
            >
              {sectors.length === SECTOR_OPTIONS.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <p className="text-[11px] text-muted">Pick sectors — we'll search GitHub for repos in these areas</p>
          <MultiSelect options={SECTOR_OPTIONS} selected={sectors} onChange={setSectors} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-bright">Which chains?</h3>
            <button
              onClick={() => setChains(chains.length === CHAIN_OPTIONS.length ? [] : [...CHAIN_OPTIONS])}
              className="text-[10px] text-accent hover:underline"
            >
              {chains.length === CHAIN_OPTIONS.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <MultiSelect options={CHAIN_OPTIONS} selected={chains} onChange={setChains} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-bright">How recent?</h3>
            <SingleSelect options={AGE_OPTIONS} selected={age} onChange={setAge} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-bright">Project size?</h3>
            <MultiSelect options={SIZE_OPTIONS.map(o => o.label)} selected={size} onChange={setSize} />
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-bright">Custom keywords (optional)</h3>
          <input
            type="text"
            value={customKeywords}
            onChange={(e) => setCustomKeywords(e.target.value)}
            placeholder="e.g. pump.fun clone, polymarket, sports book"
            className="w-full bg-ink border border-border/40 rounded-lg px-3 py-2 text-xs text-bright outline-none focus:border-accent/40"
          />
          <p className="text-[10px] text-muted">Comma-separated. These get searched as-is on GitHub.</p>
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
            Scanning GitHub...
          </span>
        ) : (
          `🔍 Scan GitHub ${sectors.length > 0 ? `(${sectors.length} sectors)` : ''}`
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

          {results.queriesUsed && (
            <p className="text-[10px] text-muted">
              Searched {results.queriesUsed.length} queries · {results.repos?.length || 0} repos found
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

          {results.repos?.length > 0 && (
            <div className="grid grid-cols-1 gap-2">
              {results.repos.map((r) => (
                <RepoCard key={r.name} repo={r} addFavorite={addFavorite} isFavorited={isFavorited} />
              ))}
            </div>
          )}

          {results.repos?.length === 0 && !results.error && (
            <div className="text-center py-8">
              <p className="text-muted text-sm">No repos found. Try different sectors or keywords.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
