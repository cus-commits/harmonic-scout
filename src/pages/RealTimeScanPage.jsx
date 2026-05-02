import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';

function moneyFmt(val) {
  if (!val) return '';
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val}`;
}

// Harmonic company link
function harmonicLink(company) {
  const id = company.id || company.entity_id;
  if (id) return `https://app.harmonic.ai/company/${id}`;
  return null;
}

export default function RealTimeScanPage() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState(null);
  const [batches, setBatches] = useState([]);
  const [feed, setFeed] = useState([]);
  const lastMsg = useRef('');
  const feedRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Poll scan status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/recurring-scan/status`);
        const data = await r.json();
        const found = (data.scans || []).find(s => s.id === scanId);
        if (found) setScan(found);
      } catch {}
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [scanId]);

  // Poll batch data
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/recurring-scan/batches/${scanId}`);
        const data = await r.json();
        if (data.batches) setBatches(data.batches);
      } catch {}
    };
    fetchBatches();
    const interval = setInterval(fetchBatches, 4000);
    return () => clearInterval(interval);
  }, [scanId]);

  // Build live feed from scan progress
  useEffect(() => {
    const msg = scan?.progress || '';
    if (!msg || msg === 'keepalive' || msg === lastMsg.current) return;
    lastMsg.current = msg;
    setFeed(prev => [{ msg, ts: Date.now(), id: Date.now() + Math.random() }, ...prev].slice(0, 200));
  }, [scan?.progress]);

  // Auto-scroll feed
  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [feed, autoScroll]);

  const stats = scan?.stats || {};
  const isRunning = scan?.status === 'scanning';
  const elapsed = scan?.startedAt ? Math.max(1, (Date.now() - scan.startedAt) / 1000) : 0;
  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60);

  // Group batches by phase
  const prescreenBatches = batches.filter(b => b.phase === 'prescreen');
  const scoringBatches = batches.filter(b => b.phase === 'scoring');
  const deepBatches = batches.filter(b => b.phase === 'deep');

  // Extract all winners across phases
  const allWinners = [];
  prescreenBatches.forEach(b => {
    (b.companies || []).filter(c => c.verdict === 'PASS').forEach(c => {
      allWinners.push({ ...c, _phase: 'prescreen', _batch: b.batchNum, _source: b.sources?.[0] });
    });
  });
  scoringBatches.forEach(b => {
    (b.companies || []).filter(c => (c.score || 0) >= 7).forEach(c => {
      allWinners.push({ ...c, _phase: 'scoring', _batch: b.batchNum });
    });
  });
  deepBatches.forEach(b => {
    (b.companies || []).filter(c => (c.score || 0) >= 7).forEach(c => {
      allWinners.push({ ...c, _phase: 'deep', _batch: b.batchNum });
    });
  });

  return (
    <div className="min-h-screen max-w-[1080px] mx-auto px-7 pt-6 pb-28 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/searchagent')}
            className="text-[10px] px-3 py-1.5 rounded-lg border border-bo/20 text-bo/60 hover:text-bo font-medium">
            ← Back to Scans
          </button>
          <div>
            <h1 className="font-serif text-lg font-semibold text-bright flex items-center gap-2">
              <span className="text-sm">⚡</span> Real Time Scan View
            </h1>
            <p className="text-[10px] text-muted/40">Scan {scanId?.slice(0, 8)}... {scan?.tier?.name && `· ${scan.tier.name}`} {scan?.user && `· by ${scan.user}`}</p>
          </div>
        </div>
        <div className="text-right">
          {isRunning ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-sm border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] font-mono text-sm/70">{mins}:{String(secs).padStart(2, '0')}</span>
            </div>
          ) : (
            <span className="text-[10px] text-muted/40 px-2 py-1 rounded bg-surface/30 border border-border/15">
              {scan?.status === 'complete' ? '✅ Complete' : scan?.status || 'Loading...'}
            </span>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {(stats.totalCompanies > 0 || stats.sonnetPassed > 0) && (
        <div className="flex gap-2 text-[10px] text-muted/40 flex-wrap justify-center mb-5 bg-ink/30 rounded-lg px-3 py-2 border border-border/10">
          {stats.savedSearches > 0 && <span>Ⓗ {stats.savedSearches} searches</span>}
          {stats.totalCompanies > 0 && <span>→ {stats.totalCompanies.toLocaleString()} companies</span>}
          {stats.sonnetPassed > 0 && <span className="text-boro/60">→ {stats.sonnetPassed} pre-screened</span>}
          {stats.enriched > 0 && <span className="text-accent/60">→ {stats.enriched} enriched</span>}
          {stats.filtered > 0 && <span className="text-accent/60">→ {stats.filtered} filtered</span>}
          {stats.scored > 0 && <span className="text-rose/60">→ {stats.scored} scored 7+</span>}
          {stats.deepScored > 0 && <span className="text-sm/60">→ {stats.deepScored} deep-scored</span>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: Live transcript feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* Live feed */}
          <div className="bg-ink/40 border border-border/15 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/10 bg-black/30">
              <span className="text-[9px] uppercase tracking-widest text-sm/50 font-bold flex items-center gap-1.5">
                {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-sm animate-pulse" />}
                Live Transcript
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)}
                  className="w-3 h-3 rounded accent-sm" />
                <span className="text-[9px] text-muted/30">Auto-scroll</span>
              </label>
            </div>
            <div ref={feedRef} className="max-h-[400px] overflow-y-auto px-4 py-2 space-y-0.5 font-mono">
              {feed.length === 0 && (
                <p className="text-[10px] text-muted/25 py-4 text-center">Waiting for scan events...</p>
              )}
              {feed.map((f, i) => {
                const isWinner = f.msg.match(/[✅🌟🏆⭐]/);
                const isScore = f.msg.match(/\d+\/10/);
                const isBatch = f.msg.match(/batch \d+/i);
                return (
                  <div key={f.id} className={`flex items-start gap-2 text-[10px] leading-relaxed py-0.5 ${
                    i === 0 ? 'text-bright/70' : i < 3 ? 'text-bright/50' : 'text-muted/35'
                  } ${isWinner ? 'text-sm/70' : ''} ${isBatch ? 'mt-1 pt-1 border-t border-border/5' : ''}`}>
                    <span className="text-[8px] text-muted/20 flex-shrink-0 w-14 text-right">
                      {new Date(f.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className="flex-1">{f.msg}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Batch-by-batch breakdown */}
          {batches.length > 0 && (
            <div className="space-y-3">
              <p className="text-[9px] uppercase tracking-widest text-muted/30 font-bold">Batch Details</p>

              {/* Show batches in reverse order (latest first) */}
              {[...batches].reverse().map((batch, i) => {
                const phaseLabel = batch.phase === 'prescreen' ? 'Pre-Screen' : batch.phase === 'scoring' ? 'Scoring' : 'Deep Analysis';
                const phaseEmoji = batch.phase === 'prescreen' ? '⚡' : batch.phase === 'scoring' ? '🎯' : '🧠';
                const phaseColor = batch.phase === 'prescreen' ? 'violet' : batch.phase === 'scoring' ? 'pink' : 'emerald';

                const winners = (batch.companies || []).filter(c =>
                  batch.phase === 'prescreen' ? c.verdict === 'PASS' : (c.score || 0) >= 7
                );
                const losers = (batch.companies || []).filter(c =>
                  batch.phase === 'prescreen' ? c.verdict !== 'PASS' : (c.score || 0) < 7
                );

                return (
                  <div key={`${batch.phase}-${batch.batchNum}`}
                    className={`bg-ink/30 border border-${phaseColor}-400/10 rounded-xl overflow-hidden`}>
                    <div className={`flex items-center justify-between px-3 py-2 border-b border-${phaseColor}-400/10 bg-${phaseColor}-500/[0.03]`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{phaseEmoji}</span>
                        <span className="text-[10px] font-bold text-bright/70">{phaseLabel} {batch.batchNum}/{batch.totalBatches}</span>
                        {batch.sources?.length > 0 && (
                          <span className="text-[8px] text-muted/30 truncate max-w-[200px]">
                            from {batch.sources.join(', ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-sm/50">{winners.length} passed</span>
                        <span className="text-[9px] text-muted/25">{losers.length} cut</span>
                      </div>
                    </div>

                    {/* Winners */}
                    {winners.length > 0 && (
                      <div className="p-2.5 space-y-1">
                        {winners.map((c, j) => {
                          const hLink = harmonicLink(c);
                          return (
                            <div key={j} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-sm/[0.04] border border-sm/8 hover:bg-sm/[0.08] transition-all group">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-bright/75">{c.name}</span>
                                  {c.score && <span className="text-[9px] px-1 py-0.5 rounded bg-sm/15 text-sm font-bold">{c.score}/10</span>}
                                  {c.funding_stage && <span className="text-[8px] text-muted/25">{c.funding_stage}</span>}
                                  {c.funding_total > 0 && <span className="text-[8px] text-bo/40">💰 {moneyFmt(c.funding_total)}</span>}
                                </div>
                                {c.reason && <p className="text-[9px] text-muted/40 truncate mt-0.5">{c.reason}</p>}
                                {c.keySignal && <p className="text-[9px] text-accent/50 truncate">💡 {c.keySignal}</p>}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {hLink && (
                                  <a href={hLink} target="_blank" rel="noopener"
                                    className="text-[8px] px-1.5 py-1 rounded bg-boro/10 text-boro/60 border border-boro/15 hover:bg-boro/20 transition-all">
                                    Ⓗ Harmonic
                                  </a>
                                )}
                                {c.website && (
                                  <a href={(typeof c.website === 'object' ? (c.website?.url || '') : c.website || '').startsWith('http') ? (typeof c.website === 'object' ? c.website?.url : c.website) : `https://${typeof c.website === 'object' ? (c.website?.domain || '') : c.website}`} target="_blank" rel="noopener"
                                    className="text-[8px] px-1.5 py-1 rounded bg-bo/10 text-bo/60 border border-bo/15 hover:bg-bo/20 transition-all">
                                    🌐
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Losers — minimal, collapsed */}
                    {losers.length > 0 && (
                      <div className="px-2.5 pb-2">
                        <details>
                          <summary className="text-[8px] text-muted/20 cursor-pointer hover:text-muted/40 py-0.5">
                            {losers.length} cut — click to see
                          </summary>
                          <div className="mt-1 space-y-0.5 max-h-[100px] overflow-y-auto">
                            {losers.map((c, j) => (
                              <div key={j} className="text-[9px] text-muted/20 truncate px-2">
                                {c.name} {c.reason ? `— ${c.reason}` : ''}
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: Winners summary */}
        <div className="space-y-4">
          <div className="bg-ink/40 border border-sm/15 rounded-xl overflow-hidden sticky top-4">
            <div className="px-4 py-2.5 border-b border-sm/10 bg-sm/[0.03]">
              <span className="text-[9px] uppercase tracking-widest text-sm/60 font-bold">
                All Winners ({allWinners.length})
              </span>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-2.5 space-y-1">
              {allWinners.length === 0 && (
                <p className="text-[10px] text-muted/25 py-4 text-center">Winners will appear here as batches complete</p>
              )}
              {allWinners.map((c, i) => {
                const hLink = harmonicLink(c);
                const phaseIcon = c._phase === 'prescreen' ? '⚡' : c._phase === 'scoring' ? '🎯' : '🧠';
                return (
                  <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-sm/[0.04] transition-all group">
                    <span className="text-[9px] flex-shrink-0">{phaseIcon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-bright/70 truncate">{c.name}</span>
                        {c.score && <span className="text-[8px] text-sm/60 font-bold flex-shrink-0">{c.score}/10</span>}
                      </div>
                      {c.reason && <p className="text-[8px] text-muted/30 truncate">{c.reason}</p>}
                    </div>
                    {hLink && (
                      <a href={hLink} target="_blank" rel="noopener"
                        className="text-[7px] px-1 py-0.5 rounded bg-boro/10 text-boro/50 border border-boro/10 hover:bg-boro/20 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-all">
                        Ⓗ
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phase summary counts */}
          <div className="bg-ink/30 border border-border/15 rounded-xl p-3 space-y-2">
            <p className="text-[9px] uppercase tracking-widest text-muted/30 font-bold">Phase Summary</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-boro/60">⚡ Pre-Screen</span>
                <span className="text-muted/40">{prescreenBatches.length} batches · {prescreenBatches.reduce((s, b) => s + (b.companies || []).filter(c => c.verdict === 'PASS').length, 0)} passed</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-rose/60">🎯 Scoring</span>
                <span className="text-muted/40">{scoringBatches.length} batches · {scoringBatches.reduce((s, b) => s + (b.companies || []).filter(c => (c.score || 0) >= 7).length, 0)} rated 7+</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-sm/60">🧠 Deep Analysis</span>
                <span className="text-muted/40">{deepBatches.length} batches · {deepBatches.reduce((s, b) => s + (b.companies || []).filter(c => (c.score || 0) >= 7).length, 0)} top picks</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
