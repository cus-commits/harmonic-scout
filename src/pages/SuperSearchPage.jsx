import React, { useState, useEffect } from 'react';
import HarmonicSavedSearches from '../components/HarmonicSavedSearches';
import HarmonicSearchBar from '../components/HarmonicSearchBar';
import FindSimilar from '../components/FindSimilar';
import { CrmButton } from '../components/CrmButton';
import { useScan } from '../components/ScanContext';

function SuperElapsed({ startTime }) {
  const [, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(v => v+1), 1000); return () => clearInterval(t); }, []);
  const s = Math.floor((Date.now() - startTime) / 1000);
  return <span className="text-[10px] text-muted/40 font-mono">{Math.floor(s/60)}:{String(s%60).padStart(2,'0')}</span>;
}

const SECTOR_OPTIONS = [
  'DeFi', 'Betting / Gambling', 'Social Betting', 'Prediction Markets',
  'Gaming', 'NFT / Collectibles', 'Social / Consumer', 'Infrastructure',
  'Bridge / Cross-chain', 'AI + Crypto', 'DAO / Governance',
  'Exchange / Marketplace', 'Options / Derivatives', 'Stablecoins',
  'Payments', 'Wallet / Account', 'Lending / Borrowing', 'Yield / Staking',
  'Privacy', 'RWA / Tokenization', 'Identity / Auth', 'SDK / Developer Tools',
];

const CHAIN_OPTIONS = [
  'Any Chain', 'Solana', 'Ethereum', 'Base', 'Arbitrum', 'Optimism',
  'Polygon', 'Cosmos', 'Sui', 'Aptos', 'Bitcoin', 'Avalanche', 'TON',
];

const SOURCE_OPTIONS = [
  { key: 'twitter', label: 'X / Twitter', emoji: '𝕏' },
  { key: 'farcaster', label: 'Farcaster', emoji: '🟪' },
  { key: 'github', label: 'GitHub', emoji: '🐙' },
  { key: 'producthunt', label: 'Product Hunt', emoji: '🐱' },
  { key: 'harmonic', label: 'Harmonic', emoji: '🔮' },
];

const ALL_SOURCE_KEYS = SOURCE_OPTIONS.map(s => s.key);

const TIME_OPTIONS = [
  { label: '24h', value: 'day' },
  { label: '7d', value: 'week' },
  { label: '30d', value: 'month' },
  { label: '90d', value: 'quarter' },
];

const FOLLOWER_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '100+', value: 100 },
  { label: '500+', value: 500 },
  { label: '1K+', value: 1000 },
  { label: '5K+', value: 5000 },
];

const ENGAGEMENT_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '3+', value: 3 },
  { label: '10+', value: 10 },
  { label: '25+', value: 25 },
];

const STAGE_OPTIONS = [
  'Any stage', 'No raise / Bootstrapped', 'Pre-Seed', 'Seed',
  'Series A', 'Series B+',
];

function Chip({ label, active, onClick, small, emoji }) {
  const base = small ? 'text-[10px] px-2 py-1' : 'text-[11px] px-2.5 py-1.5';
  return (
    <button
      onClick={onClick}
      className={`${base} rounded-lg border font-medium transition-all duration-150 ${
        active
          ? 'bg-bo/12 border-bo/35 text-bo shadow-none'
          : 'bg-surface/40 border-border/25 text-muted/80 hover:border-border/50 hover:text-muted'
      }`}
    >
      {emoji ? `${emoji} ` : ''}{label}
    </button>
  );
}

function MultiSelect({ options, selected, onChange, small }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => {
        const label = typeof opt === 'string' ? opt : opt.label;
        const val = typeof opt === 'string' ? opt : (opt.key || opt.value || opt.label);
        const active = selected.includes(val);
        return (
          <Chip key={label} label={label} emoji={opt.emoji} active={active} small={small}
            onClick={() => onChange(active ? selected.filter(s => s !== val) : [...selected, val])} />
        );
      })}
    </div>
  );
}

function SingleSelect({ options, selected, onChange, small }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => {
        const label = typeof opt === 'string' ? opt : opt.label;
        const val = typeof opt === 'string' ? opt : (opt.value || opt.label);
        return (
          <Chip key={label} label={label} active={selected === val} small={small} onClick={() => onChange(val)} />
        );
      })}
    </div>
  );
}

const sourceIcons = { twitter: '𝕏', farcaster: '🟪', github: '🐙', producthunt: '🐱', harmonic: '🔮' };

const sourceColors = {
  twitter: 'bg-bright/8 text-bright/90 border-border/15',
  farcaster: 'bg-boro/12 text-boro border-boro/25',
  github: 'bg-muted/12 text-muted border-muted/25',
  producthunt: 'bg-accent/12 text-accent border-accent/25',
  harmonic: 'bg-accent/12 text-accent border-accent/25',
};

