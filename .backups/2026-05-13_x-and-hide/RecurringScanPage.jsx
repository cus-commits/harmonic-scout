import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CrmButton } from '../components/CrmButton';
import RemoveMenu from '../components/RemoveMenu';
import { autoSaveTopPicks } from '../components/ScanContext';

const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';

function authHeaders() {
  const anthropicKey = localStorage.getItem('scout_anthropic_key') || '';
  const crmUser = localStorage.getItem('crm_user') || '';
  const h = { 'Content-Type': 'application/json', 'x-anthropic-key': anthropicKey };
  if (crmUser) h['x-user-id'] = crmUser;
  return h;
}

// ---- Scan Tiers ----

const TIERS = [
  { key: 'scout',    name: 'Quick Scout',  cost: '$12',  emoji: '⚡', color: 'sky',     ddPush: 2,  desc: 'Haiku pre-screen → Sonnet deep 10 → top 2 to DD', time: '15-30 min', estMinutes: 25 },
  { key: 'standard', name: 'Standard',     cost: '$18', emoji: '🔍', color: 'violet',  ddPush: 5,  desc: 'Sonnet pre-screen → Opus deep 15 → top 5 to DD', time: '30-60 min', estMinutes: 45 },
  { key: 'deep',     name: 'Deep Dive',    cost: '$28', emoji: '🔬', color: 'amber',   ddPush: 8,  desc: 'Sonnet all → Opus deep 40 → top 8 to DD', time: '1-2 hours', estMinutes: 90 },
  { key: 'sweep',    name: 'Full Sweep',   cost: '$38', emoji: '🌊', color: 'pink',    ddPush: 12, desc: 'Sonnet full → Opus deep 60 → top 12 to DD', time: '2-3 hours', estMinutes: 150 },
  { key: 'maximum',  name: 'Maximum',      cost: '$50', emoji: '🚀', color: 'emerald', ddPush: 20, desc: 'Full pipeline → Opus deep 100 → top 20 to DD', time: '3-5 hours', estMinutes: 240 },
];

const CRM_STAGES = [
  { key: 'BO', label: 'BO', color: 'sky' },
  { key: 'BORO', label: 'BORO', color: 'violet' },
  { key: 'BORO-SM', label: 'BORO-SM', color: 'emerald' },
  { key: 'Warm', label: 'Warm', color: 'amber' },
];

const SECTORS = ['Crypto / Web3', 'DeFi', 'NFT / Digital Assets', 'Fintech', 'Payments', 'AI / ML', 'SaaS / Enterprise', 'Gaming / Esports', 'Gambling / Betting', 'Consumer', 'Social', 'Climate / Cleantech', 'Marketplace', 'Creator Economy', 'Cybersecurity', 'Robotics / Automation', 'PropTech', 'EdTech', 'Healthcare / Biotech', 'Logistics', 'Insurance / Insurtech', 'Legal Tech', 'Media / Entertainment'];
const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+'];
const GEOS = ['US Only', 'US + Canada', 'Europe', 'Asia', 'Latin America', 'MENA', 'Africa', 'Global'];
const MODELS = ['B2C', 'B2B', 'Marketplace', 'Platform / Infra', 'API / Developer Tools', 'Protocol / Token'];
const SIGNALS = ['Revenue / ARR traction', 'User growth signals', 'Token/protocol activity', 'Recent funding round', 'Headcount growth', 'Web traffic growth', 'YC / top accelerator', 'Notable investors', 'Open source / GitHub', 'Press / media coverage'];

// Saved scan presets stored in localStorage
const PRESETS_KEY = 'deepscan_presets';
function loadPresets() { try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]'); } catch { return []; } }
function savePresets(p) { localStorage.setItem(PRESETS_KEY, JSON.stringify(p)); }

const TEAM = [
  { id: 'mark', name: 'Mark' }, { id: 'jake', name: 'Jake' },
  { id: 'joe', name: 'Joe' }, { id: 'carlo', name: 'Carlo' },
  { id: 'liam', name: 'Liam' }, { id: 'serena', name: 'Serena' },
];

function loadHScreensProfiles() {
  const all = [];
  for (const t of TEAM) {
    try {
      const saved = localStorage.getItem(`autoscan_profiles_${t.id}`);
      if (saved) {
        const profiles = JSON.parse(saved);
        if (Array.isArray(profiles)) {
          profiles.forEach(p => {
            all.push({ ...p, _owner: t.name, _ownerId: t.id });
          });
        }
      }
    } catch {}
  }
  return all;
}

const tierColors = {
  sky:     { bg: 'bg-bo/10', border: 'border-bo/25', text: 'text-bo', activeBg: 'bg-bo/20', activeBorder: 'border-bo/50' },
  violet:  { bg: 'bg-boro/10', border: 'border-boro/25', text: 'text-boro', activeBg: 'bg-boro/20', activeBorder: 'border-boro/50' },
  amber:   { bg: 'bg-accent/10', border: 'border-accent/25', text: 'text-accent', activeBg: 'bg-accent/20', activeBorder: 'border-accent/50' },
  pink:    { bg: 'bg-rose/10', border: 'border-rose/25', text: 'text-rose', activeBg: 'bg-rose/20', activeBorder: 'border-rose/50' },
  emerald: { bg: 'bg-sm/10', border: 'border-sm/25', text: 'text-sm', activeBg: 'bg-sm/20', activeBorder: 'border-sm/50' },
};

