import React, { useState, useEffect, useCallback } from 'react';
import FindSimilar from '../components/FindSimilar';
import { CrmButton } from '../components/CrmButton';

const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';

// Web growth badge — shows on company cards when growth is significant
function WebGrowthBadge({ company }) {
  const t = company.traction || {};
  const g30 = t.webGrowth30d;
  const g90 = t.webGrowth90d;
  const harmonicUrl = company.id && typeof company.id === 'number' ? `https://console.harmonic.ai/dashboard/company/${company.id}?selectedTab=TRACTION` : null;

  const badges = [];

  if (g30 !== null && g30 !== undefined) {
    if (g30 >= 50) {
      badges.push({ label: `🌐▲${Math.round(g30)}%`, period: '1mo', color: 'bg-sm/15 text-sm border-sm/25', url: harmonicUrl });
    } else if (g30 <= -30) {
      badges.push({ label: `🌐▼${Math.abs(Math.round(g30))}%`, period: '1mo', color: 'bg-rose/12 text-rose border-rose/20', url: harmonicUrl });
    }
  }

  if (g90 !== null && g90 !== undefined) {
    if (g90 >= 50) {
      badges.push({ label: `🌐▲${Math.round(g90)}%`, period: '3mo', color: 'bg-sm/12 text-sm/70 border-sm/20', url: harmonicUrl });
    } else if (g90 <= -30) {
      badges.push({ label: `🌐▼${Math.abs(Math.round(g90))}%`, period: '3mo', color: 'bg-rose/10 text-rose/70 border-rose/15', url: harmonicUrl });
    }
  }

  if (badges.length === 0) return null;

  return badges.map((b, i) => (
    b.url ? (
      <a key={i} href={b.url} target="_blank" rel="noopener"
        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border cursor-pointer hover:opacity-80 transition-opacity ${b.color}`}
        title={`${b.period} web traffic growth — click for Harmonic traction`}>
        {b.label} <span className="text-[7px] opacity-60">{b.period}</span>
      </a>
    ) : (
      <span key={i} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${b.color}`} title={`${b.period} web traffic growth`}>
        {b.label} <span className="text-[7px] opacity-60">{b.period}</span>
      </span>
    )
  ));
}

const PARTNERS = [
  { id: 'mark', name: 'Mark', emoji: '🦅' },
  { id: 'joe', name: 'Joe', emoji: '🦁' },
  { id: 'liam', name: 'Liam', emoji: '🦊' },
  { id: 'carlo', name: 'Carlo', emoji: '🐻' },
  { id: 'jake', name: 'Jake', emoji: '🐺' },
  { id: 'serena', name: 'Serena', emoji: '🦋' },
];

const ALL_TEAM = [...PARTNERS];

function sourceInfo(source, sourceMeta) {
  if (!source && !sourceMeta) return null;
  
  const personId = sourceMeta?.personId || (source ? source.split(':')[1] : '') || '';
  const person = ALL_TEAM.find(p => p.id === personId);
  const personLabel = person ? `${person.emoji} ${person.name}` : '';
  const profileName = sourceMeta?.profileName || null;

  let typeLabel = '';
  let color = 'text-muted/40';

  if (source?.includes('scan-agent') || source?.includes('recurring-scan')) {
    typeLabel = 'Scan Agent';
    color = 'text-sm/60';
  } else if (source?.includes('savedSearch-scan') || sourceMeta?.scanMode === 'savedSearch') {
    typeLabel = 'Saved Search Scan';
    color = 'text-amber/60';
  } else if (source?.includes('batch2-promoted')) {
    typeLabel = 'Batch 2';
    color = 'text-amber/50';
  } else if (source?.includes('daily') || sourceMeta?.scanMode === 'daily') {
    typeLabel = 'Daily Screen';
    color = 'text-bo/60';
  } else if (source?.includes('weekly') || sourceMeta?.scanMode === 'weekly') {
    typeLabel = 'Weekly Screen';
    color = 'text-boro/50';
  }

  // Build the two-line display
  const line1 = personLabel ? `${personLabel}: 🔍 ${profileName || typeLabel}` : (profileName || typeLabel);
  const line2 = sourceMeta?.sourceCategory ? `from "${sourceMeta.sourceCategory}"` : null;

  return { line1, line2, color };
}

