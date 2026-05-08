import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import HarmonicSavedSearches from '../components/HarmonicSavedSearches';
import HarmonicSearchBar from '../components/HarmonicSearchBar';
import FindSimilar from '../components/FindSimilar';
import { CrmButton } from '../components/CrmButton';
import { useScan } from '../components/ScanContext';
import { PORTFOLIO } from '../constants/portfolio';

const API_BASE = import.meta.env?.VITE_API_URL || 'https://pigeon-api.up.railway.app';

// ─── Baseline Companies Section ───
function BaselinesSection({ baselines, setBaselines, importance, setImportance }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API_BASE}/api/harmonic/typeahead?q=${encodeURIComponent(query)}&size=6`);
        if (r.ok) {
          const data = await r.json();
          setSuggestions(data.results || []);
        }
      } catch (e) {}
      setLoading(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const addBaseline = (company) => {
    const id = company.id || (company.entity_urn || '').split(':').pop() || null;
    if (baselines.some(b => b.name === company.name)) return;
    setBaselines([...baselines, {
      name: company.name,
      id,
      logo_url: company.logo_url || company.logoUrl || null,
      domain: company.domain || company.website?.domain || '',
    }]);
    setQuery('');
    setSuggestions([]);
  };

  const removeBaseline = (idx) => setBaselines(baselines.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-bright/90 uppercase tracking-wider">Baseline Companies</h3>
          <p className="text-[10px] text-muted/50 mt-0.5">Anchor the search around specific companies you want to find similar ones to</p>
        </div>
        {baselines.length > 0 && (
          <span className="text-[10px] text-bo/60 font-mono">{baselines.length} added</span>
        )}
      </div>

      {/* Chips */}
      {baselines.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {baselines.map((b, i) => (
            <div key={b.name + i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-bo/8 border border-bo/20">
              {b.logo_url ? (
                <img src={b.logo_url} alt="" className="w-4 h-4 rounded-sm flex-shrink-0 object-contain bg-ink/40"
                  onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <div className="w-4 h-4 rounded-sm bg-bo/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-bo text-[8px] font-bold">{(b.name || '?')[0]}</span>
                </div>
              )}
              <span className="text-[10px] text-bright font-medium max-w-[140px] truncate">{b.name}</span>
              <button onClick={() => removeBaseline(i)} className="text-muted/40 hover:text-rose text-[10px]">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Typeahead */}
      <div className="relative">
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder={baselines.length === 0 ? "Search a company to anchor the search..." : "+ Add another baseline..."}
          className="w-full bg-ink/50 border border-border/25 rounded-lg px-3 py-2 text-xs text-bright outline-none focus:border-bo/35 placeholder:text-muted/40" />
        {loading && <div className="absolute right-3 top-2.5 w-3 h-3 border-2 border-bo border-t-transparent rounded-full animate-spin" />}
        {suggestions.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border/30 rounded-lg shadow-2xl shadow-black/40 overflow-hidden max-h-[240px] overflow-y-auto">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => addBaseline(s)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-bo/8 transition-colors text-left border-b border-border/15 last:border-0">
                {s.logo_url ? (
                  <img src={s.logo_url} alt="" className="w-7 h-7 rounded-md bg-ink/50 flex-shrink-0 object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="w-7 h-7 rounded-md bg-bo/12 flex items-center justify-center flex-shrink-0">
                    <span className="text-bo text-[10px] font-bold">{(s.name || '?')[0]}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-bright truncate">{s.name}</p>
                  <p className="text-[9px] text-muted/50 truncate">{s.domain || s.website?.domain || ''}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Importance Slider */}
      {baselines.length > 0 && (
        <ImportanceSlider value={importance} onChange={setImportance}
          label="Baseline Importance"
          hint="How heavily should similar companies match these baselines?" />
      )}
    </div>
  );
}

// ─── Popular keywords (curated for Daxos thesis) ───
const POPULAR_KEYWORDS = [
  // Crypto / Trading
  { label: 'prediction markets', group: 'crypto' },
  { label: 'polymarket', group: 'crypto' },
  { label: 'social betting', group: 'crypto' },
  { label: 'sportsbook', group: 'crypto' },
  { label: 'perps', group: 'crypto' },
  { label: 'derivatives', group: 'crypto' },
  { label: 'memecoins', group: 'crypto' },
  { label: 'launchpad', group: 'crypto' },
  { label: 'pump.fun', group: 'crypto' },
  // Infrastructure
  { label: 'wallet', group: 'infra' },
  { label: 'account abstraction', group: 'infra' },
  { label: 'embedded wallet', group: 'infra' },
  { label: 'bridge', group: 'infra' },
  { label: 'restaking', group: 'infra' },
  { label: 'L2 / L3', group: 'infra' },
  // Bitcoin / BRC
  { label: 'bitcoin L2', group: 'btc' },
  { label: 'ordinals', group: 'btc' },
  { label: 'BRC-20', group: 'btc' },
  // AI
  { label: 'AI agents', group: 'ai' },
  { label: 'LLM tools', group: 'ai' },
  { label: 'AI x crypto', group: 'ai' },
  { label: 'developer tools', group: 'ai' },
  // Stablecoins / RWA
  { label: 'stablecoins', group: 'fin' },
  { label: 'RWA', group: 'fin' },
  { label: 'on-chain payments', group: 'fin' },
  { label: 'yield', group: 'fin' },
  // Consumer
  { label: 'social tokens', group: 'consumer' },
  { label: 'consumer crypto', group: 'consumer' },
  { label: 'NFT marketplace', group: 'consumer' },
];

function PopularKeywordsPanel({ onAdd, currentKeywords }) {
  const [open, setOpen] = useState(false);
  const isAdded = (kw) => {
    const tokens = (currentKeywords || '').toLowerCase().split(/[,;]/).map(t => t.trim());
    return tokens.includes(kw.toLowerCase());
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="text-[10px] px-2.5 py-1.5 rounded-lg border border-accent/25 bg-accent/8 text-accent/85 hover:bg-accent/15 hover:border-accent/40 transition-all flex items-center gap-1 whitespace-nowrap">
        ✨ Popular keywords
        <span className={`transition-transform text-[9px] ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 right-0 top-full mt-1 w-[320px] bg-card border border-border/30 rounded-xl shadow-2xl shadow-black/40 p-3 space-y-2.5">
            <p className="text-[9px] uppercase tracking-wider text-muted/50 font-bold">Curated for Daxos thesis</p>
            <div className="flex flex-wrap gap-1">
              {POPULAR_KEYWORDS.map(kw => {
                const added = isAdded(kw.label);
                return (
                  <button key={kw.label} onClick={() => onAdd(kw.label)} disabled={added}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                      added
                        ? 'bg-sm/10 border-sm/25 text-sm/70 cursor-default'
                        : 'border-border/25 text-muted/70 hover:border-accent/35 hover:text-accent hover:bg-accent/5'
                    }`}>
                    {added ? '✓ ' : '+ '}{kw.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-muted/40 leading-relaxed">Click to append to your keywords. These reflect Daxos focus + portfolio sectors (crypto, betting, AI, infra, RWA, consumer).</p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Importance Slider (0-100%) ───
function ImportanceSlider({ value, onChange, label, hint, color = 'bo' }) {
  const colorMap = {
    bo: 'accent-bo',
    boro: 'accent-boro',
    sm: 'accent-sm',
    accent: 'accent-accent',
  };
  // 0-100% with descriptive band for context
  const band = value === 0 ? 'Off' : value <= 25 ? 'Light' : value <= 50 ? 'Mild' : value <= 75 ? 'Strong' : 'Max';
  return (
    <div className="bg-ink/30 border border-border/15 rounded-lg p-2.5 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted/70">{label}</span>
        <span className={`text-[10px] font-mono text-${color}`}>{band} · {value}%</span>
      </div>
      <input type="range" min="0" max="100" step="1" value={value} onChange={e => onChange(parseInt(e.target.value))}
        className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-surface ${colorMap[color] || 'accent-bo'}`} />
      {hint && <p className="text-[9px] text-muted/40">{hint}</p>}
    </div>
  );
}