function TierSelector({ selected, onSelect, totalCompanies }) {
  // Estimate cost based on company count and tier config
  // Cost model: base overhead + variable per-company cost, with floor and ceiling per tier
  function estimateCost(tier, count) {
    if (!count) return null;
    const maxCost = parseFloat(tier.cost.replace('$', ''));
    // Base overhead (fixed cost regardless of company count — model loading, prompt setup)
    const bases = { scout: 5, standard: 6, deep: 8, sweep: 10, maximum: 12 };
    // Variable cost per company (pre-screen + scoring + deep analysis amortized)
    const perCompany = { scout: 0.001, standard: 0.002, deep: 0.004, sweep: 0.006, maximum: 0.008 };
    // Minimum spend floors — fewer companies = more expensive models per company
    const floors = { scout: 7, standard: 10, deep: 18, sweep: 26, maximum: 35 };
    const base = bases[tier.key] || 5;
    const variable = count * (perCompany[tier.key] || 0.002);
    const raw = base + variable;
    return Math.max(floors[tier.key] || 7, Math.min(maxCost, raw)).toFixed(2);
  }

  return (
    <div className="space-y-2">
      {TIERS.map(t => {
        const c = tierColors[t.color];
        const isActive = selected === t.key;
        const estCost = estimateCost(t, totalCompanies);
        return (
          <button key={t.key} onClick={() => onSelect(t.key)}
            className={`w-full text-left rounded-xl border p-3 transition-all ${
              isActive ? `${c.activeBg} ${c.activeBorder} ring-1 ring-border/5` : `${c.bg} ${c.border} hover:${c.activeBg}`
            }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{t.emoji}</span>
                <span className={`text-sm font-bold ${c.text}`}>{t.name}</span>
                <span className="text-[10px] text-muted/40">~{t.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted/40">{t.ddPush} to DD</span>
                {estCost && totalCompanies > 0 ? (
                  <>
                    <span className={`text-sm font-bold ${c.text}`}>~${estCost}</span>
                    <span className="text-[9px] text-muted/30 line-through">{t.cost}</span>
                  </>
                ) : (
                  <span className={`text-sm font-bold ${c.text}`}>{t.cost}</span>
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted/40 mt-1 ml-7">{t.desc}</p>
          </button>
        );
      })}
      {totalCompanies > 0 && (
        <p className="text-[9px] text-muted/25 text-center">Cost estimates based on ~{totalCompanies.toLocaleString()} companies across selected searches</p>
      )}
    </div>
  );
}

// ---- Search Selector ----

function SearchSelector({ searches, selectedIds, onToggle, onToggleAll }) {
  const [expanded, setExpanded] = useState(false);
  const allSelected = selectedIds === null || (searches.length > 0 && selectedIds?.size === searches.length);

  if (searches.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-bright/60 font-medium">Harmonic Saved Searches</span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={onToggleAll}
              className="w-3.5 h-3.5 rounded border-border/30 bg-ink/50 accent-bo" />
            <span className="text-[10px] text-muted/50 font-medium">All ({searches.length})</span>
          </label>
          <button onClick={() => setExpanded(!expanded)}
            className="text-[9px] text-bo/50 hover:text-bo font-medium">
            {expanded ? '▾ Collapse' : '▸ Select'}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="bg-ink/30 border border-border/15 rounded-lg p-2 max-h-[200px] overflow-y-auto space-y-0.5">
          {searches.map(s => {
            const isOn = selectedIds === null || selectedIds?.has(s.id);
            return (
              <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bright/[0.03] cursor-pointer">
                <input type="checkbox" checked={isOn} onChange={() => onToggle(s.id)}
                  className="w-3.5 h-3.5 rounded border-border/30 bg-ink/50 accent-bo flex-shrink-0" />
                <span className={`text-[10px] truncate flex-1 ${isOn ? 'text-bright/60' : 'text-muted/30'}`}>{s.name}</span>
                {s.resultCount > 0 && <span className="text-[8px] text-muted/25 flex-shrink-0">{s.resultCount.toLocaleString()}</span>}
              </label>
            );
          })}
        </div>
      )}
      {!allSelected && selectedIds && (
        <p className="text-[9px] text-accent/50">{selectedIds.size} of {searches.length} searches selected</p>
      )}
    </div>
  );
}

// ---- Portfolio Selector ----

function PortcoSelector({ portcos, enabled, onToggleEnabled, selectedIds, onToggle, onToggleAll }) {
  const [expanded, setExpanded] = useState(false);
  const allSelected = selectedIds === null || (portcos.length > 0 && selectedIds?.size === portcos.length);
  const activeCount = selectedIds === null ? portcos.length : selectedIds.size;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input type="checkbox" checked={enabled} onChange={onToggleEnabled}
            className="w-4 h-4 rounded border-border/30 bg-ink/50 accent-bo" />
          <div>
            <span className="text-[11px] text-bright/70 font-medium group-hover:text-bright">Include Portfolio Companies</span>
            <p className="text-[9px] text-muted/35">Find similar to our portcos{enabled ? ` (${activeCount} selected)` : ''}</p>
          </div>
        </label>
        {enabled && portcos.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={onToggleAll}
                className="w-3.5 h-3.5 rounded border-border/30 bg-ink/50 accent-bo" />
              <span className="text-[10px] text-muted/50 font-medium">All ({portcos.length})</span>
            </label>
            <button onClick={() => setExpanded(!expanded)}
              className="text-[9px] text-bo/50 hover:text-bo font-medium">
              {expanded ? '▾ Collapse' : '▸ Select'}
            </button>
          </div>
        )}
      </div>
      {enabled && expanded && portcos.length > 0 && (
        <div className="bg-ink/30 border border-border/15 rounded-lg p-2 max-h-[180px] overflow-y-auto space-y-0.5 ml-6">
          {portcos.map(domain => {
            const isOn = selectedIds === null || selectedIds?.has(domain);
            return (
              <label key={domain} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-bright/[0.03] cursor-pointer">
                <input type="checkbox" checked={isOn} onChange={() => onToggle(domain)}
                  className="w-3.5 h-3.5 rounded border-border/30 bg-ink/50 accent-bo flex-shrink-0" />
                <span className={`text-[10px] truncate ${isOn ? 'text-bright/60' : 'text-muted/30'}`}>{domain}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// (BatchInspector removed — replaced by Real Time page)

// ---- Progress Panel ----

function ScanProgress({ scan, onCancel }) {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [feed, setFeed] = useState([]);
  const [hideFeed, setHideFeed] = useState(false);
  const [batchData, setBatchData] = useState([]);

  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch batch data for winner cards in feed
  useEffect(() => {
    if (!scan?.id) return;
    const fetchBatches = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/recurring-scan/batches/${scan.id}`);
        const data = await r.json();
        if (data.batches) setBatchData(data.batches);
      } catch {}
    };
    fetchBatches();
    const interval = setInterval(fetchBatches, 8000);
    return () => clearInterval(interval);
  }, [scan?.id]);

  const lastMsg = useRef('');
  useEffect(() => {
    const msg = scan?.progress || '';
    if (!msg || msg === 'keepalive' || msg === lastMsg.current) return;
    lastMsg.current = msg;
    setFeed(prev => [{ msg, ts: Date.now(), id: Date.now() + Math.random() }, ...prev].slice(0, 80));
  }, [scan?.progress]);

  const progress = scan?.progress || '';
  const stats = scan?.stats || {};
  const tierInfo = scan?.tier || {};
  const startedAt = scan?.startedAt || Date.now();

  // Determine current stage
  let stage = 'fetch';
  if (progress.match(/[Oo]pus|deep.*(batch|anal)/i)) stage = 'opus';
  else if (progress.match(/[Ss](onnet )?scoring|scoring batch/i)) stage = 'screen';
  else if (progress.match(/[Ee]nrich|[Ff]ilter/i)) stage = 'enrich';
  else if (progress.match(/[Pp]re-screen|[Ss]creening/i)) stage = 'prescreen';
  else if (progress.match(/[Ff]etch|[Ss]tart|[Ll]oad|search/i)) stage = 'fetch';

  const stages = [
    { id: 'fetch', emoji: '📡', label: 'Fetching', color: 'text-bo', weight: 0.10 },
    { id: 'prescreen', emoji: '⚡', label: 'Pre-Screen', color: 'text-boro', weight: 0.30 },
    { id: 'enrich', emoji: '🔬', label: 'Enriching', color: 'text-accent', weight: 0.10 },
    { id: 'screen', emoji: '🎯', label: 'Scoring', color: 'text-rose', weight: 0.25 },
    { id: 'opus', emoji: '🧠', label: 'Deep Analysis', color: 'text-sm', weight: 0.25 },
  ];

  // ETA: stage-weighted + batch progress + elapsed time
  const stageIdx = stages.findIndex(s => s.id === stage);
  const completedWeight = stages.slice(0, stageIdx).reduce((sum, s) => sum + s.weight, 0);
  const currentWeight = stages[stageIdx]?.weight || 0.2;

  let batchFraction = 0.5;
  const batchMatch = progress.match(/batch (\d+)\/(\d+)/);
  if (batchMatch) batchFraction = Math.min(1, parseInt(batchMatch[1]) / Math.max(1, parseInt(batchMatch[2])));

  const overallProgress = Math.max(0.02, completedWeight + currentWeight * batchFraction);
  const elapsed = Math.max(1, (Date.now() - startedAt) / 1000);
  const totalEst = elapsed / overallProgress;
  const etaRemaining = Math.max(0, Math.round(totalEst - elapsed));
  const showEta = elapsed > 10 && etaRemaining > 5;
  const etaMins = Math.floor(etaRemaining / 60);
  const etaSecs = etaRemaining % 60;

  const hours = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = Math.floor(elapsed % 60);

  // Extract winners from batch data for enhanced feed
  const latestWinners = [];
  [...batchData].reverse().forEach(b => {
    (b.companies || []).forEach(c => {
      const isWinner = b.phase === 'prescreen' ? c.verdict === 'PASS' : (c.score || 0) >= 7;
      if (isWinner && latestWinners.length < 8) {
        latestWinners.push({ ...c, _phase: b.phase, _batch: b.batchNum });
      }
    });
  });

  return (
    <div className="bg-ink/30 border border-bo/15 rounded-xl overflow-hidden">
      <div className="p-4 space-y-3">
        {/* User + Tier badge + timer + ETA */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-bo border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-bright/70 font-medium truncate">{progress || 'Starting scan agent...'}</p>
              {tierInfo.name && <span className="text-[9px] px-1.5 py-0.5 rounded bg-bright/5 border border-border/10 text-muted/50">{tierInfo.name}</span>}
              {scan?.user && <span className="text-[9px] px-1.5 py-0.5 rounded bg-boro/10 border border-boro/15 text-boro/50">by {scan.user}</span>}
            </div>
            <p className="text-[10px] text-muted/40 mt-0.5">
              {showEta ? `~${etaMins}m ${String(etaSecs).padStart(2, '0')}s remaining` : 'Scan runs in background — safe to close tab or refresh'}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-[11px] font-mono text-bo/60">
              {hours > 0 ? `${hours}h ${String(mins).padStart(2, '0')}m` : `${mins}:${String(secs).padStart(2, '0')}`}
            </span>
            {showEta && (
              <p className="text-[9px] font-mono text-accent/50 mt-0.5">~{etaMins}m {String(etaSecs).padStart(2, '0')}s left</p>
            )}
          </div>
        </div>

        {/* Stage pipeline */}
        <div className="flex items-center justify-center gap-1 px-1">
          {stages.map((s, i) => {
            const isActive = s.id === stage;
            const isPast = i < stageIdx;
            return (
              <React.Fragment key={s.id}>
                {i > 0 && <div className={`flex-shrink-0 w-4 h-px ${isPast || isActive ? 'bg-bo/30' : 'bg-border/15'}`} />}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-medium transition-all ${
                  isActive ? `${s.color} bg-bright/5 border border-border/10 scale-105` : isPast ? 'text-muted/50' : 'text-muted/20'
                }`}>
                  <span>{s.emoji}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Live stats funnel */}
        {(stats.savedSearches > 0 || stats.totalCompanies > 0) && (
          <div className="flex gap-2 text-[10px] text-muted/40 flex-wrap justify-center">
            {stats.savedSearches > 0 && <span>Ⓗ {stats.savedSearches} searches</span>}
            {stats.totalCompanies > 0 && <span>→ {stats.totalCompanies} companies</span>}
            {stats.sonnetPassed > 0 && <span className="text-boro/60">→ {stats.sonnetPassed} pre-screened</span>}
            {stats.enriched > 0 && <span className="text-accent/60">→ {stats.enriched} enriched</span>}
            {stats.filtered > 0 && <span className="text-accent/60">→ {stats.filtered} filtered</span>}
            {stats.scored > 0 && <span className="text-rose/60">→ {stats.scored} scored 7+</span>}
            {stats.deepScored > 0 && <span className="text-sm/60">→ {stats.deepScored} deep-scored</span>}
          </div>
        )}

        {/* Winners populating — enhanced company cards */}
        {latestWinners.length > 0 && (
          <div className="bg-sm/[0.03] border border-sm/10 rounded-lg p-2.5 space-y-1.5">
            <p className="text-[8px] uppercase tracking-widest text-sm/50 font-bold">Winners Populating ({latestWinners.length})</p>
            {latestWinners.map((c, i) => {
              const phaseIcon = c._phase === 'prescreen' ? '⚡' : c._phase === 'scoring' ? '🎯' : '🧠';
              const hId = c.id || c.entity_id;
              const hLink = hId ? `https://app.harmonic.ai/company/${hId}` : null;
              return (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-sm/[0.04] border border-sm/8 hover:bg-sm/[0.08] transition-all group">
                  <span className="text-[9px] flex-shrink-0">{phaseIcon}</span>
                  {c.logo_url ? (
                    <img src={c.logo_url} alt="" className="w-6 h-6 rounded-md bg-ink/50 flex-shrink-0" onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="w-6 h-6 rounded-md bg-sm/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-[9px]">{(c.name || '?')[0]}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-bright/75 truncate">{c.name}</span>
                      {c.score && <span className="text-[8px] px-1 py-0.5 rounded bg-sm/15 text-sm font-bold">{c.score}/10</span>}
                      {c.funding_stage && <span className="text-[8px] text-muted/25">{c.funding_stage}</span>}
                    </div>
                    {c.reason && <p className="text-[8px] text-muted/35 truncate">{c.reason}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-all">
                    {hLink && (
                      <a href={hLink} target="_blank" rel="noopener" className="text-[7px] px-1 py-0.5 rounded bg-boro/10 text-boro/50 border border-boro/10 hover:bg-boro/20">Ⓗ</a>
                    )}
                    {c.website && (
                      <a href={(typeof c.website === 'object' ? (c.website?.url || '') : c.website || '').startsWith('http') ? (typeof c.website === 'object' ? c.website?.url : c.website) : `https://${typeof c.website === 'object' ? (c.website?.domain || '') : c.website}`} target="_blank" rel="noopener"
                        className="text-[7px] px-1 py-0.5 rounded bg-bo/10 text-bo/50 border border-bo/10 hover:bg-bo/20">🌐</a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cancel + Real Time buttons */}
        <div className="flex items-center justify-between">
          <div>
            {!confirmCancel ? (
              <button onClick={() => setConfirmCancel(true)}
                className="text-[10px] px-3 py-1.5 rounded-lg border border-rose/20 text-rose/60 hover:text-rose hover:border-rose/40 transition-all font-medium">
                Cancel Scan
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-rose/5 border border-rose/20 rounded-lg px-3 py-2">
                <span className="text-[10px] text-rose/70">Cancel?</span>
                <button onClick={() => { onCancel(); setConfirmCancel(false); }}
                  className="text-[10px] px-2.5 py-1 rounded bg-rose/20 border border-rose/30 text-rose font-bold hover:bg-rose/30 transition-all">
                  Yes
                </button>
                <button onClick={() => setConfirmCancel(false)}
                  className="text-[10px] px-2.5 py-1 rounded border border-border/20 text-muted/50 hover:text-bright/60 transition-all">
                  No
                </button>
              </div>
            )}
          </div>
          <button onClick={() => navigate(`/searchagent/live/${scan.id}`)}
            className="text-[10px] px-3 py-1.5 rounded-lg border border-sm/30 bg-sm/10 text-sm hover:bg-sm/20 hover:border-sm/50 transition-all font-bold">
            Real Time ⚡
          </button>
        </div>
      </div>

      {/* Full live feed — enhanced with winner highlights */}
      {feed.length > 0 && (
        <div className="border-t border-border/10 bg-black/20">
          <button onClick={() => setHideFeed(!hideFeed)}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-bright/[0.02] transition-colors">
            <span className="text-[8px] uppercase tracking-widest text-muted/25 font-bold">Full Feed ({feed.length})</span>
            <span className="text-[9px] text-muted/30">{hideFeed ? '▸ Show' : '▾ Hide'}</span>
          </button>
          {!hideFeed && (
            <div className="px-4 pb-3 max-h-[300px] overflow-y-auto">
              <div className="space-y-1">
                {feed.map((f, i) => {
                  const isWinner = f.msg.match(/[✅🌟🏆⭐]/);
                  const isScore = f.msg.match(/(\d+)\/10/);
                  const score = isScore ? parseInt(isScore[1]) : null;
                  const isBatchLine = f.msg.match(/batch \d+/i);

                  return (
                    <div key={f.id} className={`flex items-center gap-1 text-[10px] leading-relaxed rounded px-1 -mx-1 ${
                      isBatchLine ? 'mt-1 pt-1 border-t border-border/5' : ''
                    } ${isWinner ? 'text-sm/60' : ''} ${i === 0 ? 'text-bright/60' : i < 3 ? 'text-muted/45' : 'text-muted/25'}`}>
                      <span className="text-[9px] font-mono text-muted/20 mr-1 flex-shrink-0">{new Date(f.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      <span className="flex-1 truncate">{f.msg}</span>
                      {score !== null && score >= 7 && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-sm/15 text-sm font-bold flex-shrink-0">{score}/10</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Result Card ----

function moneyFmt(val) {
  if (!val) return '';
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val}`;
}

function WebGrowthBadge({ company }) {
  const t = (company.card || company).traction || company.traction || {};
  const g30 = t.webGrowth30d;
  const g90 = t.webGrowth90d;
  const harmonicUrl = company.id && typeof company.id === 'number' ? `https://console.harmonic.ai/dashboard/company/${company.id}?selectedTab=TRACTION` : null;
  const badges = [];
  if (g30 !== null && g30 !== undefined) {
    if (g30 >= 50) badges.push({ label: `🌐▲${Math.round(g30)}%`, period: '1mo', color: 'bg-sm/15 text-sm border-sm/25', url: harmonicUrl });
    else if (g30 <= -30) badges.push({ label: `🌐▼${Math.abs(Math.round(g30))}%`, period: '1mo', color: 'bg-rose/12 text-rose border-rose/20', url: harmonicUrl });
  }
  if (g90 !== null && g90 !== undefined) {
    if (g90 >= 50) badges.push({ label: `🌐▲${Math.round(g90)}%`, period: '3mo', color: 'bg-sm/12 text-sm/70 border-sm/20', url: harmonicUrl });
    else if (g90 <= -30) badges.push({ label: `🌐▼${Math.abs(Math.round(g90))}%`, period: '3mo', color: 'bg-rose/10 text-rose/70 border-rose/15', url: harmonicUrl });
  }
  if (badges.length === 0) return null;
  return badges.map((b, i) => b.url ? (
    <a key={i} href={b.url} target="_blank" rel="noopener" className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border hover:opacity-80 ${b.color}`} title={`${b.period} web traffic — click for Harmonic`}>{b.label} <span className="text-[7px] opacity-60">{b.period}</span></a>
  ) : (
    <span key={i} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${b.color}`}>{b.label} <span className="text-[7px] opacity-60">{b.period}</span></span>
  ));
}

function ResultCard({ result, rank, addFavorite, isFavorited }) {
  const [expanded, setExpanded] = useState(false);
  const cardRaw = result.card || {};
  const card = result.card ? { ...cardRaw, ...result } : result;
  const score = result.score || 0;
  const isFav = isFavorited ? isFavorited(result.name) : false;
  const rawWeb = typeof (card.website || cardRaw.website) === 'object' ? ((card.website || cardRaw.website)?.url || (card.website || cardRaw.website)?.domain || '') : (card.website || cardRaw.website || '');
  const webUrl = rawWeb ? (rawWeb.startsWith('http') ? rawWeb : `https://${rawWeb}`) : null;
  const companyId = card.id || cardRaw.id;

  const scoreColor = score >= 9 ? 'bg-sm/15 text-sm border-sm/30'
    : score >= 7 ? 'bg-bo/15 text-bo border-bo/30'
    : score >= 5 ? 'bg-accent/12 text-accent/70 border-accent/25'
    : 'bg-surface/40 text-muted/60 border-border/20';

  const confidenceColor = result.confidence === 'High' ? 'text-sm/70' : result.confidence === 'Low' ? 'text-rose/60' : 'text-accent/60';
  const rankColor = rank <= 3 ? 'text-accent' : rank <= 10 ? 'text-bo/70' : 'text-muted/40';

  return (
    <div className="rounded-xl border border-border/15 bg-surface/50 p-3.5 space-y-2.5">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center flex-shrink-0 w-7 pt-0.5">
          <span className={`text-[13px] font-bold ${rankColor}`}>#{rank}</span>
        </div>
        {(card.logo_url || cardRaw.logo_url) ? (
          <img src={card.logo_url || cardRaw.logo_url} alt="" className="w-9 h-9 rounded-lg bg-ink/50 flex-shrink-0" onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-boro/10 flex items-center justify-center flex-shrink-0">
            <span className="text-boro font-bold text-sm">{(result.name || '?')[0]}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-bright text-sm truncate">{result.name}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${scoreColor}`}>{score}/10</span>
            {result.confidence && <span className={`text-[9px] ${confidenceColor}`}>{result.confidence}</span>}
            {companyId && typeof companyId === 'number' && <a href={`/company/${companyId}`} className="h-pill" title="Harmonic Card">H</a>}
            {webUrl && <a href={webUrl} target="_blank" rel="noopener" className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-bo/15 text-bo border border-bo/30 hover:bg-bo/20 font-medium">🌐</a>}
          </div>
          <div className="flex gap-1.5 mt-0.5 flex-wrap">
            {card.funding_stage && <span className="text-[9px] px-1.5 py-0.5 rounded-md border bg-bo/8 text-bo/70 border-bo/20">{card.funding_stage}</span>}
            {(card.funding_total || cardRaw.funding_total) > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-md border bg-bo/10 text-bo border-bo/20">💰 {moneyFmt(card.funding_total || cardRaw.funding_total)}</span>}
            {(card.headcount || cardRaw.headcount) > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-md border bg-surface/40 text-muted/50 border-border/20">👥 {card.headcount || cardRaw.headcount}</span>}
            <WebGrowthBadge company={result} />
            {result._sourceSearch && <span className="text-[9px] px-1.5 py-0.5 rounded-md border bg-accent/8 text-accent/60 border-accent/15">🔍 {result._sourceSearch}</span>}
          </div>
        </div>
      </div>

      {(card.description || cardRaw.description) && <p className="text-[10px] text-muted/50 leading-relaxed line-clamp-2 ml-10">{card.description || cardRaw.description}</p>}

      {result.analysis && (
        <div className="ml-10">
          <button onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-boro/60 hover:text-boro transition-colors font-medium">
            {expanded ? '▾ Hide Logic' : '▸ Why #' + rank + '?'}
          </button>
          {expanded && (
            <div className="mt-2 bg-boro/[0.03] border border-boro/12 rounded-lg p-3 text-[11px] text-bright/60 leading-relaxed whitespace-pre-wrap font-mono">
              {result.analysis}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 ml-10">
        <button onClick={() => addFavorite && addFavorite({ ...card, name: result.name, _score: score })}
          className={`text-[10px] px-3 py-1 rounded-lg border font-bold transition-all active:scale-95 ${
            isFav
              ? 'bg-rose/15 border-rose/40 text-rose'
              : 'border-rose/25 text-rose/70 hover:bg-rose/15 hover:border-rose/50 hover:text-rose'
          }`}>
          {isFav ? '❤️ Favorited' : '🤍 Favorite'}
        </button>
        <CrmButton company={{ ...card, name: result.name }} />
        <RemoveMenu company={{ ...card, name: result.name }} variant="icon-lg" />
      </div>
    </div>
  );
}

// ---- History Panel ----

function HistoryPanel({ history, onViewScan, addFavorite, isFavorited }) {
  const [expanded, setExpanded] = useState(null); // scan timestamp
  const [subTab, setSubTab] = useState({}); // { [timestamp]: 'results' | 'logic' }

  if (!history || history.length === 0) {
    return (
      <div className="bg-surface/30 border border-border/15 rounded-xl p-6 text-center">
        <p className="text-muted/40 text-sm">No scan history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((scan, i) => {
        const date = new Date(scan.timestamp);
        const topCount = (scan.results || []).filter(r => r.score >= 7).length;
        const isExpanded = expanded === scan.timestamp;
        const activeTab = subTab[scan.timestamp] || 'results';
        const sortedResults = scan.results ? [...scan.results].sort((a, b) => (b.score || 0) - (a.score || 0)) : [];

        return (
          <div key={scan.timestamp} className="rounded-xl border border-border/15 bg-surface/40 overflow-hidden">
            <button onClick={() => setExpanded(isExpanded ? null : scan.timestamp)}
              className="w-full text-left p-3 hover:bg-surface/60 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{scan.tier?.name ? (TIERS.find(t => t.key === scan.tier?.key)?.emoji || '🔬') : '🔬'}</span>
                  <span className="text-[11px] font-bold text-bright/70">{scan.tier?.name || 'Scan'}</span>
                  <span className="text-[10px] text-muted/40">{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-sm/60">{topCount} rated 7+</span>
                  <span className="text-[10px] text-muted/30">{(scan.results || []).length} total</span>
                  <span className="text-[10px] text-bo/50">{scan.tier?.cost || `$${scan.budgetUsed}`}</span>
                  <span className="text-[10px] text-muted/30">{isExpanded ? '▼' : '▶'}</span>
                </div>
              </div>
              <div className="flex gap-2 text-[9px] text-muted/30 mt-1 ml-6">
                {scan.stats && (
                  <>
                    <span>{scan.stats.totalCompanies} sourced</span>
                    <span>→ {scan.stats.sonnetPassed} screened</span>
                    <span>→ {scan.stats.deepScored} deep-scored</span>
                  </>
                )}
                {scan.duration && <span>· {Math.round(scan.duration / 60)}m</span>}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border/15 p-3 space-y-3">
                {/* Stats funnel */}
                {scan.stats && (
                  <div className="bg-accent/5 border border-accent/12 rounded-lg p-2 flex items-center gap-2 text-[10px] text-accent/60 flex-wrap justify-center">
                    {scan.stats.savedSearches > 0 && <span>Ⓗ {scan.stats.savedSearches} searches</span>}
                    <span>→ {scan.stats.totalCompanies} sourced</span>
                    <span className="text-boro/60">→ {scan.stats.sonnetPassed} pre-screened</span>
                    <span className="text-accent/60">→ {scan.stats.enriched} enriched</span>
                    {scan.stats.filtered > 0 && <span className="text-accent/60">→ {scan.stats.filtered} filtered</span>}
                    {scan.stats.scored > 0 && <span className="text-rose/60">→ {scan.stats.scored} scored 7+</span>}
                    <span className="text-sm/60">→ {scan.stats.deepScored} deep-scored</span>
                    {scan.stats.ddPushed > 0 && <span className="text-sm/70 font-medium">→ {scan.stats.ddPushed} to DD</span>}
                    <span className="text-bo/50">· ${scan.budgetUsed} spent</span>
                  </div>
                )}

                {/* Results / Logic tabs */}
                <div className="flex gap-1 bg-ink/30 rounded-lg p-1">
                  <button onClick={() => setSubTab(prev => ({ ...prev, [scan.timestamp]: 'results' }))}
                    className={`flex-1 text-[10px] py-1.5 rounded-md font-semibold transition-all ${
                      activeTab === 'results' ? 'bg-bo/15 text-bo border border-bo/25' : 'text-muted/50 hover:text-muted/70'
                    }`}>
                    Results ({sortedResults.length})
                  </button>
                  {scan.screenAnalysis && (
                    <button onClick={() => setSubTab(prev => ({ ...prev, [scan.timestamp]: 'logic' }))}
                      className={`flex-1 text-[10px] py-1.5 rounded-md font-semibold transition-all ${
                        activeTab === 'logic' ? 'bg-boro/15 text-boro border border-boro/25' : 'text-muted/50 hover:text-muted/70'
                      }`}>
                      Full Logic
                    </button>
                  )}
                </div>

                {activeTab === 'results' && (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {sortedResults.length === 0 ? (
                      <p className="text-muted/40 text-sm text-center py-4">No results from this scan.</p>
                    ) : sortedResults.map((r, ri) => (
                      <ResultCard key={r.name} result={r} rank={ri + 1} addFavorite={addFavorite} isFavorited={isFavorited} />
                    ))}
                  </div>
                )}

                {activeTab === 'logic' && scan.screenAnalysis && (
                  <div className="bg-boro/[0.03] border border-boro/12 rounded-lg p-3 max-h-[60vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] text-boro/50 uppercase tracking-widest font-bold">Screening & Scoring Logic</p>
                      <button onClick={() => navigator.clipboard.writeText(scan.screenAnalysis).catch(() => {})}
                        className="text-[9px] px-2 py-0.5 rounded border border-boro/20 text-boro/60 hover:bg-boro/10">
                        Copy
                      </button>
                    </div>
                    <pre className="text-[10px] text-muted/50 leading-relaxed whitespace-pre-wrap font-mono">{scan.screenAnalysis}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Results View ----

function ResultsView({ data, addFavorite, isFavorited }) {
  const [showCount, setShowCount] = useState(5);
  const [tab, setTab] = useState('results');

  const sortedResults = data?.results ? [...data.results].sort((a, b) => (b.score || 0) - (a.score || 0)) : [];
  const shown = sortedResults.slice(0, showCount);
  const hasMore = sortedResults.length > showCount;

  return (
    <div className="space-y-4">
      {data.stats && (
        <div className="bg-accent/5 border border-accent/12 rounded-xl p-3 flex items-center gap-2 text-[10px] text-accent/60 flex-wrap justify-center">
          {data.tier?.name && <span className="text-muted/50">{data.tier.name}</span>}
          {data.stats.savedSearches > 0 && <span>Ⓗ {data.stats.savedSearches} searches</span>}
          <span>→ {data.stats.totalCompanies} sourced</span>
          <span className="text-boro/60">→ {data.stats.sonnetPassed} pre-screened</span>
          <span className="text-accent/60">→ {data.stats.enriched} enriched</span>
          {data.stats.filtered > 0 && <span className="text-accent/60">→ {data.stats.filtered} filtered</span>}
          {data.stats.scored > 0 && <span className="text-rose/60">→ {data.stats.scored} scored 7+</span>}
          <span className="text-sm/60">→ {data.stats.deepScored} deep-scored</span>
          <span className="text-rose/60">→ {data.stats.topResults} rated 7+</span>
          {data.stats.ddPushed > 0 && <span className="text-sm/70 font-medium">→ {data.stats.ddPushed} to DD</span>}
          <span className="text-bo/50">· ${data.budgetUsed} spent</span>
          {data.duration && <span className="text-muted/30">· {Math.round(data.duration / 60)}m</span>}
        </div>
      )}

      {data.options && (data.options.includePortcos || data.options.crmStages?.length > 0 || data.options.keywords) && (
        <div className="flex gap-2 text-[9px] text-muted/30 flex-wrap justify-center">
          {data.options.includePortcos && <span className="px-1.5 py-0.5 rounded bg-bo/8 border border-bo/15 text-bo/50">📂 Portcos</span>}
          {data.options.crmStages?.map(s => (
            <span key={s} className="px-1.5 py-0.5 rounded bg-boro/8 border border-boro/15 text-boro/50">{s}</span>
          ))}
          {data.options.keywords && <span className="px-1.5 py-0.5 rounded bg-accent/8 border border-accent/15 text-accent/50">🔑 {data.options.keywords.slice(0, 60)}{data.options.keywords.length > 60 ? '...' : ''}</span>}
        </div>
      )}

      <div className="flex gap-1 bg-ink/30 rounded-lg p-1">
        <button onClick={() => setTab('results')}
          className={`flex-1 text-[11px] py-2 rounded-md font-semibold transition-all ${
            tab === 'results' ? 'bg-bo/15 text-bo border border-bo/25' : 'text-muted/50 hover:text-muted/70'
          }`}>
          📊 Results ({sortedResults.length})
        </button>
        {data.screenAnalysis && (
          <button onClick={() => setTab('logic')}
            className={`flex-1 text-[11px] py-2 rounded-md font-semibold transition-all ${
              tab === 'logic' ? 'bg-boro/15 text-boro border border-boro/25' : 'text-muted/50 hover:text-muted/70'
            }`}>
            🧠 Full Logic
          </button>
        )}
      </div>

      {tab === 'results' && (
        <div className="space-y-2.5">
          {sortedResults.length === 0 && (
            <p className="text-muted/40 text-sm text-center py-4">No results from this scan.</p>
          )}
          {shown.map((r, i) => (
            <ResultCard key={r.name} result={r} rank={i + 1} addFavorite={addFavorite} isFavorited={isFavorited} />
          ))}
          {hasMore && (
            <button onClick={() => setShowCount(prev => prev + 10)}
              className="w-full py-3 rounded-xl border border-bo/15 bg-bo/[0.04] text-bo/60 text-xs font-medium hover:text-bo hover:border-bo/25 transition-all">
              Load 10 More ({sortedResults.length - showCount} remaining)
            </button>
          )}
        </div>
      )}

      {tab === 'logic' && data.screenAnalysis && (
        <div className="bg-boro/[0.03] border border-boro/12 rounded-xl p-4 space-y-3 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-boro/50 uppercase tracking-widest font-bold">Full Screening & Scoring Logic</p>
            <button onClick={() => navigator.clipboard.writeText(data.screenAnalysis).catch(() => {})}
              className="text-[9px] px-2 py-0.5 rounded border border-boro/20 text-boro/60 hover:bg-boro/10 transition-all">
              📋 Copy
            </button>
          </div>
          <div className="text-[11px] text-bright/60 leading-relaxed whitespace-pre-wrap font-mono">{data.screenAnalysis}</div>
        </div>
      )}
    </div>
  );
}

// ---- Main Page ----

export default function RecurringScanPage({ addFavorite, isFavorited }) {
  const [scans, setScans] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedTier, setSelectedTier] = useState('standard');
  const [pageTab, setPageTab] = useState('scan');
  const [viewingScan, setViewingScan] = useState(null);
  const [showNewScan, setShowNewScan] = useState(false);
  const abortRefs = useRef({});

  // Scan options
  const [includePortcos, setIncludePortcos] = useState(false);
  const [crmStages, setCrmStages] = useState([]);
  const [keywords, setKeywords] = useState('');
  const [excludeKeywords, setExcludeKeywords] = useState('');
  const [sectors, setSectors] = useState([]);
  const [stages, setStages] = useState([]);
  const [geos, setGeos] = useState([]);
  const [models, setModels] = useState([]);
  const [signals, setSignals] = useState([]);
  const [maxRaised, setMaxRaised] = useState('');
  const [maxValuation, setMaxValuation] = useState('');
  const [foundedAfter, setFoundedAfter] = useState('');
  const [minTeam, setMinTeam] = useState('');
  const [maxTeam, setMaxTeam] = useState('');
  const [notes, setNotes] = useState('');
  const [expandedFilters, setExpandedFilters] = useState({});
  const [presets, setPresets] = useState(loadPresets());
  const [hScreensProfiles] = useState(loadHScreensProfiles);
  const [jiggleKey, setJiggleKey] = useState(null);
  const [presetScroll, setPresetScroll] = useState(0);
  const presetContainerRef = useRef(null);
  const hScreensRef = useRef(null);
  const [editingPresetId, setEditingPresetId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editPresetName, setEditPresetName] = useState('');

  // Search selection
  const [availableSearches, setAvailableSearches] = useState([]);
  const [selectedSearchIds, setSelectedSearchIds] = useState(null); // null = all

  // Portco selection
  const [availablePortcos, setAvailablePortcos] = useState([]);
  const [selectedPortcos, setSelectedPortcos] = useState(null); // null = all

  const toggleCrmStage = (stage) => {
    setCrmStages(prev => prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]);
  };
  const toggleAllCrm = () => {
    const allKeys = CRM_STAGES.map(s => s.key);
    setCrmStages(prev => prev.length === allKeys.length ? [] : allKeys);
  };

  const toggleSearch = (searchId) => {
    setSelectedSearchIds(prev => {
      if (prev === null) {
        // Was "all" — create set with all except this one
        const all = new Set(availableSearches.map(s => s.id));
        all.delete(searchId);
        return all;
      }
      const next = new Set(prev);
      if (next.has(searchId)) next.delete(searchId);
      else next.add(searchId);
      // If all selected, go back to null
      if (next.size === availableSearches.length) return null;
      return next;
    });
  };

  const toggleAllSearches = () => {
    setSelectedSearchIds(prev => {
      if (prev === null) return new Set();
      return null;
    });
  };

  const togglePortco = (domain) => {
    setSelectedPortcos(prev => {
      if (prev === null) {
        const all = new Set(availablePortcos);
        all.delete(domain);
        return all;
      }
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      if (next.size === availablePortcos.length) return null;
      return next;
    });
  };

  const toggleAllPortcos = () => {
    setSelectedPortcos(prev => prev === null ? new Set() : null);
  };

  const toggleFilter = (setter, value) => {
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const toggleExpanded = (key) => {
    setExpandedFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getCurrentConfig = () => ({
    tier: selectedTier, includePortcos, crmStages, keywords, excludeKeywords,
    sectors, stages, geos, models, signals,
    maxRaised, maxValuation, foundedAfter, minTeam, maxTeam, notes,
    selectedSearchIds: selectedSearchIds === null ? null : [...selectedSearchIds],
    selectedPortcos: selectedPortcos === null ? null : [...selectedPortcos],
  });

  const applyPreset = (preset) => {
    setSelectedTier(preset.tier || 'standard');
    setIncludePortcos(preset.includePortcos || false);
    setCrmStages(preset.crmStages || []);
    setKeywords(preset.keywords || '');
    setExcludeKeywords(preset.excludeKeywords || '');
    setSectors(preset.sectors || []);
    setStages(preset.stages || []);
    setGeos(preset.geos || []);
    setModels(preset.models || []);
    setSignals(preset.signals || []);
    setMaxRaised(preset.maxRaised || '');
    setMaxValuation(preset.maxValuation || '');
    setFoundedAfter(preset.foundedAfter || '');
    setMinTeam(preset.minTeam || '');
    setMaxTeam(preset.maxTeam || '');
    setNotes(preset.notes || '');
    if (preset.selectedSearchIds) setSelectedSearchIds(new Set(preset.selectedSearchIds));
    if (preset.selectedPortcos) setSelectedPortcos(new Set(preset.selectedPortcos));
    // Jiggle animation
    setJiggleKey(Date.now());
    setTimeout(() => setJiggleKey(null), 600);
  };

  const saveCurrentAsPreset = () => {
    const name = prompt('Name this scan:');
    if (!name) return;
    const config = getCurrentConfig();
    const updated = [...presets, { ...config, name, id: Date.now(), user: localStorage.getItem('crm_user') || 'Mark' }];
    setPresets(updated);
    savePresets(updated);
  };

  const deletePreset = (id) => {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    savePresets(updated);
  };

  const updatePresetFromCurrent = (id) => {
    const config = getCurrentConfig();
    const updated = presets.map(p => p.id === id ? { ...p, ...config } : p);
    setPresets(updated);
    savePresets(updated);
    setEditingPresetId(null);
  };

  const applyHScreensProfile = (profile) => {
    setSectors(profile.sectors || []);
    setStages(profile.stages || []);
    setGeos(profile.geos || []);
    setModels(profile.models || []);
    setSignals(profile.signals || []);
    setKeywords(profile.keywords || '');
    setExcludeKeywords(profile.antiKeywords || '');
    setMaxRaised(profile.maxRaised || '');
    setMaxValuation(profile.maxValuation || '');
    setFoundedAfter(profile.foundedAfter || '');
    setMinTeam(profile.minHeadcount || profile.minTeam || '');
    setMaxTeam(profile.maxHeadcount || profile.maxTeam || '');
    setNotes(profile.notes || '');
    // If the profile has savedSearchIds, map them to our search selection
    if (profile.savedSearchIds && profile.savedSearchIds.length > 0) {
      const ids = new Set(profile.savedSearchIds.map(s => typeof s === 'object' ? String(s.id) : String(s)));
      setSelectedSearchIds(ids);
    }
    // Jiggle
    setJiggleKey(Date.now());
    setTimeout(() => setJiggleKey(null), 600);
  };

  const scrollHScreens = (dir) => {
    if (hScreensRef.current) hScreensRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSelectedTier('standard');
    setIncludePortcos(false);
    setCrmStages([]);
    setKeywords('');
    setExcludeKeywords('');
    setSectors([]);
    setStages([]);
    setGeos([]);
    setModels([]);
    setSignals([]);
    setMaxRaised('');
    setMaxValuation('');
    setFoundedAfter('');
    setMinTeam('');
    setMaxTeam('');
    setNotes('');
    setSelectedSearchIds(null);
    setSelectedPortcos(null);
    setExpandedFilters({});
  };

  const renamePreset = (id, newName) => {
    const updated = presets.map(p => p.id === id ? { ...p, name: newName } : p);
    setPresets(updated);
    savePresets(updated);
  };

  const scrollPresets = (dir) => {
    if (presetContainerRef.current) {
      presetContainerRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
    }
  };

  // Poll status
  useEffect(() => {
    fetchStatus();
    fetchResults();
    fetchHistory();
    fetchSearches();
    fetchPortcos();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/recurring-scan/status`);
      const data = await r.json();
      const scanList = data.scans || [];
      setScans(scanList);
      // Don't force user back to scan tab — they may be viewing history
    } catch (e) {}
    setInitialLoading(false);
  };

  const fetchResults = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/recurring-scan/results`);
      const data = await r.json();
      if (data.results && data.results.length > 0) setResults(data);
    } catch (e) {}
  };

  const fetchHistory = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/recurring-scan/history`);
      const data = await r.json();
      if (Array.isArray(data)) setHistory(data);
    } catch (e) {}
  };

  const fetchSearches = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/recurring-scan/searches`);
      const data = await r.json();
      if (Array.isArray(data)) setAvailableSearches(data);
    } catch (e) {}
  };

  const fetchPortcos = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/recurring-scan/portcos`);
      const data = await r.json();
      if (Array.isArray(data)) setAvailablePortcos(data);
    } catch (e) {}
  };

  const crmUser = localStorage.getItem('crm_user') || 'Mark';

  const startScan = async () => {
    setShowNewScan(false);
    setViewingScan(null);
    setPageTab('scan');

    const searchesToSend = selectedSearchIds === null ? [] : [...selectedSearchIds];

    try {
      const controller = new AbortController();

      const res = await fetch(`${API_BASE}/api/recurring-scan`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          tier: selectedTier, includePortcos, crmStages, keywords, excludeKeywords,
          sectors, stages, geos, models, signals,
          maxRaised, maxValuation, foundedAfter, minTeam, maxTeam, notes,
          selectedSearches: searchesToSend,
          selectedPortcos: selectedPortcos === null ? null : [...selectedPortcos],
          user: crmUser,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        console.error('Scan request failed:', res.status);
        fetchStatus();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let currentScanId = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.scanId) {
                currentScanId = d.scanId;
                abortRefs.current[currentScanId] = controller;
              }
            } catch {}
          } else if (line.startsWith(': ') && line.length > 2 && currentScanId) {
            const comment = line.slice(2).trim();
            if (comment && comment !== 'keepalive') {
              setScans(prev => {
                const idx = prev.findIndex(s => s.id === currentScanId);
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = { ...updated[idx], progress: comment };
                  return updated;
                }
                return [...prev, { id: currentScanId, status: 'scanning', progress: comment, startedAt: Date.now(), user: crmUser, tier: TIERS.find(t => t.key === selectedTier) }];
              });
            }
          }
        }
      }

      const dataLine = fullText.split('\n').filter(l => l.startsWith('data: ')).pop();
      if (dataLine) {
        try {
          const data = JSON.parse(dataLine.slice(6));
          if (!data.error && data.results) {
            setResults(data);
            // Save 7+/10 results to Top Picks
            try {
              const userId = (crmUser || 'mark').toLowerCase();
              const resultsWithScores = (data.results || []).map(r => ({
                ...r.card, name: r.name, _score: r.score || 0,
                _sourceSearchName: r._sourceSearch || 'Scan Agent',
              }));
              autoSaveTopPicks(userId, resultsWithScores, '', `Scan Agent (${selectedTierObj?.name || selectedTier})`, 'deep-scan');
            } catch (e) { console.warn('[TopPicks] Save error:', e); }
          }
        } catch (e) {}
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error('Scan error:', e);
    }

    fetchStatus();
    fetchResults();
    fetchHistory();
  };

  const cancelScan = async (scanId) => {
    if (scanId && abortRefs.current[scanId]) {
      abortRefs.current[scanId].abort();
      delete abortRefs.current[scanId];
    }
    try {
      await fetch(`${API_BASE}/api/recurring-scan/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: scanId }),
      });
    } catch (e) {}
    fetchStatus();
  };

  const runningScans = scans.filter(s => s.status === 'scanning');
  const interruptedScans = scans.filter(s => s.status === 'interrupted');
  const hasRunning = runningScans.length > 0;
  const activeResults = viewingScan || results;

  // Always show create form on scan tab
  const showCreateForm = true;

  // Dynamic company count and cost estimate
  // Use 500 as fallback per search if server hasn't cached counts yet
  const DEFAULT_PER_SEARCH = 500;
  const selectedCompanyCount = availableSearches.reduce((sum, s) => {
    if (selectedSearchIds !== null && !selectedSearchIds.has(s.id)) return sum;
    const rc = s.resultCount;
    const count = typeof rc === 'string' ? parseInt(rc.replace(/[^0-9]/g, '')) || DEFAULT_PER_SEARCH : (rc || DEFAULT_PER_SEARCH);
    return sum + count;
  }, 0);
  const selectedTierObj = TIERS.find(t => t.key === selectedTier);
  const dynamicCostEstimate = (() => {
    if (!selectedCompanyCount || !selectedTierObj) return null;
    const maxCost = parseFloat(selectedTierObj.cost.replace('$', ''));
    const bases = { scout: 5, standard: 6, deep: 8, sweep: 10, maximum: 12 };
    const perCompany = { scout: 0.001, standard: 0.002, deep: 0.004, sweep: 0.006, maximum: 0.008 };
    const floors = { scout: 7, standard: 10, deep: 18, sweep: 26, maximum: 35 };
    const raw = (bases[selectedTier] || 5) + selectedCompanyCount * (perCompany[selectedTier] || 0.002);
    return Math.max(floors[selectedTier] || 7, Math.min(maxCost, raw)).toFixed(2);
  })();

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-serif text-xl font-semibold text-bright">🔬 Scan Agent</h1>
          <p className="text-[11px] text-muted/40 mt-1">AI-powered pipeline across all Harmonic saved searches</p>
        </div>
        <span className="text-[11px] text-bo/70 font-medium">{crmUser}</span>
      </div>

      {/* Loading state — prevents flash of create form on refresh */}
      {initialLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-bo border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-sm text-muted/40">Loading scan status...</span>
        </div>
      )}

      {!initialLoading && (
        <>
          {/* Page tabs */}
          <div className="flex gap-1 bg-ink/30 rounded-lg p-1 mb-5">
            <button onClick={() => { setPageTab('scan'); setViewingScan(null); }}
              className={`flex-1 text-[11px] py-2 rounded-md font-semibold transition-all ${
                pageTab === 'scan' ? 'bg-bo/15 text-bo border border-bo/25' : 'text-muted/50 hover:text-muted/70'
              }`}>
              {hasRunning ? `🚀 New Scan (${runningScans.length} running)` : '🚀 New Scan'}
            </button>
            <button onClick={() => setPageTab('history')}
              className={`flex-1 text-[11px] py-2 rounded-md font-semibold transition-all ${
                pageTab === 'history' ? 'bg-boro/15 text-boro border border-boro/25' : 'text-muted/50 hover:text-muted/70'
              }`}>
              📜 History ({history.length})
            </button>
          </div>

          {/* ---- SCAN TAB ---- */}
          {pageTab === 'scan' && (
            <>
              {/* Interrupted banners */}
              {interruptedScans.map(scan => (
                <div key={scan.id} className="mb-4 bg-accent/8 border border-accent/20 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-accent/80 text-sm font-medium">⚠️ Scan interrupted {scan.tier?.name ? `(${scan.tier.name})` : ''}</p>
                      <p className="text-[10px] text-muted/40 mt-1">{scan.progress || 'Server restarted while scan was running'}</p>
                      {scan.user && <p className="text-[9px] text-muted/30 mt-0.5">Started by {scan.user}</p>}
                    </div>
                    <button onClick={() => cancelScan(scan.id)}
                      className="text-[10px] px-3 py-1.5 rounded-lg border border-accent/25 text-accent/60 hover:text-accent font-medium flex-shrink-0">
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}

              {/* Running scan panels */}
              {runningScans.map(scan => (
                <div key={scan.id} className="mb-4">
                  <ScanProgress scan={scan} onCancel={() => cancelScan(scan.id)} />
                </div>
              ))}

              {/* Create scan form — always visible on scan tab */}
              {showCreateForm && (
                <div className="space-y-5">

                  {/* Saved Scans — current user first, then others via scroll */}
                  {(() => {
                    const currentUser = (localStorage.getItem('crm_user') || 'Mark').toLowerCase();
                    // Current user's saved scans + H Screens profiles
                    const myPresets = presets.filter(p => !p.user || p.user.toLowerCase() === currentUser);
                    const myHScreens = hScreensProfiles.filter(p => p._ownerId === currentUser);
                    const othersPresets = presets.filter(p => p.user && p.user.toLowerCase() !== currentUser);
                    const othersHScreens = hScreensProfiles.filter(p => p._ownerId !== currentUser);
                    // Ordered: my saved scans → my H Screens → others' saved scans → others' H Screens
                    const allItems = [
                      ...myPresets.map(p => ({ ...p, _type: 'preset', _mine: true })),
                      ...myHScreens.map((p, i) => ({ ...p, _type: 'hscreen', _mine: true, _key: `hs-${p._ownerId}-${p.id || i}` })),
                      ...othersPresets.map(p => ({ ...p, _type: 'preset', _mine: false })),
                      ...othersHScreens.map((p, i) => ({ ...p, _type: 'hscreen', _mine: false, _key: `hs-${p._ownerId}-${p.id || i}` })),
                    ];
                    const myCount = myPresets.length + myHScreens.length;

                    return (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-muted/50 uppercase tracking-widest font-bold">Saved Scans</p>
                          <div className="flex gap-1.5 items-center">
                            <button onClick={() => scrollPresets(-1)} className="text-[10px] px-1.5 py-0.5 rounded border border-border/20 text-muted/40 hover:text-muted/60">◀</button>
                            <button onClick={() => scrollPresets(1)} className="text-[10px] px-1.5 py-0.5 rounded border border-border/20 text-muted/40 hover:text-muted/60">▶</button>
                            <button onClick={() => setEditMode(!editMode)}
                              className={`text-[9px] px-2 py-0.5 rounded border font-medium transition-all ${
                                editMode ? 'bg-accent/15 border-accent/30 text-accent' : 'border-border/20 text-muted/40 hover:text-muted/60'
                              }`}>
                              {editMode ? 'Done' : 'Edit'}
                            </button>
                          </div>
                        </div>
                        <div ref={presetContainerRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-1" style={{ scrollBehavior: 'smooth' }}>
                          {allItems.map((item, idx) => {
                            // Divider between mine and others
                            const showDivider = idx === myCount && myCount > 0 && idx < allItems.length;

                            return (
                              <React.Fragment key={item._key || item.id || idx}>
                                {showDivider && (
                                  <div className="flex-shrink-0 flex items-center px-1">
                                    <div className="w-px h-6 bg-border/20" />
                                  </div>
                                )}
                                <div className="flex-shrink-0 relative">
                                  {item._type === 'preset' && editMode && editingPresetId === item.id ? (
                                    <div className="flex items-center gap-1 bg-surface/60 border border-accent/30 rounded-lg px-2 py-1.5">
                                      <input type="text" value={editPresetName} onChange={e => setEditPresetName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { renamePreset(item.id, editPresetName); setEditingPresetId(null); } }}
                                        className="bg-transparent text-[10px] text-bright w-24 outline-none" autoFocus />
                                      <button onClick={() => { renamePreset(item.id, editPresetName); setEditingPresetId(null); }}
                                        className="text-[9px] text-sm">✓</button>
                                      <button onClick={() => updatePresetFromCurrent(item.id)}
                                        className="text-[9px] text-bo ml-1" title="Update with current filters">↻</button>
                                      <button onClick={() => deletePreset(item.id)}
                                        className="text-[9px] text-rose ml-1">✕</button>
                                    </div>
                                  ) : (
                                    <button onClick={() => {
                                      if (item._type === 'preset' && editMode) { setEditingPresetId(item.id); setEditPresetName(item.name); }
                                      else if (item._type === 'preset') applyPreset(item);
                                      else applyHScreensProfile(item);
                                    }}
                                      className={`text-[10px] px-3 py-2 rounded-lg border font-medium whitespace-nowrap transition-all ${
                                        editMode && item._type === 'preset'
                                          ? 'border-accent/25 bg-accent/8 text-accent/70 hover:bg-accent/15'
                                          : item._type === 'hscreen'
                                            ? 'border-bo/20 bg-bo/8 text-bo/70 hover:bg-bo/15 hover:text-bo'
                                            : 'border-boro/20 bg-boro/8 text-boro/70 hover:bg-boro/15 hover:text-boro'
                                      }`}>
                                      {editMode && item._type === 'preset' && <span className="mr-1">✎</span>}
                                      {!item._mine && <span className="text-[8px] text-muted/30 mr-1">{item.user || item._owner}</span>}
                                      {item.name || 'Main Scan'}
                                      {item._type === 'hscreen' && !item._mine && <span className="text-[8px] text-bo/30 ml-1">H</span>}
                                    </button>
                                  )}
                                </div>
                              </React.Fragment>
                            );
                          })}
                          {allItems.length === 0 && (
                            <p className="text-[9px] text-muted/25 py-1">No saved scans yet — configure filters and click "Save Search"</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Scan Options */}
                  <div className={`rounded-xl border border-border/15 bg-surface/30 p-4 space-y-4 transition-all fill-cascade ${jiggleKey ? 'filling' : ''}`}>
                    <style>{`
                      @keyframes fillin { 0% { background-color: rgba(56,189,248,0.12); } 100% { background-color: transparent; } }
                      .fill-cascade > .filter-row { transition: all 0.3s; }
                      .fill-cascade.filling > .filter-row:nth-child(2) { animation: fillin 0.6s 0.05s both; }
                      .fill-cascade.filling > .filter-row:nth-child(3) { animation: fillin 0.6s 0.12s both; }
                      .fill-cascade.filling > .filter-row:nth-child(4) { animation: fillin 0.6s 0.19s both; }
                      .fill-cascade.filling > .filter-row:nth-child(5) { animation: fillin 0.6s 0.26s both; }
                      .fill-cascade.filling > .filter-row:nth-child(6) { animation: fillin 0.6s 0.33s both; }
                      .fill-cascade.filling > .filter-row:nth-child(7) { animation: fillin 0.6s 0.40s both; }
                      .fill-cascade.filling > .filter-row:nth-child(8) { animation: fillin 0.6s 0.47s both; }
                      .fill-cascade.filling > .filter-row:nth-child(9) { animation: fillin 0.6s 0.54s both; }
                      .fill-cascade.filling > .filter-row:nth-child(10) { animation: fillin 0.6s 0.61s both; }
                      .fill-cascade.filling > .filter-row:nth-child(11) { animation: fillin 0.6s 0.68s both; }
                      .fill-cascade.filling > .filter-row:nth-child(12) { animation: fillin 0.6s 0.75s both; }
                    `}</style>

                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted/50 uppercase tracking-widest font-bold">Search Filters</p>
                      <button onClick={clearFilters}
                        className="text-[9px] px-2 py-0.5 rounded border border-border/20 text-muted/40 hover:text-rose hover:border-rose/30 font-medium transition-all">
                        Clear
                      </button>
                    </div>

                    {/* Saved Search Selection */}
                    <div className="filter-row rounded-lg"><SearchSelector
                      searches={availableSearches}
                      selectedIds={selectedSearchIds}
                      onToggle={toggleSearch}
                      onToggleAll={toggleAllSearches}
                    /></div>

                    {/* Sectors */}
                    <div className="filter-row rounded-lg space-y-1.5">
                      <button onClick={() => toggleExpanded('sectors')} className="flex items-center gap-2 w-full text-left">
                        <span className="text-[9px] text-muted/40">{expandedFilters.sectors ? '▾' : '▸'}</span>
                        <span className="text-[11px] text-bright/60 font-medium">Sectors</span>
                        {sectors.length > 0 && <span className="text-[9px] text-bo/60 font-bold ml-auto">{sectors.length} selected</span>}
                      </button>
                      {expandedFilters.sectors && (
                        <div className="flex gap-1.5 flex-wrap">
                          {SECTORS.map(s => (
                            <button key={s} onClick={() => toggleFilter(setSectors, s)}
                              className={`text-[9px] px-2 py-1 rounded-md border transition-all ${
                                sectors.includes(s) ? 'bg-bo/15 border-bo/30 text-bo' : 'border-border/20 text-muted/40 hover:text-muted/60'
                              }`}>{sectors.includes(s) ? '✓ ' : ''}{s}</button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stages */}
                    <div className="filter-row rounded-lg space-y-1.5">
                      <button onClick={() => toggleExpanded('stages')} className="flex items-center gap-2 w-full text-left">
                        <span className="text-[9px] text-muted/40">{expandedFilters.stages ? '▾' : '▸'}</span>
                        <span className="text-[11px] text-bright/60 font-medium">Stage</span>
                        {stages.length > 0 && <span className="text-[9px] text-boro/60 font-bold ml-auto">{stages.length} selected</span>}
                      </button>
                      {expandedFilters.stages && (
                        <div className="flex gap-1.5 flex-wrap">
                          {STAGES.map(s => (
                            <button key={s} onClick={() => toggleFilter(setStages, s)}
                              className={`text-[9px] px-2 py-1 rounded-md border transition-all ${
                                stages.includes(s) ? 'bg-boro/15 border-boro/30 text-boro' : 'border-border/20 text-muted/40 hover:text-muted/60'
                              }`}>{stages.includes(s) ? '✓ ' : ''}{s}</button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Geography */}
                    <div className="filter-row rounded-lg space-y-1.5">
                      <button onClick={() => toggleExpanded('geos')} className="flex items-center gap-2 w-full text-left">
                        <span className="text-[9px] text-muted/40">{expandedFilters.geos ? '▾' : '▸'}</span>
                        <span className="text-[11px] text-bright/60 font-medium">Geography</span>
                        {geos.length > 0 && <span className="text-[9px] text-sm/60 font-bold ml-auto">{geos.length} selected</span>}
                      </button>
                      {expandedFilters.geos && (
                        <div className="flex gap-1.5 flex-wrap">
                          {GEOS.map(g => (
                            <button key={g} onClick={() => toggleFilter(setGeos, g)}
                              className={`text-[9px] px-2 py-1 rounded-md border transition-all ${
                                geos.includes(g) ? 'bg-sm/15 border-sm/30 text-sm' : 'border-border/20 text-muted/40 hover:text-muted/60'
                              }`}>{geos.includes(g) ? '✓ ' : ''}{g}</button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Business Model */}
                    <div className="filter-row rounded-lg space-y-1.5">
                      <button onClick={() => toggleExpanded('models')} className="flex items-center gap-2 w-full text-left">
                        <span className="text-[9px] text-muted/40">{expandedFilters.models ? '▾' : '▸'}</span>
                        <span className="text-[11px] text-bright/60 font-medium">Business Model</span>
                        {models.length > 0 && <span className="text-[9px] text-accent/60 font-bold ml-auto">{models.length} selected</span>}
                      </button>
                      {expandedFilters.models && (
                        <div className="flex gap-1.5 flex-wrap">
                          {MODELS.map(m => (
                            <button key={m} onClick={() => toggleFilter(setModels, m)}
                              className={`text-[9px] px-2 py-1 rounded-md border transition-all ${
                                models.includes(m) ? 'bg-accent/15 border-accent/30 text-accent' : 'border-border/20 text-muted/40 hover:text-muted/60'
                              }`}>{models.includes(m) ? '✓ ' : ''}{m}</button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Deal Signals */}
                    <div className="filter-row rounded-lg space-y-1.5">
                      <button onClick={() => toggleExpanded('signals')} className="flex items-center gap-2 w-full text-left">
                        <span className="text-[9px] text-muted/40">{expandedFilters.signals ? '▾' : '▸'}</span>
                        <span className="text-[11px] text-bright/60 font-medium">Deal Signals</span>
                        {signals.length > 0 && <span className="text-[9px] text-rose/60 font-bold ml-auto">{signals.length} selected</span>}
                      </button>
                      {expandedFilters.signals && (
                        <div className="flex gap-1.5 flex-wrap">
                          {SIGNALS.map(s => (
                            <button key={s} onClick={() => toggleFilter(setSignals, s)}
                              className={`text-[9px] px-2 py-1 rounded-md border transition-all ${
                                signals.includes(s) ? 'bg-rose/15 border-rose/30 text-rose' : 'border-border/20 text-muted/40 hover:text-muted/60'
                              }`}>{signals.includes(s) ? '✓ ' : ''}{s}</button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Numeric Filters */}
                    <div className="filter-row rounded-lg space-y-1.5">
                      <button onClick={() => toggleExpanded('numerics')} className="flex items-center gap-2 w-full text-left">
                        <span className="text-[9px] text-muted/40">{expandedFilters.numerics ? '▾' : '▸'}</span>
                        <span className="text-[11px] text-bright/60 font-medium">$ Raised / Team / Founded</span>
                        {(maxRaised || maxValuation || foundedAfter || minTeam || maxTeam) && <span className="text-[9px] text-bo/60 font-bold ml-auto">set</span>}
                      </button>
                      {expandedFilters.numerics && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-muted/40">Max Raised</label>
                            <input type="text" value={maxRaised} onChange={e => setMaxRaised(e.target.value)}
                              placeholder="$5M" className="w-full bg-ink/50 border border-border/25 rounded-lg px-2 py-1.5 text-[10px] text-bright outline-none focus:border-bo/35 placeholder:text-bright/15" />
                          </div>
                          <div>
                            <label className="text-[9px] text-muted/40">Max Valuation</label>
                            <input type="text" value={maxValuation} onChange={e => setMaxValuation(e.target.value)}
                              placeholder="$30M" className="w-full bg-ink/50 border border-border/25 rounded-lg px-2 py-1.5 text-[10px] text-bright outline-none focus:border-bo/35 placeholder:text-bright/15" />
                          </div>
                          <div>
                            <label className="text-[9px] text-muted/40">Min Team</label>
                            <input type="text" value={minTeam} onChange={e => setMinTeam(e.target.value)}
                              placeholder="2" className="w-full bg-ink/50 border border-border/25 rounded-lg px-2 py-1.5 text-[10px] text-bright outline-none focus:border-bo/35 placeholder:text-bright/15" />
                          </div>
                          <div>
                            <label className="text-[9px] text-muted/40">Max Team</label>
                            <input type="text" value={maxTeam} onChange={e => setMaxTeam(e.target.value)}
                              placeholder="50" className="w-full bg-ink/50 border border-border/25 rounded-lg px-2 py-1.5 text-[10px] text-bright outline-none focus:border-bo/35 placeholder:text-bright/15" />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[9px] text-muted/40">Founded After</label>
                            <input type="text" value={foundedAfter} onChange={e => setFoundedAfter(e.target.value)}
                              placeholder="2022" className="w-full bg-ink/50 border border-border/25 rounded-lg px-2 py-1.5 text-[10px] text-bright outline-none focus:border-bo/35 placeholder:text-bright/15" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Portcos selector */}
                    <PortcoSelector
                      portcos={availablePortcos}
                      enabled={includePortcos}
                      onToggleEnabled={() => setIncludePortcos(!includePortcos)}
                      selectedIds={selectedPortcos}
                      onToggle={togglePortco}
                      onToggleAll={toggleAllPortcos}
                    />

                    {/* CRM Stages */}
                    <div className="filter-row rounded-lg space-y-1.5">
                      <button onClick={() => toggleExpanded('crm')} className="flex items-center gap-2 w-full text-left">
                        <span className="text-[9px] text-muted/40">{expandedFilters.crm ? '▾' : '▸'}</span>
                        <span className="text-[11px] text-bright/60 font-medium">CRM Pipeline Similarity</span>
                        {crmStages.length > 0 && <span className="text-[9px] text-bo/60 font-bold ml-auto">{crmStages.length} stages</span>}
                      </button>
                      {expandedFilters.crm && (
                        <div className="space-y-1.5">
                          <div className="flex gap-2 flex-wrap">
                            {CRM_STAGES.map(s => {
                              const isOn = crmStages.includes(s.key);
                              const colors = tierColors[s.color];
                              return (
                                <button key={s.key} onClick={() => toggleCrmStage(s.key)}
                                  className={`text-[10px] px-3 py-1.5 rounded-lg border font-bold transition-all ${
                                    isOn ? `${colors.activeBg} ${colors.activeBorder} ${colors.text}` : `${colors.bg} ${colors.border} text-muted/50 hover:text-muted/70`
                                  }`}>
                                  {isOn ? '✓ ' : ''}{s.label}
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-[9px] text-muted/30">Boosts companies similar to those in your pipeline</p>
                        </div>
                      )}
                    </div>

                    {/* Keywords */}
                    <div className="filter-row rounded-lg space-y-1.5">
                      <label className="text-[11px] text-bright/60 font-medium">Priority Keywords</label>
                      <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)}
                        placeholder="e.g. prediction markets, AI agents, crypto exchange..."
                        className="w-full bg-ink/50 border border-border/25 rounded-lg px-3 py-2 text-xs text-bright outline-none focus:border-bo/35 transition-colors placeholder:text-bright/15" />
                    </div>

                    {/* Exclude Keywords */}
                    <div className="filter-row rounded-lg space-y-1.5">
                      <label className="text-[11px] text-bright/60 font-medium">Exclude Keywords</label>
                      <input type="text" value={excludeKeywords} onChange={e => setExcludeKeywords(e.target.value)}
                        placeholder="e.g. consulting, NFT collection, metaverse..."
                        className="w-full bg-ink/50 border border-border/25 rounded-lg px-3 py-2 text-xs text-bright outline-none focus:border-bo/35 transition-colors placeholder:text-bright/15" />
                    </div>

                    {/* Notes for AI */}
                    <div className="filter-row rounded-lg space-y-1.5">
                      <button onClick={() => toggleExpanded('notes')} className="flex items-center gap-2 w-full text-left">
                        <span className="text-[9px] text-muted/40">{expandedFilters.notes ? '▾' : '▸'}</span>
                        <span className="text-[11px] text-bright/60 font-medium">Notes for AI</span>
                        {notes && <span className="text-[9px] text-boro/60 font-bold ml-auto">set</span>}
                      </button>
                      {expandedFilters.notes && (
                        <textarea value={notes} onChange={e => setNotes(e.target.value)}
                          placeholder="Anything specific for the AI to prioritize or look for..."
                          rows={3} className="w-full bg-ink/50 border border-border/25 rounded-lg px-3 py-2 text-xs text-bright outline-none focus:border-bo/35 transition-colors placeholder:text-bright/15 resize-none" />
                      )}
                    </div>
                  </div>

                  {/* Scan Depth — at bottom before launch */}
                  <div>
                    <p className="text-[10px] text-muted/50 uppercase tracking-widest font-bold mb-2">Select Scan Depth</p>
                    <TierSelector selected={selectedTier} onSelect={setSelectedTier}
                      totalCompanies={selectedCompanyCount} />
                  </div>

                  {/* Action buttons — Save above Run */}
                  <div className="space-y-2">
                    <button onClick={saveCurrentAsPreset}
                      className="w-full px-4 py-2.5 rounded-xl border border-boro/20 bg-boro/6 text-boro/60 font-medium text-xs hover:bg-boro/12 hover:text-boro transition-all active:scale-[0.98]">
                      Save Search
                    </button>
                    <button onClick={startScan} disabled={selectedSearchIds !== null && selectedSearchIds.size === 0}
                      className="w-full px-6 py-3 rounded-xl bg-bo/15 border border-bo/30 text-bo font-bold text-sm hover:bg-bo/25 hover:border-bo/50 transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">
                      Run {selectedTierObj?.name} Scan {dynamicCostEstimate ? `(~$${dynamicCostEstimate})` : `(${selectedTierObj?.cost} max)`}
                    </button>
                  </div>
                </div>
              )}

              {/* Results now live in History tab */}
            </>
          )}

          {/* ---- HISTORY TAB ---- */}
          {pageTab === 'history' && (
            <div className="space-y-4">
              {viewingScan ? (
                <>
                  <button onClick={() => setViewingScan(null)} className="text-[10px] text-bo/60 hover:text-bo font-medium">← Back to History</button>
                  <ResultsView data={viewingScan} addFavorite={addFavorite} isFavorited={isFavorited} />
                </>
              ) : (
                <HistoryPanel history={history} onViewScan={(scan) => setViewingScan(scan)} addFavorite={addFavorite} isFavorited={isFavorited} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