function moneyFmt(n) {
  if (!n || typeof n !== 'number') return null;
  if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
  return `$${n}`;
}

function stageColor(s) {
  const st = (s||'').toLowerCase();
  if (st.includes('pre')) return 'bg-amber/12 text-amber border-amber/25';
  if (st.includes('seed')) return 'bg-sm/12 text-sm border-sm/25';
  if (st.includes('series_a') || st.includes('series a')) return 'bg-bo/12 text-bo border-bo/25';
  return 'bg-muted/12 text-muted border-muted/25';
}

function stageFmt(s) {
  return s ? (typeof s === 'string' ? s : '').replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()).replace('Pre Seed','Preseed') : '';
}

function sourceBadge(source) {
  if (!source) return null;
  if (source.includes('scan-agent') || source.includes('recurring-scan')) return { label: '🔬 Scan Agent', color: 'bg-sm/12 text-sm border-sm/20' };
  if (source.includes('super-search')) return { label: '⚡ Super Search', color: 'bg-boro/12 text-boro border-boro/20' };
  if (source.includes('savedSearch')) return { label: 'Ⓗ Saved Search', color: 'bg-amber/12 text-amber border-amber/20' };
  if (source.includes('batch2-promoted')) return { label: '📦 Batch 2', color: 'bg-amber/12 text-amber border-amber/20' };
  if (source.includes('daily')) return { label: 'Daily', color: 'bg-bo/12 text-bo border-bo/20' };
  if (source.includes('weekly')) return { label: 'Weekly', color: 'bg-boro/12 text-boro border-boro/20' };
  return { label: 'Manual', color: 'bg-muted/12 text-muted border-muted/20' };
}

