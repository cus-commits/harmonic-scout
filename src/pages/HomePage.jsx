import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CrmButton } from '../components/CrmButton';

const API_BASE = import.meta.env?.VITE_API_URL || 'https://pigeon-api.up.railway.app';

const VOTER_MAP = { 'Joe': 'Joe C', 'Mark': 'Mark', 'Carlo': 'Carlo', 'Jake': 'Jake', 'Liam': 'Liam' };
const getAirtableVoter = (u) => VOTER_MAP[u] || u;

export default function HomePage({ addFavorite, isFavorited }) {
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState('');
  const [voting, setVoting] = useState(null);
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [showScanPicker, setShowScanPicker] = useState(false);
  const user = typeof window !== 'undefined' ? localStorage.getItem('crm_user') || '' : '';

  // Fetch all BO + BORO + SM companies, filter to ones user hasn't voted on
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
        console.log(`[Home] Fetched ${all.length} companies, user=${user}, voterName=${voterName}`);
        const needsVote = all.filter(c => {
          const raw = c.in_or_out;
          const votes = Array.isArray(raw) ? raw : (raw && typeof raw === 'string' ? [raw] : []);
          const hasVoted = votes.some(v => typeof v === 'string' && v.toLowerCase().startsWith(`${voterName}:`));
          // Log first few for debugging
          if (votes.length > 0 && all.indexOf(c) < 5) {
            console.log(`[Home] ${c.company}: votes=${JSON.stringify(votes)}, checking "${voterName}:", hasVoted=${hasVoted}`);
          }
          return !hasVoted && c.company;
        });
        console.log(`[Home] ${needsVote.length} companies need ${user}'s vote`);
        setPending(needsVote);
      } catch (e) { console.error('Fetch pending error:', e); }
      setLoading(false);
    };
    fetchPending();
  }, [user]);

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
        // Remove from pending list
        setPending(prev => prev.filter(c => c.company !== company.company));
      }
    } catch (e) {}
    setVoting(null);
  };

  const stageColor = (s) => {
    if (s === 'BORO-SM') return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
    if (s === 'BORO') return 'bg-violet-500/20 text-violet-300 border-violet-400/30';
    return 'bg-sky-500/20 text-sky-300 border-sky-400/30';
  };

  const pendingBO = pending.filter(c => c.crm_stage === 'BO');
  const pendingBORO = pending.filter(c => c.crm_stage === 'BORO');
  const pendingSM = pending.filter(c => c.crm_stage === 'BORO-SM');

  return (
    <div className="max-w-4xl mx-auto px-8 pt-6 pb-24">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold text-accent tracking-[6px] uppercase">Daxos Capital</h1>
          <p className="text-[10px] font-medium text-bright/40 mt-1.5 tracking-wide">🐦 Pigeon Finder</p>
        </div>
        <p className="text-xs text-muted/40 mt-1">{user ? `Welcome, ${user}` : 'Claim your identity below'}</p>
      </div>

      {/* Quick nav buttons — 2x2 grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Row 1: Screener (big) + CRM (big) */}
        <button onClick={() => navigate('/autoscan')}
          className="py-4 rounded-xl border border-sky-400/25 bg-sky-500/8 hover:bg-sky-500/15 transition-colors text-center">
          <span className="text-2xl block mb-1">🔍</span>
          <span className="text-sm font-bold text-sky-300">Screener</span>
          <span className="text-[10px] text-muted/40 block">Auto-scan deals</span>
        </button>
        <button onClick={() => navigate('/airtable')}
          className="py-4 rounded-xl border border-amber-400/25 bg-amber-500/8 hover:bg-amber-500/15 transition-colors text-center">
          <span className="text-2xl block mb-1">📋</span>
          <span className="text-sm font-bold text-amber-300">CRM Pipeline</span>
          <span className="text-[10px] text-muted/40 block">BO · BORO · SM</span>
        </button>
        {/* Row 2: Favs+Team (half) + DD+Super (half) */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => navigate('/favorites')}
            className="py-3 rounded-xl border border-amber-400/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-center">
            <span className="text-lg block mb-0.5">⭐</span>
            <span className="text-[10px] font-bold text-amber-300">Favs</span>
          </button>
          <button onClick={() => navigate('/community')}
            className="py-3 rounded-xl border border-violet-400/20 bg-violet-500/5 hover:bg-violet-500/10 transition-colors text-center">
            <span className="text-lg block mb-0.5">👥</span>
            <span className="text-[10px] font-bold text-violet-300">Team</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => navigate('/toppicks')}
            className="py-3 rounded-xl border border-emerald-400/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors text-center">
            <span className="text-lg block mb-0.5">🎯</span>
            <span className="text-[10px] font-bold text-emerald-300">DD</span>
          </button>
          <div className="relative">
            <button onClick={() => setShowScanPicker(!showScanPicker)}
              className="w-full py-3 rounded-xl border border-sky-400/20 bg-sky-500/5 hover:bg-sky-500/10 transition-colors text-center">
              <span className="text-lg block mb-0.5">📡</span>
              <span className="text-[10px] font-bold text-sky-300">Scan</span>
            </button>
            {showScanPicker && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1a1d2e] border border-amber-400/25 rounded-xl overflow-hidden z-50"
                style={{ boxShadow: '0 -8px 30px rgba(0,0,0,0.5)' }}>
                <button onClick={() => { navigate('/super'); setShowScanPicker(false); }}
                  className="w-full text-left px-3 py-2.5 text-xs font-medium text-bright/70 hover:bg-white/5 transition-colors">
                  ⚡ Super Search
                  <span className="block text-[9px] text-muted/40 mt-0.5">Multi-source deep scan</span>
                </button>
                <button onClick={() => { navigate('/autoscan'); setShowScanPicker(false); }}
                  className="w-full text-left px-3 py-2.5 text-xs font-medium text-bright/70 hover:bg-white/5 border-t border-white/5 transition-colors">
                  📡 Daily Screen
                  <span className="block text-[9px] text-muted/40 mt-0.5">Auto-scan by profile</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pending votes section */}
      {!user ? (
        <div className="text-center py-8 border border-border/15 rounded-xl bg-surface/30">
          <p className="text-muted/40 text-sm">Claim your identity to see pending votes</p>
          <p className="text-[10px] text-muted/35 mt-1">Use the name selector at bottom right</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center py-12 gap-2">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-[11px] text-muted/40">Loading {loadingStage || 'pipeline'}...</p>
          <div className="flex gap-1.5 mt-1">
            <span className={`text-[9px] px-2 py-0.5 rounded-full border ${!loadingStage || loadingStage === 'BO' ? 'border-sky-400/30 text-sky-400' : 'border-emerald-400/20 text-emerald-400/50'}`}>
              {loadingStage === 'BO' ? '◌' : !loadingStage ? '◌' : '✓'} BO
            </span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full border ${loadingStage === 'BORO' ? 'border-violet-400/30 text-violet-400' : loadingStage === 'SM' || !loadingStage ? 'border-emerald-400/20 text-emerald-400/50' : 'border-border/15 text-muted/40'}`}>
              {loadingStage === 'BORO' ? '◌' : (loadingStage === 'SM' || !loadingStage) ? '✓' : '·'} BORO
            </span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full border ${loadingStage === 'SM' ? 'border-emerald-400/30 text-emerald-400' : !loadingStage ? 'border-emerald-400/20 text-emerald-400/50' : 'border-border/15 text-muted/40'}`}>
              {loadingStage === 'SM' ? '◌' : !loadingStage ? '✓' : '·'} SM
            </span>
          </div>
        </div>
      ) : pending.length === 0 ? (
        <div className="text-center py-8 border border-emerald-400/15 rounded-xl bg-emerald-500/5">
          <p className="text-emerald-400 text-sm font-medium">✓ All caught up!</p>
          <p className="text-[10px] text-muted/40 mt-1">No companies waiting for your vote</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending counts */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-bright">Needs your vote</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-400/20 font-bold">{pending.length}</span>
          </div>

          {/* Stage sections */}
          {[
            { label: '🏆 BORO-SM', items: pendingSM, stage: 'BORO-SM' },
            { label: 'BORO', items: pendingBORO, stage: 'BORO' },
            { label: 'BO', items: pendingBO, stage: 'BO' },
          ].filter(s => s.items.length > 0).map(section => (
            <div key={section.stage}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${stageColor(section.stage)}`}>{section.label}</span>
                <span className="text-[10px] text-muted/40">{section.items.length} pending</span>
              </div>
              <div className="space-y-1.5">
                {section.items.map((c, i) => {
                  const isExpanded = expandedCompany === c.company;
                  const webUrl = c.company_link ? (c.company_link.startsWith('http') ? c.company_link : `https://${c.company_link}`) : null;
                  const tagline = c.notes ? c.notes.replace(/^\[.*?\]\s*/, '').split(' · ')[0].slice(0, 100) : '';
                  const votes = Array.isArray(c.in_or_out) ? c.in_or_out : [];

                  return (
                    <div key={c.airtable_id || i} className="border border-border/18 rounded-xl bg-surface/30 overflow-hidden">
                      {/* Main row — clickable to expand */}
                      <button onClick={() => setExpandedCompany(isExpanded ? null : c.company)}
                        className="w-full text-left px-3.5 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-bright">{c.company}</span>
                            {webUrl && <a href={webUrl} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-blue-400 text-xs hover:text-blue-300">🌐</a>}
                            {c.twitter_link && <a href={c.twitter_link} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-blue-400/65 text-xs hover:text-blue-300">𝕏</a>}
                          </div>
                          {tagline && <p className="text-[10px] text-bright/40 truncate mt-0.5">{tagline}</p>}
                          {/* Existing votes */}
                          {votes.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {votes.map((v, j) => {
                                const isIn = typeof v === 'string' && v.toUpperCase().includes('IN');
                                const name = typeof v === 'string' ? v.split(':')[0].trim() : '';
                                return (
                                  <span key={j} className={`text-[9px] px-2 py-0.5 rounded font-bold text-white ${isIn ? 'bg-emerald-500' : 'bg-red-500/80'}`}>
                                    {name}{isIn ? '✓' : '✗'}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {/* Vote indicator */}
                        <div className="flex-shrink-0 flex items-center gap-1.5">
                          <span className="text-amber-400 text-lg animate-pulse">⚡</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-muted/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </button>

                      {/* Expanded — vote buttons + details */}
                      {isExpanded && (
                        <div className="px-3.5 pb-3.5 border-t border-border/18 pt-3 space-y-3">
                          {c.total_funding && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-sky-400/65">💰</span>
                              <span className="text-xs text-sky-300 font-semibold">{c.total_funding}</span>
                            </div>
                          )}
                          {c.sector && <span className="text-[9px] text-muted/40">{c.sector}</span>}

                          {/* Vote buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVote(c, 'IN')}
                              disabled={!!voting}
                              className="flex-1 py-3 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 font-bold text-sm hover:bg-emerald-500/25 transition-colors disabled:opacity-30">
                              {voting === `${c.company}-IN` ? '...' : '✓ IN'}
                            </button>
                            <button
                              onClick={() => handleVote(c, 'OUT')}
                              disabled={!!voting}
                              className="flex-1 py-3 rounded-xl bg-red-500/15 border border-red-400/30 text-red-400 font-bold text-sm hover:bg-red-500/25 transition-colors disabled:opacity-30">
                              {voting === `${c.company}-OUT` ? '...' : '✗ OUT'}
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
