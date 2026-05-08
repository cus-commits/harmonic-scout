import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';

// Tier expected total runtime in seconds — for ETA math
const TIER_DURATIONS = {
  haiku: 90,
  sonnet: 180,
  opus20: 300,
  opus80: 720,
  extreme: 1500,
  unknown: 600,
};

const TIER_META = {
  haiku:   { label: 'Quick',    emoji: '⚡', tone: 'muted' },
  sonnet:  { label: 'Standard', emoji: '💰', tone: 'accent' },
  opus20:  { label: 'Deep',     emoji: '🔍', tone: 'bo' },
  opus80:  { label: 'Max',      emoji: '🧠', tone: 'boro' },
  extreme: { label: 'Extreme',  emoji: '🚀', tone: 'sm' },
  unknown: { label: 'Search',   emoji: '🔎', tone: 'muted' },
};

const STAGE_GROUPS = {
  import: 'Importing',
  filter: 'Filtering',
  prescreen: 'Screening',
  screen: 'Screening',
  meritscore: 'Merit-Scoring',
  deepscore: 'Deep-Scoring',
  'enrich-survivors': 'Enriching',
  'anchor-rating': 'Anchor Rating',
  'ai-query-gen': 'Generating Queries',
  'ai-query-run': 'Running Queries',
  'ai-query-enrich': 'Enriching Pool',
  'ai-query-done': 'Pool Complete',
  done: 'Done',
};

// Parse what we can from progress text + stage to enrich the display.
// (Backend doesn't currently surface tier/baselines per scan — TODO once we deploy backend changes.)
function parseScanInfo(scan) {
  const progress = scan.progress || '';
  const stage = scan.stage || '';

  // Tier inference from progress text patterns
  let tier = 'unknown';
  if (/50 Harmonic queries.*size=1000/i.test(progress) || /Merit batch \d+\/(\d+)/.test(progress)) {
    const meritMatch = progress.match(/Merit batch \d+\/(\d+)/);
    if (meritMatch) {
      const total = parseInt(meritMatch[1]);
      if (total >= 30) tier = 'extreme';
      else if (total >= 10) tier = 'opus80';
      else if (total >= 4) tier = 'opus20';
      else tier = 'sonnet';
    } else if (/50 Harmonic queries.*size=1000/i.test(progress)) {
      tier = 'extreme';
    }
  } else if (/20 Harmonic queries.*size=500/i.test(progress)) {
    tier = 'opus80';
  } else if (/Sonnet batch/i.test(progress) && !/Merit/.test(progress)) {
    tier = 'sonnet';
  }

  // Pool size, query progress, batch progress
  const poolMatch = progress.match(/pool[:\s]+(\d+[\d,]*)/i);
  const poolSize = poolMatch ? parseInt(poolMatch[1].replace(/,/g, '')) : null;

  const queryMatch = progress.match(/Query (\d+)\/(\d+)/i);
  const queryDone = queryMatch ? parseInt(queryMatch[1]) : null;
  const queryTotal = queryMatch ? parseInt(queryMatch[2]) : null;

  const sonnetMatch = progress.match(/Sonnet batch (\d+)\/(\d+)/i);
  const sonnetDone = sonnetMatch ? parseInt(sonnetMatch[1]) : null;
  const sonnetTotal = sonnetMatch ? parseInt(sonnetMatch[2]) : null;

  const meritMatch = progress.match(/Merit batch (\d+)\/(\d+)/i);
  const meritDone = meritMatch ? parseInt(meritMatch[1]) : null;
  const meritTotal = meritMatch ? parseInt(meritMatch[2]) : null;

  return { tier, stage, poolSize, queryDone, queryTotal, sonnetDone, sonnetTotal, meritDone, meritTotal };
}