function ClaudeLogic({ reasoning, fullAnalysis, score, company }) {
  const [open, setOpen] = useState(false);
  
  // Prefer fullAnalysis (entire Opus output), fall back to short reasoning snippet
  const hasFullAnalysis = fullAnalysis && typeof fullAnalysis === 'string' && fullAnalysis.length > 100;
  const hasReasoning = reasoning && typeof reasoning === 'string' && reasoning.trim().length > 0;
  
  if (!hasFullAnalysis && !hasReasoning) return null;

  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all font-medium ${
          open ? 'bg-boro/10 border-boro/25 text-boro' : 'border-border/15 text-muted/40 hover:text-boro hover:border-boro/20'
        }`}>
        🧠 {open ? 'Hide' : 'Claude'} Logic{score ? ` (${score}/10)` : ''}
      </button>
      {open && (
        <div className="mt-2 bg-boro/[0.04] border border-boro/10 rounded-xl px-4 py-3 space-y-2 max-h-[600px] overflow-y-auto">
          {hasFullAnalysis ? (
            <>
              <p className="text-[9px] uppercase tracking-widest text-boro/45 font-bold">Full Opus Analysis</p>
              <div className="text-[11px] text-bright/60 leading-relaxed whitespace-pre-wrap">{fullAnalysis}</div>
            </>
          ) : (
            <>
              <p className="text-[9px] uppercase tracking-widest text-boro/45 font-bold">Reasoning Snippet</p>
              <p className="text-[11px] text-bright/55 leading-relaxed whitespace-pre-wrap">{reasoning.replace(/^[\s\-—·]+/, '').trim()}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RemoveMenu({ company, onHide, onBackburn }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex-shrink-0">
      <button onClick={() => setOpen(!open)} className="text-muted/40 hover:text-rose transition-colors" title="Options">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1 z-50 bg-card border border-border/30 rounded-lg shadow-xl py-1 min-w-[140px]">
            <button onClick={() => { onHide(company); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-[11px] text-muted/60 hover:text-bright hover:bg-white/5 transition-colors">
              👁‍🗨 Hide for me
            </button>
            <button onClick={() => { onBackburn(company); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-[11px] text-rose/70 hover:text-rose hover:bg-rose/5 transition-colors border-t border-border/10">
              🔥 Backburn
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function VettingCard({ company, onHide, onBackburn, addFavorite, isFavorited }) {
  const stage = stageFmt(company.funding_stage);
  const total = moneyFmt(company.funding_total);
  const webUrl = company.website ? (company.website.startsWith('http') ? company.website : `https://${company.website}`) : null;
  const badge = sourceBadge(company.source);
  const scoreDisplay = company.score ? `${company.score}/10` : null;
  const saved = isFavorited && isFavorited(company.name);
  const linkedinUrl = company.socials?.linkedin || null;

  return (
    <div className="rounded-[14px] border border-border/[0.06] hover:border-accent/18 transition-all" style={{ background: 'rgba(46, 42, 37, 0.55)' }}>
      <div className="p-4 space-y-2.5">
        <div className="flex items-start gap-3">
          {company.logo_url ? (
            <img src={company.logo_url} alt="" className="w-11 h-11 rounded-[10px] bg-ink-2 object-contain flex-shrink-0" onError={e => { e.target.style.display='none'; }} />
          ) : (
            <div className="w-11 h-11 rounded-[10px] bg-ink-2 flex items-center justify-center flex-shrink-0">
              <span className="font-serif italic font-semibold text-accent text-lg">{(company.name||'?')[0]}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            {/* Name + H + Website + LinkedIn — all in one row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-bright text-sm">{company.name}</h3>
              {company.id && typeof company.id === "number" && (
                <a href={`/company/${company.id}`} className="text-[9px] px-1.5 py-0.5 rounded bg-rose/10 text-rose border border-rose/15 hover:bg-rose/20 font-bold" title="Harmonic Card">H</a>
              )}
              {webUrl && (
                <a href={webUrl} target="_blank" rel="noopener"
                  className="text-[9px] px-1.5 py-0.5 rounded-md bg-bo/12 text-bo border border-bo/20 hover:bg-bo/20 font-medium">
                  🌐
                </a>
              )}
              {linkedinUrl && (
                <a href={linkedinUrl} target="_blank" rel="noopener"
                  className="text-[9px] px-1.5 py-0.5 rounded-md bg-card/40 border border-border/20 text-muted/50 hover:text-bo font-medium">
                  💼
                </a>
              )}
            </div>
            {/* Badges row */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {scoreDisplay && (
                <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-[5px] border ${
                  company.score >= 8 ? 'bg-sm/15 text-sm border-sm/25'
                  : company.score >= 7 ? 'bg-bo/15 text-bo border-bo/25'
                  : 'bg-muted/12 text-muted border-muted/20'
                }`}>⭐ {scoreDisplay}</span>
              )}
              {stage && <span className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-[5px] border ${stageColor(company.funding_stage)}`}>{stage}</span>}
              {total && <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-[5px] border bg-bo/12 text-bo border-bo/20">💰 {total}</span>}
              <WebGrowthBadge company={company} />
              {badge && <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${badge.color}`}>{badge.label}</span>}
            </div>
          </div>
          {/* Remove menu */}
          <RemoveMenu company={company} onHide={onHide} onBackburn={onBackburn} />
        </div>

        {company.description && <p className="text-bright/42 text-xs leading-relaxed line-clamp-2">{company.description}</p>}

        <div className="flex flex-wrap gap-1.5 text-[10px]">
          {company.location && <span className="px-2 py-0.5 rounded-md border bg-card/40 border-border/[0.06] text-muted/50">📍 {company.location}</span>}
          {company.headcount && <span className="px-2 py-0.5 rounded-md border bg-card/40 border-border/[0.06] text-muted/50">👥 {company.headcount}</span>}
          {company.investors?.length > 0 && <span className="text-muted/40">Backed by: {company.investors.join(', ')}</span>}
        </div>

        {/* Date + Source detail */}
        <div className="text-[10px] leading-relaxed">
          <span className="text-bright/50">{company.addedAt ? new Date(company.addedAt).toLocaleDateString() : ''}</span>
          {(() => {
            const si = sourceInfo(company.source, company.sourceMeta);
            if (!si) return null;
            return (
              <div className={`${si.color} mt-0.5`}>
                <span>{si.line1}</span>
                {si.line2 && <span className="ml-1 text-muted/35">{si.line2}</span>}
              </div>
            );
          })()}
        </div>

        {/* Claude Logic */}
        {(company.claudeReasoning || company.fullAnalysis) && (
          <ClaudeLogic reasoning={company.claudeReasoning} fullAnalysis={company.fullAnalysis} score={company.score} company={company} />
        )}

        {/* Actions row — clean, symmetrical */}
        <div className="flex items-center gap-2 pt-1">
          {addFavorite && (
            <button onClick={() => { if (!saved) addFavorite({ ...company }); }}
              className={`text-[11px] px-4 py-1.5 rounded-lg border font-bold transition-all active:scale-95 ${
                saved
                  ? 'bg-rose/15 border-rose/40 text-rose'
                  : 'border-rose/20 text-rose/60 hover:bg-rose/15 hover:border-rose/40 hover:text-rose'
              }`}>
              {saved ? '❤️ Favorited' : '🤍 Favorite'}
            </button>
          )}
          <CrmButton company={company} />
          <FindSimilar addFavorite={addFavorite} isFavorited={isFavorited} companyId={company.id} companyName={company.name} />
        </div>
      </div>
    </div>
  );
}

export default function TopPicksPage({ addFavorite, isFavorited }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recent'); // recent, rating, sector
  const [batchStatus, setBatchStatus] = useState({});
  const [promoting, setPromoting] = useState(false);

  const fetchPipeline = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/vetting`);
      const data = await r.json();
      setCompanies((data.companies || []).sort((a, b) => {
        // Stealth companies always go to bottom
        const aStealth = (a.name || '').toLowerCase().startsWith('stealth company');
        const bStealth = (b.name || '').toLowerCase().startsWith('stealth company');
        if (aStealth && !bStealth) return 1;
        if (!aStealth && bStealth) return -1;
        // Sort by score descending, then by addedAt (newest first)
        const scoreA = a.score || 0;
        const scoreB = b.score || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (b.addedAt || 0) - (a.addedAt || 0);
      }));
    } catch (e) { console.error('Fetch vetting error:', e); }
    setLoading(false);
  }, []);

  // Fetch batch status for all partners
  const fetchBatchStatus = useCallback(async () => {
    const statuses = {};
    for (const p of PARTNERS) {
      try {
        const r = await fetch(`${API_BASE}/api/autoscan/batches/${p.id}`);
        const data = await r.json();
        if (data.batch2Count > 0) statuses[p.id] = data;
      } catch (e) {}
    }
    setBatchStatus(statuses);
  }, []);

  useEffect(() => { fetchPipeline(); fetchBatchStatus(); }, [fetchPipeline, fetchBatchStatus]);

  const handlePromoteBatch = async (personId) => {
    setPromoting(true);
    try {
      const r = await fetch(`${API_BASE}/api/autoscan/promote-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId }),
      });
      const data = await r.json();
      if (data.success) {
        await fetchPipeline();
        await fetchBatchStatus();
      }
    } catch (e) { console.error('Promote error:', e); }
    setPromoting(false);
  };

  const handleVote = async (companyName, personId, vote) => {
    // Optimistic update
    setCompanies(prev => prev.map(c => {
      if ((c.name || '').toLowerCase() === companyName.toLowerCase()) {
        const newVotes = { ...(c.votes || {}), [personId]: vote };
        const allOut = PARTNERS.every(p => newVotes[p.id] === 'out');
        return { ...c, votes: newVotes, dismissed: allOut };
      }
      return c;
    }));
    try {
      await fetch(`${API_BASE}/api/vetting/vote`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, personId, vote }),
      });
    } catch (e) { console.error('Vote error:', e); }
  };

  const handleRemove = async (company) => {
    setCompanies(prev => prev.filter(c => (c.name || '').toLowerCase() !== (company.name || '').toLowerCase()));
    try {
      await fetch(`${API_BASE}/api/vetting/remove`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: company.name }),
      });
    } catch (e) { console.error('Remove error:', e); }
  };

  const crmUser = typeof window !== 'undefined' ? localStorage.getItem('crm_user') || '' : '';

  const handleHide = async (company) => {
    if (!crmUser) return;
    setCompanies(prev => prev.map(c => {
      if ((c.name || '').toLowerCase() === (company.name || '').toLowerCase()) {
        return { ...c, hiddenBy: [...(c.hiddenBy || []), crmUser] };
      }
      return c;
    }));
    try {
      await fetch(`${API_BASE}/api/vetting/hide`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: company.name, personId: crmUser }),
      });
    } catch (e) { console.error('Hide error:', e); }
  };

  const handleBackburn = async (company) => {
    setCompanies(prev => prev.map(c => {
      if ((c.name || '').toLowerCase() === (company.name || '').toLowerCase()) {
        return { ...c, dismissed: true, backburned: true, backburnedBy: crmUser };
      }
      return c;
    }));
    try {
      await fetch(`${API_BASE}/api/vetting/backburn`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: company.name, personId: crmUser }),
      });
    } catch (e) { console.error('Backburn error:', e); }
  };

  const [showBackburn, setShowBackburn] = useState(false);

  // Filter: exclude dismissed/backburned AND hidden-for-me, then sort
  const filtered = companies.filter(c => {
    if (c.dismissed || c.backburned) return false;
    if (crmUser && (c.hiddenBy || []).includes(crmUser)) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'rating') return (b._score || 0) - (a._score || 0);
    if (sortBy === 'sector') {
      const descA = ((a.description || '') + ' ' + (a._analysis || '')).toLowerCase();
      const descB = ((b.description || '') + ' ' + (b._analysis || '')).toLowerCase();
      const sectorOrder = ['crypto', 'fintech', 'ai', 'robotics', 'gaming', 'saas'];
      const getSector = (d) => { for (let i = 0; i < sectorOrder.length; i++) if (d.includes(sectorOrder[i])) return i; return sectorOrder.length; };
      const diff = getSector(descA) - getSector(descB);
      return diff !== 0 ? diff : (b._score || 0) - (a._score || 0);
    }
    // 'recent' — most recently added first
    return (b.addedAt || 0) - (a.addedAt || 0);
  });

  const backburned = companies.filter(c => c.dismissed || c.backburned);

  // Stats
  const scanAgentCount = companies.filter(c => !c.dismissed && (c.source?.includes('scan-agent') || c.source?.includes('recurring-scan'))).length;
  const totalBatch2 = Object.values(batchStatus).reduce((sum, b) => sum + (b.batch2Count || 0), 0);

  return (
    <div className="min-h-screen max-w-[1080px] mx-auto px-7 pt-6 pb-28 fade-in">
      <div className="mb-5">
        <h1 className="font-serif text-xl font-semibold text-bright tracking-tight">Top Picks</h1>
        <p className="text-muted/50 text-xs mt-1 font-mono tracking-wide">Shared DD pipeline · auto-populated from scans</p>
      </div>

      {/* Batch Indicator */}
      {totalBatch2 > 0 && (
        <div className="mb-4 bg-amber/5 border border-amber/15 rounded-[14px] p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-amber/60 font-bold">📦 Batch Queue</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-amber/12 text-amber border border-amber/20 font-medium">
                {totalBatch2} waiting
              </span>
            </div>
          </div>
          {Object.entries(batchStatus).map(([personId, batch]) => {
            const person = PARTNERS.find(p => p.id === personId);
            if (!person || !batch.batch2Count) return null;
            return (
              <div key={personId} className="flex items-center justify-between bg-surface/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{person.emoji}</span>
                  <div>
                    <p className="text-xs text-bright/70 font-medium">{person.name}</p>
                    <p className="text-[10px] text-muted/40">
                      {batch.batch1Count > 0 && `${batch.batch1Count} in DD · `}
                      {batch.batch2Count} in batch2
                      {batch.lastScanDate && ` · last scan: ${batch.lastScanDate}`}
                    </p>
                  </div>
                </div>
                <button onClick={() => handlePromoteBatch(personId)} disabled={promoting}
                  className="font-mono text-[10px] px-3 py-1.5 rounded-lg bg-amber/15 border border-amber/25 text-amber font-semibold hover:bg-amber/25 transition-all disabled:opacity-40">
                  {promoting ? '...' : '⬆ Promote'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-3 mb-4 font-mono text-[10px]">
        <span className="text-muted/40">{companies.filter(c => !c.dismissed).length} in pipeline</span>
        {scanAgentCount > 0 && <span className="text-sm/65">🔬 {scanAgentCount} from Scan Agent</span>}
      </div>

      {/* Sort options */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] text-muted/40 font-medium">Sort by:</span>
        {[
          { key: 'recent', label: '🕐 Most Recent' },
          { key: 'rating', label: '⭐ Highest Rating' },
          { key: 'sector', label: '🏷️ Sector' },
        ].map(f => (
          <button key={f.key} onClick={() => setSortBy(f.key)}
            className={`text-[11px] px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${
              sortBy === f.key ? 'bg-accent/12 border-accent/30 text-accent font-medium' : 'border-border/[0.06] text-muted/50 hover:border-accent/18'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Companies */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(c => (
            <VettingCard key={c.name} company={c} onHide={handleHide} onBackburn={handleBackburn} addFavorite={addFavorite} isFavorited={isFavorited} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted/40 text-sm">No companies in pipeline yet</p>
          <p className="text-muted/35 text-xs mt-1">Run daily/weekly scans on the Screen tab — top picks auto-populate here</p>
        </div>
      )}

      {/* Backburned section */}
      {backburned.length > 0 && (
        <div className="mt-8">
          <button onClick={() => setShowBackburn(!showBackburn)}
            className="flex items-center gap-2 mb-3 text-muted/40 hover:text-muted/60 transition-colors">
            <h2 className="text-sm font-bold text-rose/50">🔥 Backburned</h2>
            <span className="text-[10px] text-muted/30">{backburned.length} companies</span>
            <span className="text-[10px] text-muted/30">{showBackburn ? '(hide)' : '(show)'}</span>
          </button>
          {showBackburn && (
            <div className="space-y-2 opacity-50">
              {backburned.map(c => (
                <div key={c.name} className="rounded-[14px] border border-rose/10 bg-card/30 p-3 flex items-center gap-3">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt="" className="w-8 h-8 rounded-lg bg-ink-2 object-contain flex-shrink-0" onError={e => { e.target.style.display='none'; }} />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-rose/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-rose/60 font-bold text-xs">{(c.name||'?')[0]}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-bright/50 truncate">{c.name}</p>
                    <p className="text-[9px] text-muted/30">
                      {c.backburnedBy && `by ${c.backburnedBy}`}
                      {c.backburnedAt && ` · ${new Date(c.backburnedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  {c.score && <span className="text-[9px] text-muted/30">{c.score}/10</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
