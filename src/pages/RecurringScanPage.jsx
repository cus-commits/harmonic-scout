import React, { useState, useEffect, useRef } from 'react';
import { CrmButton } from '../components/CrmButton';

const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';

function authHeaders() {
  const anthropicKey = localStorage.getItem('scout_anthropic_key') || '';
  return { 'Content-Type': 'application/json', 'x-anthropic-key': anthropicKey };
}

// ---- Scan Tiers ----

const TIERS = [
  { key: 'scout',    name: 'Quick Scout',  cost: '$5',  emoji: '⚡', color: 'sky',     ddPush: 2,  desc: 'Haiku pre-screen → Sonnet deep 10 → top 2 to DD', time: '15-30 min' },
  { key: 'standard', name: 'Standard',     cost: '$12', emoji: '🔍', color: 'violet',  ddPush: 5,  desc: 'Sonnet pre-screen → Opus deep 15 → top 5 to DD', time: '30-60 min' },
  { key: 'deep',     name: 'Deep Dive',    cost: '$25', emoji: '🔬', color: 'amber',   ddPush: 8,  desc: 'Sonnet all → Opus deep 40 → top 8 to DD', time: '1-2 hours' },
  { key: 'sweep',    name: 'Full Sweep',   cost: '$35', emoji: '🌊', color: 'pink',    ddPush: 12, desc: 'Sonnet full → Opus deep 60 → top 12 to DD', time: '2-3 hours' },
  { key: 'maximum',  name: 'Maximum',      cost: '$50', emoji: '🚀', color: 'emerald', ddPush: 20, desc: 'Full pipeline → Opus deep 100 → top 20 to DD', time: '3-5 hours' },
];

const CRM_STAGES = [
  { key: 'BO', label: 'BO', color: 'sky' },
  { key: 'BORO', label: 'BORO', color: 'violet' },
  { key: 'BORO-SM', label: 'BORO-SM', color: 'emerald' },
  { key: 'Warm', label: 'Warm', color: 'amber' },
];