// ─── CRM Section ───
function CRMSection({ enabled, setEnabled, stages, setStages, importance, setImportance }) {
  const STAGE_OPTIONS = ['BO', 'BORO', 'BORO-SM', 'Warm', 'Backburn'];
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-bright/90 uppercase tracking-wider">Include CRM Companies</h3>
          <p className="text-[10px] text-muted/50 mt-0.5">Use companies from your CRM as additional context for similarity</p>
        </div>
        <button onClick={() => setEnabled(!enabled)}
          className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
            enabled ? 'bg-boro/15 border-boro/30 text-boro' : 'border-border/25 text-muted/40 hover:border-border/45'
          }`}>
          {enabled ? '✓ On' : 'Off'}
        </button>
      </div>
      {enabled && (
        <>
          <div className="flex flex-wrap gap-1">
            {STAGE_OPTIONS.map(stage => (
              <button key={stage} onClick={() => setStages(stages.includes(stage) ? stages.filter(s => s !== stage) : [...stages, stage])}
                className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                  stages.includes(stage) ? 'bg-boro/15 border-boro/30 text-boro' : 'border-border/20 text-muted/45 hover:border-border/40'
                }`}>
                {stage}
              </button>
            ))}
          </div>
          <ImportanceSlider value={importance} onChange={setImportance}
            label="CRM Influence"
            hint={stages.length === 0 ? "Pick at least one CRM stage above" : `Weight of ${stages.join(', ')} companies on scoring`}
            color="boro" />
        </>
      )}
    </div>
  );
}

