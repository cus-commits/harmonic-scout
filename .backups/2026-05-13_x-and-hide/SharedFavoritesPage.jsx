import React, { useState, useEffect, useCallback } from 'react';
import FindSimilar from '../components/FindSimilar';
import { CrmButton } from '../components/CrmButton';
import RemoveMenu from '../components/RemoveMenu';
import { getSharedFavorites } from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';

function WebGrowthBadge({ company }) {
  const t = company.traction || {};
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
    <a key={i} href={b.url} target="_blank" rel="noopener" className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border hover:opacity-80 ${b.color}`} title={`${b.period} web traffic`}>{b.label} <span className="text-[7px] opacity-60">{b.period}</span></a>
  ) : (
    <span key={i} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${b.color}`}>{b.label} <span className="text-[7px] opacity-60">{b.period}</span></span>
  ));
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
  return 'bg-muted/12 text-muted border-muted/25';
}

export default function SharedFavoritesPage({ userId, addFavorite, isFavorited }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBackburn, setShowBackburn] = useState(false);
  const [votingOn, setVotingOn] = useState(null);

  const crmUser = typeof window !== 'undefined' ? localStorage.getItem('crm_user') || '' : '';

  const fetchFavorites = useCallback(async () => {
    try {
      const data = await getSharedFavorites();
      setFavorites(data.favorites || []);
    } catch (e) { console.error('Fetch favorites error:', e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const handleVote = async (companyName, vote) => {
    if (!crmUser) return;
    setVotingOn(`${companyName}-${vote}`);
    try {
      await fetch(`${API_BASE}/api/shared/favorites/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, voter: crmUser, vote }),
      });
      // Optimistic update
      setFavorites(prev => prev.map(f => {
        if (f.company?.name === companyName) {
          const newVotes = { ...(f.votes || {}), [crmUser]: vote };
          const allOut = Object.values(newVotes).every(v => v === 'out');
          return { ...f, votes: newVotes, backburned: allOut };
        }
        return f;
      }));
    } catch (e) { console.error('Vote error:', e); }
    setVotingOn(null);
  };

  // Deduplicate by company name (multiple users may have favorited the same company)
  const companyMap = {};
  for (const f of favorites) {
    const name = f.company?.name;
    if (!name) continue;
    if (!companyMap[name]) {
      companyMap[name] = {
        company: f.company,
        addedBy: [],
        sharedAt: f.shared_at,
        votes: f.votes || {},
        backburned: f.backburned || false,
      };
    }
    companyMap[name].addedBy.push({ nickname: f.nickname, sharedAt: f.shared_at });
    // Merge votes from all entries
    if (f.votes) {
      companyMap[name].votes = { ...companyMap[name].votes, ...f.votes };
    }
    if (f.backburned) companyMap[name].backburned = true;
  }

  const allCompanies = Object.values(companyMap);
  const active = allCompanies.filter(c => !c.backburned);
  const backburned = allCompanies.filter(c => c.backburned);

  return (
    <div className="min-h-screen max-w-[1080px] mx-auto px-7 pt-6 pb-28 fade-in">
      <div className="mb-4">
        <h1 className="font-serif text-xl font-semibold text-bright">Team</h1>
        <p className="text-muted/50 text-xs mt-0.5">Shared favorites from the team — vote In or Out</p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-4 text-[10px]">
        <span className="text-muted/40">{active.length} active</span>
        {backburned.length > 0 && (
          <button onClick={() => setShowBackburn(!showBackburn)}
            className={`transition-all ${showBackburn ? 'text-rose/60' : 'text-muted/35 hover:text-muted/50'}`}>
            🔥 {backburned.length} backburned {showBackburn ? '(hide)' : '(show)'}
          </button>
        )}
        {crmUser && <span className="ml-auto text-muted/30">Voting as: {crmUser}</span>}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : active.length === 0 && backburned.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted/40 text-sm">No team favorites yet</p>
          <p className="text-muted/35 text-xs mt-1">Favorite companies from DD or Scan pages — they'll appear here for team review</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map(item => (
            <TeamCard
              key={item.company.name}
              item={item}
              crmUser={crmUser}
              onVote={handleVote}
              votingOn={votingOn}
              addFavorite={addFavorite}
              isFavorited={isFavorited}
            />
          ))}
        </div>
      )}

      {/* Backburn section */}
      {showBackburn && backburned.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-rose/60">🔥 Backburned</h2>
            <span className="text-[10px] text-muted/30">{backburned.length} companies</span>
          </div>
          <div className="space-y-2 opacity-60">
            {backburned.map(item => (
              <TeamCard
                key={item.company.name}
                item={item}
                crmUser={crmUser}
                onVote={handleVote}
                votingOn={votingOn}
                addFavorite={addFavorite}
                isFavorited={isFavorited}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamCard({ item, crmUser, onVote, votingOn, addFavorite, isFavorited }) {
  const c = item.company;
  if (!c?.name) return null;

  const stage = c.funding_stage ? (typeof c.funding_stage === 'string' ? c.funding_stage : '').replace(/_/g,' ').replace(/\b\w/g, ch => ch.toUpperCase()).replace('Pre Seed','Preseed') : '';
  const total = moneyFmt(c.funding_total);
  const rawWebsite = typeof c.website === 'object' ? (c.website?.url || '') : (c.website || '');
  const webUrl = rawWebsite ? (rawWebsite.startsWith('http') ? rawWebsite : `https://${rawWebsite}`) : null;
  const votes = item.votes || {};
  const inVotes = Object.entries(votes).filter(([,v]) => v === 'in');
  const outVotes = Object.entries(votes).filter(([,v]) => v === 'out');
  const myVote = crmUser ? votes[crmUser] : null;

  return (
    <div className={`rounded-xl border p-4 space-y-2.5 transition-all ${
      item.backburned ? 'border-rose/15' : 'border-border/[0.06]'
    }`} style={{ background: 'rgba(46, 42, 37, 0.55)' }}>
      {/* Header */}
      <div className="flex items-start gap-3">
        {c.logo_url ? (
          <img src={c.logo_url} alt="" className="w-10 h-10 rounded-[10px] bg-ink-2 object-contain flex-shrink-0" onError={e => { e.target.style.display='none'; }} />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-ink-2 flex items-center justify-center flex-shrink-0">
            <span className="font-serif italic font-semibold text-accent text-lg">{(c.name||'?')[0]}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-bright text-sm">{c.name}</h3>
            {webUrl && (
              <a href={webUrl} target="_blank" rel="noopener"
                className="text-[10px] px-2 py-0.5 rounded-md bg-bo/12 text-bo border border-bo/20 hover:bg-bo/20 font-medium">
                🌐 website
              </a>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {stage && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${stageColor(c.funding_stage)}`}>{stage}</span>}
            {total && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-bo/12 text-bo border-bo/20">💰 {total}</span>}
            <WebGrowthBadge company={c} />
          </div>
        </div>
      </div>

      {c.description && <p className="text-muted/60 text-xs leading-relaxed line-clamp-2">{c.description}</p>}

      {/* Added by */}
      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
        <span className="text-muted/35">Added by:</span>
        {item.addedBy.map((a, i) => (
          <span key={i} className="px-2 py-0.5 rounded-full bg-rose/10 text-rose/70 border border-rose/15 font-medium">
            {a.nickname}
          </span>
        ))}
        <span className="text-muted/25 ml-1">{item.sharedAt ? new Date(item.sharedAt).toLocaleDateString() : ''}</span>
      </div>

      {/* Vote summary */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {inVotes.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sm/12 text-sm border border-sm/20 font-medium">{inVotes.length} In</span>
            <span className="text-[9px] text-sm/40">{inVotes.map(([k]) => k).join(', ')}</span>
          </div>
        )}
        {outVotes.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose/12 text-rose border border-rose/20 font-medium">{outVotes.length} Out</span>
            <span className="text-[9px] text-rose/40">{outVotes.map(([k]) => k).join(', ')}</span>
          </div>
        )}
      </div>

      {/* In/Out vote buttons */}
      {crmUser && (
        <div className="flex gap-2">
          <button onClick={() => onVote(c.name, 'in')} disabled={!!votingOn}
            className={`flex-1 text-[11px] py-2 rounded-lg border font-semibold transition-all ${
              myVote === 'in'
                ? 'bg-sm/20 border-sm/40 text-sm'
                : 'border-border/25 text-muted/40 hover:border-sm/30 hover:text-sm/60'
            }`}>
            {votingOn === `${c.name}-in` ? '...' : '✓ In'}
          </button>
          <button onClick={() => onVote(c.name, 'out')} disabled={!!votingOn}
            className={`flex-1 text-[11px] py-2 rounded-lg border font-semibold transition-all ${
              myVote === 'out'
                ? 'bg-rose/20 border-rose/40 text-rose'
                : 'border-border/25 text-muted/40 hover:border-rose/30 hover:text-rose/60'
            }`}>
            {votingOn === `${c.name}-out` ? '...' : '✗ Out'}
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <CrmButton company={c} />
        <RemoveMenu company={c} />
        {c.id && typeof c.id === "number" && <a href={`/company/${c.id}`} className="h-pill" title="Company Card">H</a>}
        <FindSimilar addFavorite={addFavorite} isFavorited={isFavorited} companyId={c.id} companyName={c.name} />
        {c.location && <span className="text-[9px] text-muted/35">📍 {c.location}</span>}
      </div>
    </div>
  );
}
