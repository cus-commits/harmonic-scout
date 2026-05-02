import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CrmButton } from '../components/CrmButton';

const API_BASE = import.meta.env?.VITE_API_URL || 'https://pigeon-api.up.railway.app';

const VOTER_MAP = { 'Joe': 'Joe C', 'Mark': 'Mark', 'Carlo': 'Carlo', 'Jake': 'Jake', 'Liam': 'Liam' };
const getAirtableVoter = (u) => VOTER_MAP[u] || u;

function moneyFmt(val) {
  if (!val) return '';
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val}`;
}

const dayName = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

export default function HomePage({ addFavorite, isFavorited }) {
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState('');
  const [voting, setVoting] = useState(null);
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [showScanPicker, setShowScanPicker] = useState(false);
  const [fundingAlerts, setFundingAlerts] = useState([]);
  const [scanWinners, setScanWinners] = useState([]);
  const [hiddenAlerts, setHiddenAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hidden_funding_alerts') || '[]'); } catch { return []; }
  });
  const user = typeof window !== 'undefined' ? localStorage.getItem('crm_user') || '' : '';

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetchPending = async () => {
      setLoading(true);
      setLoadingStage('BO');
      try {
        const boRes = await fetch(`${API_BASE}/api/airtable/companies?stage=BO&limit=200`).then(r => r.json());
        setLoadingStage('BORO');
        const boroRes = await fetch(`${API_BASE}/api/airtable/companies?stage=BORO&limit=200`).then(r => r.json());
        setLoadingStage('SM');
        const smRes = await fetch(`${API_BASE}/api/airtable/companies?stage=BORO-SM&limit=200`).then(r => r.json());
        setLoadingStage('');
        const all = [...(boRes.companies || []), ...(boroRes.companies || []), ...(smRes.companies || [])];
        const voterName = getAirtableVoter(user).toLowerCase();
        const needsVote = all.filter(c => {
          const raw = c.in_or_out;
          const votes = Array.isArray(raw) ? raw : (raw && typeof raw === 'string' ? [raw] : []);
          const hasVoted = votes.some(v => typeof v === 'string' && v.toLowerCase().startsWith(`${voterName}:`));
          return !hasVoted && c.company;
        });
        setPending(needsVote);
      } catch (e) { console.error('Fetch pending error:', e); }
      setLoading(false);
    };
    fetchPending();
  }, [user]);

  useEffect(() => {
    fetch(`${API_BASE}/api/alerts/funding-rounds`).then(r => r.json()).then(d => {
      setFundingAlerts(d.alerts || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/recurring-scan/history`).then(r => r.json()).then(history => {
      if (!Array.isArray(history) || history.length === 0) return;
      const winners = [];
      const seen = new Set();
      const caps = [2, 3, 3];
      for (let i = 0; i < Math.min(history.length, 3); i++) {
        const scan = history[i];
        const sorted = (scan.results || []).filter(r => r.score >= 6).sort((a, b) => (b.score || 0) - (a.score || 0));
        let added = 0;
        for (const r of sorted) {
          if (added >= caps[i] || winners.length >= 8) break;
          if (seen.has(r.name?.toLowerCase())) continue;
          seen.add(r.name?.toLowerCase());
          winners.push({ ...r, _scanDate: scan.timestamp, _tierName: scan.tier?.name || 'Scan' });
          added++;
        }
      }
      setScanWinners(winners);
    }).catch(() => {});
  }, []);

  const hideAlert = (company) => {
    const updated = [...hiddenAlerts, company];
    setHiddenAlerts(updated);
    localStorage.setItem('hidden_funding_alerts', JSON.stringify(updated));
  };

  const visibleAlerts = fundingAlerts.filter(a => !hiddenAlerts.includes(a.company));

  const handleVote = async (company, vote) => {
    setVoting(`${company.company}-${vote}`);
    try {
      const r = await fetch(`${API_BASE}/api/airtable/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.company, voter: user, vote }),
      });
      const data = await r.json();
      if (data.success) {
        setPending(prev => prev.filter(c => c.company !== company.company));
      }
    } catch (e) {}
    setVoting(null);
  };

  const stageColor = (s) => {
    if (s === 'BORO-SM') return 'bg-sm/12 text-sm border-sm/28';
    if (s === 'BORO') return 'bg-boro/12 text-boro border-boro/28';
    return 'bg-bo/12 text-bo border-bo/28';
  };

  const pendingBO = pending.filter(c => c.crm_stage === 'BO');
  const pendingBORO = pending.filter(c => c.crm_stage === 'BORO');
  const pendingSM = pending.filter(c => c.crm_stage === 'BORO-SM');

  return (
    <div className="max-w-[1080px] mx-auto px-7 pt-8 pb-28 fade-in">
      {/* Brand header — v2 style */}
      <div className="text-center mb-8 select-none">
        <p className="font-mono text-[9px] text-muted/58 tracking-[0.32em] uppercase mb-2">🐦 pigeon finder</p>
        <h1 className="font-serif text-[28px] font-semibold text-accent tracking-[0.08em]" style={{ letterSpacing: '-0.02em' }}>Daxos Capital</h1>
        <p className="font-serif italic text-sm text-bright/62 mt-1.5 tracking-wide">
          {user ? `Welcome back, ${user}` : 'Claim your identity below'} · {dayName()}
        </p>
      </div>

      {/* Quick nav — glass tiles */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <button onClick={() => navigate('/searchagent')}
          className="glass-card py-5 px-4 text-center hover:border-bo/22 transition-all hover:-translate-y-px group"
          style={{ borderColor: 'rgba(125, 211, 252, 0.15)', background: 'rgba(46, 42, 37, 0.4)' }}>
          <div className="w-6 h-6 mx-auto mb-1.5 text-bo flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <span className="text-[13px] font-semibold text-bo tracking-wide">Scan</span>
          <span className="text-[10px] text-muted/58 block mt-0.5">Weekly digest</span>
        </button>
        <button onClick={() => navigate('/airtable')}
          className="glass-card py-5 px-4 text-center hover:border-accent/22 transition-all hover:-translate-y-px group"
          style={{ borderColor: 'rgba(210, 180, 140, 0.18)', background: 'rgba(46, 42, 37, 0.4)' }}>
          <div className="w-6 h-6 mx-auto mb-1.5 text-accent flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
          </div>
          <span className="text-[13px] font-semibold text-accent tracking-wide">Pipeline</span>
          <span className="text-[10px] text-muted/58 block mt-0.5">BO · BORO · SM</span>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-6">
        <button onClick={() => navigate('/chat')}
          className="py-3 px-3 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 transition-all text-center flex items-center justify-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span className="text-[10px] font-bold text-muted tracking-wide">Ask Pigeon</span>
        </button>
        <button onClick={() => navigate('/favorites')}
          className="py-3 px-3 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 transition-all text-center flex items-center justify-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <span className="text-[10px] font-bold text-accent/80 tracking-wide">Favorites</span>
        </button>
      </div>

      {/* Funding alerts panel */}
      {visibleAlerts.length > 0 && (
        <div className="mb-4 p-3.5 rounded-[14px] border border-sm/15" style={{ background: 'rgba(110, 231, 183, 0.04)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sm inline-block" />
              <span className="font-mono text-[9.5px] font-bold tracking-[0.16em] uppercase text-sm/75">Funding alerts</span>
              <span className="font-mono text-[9px] text-sm/40">{visibleAlerts.length} this week</span>
            </div>
          </div>
          <div className="space-y-1.5">
            {visibleAlerts.map((a, i) => (
              <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] border border-border/[0.06]" style={{ background: 'rgba(38, 35, 32, 0.4)' }}>
                {a.logo ? (
                  <img src={a.logo} alt="" className="w-7 h-7 rounded-[7px] bg-ink-2 flex-shrink-0 object-contain" onError={e => { e.target.style.display='none'; }} />
                ) : (
                  <div className="w-7 h-7 rounded-[7px] bg-ink-2 flex items-center justify-center flex-shrink-0">
                    <span className="font-serif italic font-semibold text-sm text-accent">{(a.company || '?')[0]}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-bright leading-tight">{a.company}</span>
                    <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                      a.stage === 'BO' ? 'bg-bo/12 text-bo border-bo/28' :
                      a.stage === 'BORO' ? 'bg-boro/12 text-boro border-boro/28' :
                      'bg-sm/12 text-sm border-sm/28'
                    }`}>{a.stage}</span>
                  </div>
                  <p className="text-[10.5px] text-bright/42 mt-0.5">
                    {a.round.replace(/_/g, ' ')}
                    {a.amount && ` · $${a.amount >= 1e6 ? (a.amount/1e6).toFixed(1) + 'M' : a.amount >= 1e3 ? (a.amount/1e3).toFixed(0) + 'K' : a.amount}`}
                    {a.totalFunding && ` · Total: ${a.totalFunding}`}
                    <span className="font-mono text-[9.5px] text-bright/30 font-medium ml-1.5">{(() => {
                      const d = Math.round((Date.now() - new Date(a.date).getTime()) / 86400000);
                      return d === 0 ? 'today' : d === 1 ? '1d ago' : d + 'd ago';
                    })()}</span>
                  </p>
                </div>
                <button onClick={() => hideAlert(a.company)} className="text-muted/25 hover:text-muted/60 text-sm flex-shrink-0" title="Hide">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scan Winners panel */}
      {scanWinners.length > 0 && (
        <div className="mb-5 p-3.5 rounded-[14px] border border-boro/15" style={{ background: 'rgba(196, 181, 253, 0.04)' }}>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-boro inline-block" />
              <span className="font-mono text-[9.5px] font-bold tracking-[0.16em] uppercase text-boro/78">Last-week winners</span>
              <span className="font-mono text-[9px] text-boro/40">Top {scanWinners.length}</span>
            </div>
            <button onClick={() => navigate('/searchagent')} className="font-mono text-[9px] text-boro/55 hover:text-boro font-medium tracking-wide">Scan →</button>
          </div>
          <div className="space-y-1.5">
            {scanWinners.map((r, i) => {
              const card = r.card || r;
              const cardId = card.id || r.id;
              const rawWeb = typeof card.website === 'object' ? (card.website?.url || card.website?.domain || '') : (card.website || '');
              const webUrl = rawWeb ? (rawWeb.startsWith('http') ? rawWeb : `https://${rawWeb}`) : null;
              const scoreClass = r.score >= 9 ? 'bg-sm/15 text-sm border-sm/30'
                : r.score >= 7 ? 'bg-bo/15 text-bo border-bo/30'
                : 'bg-amber/12 text-amber border-amber/25';
              const rankColor = i === 0 ? 'text-accent' : i < 3 ? 'text-bo/70' : 'text-muted/40';
              const isFav = isFavorited ? isFavorited(r.name) : false;

              return (
                <div key={r.name} className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] border border-border/[0.06] hover:border-accent/18 transition-colors" style={{ background: 'rgba(38, 35, 32, 0.4)' }}>
                  <span className={`font-mono text-[11px] font-bold w-5 text-center flex-shrink-0 ${rankColor}`}>#{i + 1}</span>
                  {card.logo_url ? (
                    <img src={card.logo_url} alt="" className="w-7 h-7 rounded-[7px] bg-ink-2 flex-shrink-0" onError={e => { e.target.style.display='none'; }} />
                  ) : (
                    <div className="w-7 h-7 rounded-[7px] bg-ink-2 flex items-center justify-center flex-shrink-0">
                      <span className="font-serif italic font-semibold text-sm text-accent">{(r.name || '?')[0]}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-bright truncate">{r.name}</span>
                      <span className={`font-mono text-[9.5px] font-bold px-1.5 py-0.5 rounded-[5px] border ${scoreClass}`}>{r.score}/10</span>
                      {webUrl && <a href={webUrl} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-bo text-[9px] hover:text-bo/80 flex-shrink-0">🌐</a>}
                      {cardId && typeof cardId === 'number' && <a href={`/company/${cardId}`} onClick={e => e.stopPropagation()} className="text-[9px] px-1.5 py-0.5 rounded bg-rose/10 text-rose border border-rose/15 font-bold hover:bg-rose/20 flex-shrink-0">H</a>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {card.funding_total > 0 && <span className="text-[9px] text-bo/50">💰 {moneyFmt(card.funding_total)}</span>}
                      {card.funding_stage && <span className="text-[9px] text-muted/30">{card.funding_stage}</span>}
                      {r._sourceSearch && <span className="text-[9px] text-muted/25 truncate">· {r._sourceSearch}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => addFavorite && addFavorite({ ...card, name: r.name, _score: r.score })}
                      className={`text-[9px] px-2 py-0.5 rounded border font-bold transition-colors ${
                        isFav ? 'bg-rose/15 border-rose/40 text-rose' : 'border-rose/20 text-rose/50 hover:text-rose'
                      }`}>
                      {isFav ? '❤️' : '🤍'}
                    </button>
                    <CrmButton company={{ ...card, name: r.name }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending votes */}
      {!user ? (
        <div className="text-center py-10 rounded-[14px] border border-border/[0.06]" style={{ background: 'rgba(38, 35, 32, 0.42)' }}>
          <p className="text-muted/50 text-sm">Claim your identity to see pending votes</p>
          <p className="text-[10px] text-muted/35 mt-1">Use the name selector at bottom right</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center py-14 gap-2">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-[11px] text-muted/40 font-mono">Loading {loadingStage || 'pipeline'}...</p>
          <div className="flex gap-1.5 mt-1">
            {['BO', 'BORO', 'SM'].map(s => {
              const done = (s === 'BO' && loadingStage !== 'BO') || (s === 'BORO' && (loadingStage === 'SM' || !loadingStage)) || (s === 'SM' && !loadingStage);
              const active = loadingStage === s;
              return (
                <span key={s} className={`font-mono text-[9px] px-2 py-0.5 rounded-full border ${
                  active ? stageColor(s === 'SM' ? 'BORO-SM' : s) :
                  done ? 'border-sm/20 text-sm/50' : 'border-border/15 text-muted/40'
                }`}>{active ? '◌' : done ? '✓' : '·'} {s}</span>
              );
            })}
          </div>
        </div>
      ) : pending.length === 0 ? (
        <div className="text-center py-10 rounded-[14px] border border-sm/15" style={{ background: 'rgba(110, 231, 183, 0.04)' }}>
          <p className="text-sm text-sm font-semibold">✓ All caught up!</p>
          <p className="text-[10px] text-muted/40 mt-1">No companies waiting for your vote</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Section heading */}
          <div className="flex items-center gap-2 mt-2">
            <h2 className="text-sm font-bold text-bright tracking-tight">Needs your vote</h2>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/12 text-accent border border-accent/22">{pending.length}</span>
          </div>

          {/* Stage groups */}
          {[
            { label: '🏆 SM', items: pendingSM, stage: 'BORO-SM' },
            { label: 'BORO', items: pendingBORO, stage: 'BORO' },
            { label: 'BO', items: pendingBO, stage: 'BO' },
          ].filter(s => s.items.length > 0).map(section => (
            <div key={section.stage}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`font-mono text-[9.5px] font-bold px-2 py-0.5 rounded-full border tracking-wide ${stageColor(section.stage)}`}>{section.label}</span>
                <span className="font-mono text-[10px] text-muted/40">{section.items.length}</span>
              </div>
              <div className="space-y-1.5">
                {section.items.map((c, i) => {
                  const isExpanded = expandedCompany === c.company;
                  const webUrl = c.company_link ? (c.company_link.startsWith('http') ? c.company_link : `https://${c.company_link}`) : null;
                  const tagline = c.notes ? c.notes.replace(/^\[.*?\]\s*/, '').split(' · ')[0].slice(0, 100) : '';
                  const votes = Array.isArray(c.in_or_out) ? c.in_or_out : [];

                  return (
                    <div key={c.airtable_id || i}
                      className={`rounded-[14px] border overflow-hidden transition-all ${
                        isExpanded ? 'border-accent/28' : 'border-border/[0.06] hover:border-accent/18'
                      }`}
                      style={{ background: isExpanded ? 'rgba(46, 42, 37, 0.6)' : 'rgba(38, 35, 32, 0.42)' }}>
                      <button onClick={() => setExpandedCompany(isExpanded ? null : c.company)}
                        className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-bright/[0.02] transition-colors">
                        <div className="w-7 h-7 rounded-[7px] bg-ink-2 flex items-center justify-center flex-shrink-0">
                          <span className="font-serif italic font-semibold text-sm text-accent">{(c.company || '?')[0]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-bright">{c.company}</span>
                            {webUrl && <a href={webUrl} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-bo text-xs hover:text-bo/80">🌐</a>}
                            {c.twitter_link && <a href={c.twitter_link} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-muted/50 text-xs hover:text-bright/60">𝕏</a>}
                          </div>
                          {tagline && <p className="text-[11px] text-bright/42 truncate mt-0.5 leading-snug">{tagline}</p>}
                          {votes.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {votes.map((v, j) => {
                                const isIn = typeof v === 'string' && v.toUpperCase().includes('IN');
                                const name = typeof v === 'string' ? v.split(':')[0].trim() : '';
                                return (
                                  <span key={j} className={`font-mono text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                                    isIn ? 'bg-sm/15 text-sm border-sm/30' : 'bg-rose/15 text-rose border-rose/30'
                                  }`}>
                                    {name} {isIn ? '✓' : '✕'}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1.5">
                          {votes.length === 0 && <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-muted/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-border/[0.06] pt-3.5 space-y-3">
                          <div className="flex flex-wrap gap-3">
                            {c.total_funding && (
                              <div className="text-xs">
                                <span className="font-mono text-[9px] text-muted/50 block mb-0.5">Total</span>
                                <span className="text-bo font-semibold">{c.total_funding}</span>
                              </div>
                            )}
                            {c.sector && (
                              <div className="text-xs">
                                <span className="font-mono text-[9px] text-muted/50 block mb-0.5">Sector</span>
                                <span className="text-bright/60">{c.sector}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVote(c, 'IN')}
                              disabled={!!voting}
                              className="flex-1 py-3 rounded-xl bg-sm/12 border border-sm/30 text-sm font-bold text-sm hover:bg-sm/22 transition-colors disabled:opacity-30">
                              {voting === `${c.company}-IN` ? '...' : "I'M IN"}
                            </button>
                            <button
                              onClick={() => handleVote(c, 'OUT')}
                              disabled={!!voting}
                              className="flex-1 py-3 rounded-xl bg-rose/12 border border-rose/30 text-rose font-bold text-sm hover:bg-rose/22 transition-colors disabled:opacity-30">
                              {voting === `${c.company}-OUT` ? '...' : 'OUT'}
                            </button>
                            <button
                              onClick={() => navigate(`/company/${c.airtable_id || c.company}`)}
                              className="px-4 py-3 rounded-xl border border-border/50 text-muted/60 font-bold text-sm hover:text-bright/60 hover:border-accent/22 transition-colors">
                              Open →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