const tierColors = {
  sky:     { bg: 'bg-sky-500/10', border: 'border-sky-400/25', text: 'text-sky-300', activeBg: 'bg-sky-500/20', activeBorder: 'border-sky-400/50' },
  violet:  { bg: 'bg-violet-500/10', border: 'border-violet-400/25', text: 'text-violet-300', activeBg: 'bg-violet-500/20', activeBorder: 'border-violet-400/50' },
  amber:   { bg: 'bg-amber-500/10', border: 'border-amber-400/25', text: 'text-amber-300', activeBg: 'bg-amber-500/20', activeBorder: 'border-amber-400/50' },
  pink:    { bg: 'bg-pink-500/10', border: 'border-pink-400/25', text: 'text-pink-300', activeBg: 'bg-pink-500/20', activeBorder: 'border-pink-400/50' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-400/25', text: 'text-emerald-300', activeBg: 'bg-emerald-500/20', activeBorder: 'border-emerald-400/50' },
};

function TierSelector({ selected, onSelect }) {
  return (
    <div className="space-y-2">
      {TIERS.map(t => {
        const c = tierColors[t.color];
        const isActive = selected === t.key;
        return (
          <button key={t.key} onClick={() => onSelect(t.key)}
            className={`w-full text-left rounded-xl border p-3 transition-all ${
              isActive ? `${c.activeBg} ${c.activeBorder} ring-1 ring-white/5` : `${c.bg} ${c.border} hover:${c.activeBg}`
            }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{t.emoji}</span>
                <span className={`text-sm font-bold ${c.text}`}>{t.name}</span>
                <span className="text-[10px] text-muted/40">~{t.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted/40">{t.ddPush} to DD</span>
                <span className={`text-sm font-bold ${c.text}`}>{t.cost}</span>
              </div>
            </div>
            <p className="text-[10px] text-muted/40 mt-1 ml-7">{t.desc}</p>
          </button>
        );
      })}
    </div>
  );
}

// ---- Progress Panel ----

function ScanProgress({ status, onCancel }) {
  const [tick, setTick] = useState(0);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [feed, setFeed] = useState([]);
  const [hideFeed, setHideFeed] = useState(false);
  const [etaTarget, setEtaTarget] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const lastMsg = useRef('');
  useEffect(() => {
    const msg = status?.progress || '';
    if (!msg || msg === 'keepalive' || msg === lastMsg.current) return;
    lastMsg.current = msg;
    setFeed(prev => [{ msg, ts: Date.now(), id: Date.now() }, ...prev].slice(0, 80));
  }, [status?.progress]);

  // ETA calculation based on progress messages
  useEffect(() => {
    const msg = status?.progress || '';
    if (!msg || msg === 'keepalive') return;

    let estSeconds = null;
    const preBatch = msg.match(/[Pp]re-screen batch (\d+)\/(\d+)/);
    const scoreBatch = msg.match(/[Ss]coring batch (\d+)\/(\d+)/);
    const deepBatch = msg.match(/[Oo]pus.*batch (\d+)\/(\d+)|deep batch (\d+)\/(\d+)/i);
    const enriching = msg.match(/[Ee]nriching (\d+)/);
    const fetching = msg.match(/\[(\d+)\/(\d+)\] Fetching/);

    if (deepBatch) {
      const cur = parseInt(deepBatch[1] || deepBatch[3]);
      const total = parseInt(deepBatch[2] || deepBatch[4]);
      estSeconds = (total - cur) * 55;
    } else if (scoreBatch) {
      const remaining = parseInt(scoreBatch[2]) - parseInt(scoreBatch[1]);
      estSeconds = remaining * 35 + 120; // + time for deep phase
    } else if (enriching) {
      estSeconds = 60 + 300; // enrichment + scoring + deep
    } else if (msg.includes('Pre-screen complete') || msg.includes('pre-screen complete')) {
      estSeconds = 300;
    } else if (preBatch) {
      const remaining = parseInt(preBatch[2]) - parseInt(preBatch[1]);
      estSeconds = remaining * 25 + 400;
    } else if (fetching) {
      const remaining = parseInt(fetching[2]) - parseInt(fetching[1]);
      estSeconds = remaining * 8 + 600;
    } else if (msg.includes('Fetching all') || msg.includes('Starting')) {
      estSeconds = 900;
    }

    if (estSeconds !== null) setEtaTarget(Date.now() + estSeconds * 1000);
  }, [status?.progress]);

  const elapsed = status?.startedAt ? Math.floor((Date.now() - status.startedAt) / 1000) : 0;
  const hours = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;

  const etaRemaining = etaTarget ? Math.max(0, Math.floor((etaTarget - Date.now()) / 1000)) : null;
  const etaMins = etaRemaining !== null ? Math.floor(etaRemaining / 60) : 0;
  const etaSecs = etaRemaining !== null ? etaRemaining % 60 : 0;
  const showEta = etaRemaining !== null && etaRemaining > 0;

  const progress = status?.progress || '';
  const stats = status?.stats || {};
  const tierInfo = status?.tier || {};

  let stage = 'fetch';
  if (progress.includes('Opus') || progress.includes('deep')) stage = 'opus';
  else if (progress.includes('Sonnet scoring') || progress.includes('scoring batch') || progress.includes('Scoring batch')) stage = 'screen';
  else if (progress.includes('Enriching') || progress.includes('Enriched') || progress.includes('Filtered')) stage = 'enrich';
  else if (progress.includes('Pre-screen') || progress.includes('pre-screen') || progress.includes('Screening')) stage = 'prescreen';
  else if (progress.includes('Fetching') || progress.includes('fetched') || progress.includes('search') || progress.includes('Starting')) stage = 'fetch';

  const stages = [
    { id: 'fetch', emoji: '📡', label: 'Fetching', color: 'text-sky-400' },
    { id: 'prescreen', emoji: '⚡', label: 'Pre-Screen', color: 'text-violet-400' },
    { id: 'enrich', emoji: '🔬', label: 'Enriching', color: 'text-amber-400' },
    { id: 'screen', emoji: '🎯', label: 'Scoring', color: 'text-pink-400' },
    { id: 'opus', emoji: '🧠', label: 'Deep Analysis', color: 'text-emerald-400' },
  ];

  // Parse feed for company highlights (scored companies)
  const companyHighlights = feed
    .filter(f => f.msg.match(/[🌟🏆⭐📊📉✅] .+ — \d+\/10/) || f.msg.match(/[🌟🏆⭐] .+/))
    .slice(0, 6);

  return (
    <div className="bg-ink/30 border border-sky-400/15 rounded-xl overflow-hidden">
      <div className="p-4 space-y-3">
        {/* Tier badge + timer + ETA */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm text-bright/70 font-medium">{progress || 'Starting scan agent...'}</p>
              {tierInfo.name && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-muted/50">{tierInfo.name}</span>}
            </div>
            <p className="text-[10px] text-muted/40 mt-0.5">
              {showEta ? `~${etaMins}m ${String(etaSecs).padStart(2, '0')}s remaining` : 'Scan runs in background — safe to close tab or refresh'}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-[11px] font-mono text-sky-400/60">
              {hours > 0 ? `${hours}h ${String(mins).padStart(2, '0')}m` : `${mins}:${String(secs).padStart(2, '0')}`}
            </span>
            {showEta && (
              <p className="text-[9px] font-mono text-amber-400/50 mt-0.5">~{etaMins}m {String(etaSecs).padStart(2, '0')}s left</p>
            )}
          </div>
        </div>

        {/* Stage pipeline */}
        <div className="flex items-center gap-1 px-1">
          {stages.map((s, i) => {
            const stageIdx = stages.findIndex(x => x.id === stage);
            const isActive = s.id === stage;
            const isPast = i < stageIdx;
            return (
              <React.Fragment key={s.id}>
                {i > 0 && <div className={`flex-shrink-0 w-4 h-px ${isPast || isActive ? 'bg-sky-400/30' : 'bg-border/15'}`} />}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-medium transition-all ${
                  isActive ? `${s.color} bg-white/5 border border-white/10 scale-105` : isPast ? 'text-muted/50' : 'text-muted/20'
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
          <div className="flex gap-2 text-[10px] text-muted/40 flex-wrap">
            {stats.savedSearches > 0 && <span>Ⓗ {stats.savedSearches} searches</span>}
            {stats.totalCompanies > 0 && <span>→ {stats.totalCompanies} companies</span>}
            {stats.sonnetPassed > 0 && <span className="text-violet-300/60">→ {stats.sonnetPassed} pre-screened</span>}
            {stats.enriched > 0 && <span className="text-amber-300/60">→ {stats.enriched} enriched</span>}
            {stats.deepScored > 0 && <span className="text-emerald-300/60">→ {stats.deepScored} deep-scored</span>}
          </div>
        )}

        {/* Live company highlights — scored companies appearing in real-time */}
        {companyHighlights.length > 0 && (
          <div className="bg-white/[0.02] rounded-lg p-2.5 space-y-1.5">
            <p className="text-[8px] uppercase tracking-widest text-muted/25 font-bold">Latest Companies</p>
            {companyHighlights.map(f => {
              const scoreMatch = f.msg.match(/(.+?) — (\d+)\/10/);
              const name = scoreMatch ? scoreMatch[1].replace(/^[🌟🏆⭐📊📉📋✅❌]\s*/, '').trim() : null;
              const score = scoreMatch ? parseInt(scoreMatch[2]) : null;
              const rest = f.msg.split(' — ').slice(1).join(' — ');
              const isPass = f.msg.startsWith('✅');
              const isCut = f.msg.startsWith('❌');

              if (score !== null) {
                const barColor = score >= 9 ? 'bg-emerald-400' : score >= 7 ? 'bg-sky-400' : score >= 5 ? 'bg-amber-400' : 'bg-red-400/50';
                return (
                  <div key={f.id} className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden flex-shrink-0">
                      <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${score * 10}%` }} />
                    </div>
                    <span className="text-[10px] text-bright/60 font-medium truncate">{name}</span>
                    <span className={`text-[10px] font-bold flex-shrink-0 ${score >= 7 ? 'text-emerald-400/70' : 'text-muted/40'}`}>{score}/10</span>
                  </div>
                );
              } else if (isPass || isCut) {
                const compName = f.msg.replace(/^[✅❌]\s*/, '').split(' — ')[0].trim();
                const reason = f.msg.split(' — ').slice(1).join(' — ').trim();
                return (
                  <div key={f.id} className="flex items-center gap-2 text-[10px]">
                    <span>{isPass ? '✅' : '❌'}</span>
                    <span className={`font-medium truncate ${isPass ? 'text-emerald-400/60' : 'text-muted/30'}`}>{compName}</span>
                    {reason && <span className="text-muted/25 truncate text-[9px]">{reason}</span>}
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* Cancel */}
        <div className="flex items-center gap-2">
          {!confirmCancel ? (
            <button onClick={() => setConfirmCancel(true)}
              className="text-[10px] px-3 py-1.5 rounded-lg border border-red-400/20 text-red-400/60 hover:text-red-300 hover:border-red-400/40 transition-all font-medium">
              Cancel Scan
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-red-500/5 border border-red-400/20 rounded-lg px-3 py-2">
              <span className="text-[10px] text-red-300/70">Cancel the scan?</span>
              <button onClick={() => { onCancel(); setConfirmCancel(false); }}
                className="text-[10px] px-2.5 py-1 rounded bg-red-500/20 border border-red-400/30 text-red-300 font-bold hover:bg-red-500/30 transition-all">
                Yes, Cancel
              </button>
              <button onClick={() => setConfirmCancel(false)}
                className="text-[10px] px-2.5 py-1 rounded border border-border/20 text-muted/50 hover:text-bright/60 transition-all">
                Keep Going
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Full live feed — collapsible */}
      {feed.length > 0 && (
        <div className="border-t border-border/10 bg-black/20">
          <button onClick={() => setHideFeed(!hideFeed)}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/[0.02] transition-colors">
            <span className="text-[8px] uppercase tracking-widest text-muted/25 font-bold">Full Feed ({feed.length})</span>
            <span className="text-[9px] text-muted/30">{hideFeed ? '▸ Show' : '▾ Hide'}</span>
          </button>
          {!hideFeed && (
            <div className="px-4 pb-3 max-h-[300px] overflow-y-auto">
              <div className="space-y-1">
                {feed.map((f, i) => (
                  <div key={f.id} className={`text-[10px] leading-relaxed transition-opacity duration-500 ${i === 0 ? 'text-bright/60' : i < 3 ? 'text-muted/45' : 'text-muted/25'}`}>
                    <span className="text-[9px] font-mono text-muted/20 mr-2">{new Date(f.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    {f.msg}
                  </div>
                ))}
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

function ResultCard({ result, rank, addFavorite, isFavorited }) {
  const [expanded, setExpanded] = useState(false);
  const card = result.card || {};
  const score = result.score || 0;
  const isFav = isFavorited ? isFavorited(result.name) : false;
  const webUrl = card.website ? (card.website.startsWith('http') ? card.website : `https://${card.website}`) : null;

  const scoreColor = score >= 9 ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
    : score >= 7 ? 'bg-sky-500/15 text-sky-300 border-sky-400/30'
    : score >= 5 ? 'bg-amber-500/12 text-amber-300/70 border-amber-400/25'
    : 'bg-surface/40 text-muted/60 border-border/20';

  const confidenceColor = result.confidence === 'High' ? 'text-emerald-400/70' : result.confidence === 'Low' ? 'text-red-400/60' : 'text-amber-400/60';

  const rankColor = rank <= 3 ? 'text-amber-400' : rank <= 10 ? 'text-sky-400/70' : 'text-muted/40';

  return (
    <div className="rounded-xl border border-border/15 bg-surface/50 p-3.5 space-y-2.5">
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Rank */}
        <div className="flex flex-col items-center flex-shrink-0 w-7 pt-0.5">
          <span className={`text-[13px] font-bold ${rankColor}`}>#{rank}</span>
        </div>
        {card.logo_url ? (
          <img src={card.logo_url} alt="" className="w-9 h-9 rounded-lg bg-ink/50 flex-shrink-0" onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
            <span className="text-violet-400 font-bold text-sm">{(result.name || '?')[0]}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-bright text-sm truncate">{result.name}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${scoreColor}`}>{score}/10</span>
            {result.confidence && <span className={`text-[9px] ${confidenceColor}`}>{result.confidence}</span>}
            {webUrl && <a href={webUrl} target="_blank" rel="noopener" className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-400/30 hover:bg-sky-500/20 font-medium">🌐</a>}
          </div>
          <div className="flex gap-1.5 mt-0.5 flex-wrap">
            {card.funding_stage && <span className="text-[9px] px-1.5 py-0.5 rounded-md border bg-sky-500/8 text-sky-400/70 border-sky-500/20">{card.funding_stage}</span>}
            {card.funding_total > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-md border bg-sky-500/10 text-sky-400 border-sky-500/20">💰 {moneyFmt(card.funding_total)}</span>}
            {card.headcount > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-md border bg-surface/40 text-muted/50 border-border/20">👥 {card.headcount}</span>}
            {result._sourceSearch && <span className="text-[9px] px-1.5 py-0.5 rounded-md border bg-amber-500/8 text-amber-400/60 border-amber-400/15">🔍 {result._sourceSearch}</span>}
          </div>
        </div>
      </div>

      {/* Description */}
      {card.description && <p className="text-[10px] text-muted/50 leading-relaxed line-clamp-2 ml-10">{card.description}</p>}

      {/* Deep analysis — expandable */}
      {result.analysis && (
        <div className="ml-10">
          <button onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-violet-400/60 hover:text-violet-300 transition-colors font-medium">
            {expanded ? '▾ Hide Logic' : '▸ Why #' + rank + '?'}
          </button>
          {expanded && (
            <div className="mt-2 bg-violet-500/[0.03] border border-violet-400/12 rounded-lg p-3 text-[11px] text-bright/60 leading-relaxed whitespace-pre-wrap font-mono">
              {result.analysis}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 ml-10">
        <button onClick={() => addFavorite && addFavorite({ ...card, name: result.name, _score: score })}
          className={`text-[10px] px-3 py-1 rounded-lg border font-bold transition-all active:scale-95 ${
            isFav
              ? 'bg-pink-500/15 border-pink-400/40 text-pink-400'
              : 'border-pink-400/25 text-pink-400/70 hover:bg-pink-500/15 hover:border-pink-400/50 hover:text-pink-400'
          }`}>
          {isFav ? '❤️ Favorited' : '🤍 Favorite'}
        </button>
        <CrmButton company={{ ...card, name: result.name }} />
      </div>
    </div>
  );
}

// ---- History Panel ----

function HistoryPanel({ history, onViewScan }) {
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
        return (
          <button key={scan.timestamp} onClick={() => onViewScan(scan)}
            className="w-full text-left rounded-xl border border-border/15 bg-surface/40 p-3 hover:bg-surface/60 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{scan.tier?.name ? (TIERS.find(t => t.key === scan.tier?.key)?.emoji || '🔁') : '🔁'}</span>
                <span className="text-[11px] font-bold text-bright/70">{scan.tier?.name || 'Scan'}</span>
                <span className="text-[10px] text-muted/40">{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-emerald-400/60">{topCount} rated 7+</span>
                <span className="text-[10px] text-muted/30">{(scan.results || []).length} total</span>
                <span className="text-[10px] text-sky-400/50">{scan.tier?.cost || `$${scan.budgetUsed}`}</span>
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
      {/* Funnel stats */}
      {data.stats && (
        <div className="bg-amber-500/5 border border-amber-400/12 rounded-xl p-3 flex items-center gap-2 text-[10px] text-amber-300/60 flex-wrap">
          {data.tier?.name && <span className="text-muted/50">{data.tier.name}</span>}
          {data.stats.savedSearches > 0 && <span>Ⓗ {data.stats.savedSearches} searches</span>}
          <span>→ {data.stats.totalCompanies} sourced</span>
          <span className="text-violet-300/60">→ {data.stats.sonnetPassed} pre-screened</span>
          <span className="text-amber-300/60">→ {data.stats.enriched} enriched</span>
          <span className="text-emerald-300/60">→ {data.stats.deepScored} deep-scored</span>
          <span className="text-pink-300/60">→ {data.stats.topResults} rated 7+</span>
          {data.stats.ddPushed > 0 && <span className="text-emerald-400/70 font-medium">→ {data.stats.ddPushed} to DD</span>}
          <span className="text-sky-300/50">· ${data.budgetUsed} spent</span>
          {data.duration && <span className="text-muted/30">· {Math.round(data.duration / 60)}m</span>}
        </div>
      )}

      {/* Options used */}
      {data.options && (data.options.includePortcos || data.options.crmStages?.length > 0 || data.options.keywords) && (
        <div className="flex gap-2 text-[9px] text-muted/30 flex-wrap">
          {data.options.includePortcos && <span className="px-1.5 py-0.5 rounded bg-sky-500/8 border border-sky-400/15 text-sky-400/50">📂 Portcos</span>}
          {data.options.crmStages?.map(s => (
            <span key={s} className="px-1.5 py-0.5 rounded bg-violet-500/8 border border-violet-400/15 text-violet-400/50">{s}</span>
          ))}
          {data.options.keywords && <span className="px-1.5 py-0.5 rounded bg-amber-500/8 border border-amber-400/15 text-amber-400/50">🔑 {data.options.keywords.slice(0, 60)}{data.options.keywords.length > 60 ? '...' : ''}</span>}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 bg-ink/30 rounded-lg p-1">
        <button onClick={() => setTab('results')}
          className={`flex-1 text-[11px] py-2 rounded-md font-semibold transition-all ${
            tab === 'results' ? 'bg-sky-500/15 text-sky-300 border border-sky-400/25' : 'text-muted/50 hover:text-muted/70'
          }`}>
          📊 Results ({sortedResults.length})
        </button>
        {data.screenAnalysis && (
          <button onClick={() => setTab('logic')}
            className={`flex-1 text-[11px] py-2 rounded-md font-semibold transition-all ${
              tab === 'logic' ? 'bg-violet-500/15 text-violet-300 border border-violet-400/25' : 'text-muted/50 hover:text-muted/70'
            }`}>
            🧠 Full Logic
          </button>
        )}
      </div>

      {/* Results */}
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
              className="w-full py-3 rounded-xl border border-sky-400/15 bg-sky-500/[0.04] text-sky-400/60 text-xs font-medium hover:text-sky-300 hover:border-sky-400/25 transition-all">
              Load 10 More ({sortedResults.length - showCount} remaining)
            </button>
          )}
        </div>
      )}

      {/* Full analysis */}
      {tab === 'logic' && data.screenAnalysis && (
        <div className="bg-violet-500/[0.03] border border-violet-400/12 rounded-xl p-4 space-y-3 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-violet-400/50 uppercase tracking-widest font-bold">Full Screening & Scoring Logic</p>
            <button onClick={() => navigator.clipboard.writeText(data.screenAnalysis).catch(() => {})}
              className="text-[9px] px-2 py-0.5 rounded border border-violet-400/20 text-violet-300/60 hover:bg-violet-500/10 transition-all">
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
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [selectedTier, setSelectedTier] = useState('standard');
  const [pageTab, setPageTab] = useState('scan'); // scan | history
  const [viewingScan, setViewingScan] = useState(null); // for viewing history item
  const abortRef = useRef(null);

  // Scan options
  const [includePortcos, setIncludePortcos] = useState(false);
  const [crmStages, setCrmStages] = useState([]);
  const [keywords, setKeywords] = useState('');

  const toggleCrmStage = (stage) => {
    setCrmStages(prev => prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]);
  };
  const toggleAllCrm = () => {
    const allKeys = CRM_STAGES.map(s => s.key);
    setCrmStages(prev => prev.length === allKeys.length ? [] : allKeys);
  };

  // Poll status on mount — reconnect if scan is running
  useEffect(() => {
    fetchStatus();
    fetchResults();
    fetchHistory();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/recurring-scan/status`);
      const data = await r.json();
      setStatus(data);
      if (data.status === 'scanning') {
        setScanning(true);
        setPageTab('scan');
      } else if (data.status === 'done' && scanning) {
        setScanning(false);
        fetchResults();
        fetchHistory();
      }
    } catch (e) {}
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

  const startScan = async () => {
    setScanning(true);
    setViewingScan(null);
    setPageTab('scan');

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch(`${API_BASE}/api/recurring-scan`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ tier: selectedTier, includePortcos, crmStages, keywords }),
        signal: controller.signal,
      });

      if (!res.ok) {
        console.error('Scan request failed:', res.status);
        setScanning(false);
        fetchStatus();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
      }

      const dataLine = fullText.split('\n').filter(l => l.startsWith('data: ')).pop();
      if (dataLine) {
        try {
          const data = JSON.parse(dataLine.slice(6));
          if (!data.error) setResults(data);
        } catch (e) {}
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error('Scan error:', e);
    }

    setScanning(false);
    fetchStatus();
    fetchResults();
    fetchHistory();
  };

  const cancelScan = async () => {
    if (abortRef.current) abortRef.current.abort();
    try { await fetch(`${API_BASE}/api/recurring-scan/cancel`, { method: 'POST' }); } catch (e) {}
    setScanning(false);
    fetchStatus();
  };

  const isRunning = scanning || status?.status === 'scanning';
  const crmUser = localStorage.getItem('crm_user') || 'Mark';

  // Determine what results to show
  const activeResults = viewingScan || results;

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 sm:px-8 pt-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-bright">🔁 Recurring Scan Agent</h1>
          <p className="text-[11px] text-muted/40 mt-1">AI-powered pipeline across all Harmonic saved searches</p>
        </div>
        <span className="text-[11px] text-sky-400/70 font-medium">🦅 {crmUser}</span>
      </div>

      {/* Page tabs */}
      <div className="flex gap-1 bg-ink/30 rounded-lg p-1 mb-5">
        <button onClick={() => { setPageTab('scan'); setViewingScan(null); }}
          className={`flex-1 text-[11px] py-2 rounded-md font-semibold transition-all ${
            pageTab === 'scan' ? 'bg-sky-500/15 text-sky-300 border border-sky-400/25' : 'text-muted/50 hover:text-muted/70'
          }`}>
          {isRunning ? '📡 Live Scan' : '🚀 New Scan'}
        </button>
        <button onClick={() => setPageTab('history')}
          className={`flex-1 text-[11px] py-2 rounded-md font-semibold transition-all ${
            pageTab === 'history' ? 'bg-violet-500/15 text-violet-300 border border-violet-400/25' : 'text-muted/50 hover:text-muted/70'
          }`}>
          📜 History ({history.length})
        </button>
      </div>

      {/* ---- SCAN TAB ---- */}
      {pageTab === 'scan' && (
        <>
          {/* Progress panel — always shows when running (even on refresh) */}
          {isRunning && (
            <div className="mb-6">
              <ScanProgress status={status} onCancel={cancelScan} />
            </div>
          )}

          {/* Tier selector + options + start — only when NOT running */}
          {!isRunning && !activeResults && (
            <div className="space-y-5">
              <div>
                <p className="text-[10px] text-muted/50 uppercase tracking-widest font-bold mb-2">Select Scan Depth</p>
                <TierSelector selected={selectedTier} onSelect={setSelectedTier} />
              </div>

              {/* Scan Options */}
              <div className="rounded-xl border border-border/15 bg-surface/30 p-4 space-y-4">
                <p className="text-[10px] text-muted/50 uppercase tracking-widest font-bold">Search Context</p>

                {/* Portcos checkbox */}
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={includePortcos} onChange={() => setIncludePortcos(!includePortcos)}
                    className="w-4 h-4 rounded border-border/30 bg-ink/50 accent-sky-400" />
                  <div>
                    <span className="text-[11px] text-bright/70 font-medium group-hover:text-bright">Include Portfolio Companies</span>
                    <p className="text-[9px] text-muted/35">Find companies similar to our portcos (Steel, Pump.fun, Bubblemaps, etc.)</p>
                  </div>
                </label>

                {/* CRM Stages */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-bright/60 font-medium">Find Similar to CRM Pipeline</span>
                    <button onClick={toggleAllCrm}
                      className={`text-[9px] px-2 py-0.5 rounded border transition-all font-medium ${
                        crmStages.length === CRM_STAGES.length
                          ? 'bg-sky-500/15 border-sky-400/30 text-sky-300'
                          : 'border-border/20 text-muted/40 hover:text-muted/60'
                      }`}>
                      {crmStages.length === CRM_STAGES.length ? '✓ All' : 'Select All'}
                    </button>
                  </div>
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
                  <p className="text-[9px] text-muted/30">Boosts companies similar to those already in your pipeline stages</p>
                </div>

                {/* Keywords */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-bright/60 font-medium">Priority Keywords</label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={e => setKeywords(e.target.value)}
                    placeholder="e.g. prediction markets, AI agents, crypto exchange, stablecoin infra..."
                    className="w-full bg-ink/50 border border-border/25 rounded-lg px-3 py-2 text-xs text-bright outline-none focus:border-sky-400/35 transition-colors placeholder:text-white/15"
                  />
                  <p className="text-[9px] text-muted/30">Companies matching these concepts/sectors will be scored higher</p>
                </div>
              </div>

              <button onClick={startScan}
                className="w-full px-6 py-3 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-300 font-bold text-sm hover:bg-sky-500/25 hover:border-sky-400/50 transition-all active:scale-[0.98]">
                🚀 Start {TIERS.find(t => t.key === selectedTier)?.name} Scan ({TIERS.find(t => t.key === selectedTier)?.cost})
              </button>
            </div>
          )}

          {/* Results — show latest or viewed scan */}
          {!isRunning && activeResults && (
            <div className="space-y-4">
              {/* Back to new scan */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {viewingScan && (
                    <button onClick={() => setViewingScan(null)} className="text-[10px] text-sky-400/60 hover:text-sky-300 font-medium">← Back</button>
                  )}
                  <p className="text-[10px] text-muted/40">
                    {viewingScan ? `Viewing scan from ${new Date(viewingScan.timestamp).toLocaleString()}` : `Latest scan · ${new Date(activeResults.timestamp).toLocaleString()}`}
                  </p>
                </div>
                <button onClick={() => { setResults(null); setViewingScan(null); }}
                  className="text-[10px] px-3 py-1 rounded-lg border border-sky-400/20 text-sky-400/60 hover:text-sky-300 font-medium">
                  + New Scan
                </button>
              </div>
              <ResultsView data={activeResults} addFavorite={addFavorite} isFavorited={isFavorited} />
            </div>
          )}

          {/* Empty — no results, not running, show tier selector */}
          {!isRunning && !activeResults && !results && (
            <div className="bg-surface/30 border border-border/15 rounded-xl p-8 text-center mt-6">
              <p className="text-2xl mb-2">🔁</p>
              <p className="text-muted/50 text-sm">Select a tier above and start scanning</p>
            </div>
          )}
        </>
      )}

      {/* ---- HISTORY TAB ---- */}
      {pageTab === 'history' && (
        <div className="space-y-4">
          {viewingScan ? (
            <>
              <button onClick={() => setViewingScan(null)} className="text-[10px] text-sky-400/60 hover:text-sky-300 font-medium">← Back to History</button>
              <ResultsView data={viewingScan} addFavorite={addFavorite} isFavorited={isFavorited} />
            </>
          ) : (
            <HistoryPanel history={history} onViewScan={(scan) => setViewingScan(scan)} />
          )}
        </div>
      )}
    </div>
  );
}
