import React, { useState, useEffect, useRef } from 'react';
import { CrmButton } from '../components/CrmButton';

const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';

function authHeaders() {
  const anthropicKey = localStorage.getItem('scout_anthropic_key') || '';
  return {
    'Content-Type': 'application/json',
    'x-anthropic-key': anthropicKey,
  };
}

// ---- Progress Panel (adapted from AutoScanPage ScanProgressPanel) ----

function ScanProgress({ status, onCancel }) {
  const [tick, setTick] = useState(0);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [feed, setFeed] = useState([]);
  const [hideFeed, setHideFeed] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Build live feed from progress messages
  const lastMsg = useRef('');
  useEffect(() => {
    const msg = status?.progress || '';
    if (!msg || msg === 'keepalive' || msg === lastMsg.current) return;
    lastMsg.current = msg;
    setFeed(prev => [{ msg, ts: Date.now(), id: Date.now() }, ...prev].slice(0, 50));
  }, [status?.progress]);

  const elapsed = status?.startedAt ? Math.floor((Date.now() - status.startedAt) / 1000) : 0;
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const hours = Math.floor(mins / 60);
  const dispMins = mins % 60;

  const progress = status?.progress || '';
  const stats = status?.stats || {};

  // Determine stage
  let stage = 'fetch';
  if (progress.includes('Opus') || progress.includes('deep')) stage = 'opus';
  else if (progress.includes('Sonnet scoring') || progress.includes('scoring batch')) stage = 'screen';
  else if (progress.includes('Enriching') || progress.includes('Enriched')) stage = 'enrich';
  else if (progress.includes('Filtered')) stage = 'enrich';
  else if (progress.includes('Pre-screen') || progress.includes('pre-screen') || progress.includes('Screening')) stage = 'prescreen';
  else if (progress.includes('Fetching') || progress.includes('fetched') || progress.includes('search')) stage = 'fetch';

  const stages = [
    { id: 'fetch', emoji: '📡', label: 'Fetching', color: 'text-sky-400' },
    { id: 'prescreen', emoji: '⚡', label: 'Pre-Screen', color: 'text-violet-400' },
    { id: 'enrich', emoji: '🔬', label: 'Enriching', color: 'text-amber-400' },
    { id: 'screen', emoji: '🎯', label: 'Sonnet Score', color: 'text-pink-400' },
    { id: 'opus', emoji: '🧠', label: 'Opus Deep', color: 'text-emerald-400' },
  ];

  return (
    <div className="bg-ink/30 border border-sky-400/15 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-bright/70 font-medium">{progress || 'Starting scan agent...'}</p>
            <p className="text-[10px] text-muted/40 mt-0.5">Scan runs in background — safe to close tab</p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-[11px] font-mono text-sky-400/60">
              {hours > 0 ? `${hours}h ${String(dispMins).padStart(2, '0')}m` : `${mins}:${String(secs).padStart(2, '0')}`}
            </span>
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

        {/* Live stats */}
        {(stats.savedSearches > 0 || stats.totalCompanies > 0) && (
          <div className="flex gap-2 text-[10px] text-muted/40 flex-wrap">
            {stats.savedSearches > 0 && <span>Ⓗ {stats.savedSearches} searches</span>}
            {stats.totalCompanies > 0 && <span>→ {stats.totalCompanies} companies</span>}
            {stats.sonnetPassed > 0 && <span className="text-violet-300/60">→ {stats.sonnetPassed} pre-screened</span>}
            {stats.enriched > 0 && <span className="text-amber-300/60">→ {stats.enriched} enriched</span>}
            {stats.deepScored > 0 && <span className="text-emerald-300/60">→ {stats.deepScored} deep-scored</span>}
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
              <span className="text-[10px] text-red-300/70">Cancel the recurring scan?</span>
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

      {/* Live feed */}
      {feed.length > 0 && (
        <div className="border-t border-border/10 bg-black/20">
          <button onClick={() => setHideFeed(!hideFeed)}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/[0.02] transition-colors">
            <span className="text-[8px] uppercase tracking-widest text-muted/25 font-bold">Live Feed ({feed.length})</span>
            <span className="text-[9px] text-muted/30">{hideFeed ? '▸ Show' : '▾ Hide'}</span>
          </button>
          {!hideFeed && (
            <div className="px-4 pb-3 max-h-[250px] overflow-y-auto">
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

function ResultCard({ result, addFavorite, isFavorited }) {
  const [expanded, setExpanded] = useState(false);
  const card = result.card || {};
  const score = result.score || 0;
  const isFav = isFavorited ? isFavorited(result.name) : false;
  const webUrl = card.website ? (card.website.startsWith('http') ? card.website : `https://${card.website}`) : null;

  const scoreColor = score >= 9 ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
    : score >= 7 ? 'bg-sky-500/15 text-sky-300 border-sky-400/30'
    : 'bg-surface/40 text-muted/60 border-border/20';

  const confidenceColor = result.confidence === 'High' ? 'text-emerald-400/70' : result.confidence === 'Low' ? 'text-red-400/60' : 'text-amber-400/60';

  return (
    <div className="rounded-xl border border-border/15 bg-surface/50 p-3.5 space-y-2.5">
      {/* Header */}
      <div className="flex items-start gap-3">
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
            <span className={`text-[9px] ${confidenceColor}`}>{result.confidence}</span>
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
      {card.description && <p className="text-[10px] text-muted/50 leading-relaxed line-clamp-2">{card.description}</p>}

      {/* Deep analysis — expandable */}
      {result.analysis && (
        <div>
          <button onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-violet-400/60 hover:text-violet-300 transition-colors font-medium">
            {expanded ? '▾ Hide Analysis' : '▸ Show Opus Analysis'}
          </button>
          {expanded && (
            <div className="mt-2 bg-violet-500/[0.03] border border-violet-400/12 rounded-lg p-3 text-[11px] text-bright/60 leading-relaxed whitespace-pre-wrap font-mono">
              {result.analysis}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
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

// ---- Main Page ----

export default function RecurringScanPage({ addFavorite, isFavorited }) {
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [feed, setFeed] = useState([]);
  const [tab, setTab] = useState('results');
  const abortRef = useRef(null);

  // Poll status on mount
  useEffect(() => {
    fetchStatus();
    fetchResults();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/recurring-scan/status`);
      const data = await r.json();
      setStatus(data);
      if (data.status === 'scanning') setScanning(true);
      else if (data.status === 'done' && scanning) {
        setScanning(false);
        fetchResults();
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

  const startScan = async () => {
    setScanning(true);
    setFeed([]);

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch(`${API_BASE}/api/recurring-scan`, {
        method: 'POST',
        headers: authHeaders(),
        signal: controller.signal,
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith(': ') && line.length > 2) {
            const msg = line.slice(2).trim();
            if (msg && msg !== 'keepalive') {
              setFeed(prev => [{ msg, ts: Date.now(), id: Date.now() + Math.random() }, ...prev].slice(0, 50));
            }
          }
        }
      }

      // Extract final data
      const dataLine = fullText.split('\n').filter(l => l.startsWith('data: ')).pop();
      if (dataLine) {
        const data = JSON.parse(dataLine.slice(6));
        setResults(data);
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error('Scan error:', e);
    }

    setScanning(false);
    fetchStatus();
    fetchResults();
  };

  const cancelScan = async () => {
    if (abortRef.current) abortRef.current.abort();
    try { await fetch(`${API_BASE}/api/recurring-scan/cancel`, { method: 'POST' }); } catch (e) {}
    setScanning(false);
    fetchStatus();
  };

  const isRunning = scanning || status?.status === 'scanning';
  const sortedResults = results?.results ? [...results.results].sort((a, b) => (b.score || 0) - (a.score || 0)) : [];
  const topResults = sortedResults.filter(r => r.score >= 7);

  const crmUser = localStorage.getItem('crm_user') || 'Mark';

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 sm:px-8 pt-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-bright">🔁 Recurring Scan Agent</h1>
          <p className="text-[11px] text-muted/40 mt-1">Full pipeline: ALL saved searches → Sonnet pre-screen → Enrichment → Sonnet score → Opus deep analysis</p>
        </div>
        <span className="text-[11px] text-sky-400/70 font-medium">🦅 {crmUser}</span>
      </div>

      {/* Controls */}
      {!isRunning && (
        <div className="mb-6">
          <button onClick={startScan}
            className="px-6 py-3 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-300 font-bold text-sm hover:bg-sky-500/25 hover:border-sky-400/50 transition-all active:scale-[0.98]">
            🚀 Start Recurring Scan
          </button>
          <p className="text-[10px] text-muted/30 mt-2">Runs all Harmonic saved searches through 5-stage AI pipeline. Budget capped at $50. Takes 1-3 hours.</p>
        </div>
      )}

      {/* Last run info */}
      {results?.timestamp && !isRunning && (
        <div className="mb-4 flex items-center gap-3 text-[10px] text-muted/40">
          <span>Last run: {new Date(results.timestamp).toLocaleString()}</span>
          {results.duration && <span>· {Math.round(results.duration / 60)}m</span>}
          {results.budgetUsed && <span>· ${results.budgetUsed} spent</span>}
          {results.stats && (
            <span>· {results.stats.totalCompanies || 0} sourced → {results.stats.deepScored || 0} deep-scored → {results.stats.topResults || 0} rated 7+</span>
          )}
        </div>
      )}

      {/* Progress panel */}
      {isRunning && (
        <div className="mb-6">
          <ScanProgress status={status} onCancel={cancelScan} />
          {/* SSE feed as backup if status polling is slow */}
          {feed.length > 0 && !status?.progress && (
            <div className="mt-3 bg-black/20 rounded-lg p-3 max-h-[200px] overflow-y-auto">
              {feed.slice(0, 20).map((f, i) => (
                <div key={f.id} className={`text-[10px] ${i === 0 ? 'text-bright/60' : 'text-muted/30'}`}>
                  <span className="font-mono text-[9px] text-muted/20 mr-2">{new Date(f.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  {f.msg}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {sortedResults.length > 0 && !isRunning && (
        <div className="space-y-4">
          {/* Funnel stats */}
          {results.stats && (
            <div className="bg-amber-500/5 border border-amber-400/12 rounded-xl p-3 flex items-center gap-2 text-[10px] text-amber-300/60 flex-wrap">
              <span>Ⓗ {results.stats.savedSearches} searches</span>
              <span>→ {results.stats.totalCompanies} sourced</span>
              <span className="text-violet-300/60">→ {results.stats.sonnetPassed} pre-screened</span>
              <span className="text-amber-300/60">→ {results.stats.enriched} enriched</span>
              <span className="text-emerald-300/60">→ {results.stats.deepScored} Opus deep-scored</span>
              <span className="text-pink-300/60">→ {results.stats.topResults} rated 7+</span>
              <span className="text-sky-300/50">· ${results.budgetUsed} spent</span>
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex gap-1 bg-ink/30 rounded-lg p-1">
            <button onClick={() => setTab('results')}
              className={`flex-1 text-[11px] py-2 rounded-md font-semibold transition-all ${
                tab === 'results' ? 'bg-sky-500/15 text-sky-300 border border-sky-400/25' : 'text-muted/50 hover:text-muted/70'
              }`}>
              📊 Top Results ({topResults.length})
            </button>
            <button onClick={() => setTab('all')}
              className={`flex-1 text-[11px] py-2 rounded-md font-semibold transition-all ${
                tab === 'all' ? 'bg-violet-500/15 text-violet-300 border border-violet-400/25' : 'text-muted/50 hover:text-muted/70'
              }`}>
              📋 All Scored ({sortedResults.length})
            </button>
            {results.screenAnalysis && (
              <button onClick={() => setTab('logic')}
                className={`flex-1 text-[11px] py-2 rounded-md font-semibold transition-all ${
                  tab === 'logic' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/25' : 'text-muted/50 hover:text-muted/70'
                }`}>
                🧠 Full Analysis
              </button>
            )}
          </div>

          {/* Results list */}
          {(tab === 'results' || tab === 'all') && (
            <div className="space-y-2.5">
              <p className="text-[11px] text-muted/40">
                {tab === 'results' ? `${topResults.length} companies scored 7+ · sorted by score` : `${sortedResults.length} total deep-scored companies`}
              </p>
              {(tab === 'results' ? topResults : sortedResults).map(r => (
                <ResultCard key={r.name} result={r} addFavorite={addFavorite} isFavorited={isFavorited} />
              ))}
              {tab === 'results' && topResults.length === 0 && (
                <p className="text-muted/40 text-sm text-center py-4">No companies scored 7+. Check "All Scored" tab.</p>
              )}
            </div>
          )}

          {/* Full analysis */}
          {tab === 'logic' && results.screenAnalysis && (
            <div className="bg-violet-500/[0.03] border border-violet-400/12 rounded-xl p-4 space-y-3 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-violet-400/50 uppercase tracking-widest font-bold">Sonnet Screening Analysis</p>
                <button onClick={() => navigator.clipboard.writeText(results.screenAnalysis).catch(() => {})}
                  className="text-[9px] px-2 py-0.5 rounded border border-violet-400/20 text-violet-300/60 hover:bg-violet-500/10 transition-all">
                  📋 Copy
                </button>
              </div>
              <div className="text-[11px] text-bright/60 leading-relaxed whitespace-pre-wrap font-mono">{results.screenAnalysis}</div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!isRunning && sortedResults.length === 0 && (
        <div className="bg-surface/30 border border-border/15 rounded-xl p-8 text-center mt-8">
          <p className="text-2xl mb-2">🔁</p>
          <p className="text-muted/50 text-sm">No scan results yet</p>
          <p className="text-muted/30 text-[11px] mt-1">Start a recurring scan to run all Harmonic saved searches through the AI pipeline</p>
        </div>
      )}
    </div>
  );
}