function fmtElapsed(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

function fmtEta(seconds) {
  if (seconds <= 0) return 'finishing up...';
  if (seconds < 60) return `<1 min`;
  if (seconds < 120) return `~1-2 min`;
  return `~${Math.ceil(seconds / 60)} min`;
}

function getStagePctForTier(stage, tier) {
  // Approximate phase-based completion percentage
  const phases = {
    extreme: { import: [0, 50], filter: [50, 55], screen: [55, 75], meritscore: [75, 100], done: [100, 100] },
    opus80:  { import: [0, 40], filter: [40, 45], screen: [45, 70], meritscore: [70, 100], done: [100, 100] },
    opus20:  { import: [0, 25], filter: [25, 30], screen: [30, 60], meritscore: [60, 100], done: [100, 100] },
    sonnet:  { import: [0, 25], filter: [25, 30], screen: [30, 95], done: [95, 100] },
    haiku:   { import: [0, 25], filter: [25, 30], screen: [30, 95], done: [95, 100] },
    unknown: { import: [0, 25], filter: [25, 35], screen: [35, 70], meritscore: [70, 100], done: [100, 100] },
  };
  const map = phases[tier] || phases.unknown;
  const stageKey = ['ai-query-gen', 'ai-query-run', 'ai-query-enrich', 'ai-query-done'].includes(stage) ? 'import'
    : ['anchor-rating', 'enrich-survivors', 'deepscore', 'meritscore'].includes(stage) ? 'meritscore'
    : ['prescreen', 'screen'].includes(stage) ? 'screen'
    : stage;
  return map[stageKey] || [50, 80];
}

function ScanCard({ scanId, scan, isMine }) {
  const info = parseScanInfo(scan);
  const tierMeta = TIER_META[info.tier];
  const stageLabel = STAGE_GROUPS[info.stage] || 'Working';
  const startedAt = scan.startedAt || Date.now();
  const elapsedSec = (Date.now() - startedAt) / 1000;
  const expectedSec = TIER_DURATIONS[info.tier];

  // ETA: blend tier-based estimate with stage-based percentage
  const [stageStart, stageEnd] = getStagePctForTier(info.stage, info.tier);
  // Assume linear progress through current stage (use sub-stage hints if available)
  let stagePct = stageStart;
  if (info.queryTotal) stagePct = stageStart + (info.queryDone / info.queryTotal) * (stageEnd - stageStart);
  else if (info.sonnetTotal) stagePct = stageStart + (info.sonnetDone / info.sonnetTotal) * (stageEnd - stageStart);
  else if (info.meritTotal) stagePct = stageStart + (info.meritDone / info.meritTotal) * (stageEnd - stageStart);
  else stagePct = (stageStart + stageEnd) / 2;
  const overallPct = Math.min(99, Math.max(1, stagePct));
  const remainSec = Math.max(0, (expectedSec * (100 - overallPct)) / 100);

  return (
    <div className={`glass-card p-3 space-y-2 transition-all ${isMine ? 'border-accent/40 ring-1 ring-accent/15' : 'border-border/20'}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-md bg-${tierMeta.tone}/10 text-${tierMeta.tone} border border-${tierMeta.tone}/25 font-bold`}>
          {tierMeta.emoji} {tierMeta.label}
        </span>
        <span className="text-[10px] text-bright/65 font-mono">{stageLabel}</span>
        {isMine && <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/12 text-accent/85 border border-accent/25 font-semibold ml-auto">YOURS</span>}
      </div>

      <div className="space-y-1">
        <p className="text-[10.5px] text-bright/75 leading-snug line-clamp-2">{scan.progress || 'Working...'}</p>
        <div className="flex items-center gap-2 text-[9px] text-muted/55 font-mono flex-wrap">
          <span>⏱ {fmtElapsed(elapsedSec)} elapsed</span>
          <span className="text-muted/30">·</span>
          <span className="text-accent/65">ETA {fmtEta(remainSec)}</span>
          {info.poolSize && (
            <>
              <span className="text-muted/30">·</span>
              <span className="text-sm/65">🔮 {info.poolSize.toLocaleString()} candidates</span>
            </>
          )}
          {info.meritTotal && (
            <>
              <span className="text-muted/30">·</span>
              <span className="text-boro/65">🧠 {info.meritDone}/{info.meritTotal} rated</span>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-surface rounded-full overflow-hidden">
        <div
          className={`h-full bg-${tierMeta.tone}/70 transition-all duration-1000 rounded-full`}
          style={{ width: `${overallPct}%` }}
        />
      </div>
    </div>
  );
}

export default function ActiveScansPanel() {
  const [scans, setScans] = useState({});
  const [loading, setLoading] = useState(true);
  const [recentDone, setRecentDone] = useState([]); // briefly show just-completed

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/signals/super/status`);
        if (!r.ok) return;
        const data = await r.json();
        const now = Date.now();
        const active = {};
        const justDone = [];
        for (const [k, v] of Object.entries(data || {})) {
          if (v.status === 'scanning' && v.startedAt && (now - v.startedAt) < 35 * 60 * 1000) {
            active[k] = v;
          } else if (v.status === 'done' && v.finishedAt && (now - v.finishedAt) < 5 * 60 * 1000) {
            // Just finished (last 5 min) — show briefly
            justDone.push({ scanId: k, scan: v });
          }
        }
        setScans(active);
        setRecentDone(justDone);
      } catch (e) {}
      setLoading(false);
    };
    fetchStatus();
    const id = setInterval(fetchStatus, 10000); // poll every 10s
    return () => clearInterval(id);
  }, []);

  const myScanId = (() => {
    try {
      // We don't have a great way to know "which scan is mine" without backend attribution.
      // Heuristic: if the user has a scan currently tracked in localStorage, match by scanId.
      // ScanContext stores active state in memory only, so this is best-effort.
      return null;
    } catch { return null; }
  })();

  const activeCount = Object.keys(scans).length;

  if (loading) {
    return (
      <div className="glass-card p-4 mb-5">
        <p className="text-[11px] text-muted/40 font-mono text-center">Loading active scans...</p>
      </div>
    );
  }

  if (activeCount === 0 && recentDone.length === 0) {
    return (
      <div className="glass-card p-4 mb-5 border-border/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[12px]">🌒</span>
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted/55">No active scans right now</span>
          </div>
          <span className="text-[9px] text-muted/40 italic">be the first — start one in Super Search</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sm opacity-60"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sm"></span>
          </span>
          <span className="text-[10px] uppercase tracking-wider font-bold text-bright/75">
            {activeCount} active scan{activeCount === 1 ? '' : 's'} across the team
          </span>
        </div>
        <span className="text-[9px] text-muted/40 italic">live — refreshes every 10s</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {Object.entries(scans).map(([scanId, scan]) => (
          <ScanCard key={scanId} scanId={scanId} scan={scan} isMine={scanId === myScanId} />
        ))}
      </div>
      {recentDone.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 px-1 mt-3">
            <span className="text-sm">✅</span>
            <span className="text-[10px] uppercase tracking-wider font-bold text-sm/75">
              Just completed ({recentDone.length})
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {recentDone.map(({ scanId, scan }) => {
              const r = scan.results || {};
              const info = parseScanInfo({ progress: '', stage: 'done' });
              return (
                <div key={scanId} className="glass-card p-3 border-sm/25 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sm/12 text-sm border border-sm/30 font-bold">✓ Done</span>
                    {r.tier && <span className="text-[10px] px-1.5 py-0.5 rounded bg-bright/8 text-bright/65 border border-border/25">{TIER_META[r.tier]?.label || r.tier}</span>}
                    {r.estimatedCost && <span className="text-[10px] text-accent/75 font-mono ml-auto">${r.estimatedCost}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted/55 font-mono flex-wrap">
                    {r.totalSignals && <span>{r.totalSignals.toLocaleString()} candidates</span>}
                    {r.meritScoredCount > 0 && <span className="text-boro/65">· 🧠 {r.meritScoredCount} merit-scored</span>}
                    {r.elapsed && <span className="text-muted/40">· ⏱ {fmtElapsed(r.elapsed)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