// ─── Portfolio Section ───
function PortfolioSection({ selected, setSelected, importance, setImportance }) {
  const allSelected = selected.length === PORTFOLIO.length;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-bright/90 uppercase tracking-wider">Include Portfolio Companies</h3>
          <p className="text-[10px] text-muted/50 mt-0.5">Select Daxos portcos to use as similarity anchors</p>
        </div>
        <button onClick={() => setSelected(allSelected ? [] : PORTFOLIO.map(p => p.name))}
          className="text-[10px] text-sm/70 hover:text-sm transition-colors">
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {PORTFOLIO.map(p => {
          const isSelected = selected.includes(p.name);
          return (
            <button key={p.name} onClick={() => setSelected(isSelected ? selected.filter(n => n !== p.name) : [...selected, p.name])}
              className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                isSelected ? 'bg-sm/15 border-sm/30 text-sm' : 'border-border/20 text-muted/45 hover:border-border/40'
              }`}>
              {p.name}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <ImportanceSlider value={importance} onChange={setImportance}
          label="Portfolio Importance"
          hint={`Influence of ${selected.length} portfolio ${selected.length === 1 ? 'company' : 'companies'}`}
          color="sm" />
      )}
    </div>
  );
}

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

// ─── Merit-mode company card (5-dim breakdown) ───
const MERIT_MODIFIER_LABELS = {
  equity_crowdfunding_only: { sign: '−', val: 1.0, label: 'Equity crowdfunding only', tone: 'rose' },
  stale_series_a:           { sign: '−', val: 1.0, label: 'Stale Series A', tone: 'rose' },
  shrinking_post_seed:      { sign: '−', val: 1.0, label: 'Shrinking post-seed', tone: 'rose' },
  founder_moved:            { sign: '−', val: 1.5, label: 'Founder moved on', tone: 'rose' },
  headcount_mismatch:       { sign: '−', val: 0.5, label: 'HC/raise mismatch', tone: 'rose' },
  buzzword_soup:            { sign: '−', val: 1.0, label: 'Buzzword soup', tone: 'rose' },
  repeat_investor:          { sign: '+', val: 0.5, label: 'Repeat investor', tone: 'sm' },
  quantified_roi:           { sign: '+', val: 0.5, label: 'Quantified ROI', tone: 'sm' },
  strategic_distribution:   { sign: '+', val: 0.5, label: 'Strategic distribution', tone: 'sm' },
  patent_lab_ip:            { sign: '+', val: 0.5, label: 'Patent lab IP', tone: 'sm' },
  major_award:              { sign: '+', val: 0.25, label: 'Major award', tone: 'sm' },
  tier1_academic_equity:    { sign: '+', val: 0.25, label: 'Tier-1 academic equity', tone: 'sm' },
};

function DimBar({ label, score, reason }) {
  const tone = score >= 8 ? 'sm' : score >= 6 ? 'accent' : score >= 4 ? 'bo' : 'rose';
  return (
    <div className="flex items-baseline gap-2 text-[10px] py-0.5">
      <span className="text-muted/60 font-medium w-[60px] flex-shrink-0">{label}</span>
      <div className="w-[80px] h-1.5 bg-surface rounded-full overflow-hidden flex-shrink-0">
        <div className={`h-full rounded-full bg-${tone}/60`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className={`font-mono font-bold text-${tone} w-[28px] flex-shrink-0`}>{score}/10</span>
      <span className="text-muted/45 italic flex-1 leading-snug">{reason}</span>
    </div>
  );
}

function MeritCompanyCard({ signal, addFavorite, isFavorited }) {
  const m = signal._merit;
  if (!m) return null;
  const meta = signal.meta || {};
  const fundingStr = meta.funding ? `$${(meta.funding / 1e6).toFixed(1)}M` : 'undisclosed';
  const finalScore = m.final;
  const finalTone = finalScore >= 8 ? 'sm' : finalScore >= 6.5 ? 'accent' : finalScore >= 4.5 ? 'bo' : 'muted';
  const saved = isFavorited && isFavorited(signal.companyName || signal.title);
  const company = { name: signal.companyName || signal.title, website: meta.website || signal.url };

  return (
    <div className={`bg-surface/40 backdrop-blur-sm border rounded-xl p-3.5 space-y-2.5 transition-all border-${finalTone}/25 shadow-[0_0_12px_rgba(0,0,0,0.05)]`}>
      <div className="flex items-start gap-3">
        {signal.pfp ? (
          <img src={signal.pfp} alt="" className="w-10 h-10 rounded-lg bg-ink/60 flex-shrink-0 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-bo/12 flex items-center justify-center flex-shrink-0">
            <span className="text-bo font-bold text-sm">{(signal.companyName || signal.title || '?')[0]}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold text-bright">{signal.companyName || signal.title}</span>
            <span className={`text-[14px] font-mono font-extrabold text-${finalTone} px-2 py-0.5 rounded-md bg-${finalTone}/10 border border-${finalTone}/25`}>
              {finalScore.toFixed(1)}/10
            </span>
            {m.capped_to_anchor && (
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-rose/10 text-rose/70 border border-rose/20" title="Capped to anchor — didn't beat anchor on any dimension">
                ⚠ capped to anchor
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted/55 flex-wrap">
            <span>💰 {fundingStr}</span>
            {meta.stage && <span>• {meta.stage}</span>}
            {meta.headcount > 0 && <span>• 👥 {meta.headcount}</span>}
            {signal.url && (
              <a href={signal.url} target="_blank" rel="noopener" className="text-bo/70 hover:text-bo hover:underline truncate">
                ↗ {signal.url.replace(/^https?:\/\//, '').slice(0, 40)}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {addFavorite && (
            <button onClick={() => !saved && addFavorite({ name: company.name, description: signal.text?.slice(0, 200), website: company.website })}
              className={`text-base ${saved ? 'text-bo' : 'text-muted/40 hover:text-bo'}`}>
              {saved ? '★' : '☆'}
            </button>
          )}
          <CrmButton company={company} />
        </div>
      </div>

      {/* 5-dim breakdown */}
      <div className="bg-ink/30 rounded-lg p-2 space-y-0">
        <DimBar label="Pedigree"     score={m.pedigree}     reason={m.pedigree_reason} />
        <DimBar label="Traction"     score={m.traction}     reason={m.traction_reason} />
        <DimBar label="Capital"      score={m.capital}      reason={m.capital_reason} />
        <DimBar label="Investors"    score={m.investor}     reason={m.investor_reason} />
        <DimBar label="Defensibility" score={m.defensibility} reason={m.defensibility_reason} />
      </div>

      {/* Modifiers */}
      {m.modifiers?.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] text-muted/40 font-bold uppercase tracking-wider">Modifiers:</span>
          {m.modifiers.map(mod => {
            const cfg = MERIT_MODIFIER_LABELS[mod];
            if (!cfg) return null;
            return (
              <span key={mod} className={`text-[9px] px-1.5 py-0.5 rounded bg-${cfg.tone}/10 text-${cfg.tone}/80 border border-${cfg.tone}/25 font-medium`}>
                {cfg.sign}{cfg.val} {cfg.label}
              </span>
            );
          })}
          <span className="text-[9px] text-muted/40 font-mono ml-1">
            (net {m.modifier_total > 0 ? '+' : ''}{m.modifier_total.toFixed(2)})
          </span>
        </div>
      )}

      {/* Bottom line */}
      {m.bottom_line && (
        <div className="text-[11px] text-bright/75 leading-relaxed pt-1.5 border-t border-border/10">
          <span className="text-muted/40 font-bold uppercase tracking-wider text-[9px] mr-1.5">Bottom Line:</span>
          {m.bottom_line}
        </div>
      )}
    </div>
  );
}

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
  const [searchParams] = useSearchParams();
  const [sectors, setSectors] = useState([]);
  const [chains, setChains] = useState([]);
  const [sources, setSources] = useState([...ALL_SOURCE_KEYS]);
  const [timeRange, setTimeRange] = useState('week');
  const [minFollowers, setMinFollowers] = useState(0);
  const [minEngagement, setMinEngagement] = useState(0);
  const [stage, setStage] = useState([]);
  const [customKeywords, setCustomKeywords] = useState('');

  // ── Baselines / CRM / Portfolio ──
  const [baselines, setBaselines] = useState([]);
  const [baselineImportance, setBaselineImportance] = useState(70);
  const [includeCRM, setIncludeCRM] = useState(false);
  const [crmStages, setCRMStages] = useState(['BO', 'BORO']);
  const [crmImportance, setCRMImportance] = useState(50);
  const [portfolioSelected, setPortfolioSelected] = useState([]);
  const [portfolioImportance, setPortfolioImportance] = useState(50);
  const [showAnchors, setShowAnchors] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [fundingFilter, setFundingFilter] = useState('auto'); // auto|under_2m|under_10m|under_25m|all

  // Pre-populate from URL params (when arriving from FindSimilar's Deep Search button)
  useEffect(() => {
    const name = searchParams.get('baselineName');
    const id = searchParams.get('baselineId');
    const logo = searchParams.get('baselineLogo');
    if (name && baselines.length === 0) {
      setBaselines([{ name, id: id || null, logo_url: logo ? decodeURIComponent(logo) : null }]);
      setShowAnchors(true);
    }
  }, []);

  // Use ScanContext for persistence across tab switches
  const { superSearchStatus, superSearchResults, superSearchHistory, runSuperSearch, cancelSuperSearch } = useScan();
  const [showHistory, setShowHistory] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [superTier, setSuperTier] = useState('opus20'); // haiku|sonnet|opus20|opus80|extreme
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

  const hasAnchors = baselines.length > 0 || (includeCRM && crmStages.length > 0) || portfolioSelected.length > 0;

  const handleScan = async () => {
    if (sectors.length === 0 && !customKeywords.trim() && !hasAnchors) {
      setResults({ signals: [], error: 'Pick a sector, add keywords, or add a baseline anchor.' });
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

    // Build anchor payload — only include when active
    const anchors = {};
    if (baselines.length > 0) {
      anchors.baselines = baselines.map(b => ({ name: b.name, id: b.id }));
      anchors.baselineImportance = baselineImportance;
    }
    if (includeCRM && crmStages.length > 0) {
      anchors.includeCRM = true;
      anchors.crmStages = crmStages;
      anchors.crmImportance = crmImportance;
    }
    if (portfolioSelected.length > 0) {
      const selected = PORTFOLIO.filter(p => portfolioSelected.includes(p.name));
      anchors.portfolioCompanies = selected.map(p => ({ name: p.name, id: p.harmonic_id || null, domain: p.domain }));
      anchors.portfolioImportance = portfolioImportance;
    }
    if (additionalInfo.trim()) {
      anchors.additionalInfo = additionalInfo.trim();
    }

    await runSuperSearch({ sectors, chains, sources, timeRange, minFollowers, minEngagement, stage, customKeywords, superTier, fundingFilter, ...anchors });
    setShowSavePrompt(true);
  };

  const filteredSignals = (displayResults?.signals || []).filter(s => {
    if (filterSource !== 'all' && s.source !== filterSource) return false;
    if (filterSignal !== 'all' && s.signal !== filterSignal) return false;
    return true;
  }).sort((a, b) => {
    // Merit-scored signals first (sorted by merit final score), then everything else
    if (a._merit && b._merit) return (b._merit.final || 0) - (a._merit.final || 0);
    if (a._merit && !b._merit) return -1;
    if (!a._merit && b._merit) return 1;
    return 0;
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
        <p className="text-muted/50 text-[11px] mt-1 tracking-wide">Custom signal hunt — anchor on companies, layer in filters, AI scores everything</p>
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

      {/* ─── Anchors: Baselines / CRM / Portfolio ─── */}
      <div className="mb-4 bg-ink/30 border border-bo/15 rounded-2xl overflow-hidden">
        <button onClick={() => setShowAnchors(!showAnchors)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-bo/5 transition-colors">
          <div className="flex items-center gap-2.5 text-left">
            <span className="text-base">🎯</span>
            <div>
              <h2 className="text-xs font-bold text-bright/90 uppercase tracking-wider">Search Anchors <span className="text-[9px] text-muted/40 font-normal normal-case tracking-normal">(optional)</span></h2>
              <p className="text-[10px] text-muted/50 mt-0.5">
                {(baselines.length === 0 && !includeCRM && portfolioSelected.length === 0)
                  ? 'Anchor your search to specific companies — find similar ones'
                  : `${baselines.length} baseline${baselines.length === 1 ? '' : 's'}${includeCRM ? ` · CRM (${crmStages.join('/')})` : ''}${portfolioSelected.length > 0 ? ` · ${portfolioSelected.length} portcos` : ''}`}
              </p>
            </div>
          </div>
          <span className={`transition-transform duration-200 text-muted/40 text-[11px] ${showAnchors ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {showAnchors && (
          <div className="border-t border-border/15 p-4 space-y-5">
            <BaselinesSection
              baselines={baselines} setBaselines={setBaselines}
              importance={baselineImportance} setImportance={setBaselineImportance} />
            <div className="border-t border-border/15" />
            <CRMSection
              enabled={includeCRM} setEnabled={setIncludeCRM}
              stages={crmStages} setStages={setCRMStages}
              importance={crmImportance} setImportance={setCRMImportance} />
            <div className="border-t border-border/15" />
            <PortfolioSection
              selected={portfolioSelected} setSelected={setPortfolioSelected}
              importance={portfolioImportance} setImportance={setPortfolioImportance} />
            <div className="border-t border-border/15" />
            {/* Funding filter — auto-defaults to under-$10M when anchors are active */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-bright/90 uppercase tracking-wider">Funding Cap</h3>
                <span className="text-[10px] text-muted/40">Daxos default: under $10M</span>
              </div>
              <p className="text-[10px] text-muted/50">Filter Harmonic-similar results by total raised. Sub-$250K checks fit best at Pre-Seed/Seed.</p>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'under_2m',  label: '< $2M',  hint: 'Highest priority' },
                  { id: 'under_10m', label: '< $10M', hint: 'Default for anchored search' },
                  { id: 'under_25m', label: '< $25M', hint: 'Expanded — includes Series A' },
                  { id: 'all',       label: 'All',    hint: 'No funding limit' },
                ].map(opt => {
                  const active = fundingFilter === opt.id || (fundingFilter === 'auto' && opt.id === 'under_10m' && (baselines.length > 0 || portfolioSelected.length > 0));
                  return (
                    <button key={opt.id} onClick={() => setFundingFilter(opt.id)} title={opt.hint}
                      className={`text-[10px] px-2 py-1.5 rounded-lg border transition-all ${
                        active ? 'bg-accent/12 border-accent/35 text-accent font-bold' : 'border-border/20 text-muted/50 hover:border-border/40'
                      }`}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
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
          <div className="flex items-center justify-between">
            <SectionHeader title="Keywords" subtitle="Comma-separated, searched across all sources" />
            <PopularKeywordsPanel
              currentKeywords={customKeywords}
              onAdd={(kw) => {
                const cur = customKeywords.trim();
                const tokens = cur.split(/[,;]/).map(t => t.trim()).filter(Boolean);
                if (tokens.includes(kw)) return;
                setCustomKeywords(cur ? `${cur}, ${kw}` : kw);
              }}
            />
          </div>
          <input type="text" value={customKeywords} onChange={e => setCustomKeywords(e.target.value)}
            placeholder="pump.fun clone, polymarket, restaking..."
            className="w-full bg-ink/50 border border-border/25 rounded-lg px-3 py-2.5 text-xs text-bright outline-none focus:border-bo/35 transition-colors placeholder:text-muted/40" />
        </div>

        {/* Additional Info — large freeform context */}
        <div className="border-t border-border/15" />
        <div className="space-y-2">
          <SectionHeader title="Additional Info" subtitle="Optional — paste anything (call transcripts, write-ups, SAFE docs, briefs, theses)" />
          <textarea value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} rows={4}
            placeholder="Paste any extra context here — a call transcript, write-up, term sheet, SAFE doc, deal memo, thesis brief... Then explain in 1-2 sentences how this should shape the search (what to prioritize, what to avoid, what patterns to look for)."
            className="w-full bg-ink/50 border border-border/25 rounded-lg px-3 py-2.5 text-xs text-bright outline-none focus:border-bo/35 transition-colors placeholder:text-muted/35 resize-y leading-relaxed font-mono" />
          <div className="flex items-center justify-between">
            <p className="text-[9px] text-muted/40 leading-relaxed">
              Claude reads this alongside your filters and anchors. Use it to load any unstructured context — a deal memo, founder bio, market analysis, transcript snippets — and tell Claude how to weigh it.
            </p>
            {additionalInfo && (
              <span className="text-[9px] text-muted/35 font-mono flex-shrink-0 ml-2">
                {additionalInfo.length.toLocaleString()} chars · ~{Math.ceil(additionalInfo.length / 3.5).toLocaleString()} tokens
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Harmonic Saved Searches */}
      <div className="mb-4">
        <HarmonicSavedSearches addFavorite={addFavorite} isFavorited={isFavorited} />
        <p className="text-[9px] text-muted/30 mt-1.5 px-1">
          Enriches your search with Harmonic's company database — matches from saved searches get 3x priority for DD picks.
        </p>
      </div>

      {/* Cost Tier Selector — 5 tiers */}
      <div className="mb-3 space-y-1.5">
        <span className="text-[9px] text-muted/40 uppercase tracking-wider font-bold">Scoring Depth</span>
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { id: 'haiku',   label: 'Quick',     emoji: '⚡', baseCost: '$0.05', desc: 'Haiku screen, initial similar pool only — fastest, cheapest' },
            { id: 'sonnet',  label: 'Standard',  emoji: '💰', baseCost: '$0.20', desc: 'Sonnet screens all signals from initial pool, no Opus' },
            { id: 'opus20',  label: 'Deep',      emoji: '🔍', baseCost: '$0.60', desc: 'Sonnet + Opus 5-dim merit scoring on top 20 (anchored)' },
            { id: 'opus80',  label: 'Max',       emoji: '🧠', baseCost: '$3.50', desc: '+ AI Query Expansion (20 queries × 2 endpoints × size 500) → ~3,000-6,000 candidates → Opus on top 80' },
            { id: 'extreme', label: 'Extreme',   emoji: '🚀', baseCost: '$12.00', desc: '+ AI Query Expansion (50 queries × 2 endpoints × size 1000) → ~8,000-15,000 candidates → Opus 5-dim on top 300' },
          ].map(t => (
            <button key={t.id} onClick={() => setSuperTier(t.id)}
              className={`text-left rounded-lg border p-2 transition-all ${
                superTier === t.id ? 'bg-bo/12 border-bo/35 ring-1 ring-bo/15' : 'border-border/20 hover:border-border/40'
              }`} title={t.desc}>
              <div className="flex items-center justify-between gap-1">
                <span className={`text-[10px] font-bold ${superTier === t.id ? 'text-bo' : 'text-bright/80'}`}>
                  {t.emoji} {t.label}
                </span>
              </div>
              <p className={`text-[9px] mt-0.5 font-mono ${superTier === t.id ? 'text-bo/70' : 'text-muted/35'}`}>~{t.baseCost}+</p>
            </button>
          ))}
        </div>
      </div>

      {/* Cost Confirmation Modal — accurate breakdown with anchors + addt'l info */}
      {showCostConfirm && (() => {
        // Source signal estimates (per source, lightly multiplied by sector count)
        const estSignalsPerSource = { twitter: 15, farcaster: 12, github: 8, producthunt: 5, harmonic: 20 };
        const sectorMultiplier = Math.max(1, Math.min(3, sectors.length || 0)); // diminishing returns past 3 sectors
        const sourceSignals = sources.reduce((sum, s) => sum + (estSignalsPerSource[s] || 10), 0) * sectorMultiplier;

        // Anchor signals: each baseline/portfolio fetches `importance` similar companies (max 100)
        const anchorBaselineSignals = baselines.length * Math.min(100, baselineImportance);
        const anchorPortfolioSignals = portfolioSelected.length * Math.min(100, portfolioImportance);
        let anchorSignals = anchorBaselineSignals + anchorPortfolioSignals;

        // AI Query Expansion adds a lot for Max/Extreme tiers
        // (Max = 20 queries × 2 endpoints × ~500 size = ~20K raw, ~30% unique after dedup = ~6K)
        // (Extreme = 50 queries × 2 endpoints × ~1000 size = ~100K raw, ~15% unique = ~15K)
        if (superTier === 'opus80' && (baselines.length > 0 || portfolioSelected.length > 0)) {
          anchorSignals += 6000;
        } else if (superTier === 'extreme' && (baselines.length > 0 || portfolioSelected.length > 0)) {
          anchorSignals += 12000;
        }

        const totalSignals = sourceSignals + anchorSignals;

        // Token estimates for additional info (it gets sent on every Sonnet + Opus call)
        const additionalInfoTokens = additionalInfo ? Math.ceil(additionalInfo.length / 3.5) : 0;
        const sonnetBatches = Math.ceil(totalSignals / 30); // 30 signals per Sonnet batch
        const additionalInfoSonnetCost = (additionalInfoTokens * sonnetBatches * 3) / 1_000_000; // $3/M input

        // Tier pricing
        const tierConfig = {
          haiku:   { screenCostPerSignal: 0.0003, opusN: 0,   opusCostPerSignal: 0,     summary: 0.02, eta: '30s-1m'  },
          sonnet:  { screenCostPerSignal: 0.001,  opusN: 0,   opusCostPerSignal: 0,     summary: 0.05, eta: '1-2m'    },
          opus20:  { screenCostPerSignal: 0.001,  opusN: 20,  opusCostPerSignal: 0.018, summary: 0.10, eta: '2-3m'    },
          opus80:  { screenCostPerSignal: 0.001,  opusN: 80,  opusCostPerSignal: 0.018, summary: 0.20, eta: '4-7m'    },
          extreme: { screenCostPerSignal: 0.0012, opusN: 300, opusCostPerSignal: 0.025, summary: 0.50, eta: '8-15m'   },
        };
        const cfg = tierConfig[superTier] || tierConfig.opus20;

        // Costs
        const screenCost = totalSignals * cfg.screenCostPerSignal;
        const opusEffective = Math.min(cfg.opusN, totalSignals);
        const opusCost = opusEffective * cfg.opusCostPerSignal;
        // Additional info goes to Opus too (heavier penalty since Opus is 5x Sonnet input cost)
        const additionalInfoOpusCost = (additionalInfoTokens * Math.ceil(opusEffective / 8) * 15) / 1_000_000;
        const overhead = cfg.summary; // base summary/orchestration overhead

        const totalEst = screenCost + opusCost + additionalInfoSonnetCost + additionalInfoOpusCost + overhead;
        const isExpensive = totalEst > 4;

        const tierLabel = { haiku: 'Quick', sonnet: 'Standard', opus20: 'Deep', opus80: 'Max', extreme: 'Extreme' }[superTier] || superTier;

        return (
          <div className={`mb-4 bg-ink/40 border rounded-xl p-4 space-y-3 ${isExpensive ? 'border-rose/30' : 'border-accent/20'}`}>
            <p className="text-[10px] text-accent/60 uppercase tracking-wider font-bold">Cost Breakdown — {tierLabel}</p>
            {isExpensive && (
              <div className="bg-rose/10 border border-rose/25 rounded-lg px-3 py-2">
                <p className="text-[11px] text-rose font-bold">⚠️ High cost search</p>
                <p className="text-[10px] text-rose/60 mt-0.5">~${totalEst.toFixed(2)} estimated — driven by {totalSignals} signals × Opus on top {opusEffective}{additionalInfoTokens > 1000 ? ` + ${additionalInfoTokens.toLocaleString()} tokens of additional info` : ''}.</p>
              </div>
            )}
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between text-muted/50">
                <span>Signal collection ({sources.length} sources × {sectors.length || 1} sectors)</span>
                <span className="text-muted/30">free · ~{sourceSignals} signals</span>
              </div>
              {anchorSignals > 0 && (
                <div className="flex justify-between text-muted/50">
                  <span>Anchor expansion ({baselines.length + portfolioSelected.length} anchor{baselines.length + portfolioSelected.length === 1 ? '' : 's'} × Harmonic similar)</span>
                  <span className="text-muted/30">free · ~{anchorSignals} signals</span>
                </div>
              )}
              <div className="flex justify-between text-muted/50">
                <span>{cfg.opusN === 0 && superTier === 'haiku' ? 'Haiku' : 'Sonnet'} screening (~{totalSignals} signals)</span>
                <span className="text-accent/60">~${screenCost.toFixed(2)}</span>
              </div>
              {opusEffective > 0 && (
                <div className="flex justify-between text-muted/50">
                  <span>Opus deep scoring (top {opusEffective} signals)</span>
                  <span className="text-accent/60">~${opusCost.toFixed(2)}</span>
                </div>
              )}
              {additionalInfoTokens > 100 && (
                <div className="flex justify-between text-muted/50">
                  <span>Additional info context ({additionalInfoTokens.toLocaleString()} tokens × all batches)</span>
                  <span className="text-accent/60">~${(additionalInfoSonnetCost + additionalInfoOpusCost).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted/50">
                <span>Orchestration + summary</span>
                <span className="text-accent/60">~${overhead.toFixed(2)}</span>
              </div>
              <div className="border-t border-border/15 pt-1.5 flex justify-between font-bold">
                <span className="text-bright/60">Estimated total</span>
                <span className={totalEst > 4 ? 'text-rose' : 'text-accent'}>~${totalEst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[9px] text-muted/30">
                <span>DD push: up to {sources.includes('harmonic') ? 15 : 5}</span>
                <span>ETA: {cfg.eta}</span>
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
            Super Search {hasAnchors ? `· ${baselines.length + portfolioSelected.length + (includeCRM ? 1 : 0)} anchor${baselines.length + portfolioSelected.length + (includeCRM ? 1 : 0) === 1 ? '' : 's'}` : ''}{sectors.length > 0 ? ` · ${sectors.length} sectors` : ''}
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
          {/* Merit-mode anchor banner — shows anchor's standalone rating + filter status */}
          {displayResults?.meritMode && (
            <div className="bg-bo/5 border border-bo/15 rounded-xl p-3 space-y-1.5">
              <p className="text-[10px] font-bold text-bo/85 uppercase tracking-wider">🎯 Merit-Mode Search</p>
              {displayResults.anchorRatings && Object.keys(displayResults.anchorRatings).length > 0 && (
                <div className="space-y-1">
                  {Object.entries(displayResults.anchorRatings).map(([name, r]) => (
                    <div key={name} className="text-[11px] flex items-baseline gap-2 flex-wrap">
                      <span className="text-bright/75 font-semibold capitalize">{name}</span>
                      <span className="text-muted/40">— anchor's standalone rating:</span>
                      <span className="text-bo font-mono font-bold">{r.final.toFixed(1)}/10</span>
                      <span className="text-muted/40 text-[10px]">(P{r.pedigree} T{r.traction} C{r.capital} I{r.investor} D{r.defensibility})</span>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted/45 italic">Surfaced companies cannot exceed an anchor's score unless they beat it on at least one sub-dimension by ≥1 point.</p>
                </div>
              )}
              {displayResults.fundingFilter && displayResults.fundingFilter !== 'all' && (
                <p className="text-[10px] text-accent/70">
                  Filter applied: total raised <span className="font-mono">{ {under_2m:'< $2M', under_10m:'< $10M', under_25m:'< $25M'}[displayResults.fundingFilter] || displayResults.fundingFilter }</span>. Pick "All" in the funding cap toggle to disable.
                </p>
              )}
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
              {displayResults?.estimatedCost && <><span className="text-border/30">|</span><span className="text-accent/40">💲 ${displayResults?.estimatedCost}</span></>}
              {displayResults?.opusScoredCount > 0 && <><span className="text-border/30">|</span><span className="text-boro/60">🧠 {displayResults?.opusScoredCount} Opus-scored</span></>}
              {displayResults?.ddPushed > 0 && <><span className="text-border/30">|</span><span className="text-sm/60">📋 {displayResults?.ddPushed} → DD</span></>}
            </div>
          )}
          {displayResults?.sourcesSkipped?.length > 0 && (
            <div className="bg-rose/5 border border-rose/15 rounded-lg px-3 py-2 text-[10px] text-rose/75 leading-relaxed">
              <p className="font-bold mb-0.5">⚠ Some sources didn't run</p>
              <ul className="space-y-0.5 ml-3">
                {displayResults.sourcesSkipped.map(s => (
                  <li key={s.source}>• <span className="font-mono text-rose/90">{s.source}</span> — {s.reason}</li>
                ))}
              </ul>
              <p className="text-rose/45 mt-1 text-[9px]">Add the missing API keys on Railway to enable. Search ran with available sources only.</p>
            </div>
          )}
          {displayResults?.costBreakdown && (
            <details className="text-[10px] text-muted/40">
              <summary className="cursor-pointer hover:text-bright/60">💰 Cost breakdown (actual tokens)</summary>
              <div className="mt-2 space-y-0.5 pl-3 font-mono">
                {displayResults.costBreakdown.sonnet > 0 && <p>Sonnet: ${displayResults.costBreakdown.sonnet.toFixed(3)} · {displayResults.costBreakdown.tokens.sonnetIn?.toLocaleString()} in / {displayResults.costBreakdown.tokens.sonnetOut?.toLocaleString()} out</p>}
                {displayResults.costBreakdown.opus > 0 && <p>Opus: ${displayResults.costBreakdown.opus.toFixed(3)} · {displayResults.costBreakdown.tokens.opusIn?.toLocaleString()} in / {displayResults.costBreakdown.tokens.opusOut?.toLocaleString()} out</p>}
                {displayResults.costBreakdown.haiku > 0 && <p>Haiku: ${displayResults.costBreakdown.haiku.toFixed(3)} · {displayResults.costBreakdown.tokens.haikuIn?.toLocaleString()} in / {displayResults.costBreakdown.tokens.haikuOut?.toLocaleString()} out</p>}
                <p className="text-bright/60">Total: ${displayResults.costBreakdown.total.toFixed(3)}</p>
              </div>
            </details>
          )}
          {displayResults?.analysis && (
            <div className="bg-bo/4 border border-bo/12 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-widest text-bo/55 font-bold mb-1.5">Claude Analysis</p>
              <p className="text-xs text-bright/80 leading-relaxed whitespace-pre-wrap">{displayResults?.analysis}</p>
            </div>
          )}
          {displayResults?.signals?.length > 0 && (
            <div className="flex flex-col gap-2 bg-ink/20 rounded-xl p-2.5 border border-border/15">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] text-muted/40 uppercase tracking-wider font-bold mr-0.5">Source</span>
                <FilterPill label={`All (${displayResults.signals.length})`} active={filterSource === 'all'} onClick={() => setFilterSource('all')} />
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
              {filteredSignals.map(s => s._merit
                ? <MeritCompanyCard key={s.id} signal={s} addFavorite={addFavorite} isFavorited={isFavorited} />
                : <SignalCard key={s.id} signal={s} addFavorite={addFavorite} isFavorited={isFavorited} />
              )}
            </div>
          ) : displayResults?.signals?.length > 0 ? (
            <p className="text-center text-muted/40 text-sm py-8">No signals match current filters</p>
          ) : !displayResults?.error ? (
            <p className="text-center text-muted/40 text-sm py-8">No signals found. Broaden topics or enable more sources.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