const signalStyles = {
  HIGH: { card: 'border-sm/25 shadow-[0_0_12px_rgba(16,185,129,0.06)]', badge: 'bg-sm/12 text-sm border-sm/25', dot: '🟢' },
  MEDIUM: { card: 'border-accent/20 shadow-[0_0_10px_rgba(245,158,11,0.04)]', badge: 'bg-accent/12 text-accent border-accent/25', dot: '🟡' },
  LOW: { card: 'border-border/15', badge: 'bg-rose/8 text-rose/65 border-rose/15', dot: '🔴' },
};

function SignalCard({ signal, addFavorite, isFavorited }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const sig = signal.signal || 'LOW';
  const style = signalStyles[sig] || signalStyles.LOW;
  const companyName = signal.companyName || signal.title || '';
  const saved = isFavorited && isFavorited(companyName);
  const webUrl = signal.url || signal.meta?.website || '';
  const crmUser = typeof window !== 'undefined' ? localStorage.getItem('crm_user') || '' : '';
  const API_BASE = import.meta.env?.VITE_API_URL || 'https://pigeon-api.up.railway.app';

  const handleHide = () => { setHidden(true); setMenuOpen(false); try { fetch(`${API_BASE}/api/vetting/hide`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ companyName, personId: crmUser }) }); } catch(e){} };
  const handleBackburn = () => { setHidden(true); setMenuOpen(false); try { fetch(`${API_BASE}/api/vetting/backburn`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ companyName, personId: crmUser }) }); } catch(e){} };

  if (hidden) return null;

  return (
    <div className={`bg-surface/50 backdrop-blur-sm border rounded-xl p-3.5 space-y-2.5 transition-all ${style.card}`}>
      <div className="flex items-start gap-3">
        {signal.pfp && (
          <img src={signal.pfp} alt="" className="w-10 h-10 rounded-lg bg-ink/60 flex-shrink-0 shadow-md" onError={(e) => { e.target.style.display = 'none'; }} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold tracking-wide ${sourceColors[signal.source]}`}>
              {sourceIcons[signal.source]} {signal.source === 'producthunt' ? 'PH' : signal.source.toUpperCase()}
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${style.badge}`}>
              {style.dot} {sig}
            </span>
            {signal.companyName && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-bo/8 text-bo border border-bo/20 font-medium">
                {signal.companyName}
              </span>
            )}
          </div>
          <p className="text-[13px] font-semibold text-bright leading-snug">{signal.title}</p>
          <p className="text-[11px] text-muted/70">{signal.subtitle}</p>
        </div>
        {/* Favorite + X menu */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {addFavorite && (
            <button onClick={() => !saved && addFavorite({ name: companyName, description: signal.text?.slice(0, 200), website: webUrl })}
              className={`text-base ${saved ? 'text-bo' : 'text-muted/40 hover:text-bo'}`}>
              {saved ? '★' : '☆'}
            </button>
          )}
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="text-muted/40 hover:text-rose transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute top-full right-0 mt-1 z-50 bg-card border border-border/30 rounded-lg shadow-xl py-1 min-w-[140px]">
                  <button onClick={handleHide} className="w-full text-left px-3 py-2 text-[11px] text-muted/60 hover:text-bright hover:bg-bright/5 transition-colors">👁‍🗨 Hide for me</button>
                  <button onClick={handleBackburn} className="w-full text-left px-3 py-2 text-[11px] text-rose/70 hover:text-rose hover:bg-rose/5 transition-colors border-t border-border/10">🔥 Backburn</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <p className="text-xs text-bright/75 leading-relaxed whitespace-pre-wrap">{signal.text}</p>
      <div className="flex items-center gap-3 text-[10px] text-muted/60 flex-wrap">
        {signal.followers > 0 && <span>👥 {signal.followers >= 1000 ? `${(signal.followers / 1000).toFixed(1)}K` : signal.followers}</span>}
        {signal.likes > 0 && <span>❤️ {signal.likes}</span>}
        {signal.meta?.retweets > 0 && <span>🔁 {signal.meta.retweets}</span>}
        {signal.meta?.recasts > 0 && <span>🔁 {signal.meta.recasts}</span>}
        {signal.meta?.stars > 0 && <span>⭐ {signal.meta.stars}</span>}
        {signal.meta?.forks > 0 && <span>🍴 {signal.meta.forks}</span>}
        {signal.meta?.funding > 0 && <span>💰 ${(signal.meta.funding / 1e6).toFixed(1)}M</span>}
        {signal.meta?.headcount > 0 && <span>🧑‍💻 {signal.meta.headcount}</span>}
        {signal.meta?.language && <span className="font-mono">{signal.meta.language}</span>}
        {signal.meta?.upvotes > 0 && <span>⬆️ {signal.meta.upvotes}</span>}
        {signal.meta?.comments > 0 && <span>💬 {signal.meta.comments}</span>}
        {signal.meta?.makers && <span>👤 {signal.meta.makers}</span>}
        {signal.meta?.founders && <span>👤 {signal.meta.founders}</span>}
        {signal.meta?.webGrowth && <span className={signal.meta.webGrowth > 0 ? 'text-sm/80' : 'text-rose/65'}>🌐 {signal.meta.webGrowth > 0 ? '+' : ''}{signal.meta.webGrowth}%</span>}
        {signal.meta?.hcGrowth && <span className={signal.meta.hcGrowth > 0 ? 'text-sm/80' : 'text-rose/65'}>📈 HC {signal.meta.hcGrowth > 0 ? '+' : ''}{signal.meta.hcGrowth}%</span>}
        {signal.meta?.engGrowth && <span className={signal.meta.engGrowth > 0 ? 'text-sm/80' : 'text-rose/65'}>⚙️ Eng {signal.meta.engGrowth > 0 ? '+' : ''}{signal.meta.engGrowth}%</span>}
        {signal.timestamp && <span className="ml-auto text-bright/40">{timeSince(signal.timestamp)}</span>}
      </div>
      <div className="flex items-center gap-2">
        {signal.url && (
          <a href={signal.url} target="_blank" rel="noopener" className="text-[10px] text-bo/70 hover:text-bo hover:underline truncate transition-colors">
            ↗ {signal.url.replace(/^https?:\/\//, '').slice(0, 45)}
          </a>
        )}
        {(signal.companyName || signal.source === 'harmonic') && <div className="flex items-center gap-1.5 flex-wrap">{signal.source === 'harmonic' && signal.id && <a href={`/company/${signal.id.replace('hm-','')}`} className="h-pill" title="Company Card">H</a>}<FindSimilar addFavorite={addFavorite} isFavorited={isFavorited} companyId={signal.id?.replace('hm-','')} companyName={signal.companyName || signal.title} /><CrmButton company={{ name: signal.companyName || signal.title, website: signal.url }} /></div>}
      </div>
    </div>
  );
}

function timeSince(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const mins = Math.floor((now - d) / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

function SectionHeader({ title, subtitle, onToggleAll, allSelected }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-xs font-bold text-bright/90 uppercase tracking-wider">{title}</h3>
        {subtitle && <p className="text-[10px] text-muted/50 mt-0.5">{subtitle}</p>}
      </div>
      {onToggleAll && (
        <button onClick={onToggleAll} className="text-[10px] text-bo/70 hover:text-bo transition-colors">
          {allSelected ? 'Clear' : 'All'}
        </button>
      )}
    </div>
  );
}

function FilterPill({ label, active, onClick, color }) {
  return (
    <button onClick={onClick}
      className={`text-[10px] px-2 py-0.5 rounded-full border transition-all duration-150 ${
        active ? (color || 'bg-bo/10 border-bo/30 text-bo') : 'border-border/20 text-muted/40 hover:border-border/35'
      }`}>
      {label}
    </button>
  );
}

export default function SuperSearchPage({ addFavorite, isFavorited }) {
  const [sectors, setSectors] = useState([]);
  const [chains, setChains] = useState([]);
  const [sources, setSources] = useState([...ALL_SOURCE_KEYS]);
  const [timeRange, setTimeRange] = useState('week');
  const [minFollowers, setMinFollowers] = useState(0);
  const [minEngagement, setMinEngagement] = useState(0);
  const [stage, setStage] = useState([]);
  const [customKeywords, setCustomKeywords] = useState('');

  // Use ScanContext for persistence across tab switches
  const { superSearchStatus, superSearchResults, superSearchHistory, runSuperSearch, cancelSuperSearch } = useScan();
  const [showHistory, setShowHistory] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [superTier, setSuperTier] = useState('opus20'); // 'sonnet' | 'opus20' | 'opus80'
  const [showCostConfirm, setShowCostConfirm] = useState(false);
  const [results, setResults] = useState(null);

  // Sync context state to local display state
  const isScanning = superSearchStatus?.status === 'scanning';
  const contextResults = superSearchResults;
  const displayResults = results || contextResults;
  const displayProgress = isScanning ? (superSearchStatus?.progress || 'Scanning...') : '';
  const displayStage = isScanning ? superSearchStatus?.stage : null;
  const displayStartTime = isScanning ? superSearchStatus?.startedAt : null;
  const [filterSource, setFilterSource] = useState('all');
  const [filterSignal, setFilterSignal] = useState('all');

  const STORAGE_KEY = 'super_saved_searches';
  const loadSaved = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
  const [savedSearches, setSavedSearches] = useState(loadSaved);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [activeSearchName, setActiveSearchName] = useState(null); // tracks which saved search is loaded
  const [showOverridePrompt, setShowOverridePrompt] = useState(false);

  const handleSaveSearch = () => {
    // If we have an active loaded search and user clicks Save, ask to override
    if (activeSearchName && !showSaveInput) {
      setShowOverridePrompt(true);
      return;
    }
    const name = saveName.trim();
    if (!name) return;
    const search = { name, sectors, chains, sources, timeRange, minFollowers, minEngagement, stage, customKeywords, savedAt: Date.now() };
    const updated = [search, ...savedSearches.filter(s => s.name !== name)].slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSavedSearches(updated);
    setSaveName('');
    setShowSaveInput(false);
    setActiveSearchName(name);
  };

  const handleOverrideSave = () => {
    const search = { name: activeSearchName, sectors, chains, sources, timeRange, minFollowers, minEngagement, stage, customKeywords, savedAt: Date.now() };
    const updated = [search, ...savedSearches.filter(s => s.name !== activeSearchName)].slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSavedSearches(updated);
    setShowOverridePrompt(false);
  };

  const handleSaveAsNew = () => {
    setShowOverridePrompt(false);
    setSaveName('');
    setShowSaveInput(true);
  };

  const handleLoadSearch = (search) => {
    setSectors(search.sectors || []);
    setChains(search.chains || []);
    setSources(search.sources || [...ALL_SOURCE_KEYS]);
    setTimeRange(search.timeRange || 'week');
    setMinFollowers(search.minFollowers || 0);
    setMinEngagement(search.minEngagement || 0);
    setStage(search.stage || []);
    setCustomKeywords(search.customKeywords || '');
    setShowDropdown(false);
    setActiveSearchName(search.name);
  };

  const handleDeleteSearch = (name, e) => {
    e.stopPropagation();
    const updated = savedSearches.filter(s => s.name !== name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSavedSearches(updated);
  };

  const handleScan = async () => {
    if (sectors.length === 0 && !customKeywords.trim()) {
      setResults({ signals: [], error: 'Pick at least one sector or add custom keywords.' });
      return;
    }
    // Show cost confirmation before starting
    setShowCostConfirm(true);
  };

  const confirmAndScan = async () => {
    setShowCostConfirm(false);
    setFilterSource('all');
    setFilterSignal('all');
    setResults(null);
    
    // Run through ScanContext for tab persistence, include tier
    await runSuperSearch({ sectors, chains, sources, timeRange, minFollowers, minEngagement, stage, customKeywords, superTier });
    
    // After scan completes, prompt to save if not already saved
    setShowSavePrompt(true);
  };

  const filteredSignals = (displayResults?.signals || []).filter(s => {
    if (filterSource !== 'all' && s.source !== filterSource) return false;
    if (filterSignal !== 'all' && s.signal !== filterSignal) return false;
    return true;
  });

  const sourceCounts = {};
  const signalCounts = {};
  for (const s of (displayResults?.signals || [])) {
    sourceCounts[s.source] = (sourceCounts[s.source] || 0) + 1;
    signalCounts[s.signal || 'LOW'] = (signalCounts[s.signal || 'LOW'] || 0) + 1;
  }

  return (
    <div className="min-h-screen max-w-[1080px] mx-auto px-7 pt-6 pb-28 fade-in">
      <div className="mb-5 text-center">
        <h1 className="font-serif text-xl font-semibold text-bright">Super Search</h1>
        <p className="text-muted/50 text-[11px] mt-1 tracking-wide">Unified signal scanner — 5 sources, one sweep</p>
      </div>

      {/* Saved Searches */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <button onClick={() => setShowDropdown(!showDropdown)} className="w-full flex items-center justify-between bg-ink/60 border border-border/25 rounded-lg px-3 py-2 text-xs text-muted/70 hover:border-bo/25 transition-colors">
            <span className="flex items-center gap-1.5">
              <span className="opacity-40">📂</span>
              {activeSearchName ? (
                <span className="text-bo font-medium">{activeSearchName} <span className="text-muted/30">(editing)</span></span>
              ) : (
                savedSearches.length > 0 ? `${savedSearches.length} saved` : 'No saved searches'
              )}
            </span>
            <span className={`transition-transform duration-200 text-[10px] ${showDropdown ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {showDropdown && savedSearches.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border/30 rounded-xl shadow-2xl shadow-black/40 z-20 max-h-60 overflow-y-auto">
              {savedSearches.map(s => (
                <button key={s.name} onClick={() => handleLoadSearch(s)} className={`w-full flex items-center justify-between px-3 py-2.5 text-xs hover:bg-bo/5 transition-colors group border-b border-border/15 last:border-0 ${activeSearchName === s.name ? 'bg-bo/5' : ''}`}>
                  <div className="text-left min-w-0">
                    <span className="text-bright font-medium block truncate">{s.name} {activeSearchName === s.name ? '✓' : ''}</span>
                    <span className="text-muted/40 text-[10px]">{s.sectors?.length || 0} sectors · {s.sources?.length || 0} sources · {s.timeRange}</span>
                  </div>
                  <span onClick={(e) => handleDeleteSearch(s.name, e)} className="text-muted/40 hover:text-rose opacity-0 group-hover:opacity-100 transition-all ml-2 text-sm flex-shrink-0">✕</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {!showSaveInput && !showOverridePrompt ? (
          <button onClick={handleSaveSearch} className="flex-shrink-0 px-3 py-2 rounded-lg border border-bo/20 text-bo/80 text-xs font-medium hover:bg-bo/8 transition-colors">
            {activeSearchName ? 'Update' : 'Save'}
          </button>
        ) : showOverridePrompt ? (
          <div className="flex gap-1.5 flex-shrink-0">
            <button onClick={handleOverrideSave} className="px-2.5 py-2 rounded-lg bg-bo text-bright text-xs font-bold shadow-md shadow-bo/20">Update "{activeSearchName}"</button>
            <button onClick={handleSaveAsNew} className="px-2.5 py-2 rounded-lg border border-border/30 text-muted/60 text-xs">Save as new</button>
            <button onClick={() => setShowOverridePrompt(false)} className="px-2 py-2 rounded-lg border border-border/30 text-muted/40 text-xs">✕</button>
          </div>
        ) : (
          <div className="flex gap-1.5 flex-shrink-0">
            <input type="text" value={saveName} onChange={e => setSaveName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveSearch()} placeholder="Name..." className="w-28 bg-ink/60 border border-border/30 rounded-lg px-2 py-2 text-xs text-bright outline-none focus:border-bo/40" autoFocus />
            <button onClick={handleSaveSearch} className="px-2.5 py-2 rounded-lg bg-bo text-bright text-xs font-bold shadow-md shadow-bo/20">Save</button>
            <button onClick={() => setShowSaveInput(false)} className="px-2 py-2 rounded-lg border border-border/30 text-muted/50 text-xs">✕</button>
          </div>
        )}
      </div>

      {/* Harmonic Search + Company lookup */}
      <div className="mb-4">
        <HarmonicSearchBar addFavorite={addFavorite} isFavorited={isFavorited} />
      </div>

      {/* Filters */}
      <div className="space-y-4 bg-ink/30 border border-border/15 rounded-2xl p-4 mb-4 shadow-inner shadow-black/10">
        <div className="space-y-2">
          <SectionHeader title="Sources" subtitle="Platforms to scan"
            onToggleAll={() => setSources(sources.length === ALL_SOURCE_KEYS.length ? [] : [...ALL_SOURCE_KEYS])}
            allSelected={sources.length === ALL_SOURCE_KEYS.length} />
          <MultiSelect options={SOURCE_OPTIONS} selected={sources} onChange={setSources} />
        </div>
        <div className="border-t border-border/15" />
        <div className="space-y-2">
          <SectionHeader title="Sectors"
            onToggleAll={() => setSectors(sectors.length === SECTOR_OPTIONS.length ? [] : [...SECTOR_OPTIONS])}
            allSelected={sectors.length === SECTOR_OPTIONS.length} />
          <MultiSelect options={SECTOR_OPTIONS} selected={sectors} onChange={setSectors} />
        </div>
        <div className="border-t border-border/15" />
        <div className="space-y-2">
          <SectionHeader title="Chains" subtitle="Filters GitHub repos"
            onToggleAll={() => setChains(chains.length === CHAIN_OPTIONS.length ? [] : [...CHAIN_OPTIONS])}
            allSelected={chains.length === CHAIN_OPTIONS.length} />
          <MultiSelect options={CHAIN_OPTIONS} selected={chains} onChange={setChains} small />
        </div>
        <div className="border-t border-border/15" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <SectionHeader title="Time range" />
            <SingleSelect options={TIME_OPTIONS} selected={timeRange} onChange={setTimeRange} small />
          </div>
          <div className="space-y-2">
            <SectionHeader title="Stage" subtitle="Harmonic filter" />
            <MultiSelect options={STAGE_OPTIONS} selected={stage} onChange={setStage} small />
          </div>
        </div>
        <div className="border-t border-border/15" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <SectionHeader title="Min followers" />
            <SingleSelect options={FOLLOWER_OPTIONS} selected={minFollowers} onChange={setMinFollowers} small />
          </div>
          <div className="space-y-2">
            <SectionHeader title="Min engagement" />
            <SingleSelect options={ENGAGEMENT_OPTIONS} selected={minEngagement} onChange={setMinEngagement} small />
          </div>
        </div>
        <div className="border-t border-border/15" />
        <div className="space-y-2">
          <SectionHeader title="Keywords" subtitle="Comma-separated, searched across all sources" />
          <input type="text" value={customKeywords} onChange={e => setCustomKeywords(e.target.value)}
            placeholder="pump.fun clone, polymarket, restaking..."
            className="w-full bg-ink/50 border border-border/25 rounded-lg px-3 py-2.5 text-xs text-bright outline-none focus:border-bo/35 transition-colors placeholder:text-muted/40" />
        </div>
      </div>

      {/* Harmonic Saved Searches */}
      <div className="mb-4">
        <HarmonicSavedSearches addFavorite={addFavorite} isFavorited={isFavorited} />
        <p className="text-[9px] text-muted/30 mt-1.5 px-1">
          Enriches your search with Harmonic's company database — matches from saved searches get 3x priority for DD picks.
        </p>
      </div>

      {/* Cost Tier Selector */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[9px] text-muted/40 uppercase tracking-wider font-bold">Scoring Tier</span>
        {[
          { id: 'sonnet', label: '💰 Sonnet Only', cost: '~$0.08', desc: 'Fast & cheap — Sonnet screens all signals' },
          { id: 'opus20', label: '⚡ + Opus Top 20', cost: '~$0.40', desc: 'Opus deep-scores top 20 HIGH signals' },
          { id: 'opus80', label: '🧠 + Opus Top 80', cost: '~$1.20', desc: 'Opus deep-scores top 80 signals' },
        ].map(t => (
          <button key={t.id} onClick={() => setSuperTier(t.id)}
            className={`text-[10px] px-3 py-1.5 rounded-lg border transition-all ${
              superTier === t.id ? 'bg-bo/12 border-bo/30 text-bo font-bold' : 'border-border/20 text-muted/40 hover:border-border/40'
            }`} title={t.desc}>
            {t.label} <span className="text-[8px] text-muted/30">{t.cost}</span>
          </button>
        ))}
      </div>

      {/* Cost Confirmation Modal */}
      {showCostConfirm && (() => {
        // Estimate signal count based on sources and sectors
        const estSignalsPerSource = { twitter: 15, farcaster: 12, github: 8, producthunt: 5, harmonic: 20 };
        const estTotalSignals = sources.reduce((sum, s) => sum + (estSignalsPerSource[s] || 10), 0) * Math.max(1, (sectors.length || 1));
        const estForClaude = estTotalSignals; // All signals get batched through Sonnet
        const sonnetCost = estForClaude * 0.001;
        const opusCost = superTier === 'opus80' ? Math.min(estForClaude, 80) * 0.015 : superTier === 'opus20' ? Math.min(estForClaude, 20) * 0.015 : 0;
        const totalEst = sonnetCost + opusCost;
        const isExpensive = totalEst > 4;
        
        return (
          <div className={`mb-4 bg-ink/40 border rounded-xl p-4 space-y-3 ${isExpensive ? 'border-rose/30' : 'border-accent/20'}`}>
            <p className="text-[10px] text-accent/60 uppercase tracking-wider font-bold">Cost Breakdown — Super Search</p>
            {isExpensive && (
              <div className="bg-rose/10 border border-rose/25 rounded-lg px-3 py-2">
                <p className="text-[11px] text-rose font-bold">⚠️ High cost warning</p>
                <p className="text-[10px] text-rose/60 mt-0.5">This search is estimated at ~${totalEst.toFixed(2)} due to {sectors.length} sectors × {sources.length} sources. Consider reducing sectors or switching to Sonnet-only tier.</p>
              </div>
            )}
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between text-muted/50">
                <span>Signal collection ({sources.length} sources × {sectors.length || 1} sectors)</span>
                <span className="text-muted/30">free · ~{estTotalSignals} est. signals</span>
              </div>
              <div className="flex justify-between text-muted/50">
                <span>Sonnet screening (rate up to {estForClaude} signals)</span>
                <span className="text-accent/60">~${sonnetCost.toFixed(2)}</span>
              </div>
              {superTier === 'opus20' && (
                <div className="flex justify-between text-muted/50">
                  <span>Opus deep scoring (top 20 signals)</span>
                  <span className="text-accent/60">~${(Math.min(20, estForClaude) * 0.015).toFixed(2)}</span>
                </div>
              )}
              {superTier === 'opus80' && (
                <div className="flex justify-between text-muted/50">
                  <span>Opus deep scoring (top 80 signals)</span>
                  <span className="text-accent/60">~${(Math.min(80, estForClaude) * 0.015).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-border/15 pt-1.5 flex justify-between font-bold">
                <span className="text-bright/60">Estimated total</span>
                <span className={totalEst > 4 ? 'text-rose' : 'text-accent'}>~${totalEst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[9px] text-muted/30">
                <span>DD push: {sources.includes('harmonic') ? 'up to 15 (Harmonic 3x)' : 'up to 5 (strict)'}</span>
                <span>ETA: ~{superTier === 'opus80' ? '3-5' : superTier === 'opus20' ? '2-3' : '1-2'} min</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={confirmAndScan}
                className={`flex-1 py-2 rounded-lg font-bold text-[11px] transition-all ${
                  isExpensive ? 'bg-rose/15 border border-rose/30 text-rose hover:bg-rose/25' : 'bg-sm/15 border border-sm/30 text-sm hover:bg-sm/25'
                }`}>
                {isExpensive ? '⚠️ Run Anyway' : '✓ Run Search'}
              </button>
              <button onClick={() => setShowCostConfirm(false)}
                className="px-4 py-2 rounded-lg border border-border/20 text-muted/40 text-[11px]">
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

      {/* Scan Button */}
      <button onClick={handleScan} disabled={isScanning}
        className="w-full py-3.5 rounded-xl font-extrabold text-sm tracking-wide active:scale-[0.98] transition-all duration-200 disabled:opacity-40 mb-5 hover:brightness-110 text-bright"
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 35%, #6366f1 60%, #be123c 100%)',
          boxShadow: '0 4px 24px rgba(59,130,246,0.25), 0 2px 12px rgba(190,18,60,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}>
        {isScanning ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin text-base">⚡</span>
            <span className="opacity-90">Scanning...</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-1.5">
            <span className="text-base">⚡</span>
            Super Search {sectors.length > 0 ? `· ${sectors.length} sectors · ${sources.length} sources` : ''}
          </span>
        )}
      </button>

      {/* History + Winners */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setShowHistory(!showHistory)}
          className={`text-[10px] px-3 py-1.5 rounded-lg border transition-all ${showHistory ? 'bg-bo/10 border-bo/30 text-bo' : 'border-border/20 text-muted/40 hover:border-bo/25'}`}>
          🕐 History ({superSearchHistory.length})
        </button>
      </div>

      {/* History panel */}
      {showHistory && superSearchHistory.length > 0 && (
        <div className="mb-5 bg-ink/20 border border-border/15 rounded-xl p-3 space-y-2 max-h-[400px] overflow-y-auto">
          <p className="text-[9px] text-muted/40 uppercase tracking-wider font-bold">Super Search History</p>
          {superSearchHistory.map((h, i) => (
            <div key={h.id || i} className="border border-border/10 rounded-lg p-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-bright/60 font-medium">{new Date(h.date).toLocaleString()}</span>
                <div className="flex gap-2 text-[9px]">
                  <span className="text-muted/40">{h.totalSignals} signals</span>
                  <span className="text-sm/60">⭐ {h.signals} HIGH</span>
                  {h.ddPushed > 0 && <span className="text-boro/60">📋 {h.ddPushed} → DD</span>}
                  <span className="text-accent/40">💲 ${h.cost}</span>
                  <span className="text-muted/30">⏱ {h.elapsed}s</span>
                </div>
              </div>
              {h.topResults?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {h.topResults.map((r, j) => (
                    <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-sm/8 text-sm/60 border border-sm/15">
                      {r.name} ({r.source})
                    </span>
                  ))}
                </div>
              )}
              {h.analysis && (
                <details className="text-[10px]">
                  <summary className="text-boro/50 cursor-pointer hover:text-boro">🧠 Analysis</summary>
                  <p className="text-bright/40 mt-1 whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">{h.analysis}</p>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Save search prompt */}
      {showSavePrompt && !isScanning && displayResults && !displayResults.error && (
        <div className="mb-4 bg-bo/5 border border-bo/20 rounded-xl p-3 flex items-center gap-3">
          <p className="text-[11px] text-bo/70 flex-1">Save this search for future use?</p>
          <button onClick={() => { setShowSaveInput(true); setShowSavePrompt(false); }}
            className="text-[10px] px-3 py-1 rounded-lg bg-bo/15 border border-bo/30 text-bo font-medium hover:bg-bo/25">Save</button>
          <button onClick={() => setShowSavePrompt(false)}
            className="text-[10px] px-2 py-1 rounded-lg border border-border/20 text-muted/40">Dismiss</button>
        </div>
      )}

      {/* Scan progress panel */}
      {isScanning && (
        <div className="mb-5 bg-ink/30 border border-bo/15 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-1 text-[9px] font-mono">
            {['import', 'filter', 'screen', 'done'].map((s, i) => {
              const labels = { import: '📡 Import', filter: '🧹 Filter', screen: '🧠 Score', done: '✅ Done' };
              const stage = displayStage || 'import';
              const isActive = stage === s;
              const isPast = ['import','filter','screen','done'].indexOf(stage) > i;
              return (
                <React.Fragment key={s}>
                  {i > 0 && <span className="text-muted/20">→</span>}
                  <span className={`px-2 py-0.5 rounded ${isActive ? 'bg-bo/15 text-bo font-bold' : isPast ? 'text-sm/50' : 'text-muted/25'}`}>{labels[s]}</span>
                </React.Fragment>
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-bright/60">{displayProgress}</p>
            <div className="flex items-center gap-3">
              {displayStartTime && <SuperElapsed startTime={displayStartTime} />}
              <span className="text-[9px] text-muted/30">
                ETA: {displayStage === 'import' ? '~60-90s' : displayStage === 'filter' ? '~30s' : displayStage === 'screen' ? '~20-40s' : '...'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-accent/40">Est. cost: ~$0.08-0.15 (Sonnet only)</span>
            <button onClick={cancelSuperSearch} className="text-[9px] px-2 py-1 rounded border border-rose/25 text-rose/60 hover:text-rose hover:border-rose/40">Cancel</button>
          </div>
        </div>
      )}

      {/* Results */}
      {displayResults && (
        <div className="space-y-3">
          {displayResults?.error && (
            <div className="bg-rose/8 border border-rose/15 rounded-xl p-3 shadow-sm">
              <p className="text-rose/90 text-sm">{displayResults?.error}</p>
            </div>
          )}
          {displayResults?.sourceStats && (
            <div className="flex flex-wrap items-center gap-2.5 text-[10px] py-1">
              <span className="text-muted/50 font-medium">{displayResults?.totalSignals || 0} signals collected</span>
              <span className="text-border/30">|</span>
              {displayResults?.sourceStats.twitter > 0 && <span className="text-bright/60">𝕏 {displayResults?.sourceStats.twitter}</span>}
              {displayResults?.sourceStats.farcaster > 0 && <span className="text-boro/60">🟪 {displayResults?.sourceStats.farcaster}</span>}
              {displayResults?.sourceStats.github > 0 && <span className="text-muted/60">🐙 {displayResults?.sourceStats.github}</span>}
              {displayResults?.sourceStats.producthunt > 0 && <span className="text-accent/60">🐱 {displayResults?.sourceStats.producthunt}</span>}
              {displayResults?.sourceStats.harmonic > 0 && <span className="text-accent/60">🔮 {displayResults?.sourceStats.harmonic}</span>}
              {displayResults?.elapsed && <><span className="text-border/30">|</span><span className="text-muted/40">⏱ {displayResults?.elapsed}s</span></>}
              {displayResults?.estimatedCost && <><span className="text-border/30">|</span><span className="text-accent/40">💲 ~${displayResults?.estimatedCost}</span></>}
              {displayResults?.ddPushed > 0 && <><span className="text-border/30">|</span><span className="text-sm/60">📋 {displayResults?.ddPushed} → DD</span></>}
            </div>
          )}
          {displayResults?.analysis && (
            <div className="bg-bo/4 border border-bo/12 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-widest text-bo/55 font-bold mb-1.5">Claude Analysis</p>
              <p className="text-xs text-bright/80 leading-relaxed whitespace-pre-wrap">{displayResults?.analysis}</p>
            </div>
          )}
          {results.signals?.length > 0 && (
            <div className="flex flex-col gap-2 bg-ink/20 rounded-xl p-2.5 border border-border/15">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] text-muted/40 uppercase tracking-wider font-bold mr-0.5">Source</span>
                <FilterPill label={`All (${results.signals.length})`} active={filterSource === 'all'} onClick={() => setFilterSource('all')} />
                {Object.entries(sourceCounts).map(([src, count]) => (
                  <FilterPill key={src} label={`${sourceIcons[src]} ${count}`} active={filterSource === src} onClick={() => setFilterSource(filterSource === src ? 'all' : src)} />
                ))}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] text-muted/40 uppercase tracking-wider font-bold mr-0.5">Signal</span>
                <FilterPill label="All" active={filterSignal === 'all'} onClick={() => setFilterSignal('all')} />
                {['HIGH', 'MEDIUM', 'LOW'].filter(s => signalCounts[s]).map(sig => (
                  <FilterPill key={sig} label={`${signalStyles[sig].dot} ${sig} (${signalCounts[sig]})`} active={filterSignal === sig}
                    onClick={() => setFilterSignal(filterSignal === sig ? 'all' : sig)} color={filterSignal === sig ? signalStyles[sig].badge : ''} />
                ))}
              </div>
            </div>
          )}
          {filteredSignals.length > 0 ? (
            <div className="space-y-2.5">
              <p className="text-[11px] text-muted/40">{filteredSignals.length} signals{filterSource !== 'all' || filterSignal !== 'all' ? ' (filtered)' : ''}</p>
              {filteredSignals.map(s => <SignalCard key={s.id} signal={s} addFavorite={addFavorite} isFavorited={isFavorited} />)}
            </div>
          ) : results.signals?.length > 0 ? (
            <p className="text-center text-muted/40 text-sm py-8">No signals match current filters</p>
          ) : !displayResults?.error ? (
            <p className="text-center text-muted/40 text-sm py-8">No signals found. Broaden topics or enable more sources.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
