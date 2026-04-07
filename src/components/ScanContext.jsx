import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';

const TEAM = [
  { id: 'mark', name: 'Mark', emoji: '🦅' },
  { id: 'jake', name: 'Jake', emoji: '🐺' },
  { id: 'joe', name: 'Joe', emoji: '🦁' },
  { id: 'carlo', name: 'Carlo', emoji: '🐻' },
  { id: 'liam', name: 'Liam', emoji: '🦊' },
  { id: 'dean', name: 'Dean', emoji: '🦈', restricted: true },
  { id: 'brett', name: 'Brett', emoji: '🐍', restricted: true },
];

const HISTORY_DAYS = 30;
const SCAN_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
const WEEKLY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const STAGGER_MS = 30 * 60 * 1000; // 30 min between team members
const TOP_PICKS_MAX = 20;

// ---- Storage helpers ----

function loadProfiles(personId) {
  try {
    const saved = localStorage.getItem(`autoscan_profiles_${personId}`);
    if (saved) return JSON.parse(saved);
    const old = localStorage.getItem(`autoscan_profile_${personId}`);
    if (old) { const p = JSON.parse(old); p.name = p.name || 'Main Scan'; p.id = 'main'; return [p]; }
    return [];
  } catch { return []; }
}

function saveProfiles(personId, profiles) {
  localStorage.setItem(`autoscan_profiles_${personId}`, JSON.stringify(profiles));
  // Also sync to server for cross-device access
  fetch(`${API_BASE}/api/profiles/${personId}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profiles }),
  }).catch(() => {});
}

// Sync profiles from server on load — server is source of truth
async function syncProfilesFromServer() {
  try {
    const r = await fetch(`${API_BASE}/api/profiles`);
    if (!r.ok) return {};
    const data = await r.json();
    const serverProfiles = data.profiles || {};
    let synced = 0;
    for (const [personId, profiles] of Object.entries(serverProfiles)) {
      if (!Array.isArray(profiles) || profiles.length === 0) continue;
      // Always overwrite local with server data (server is source of truth)
      localStorage.setItem(`autoscan_profiles_${personId}`, JSON.stringify(profiles));
      synced++;
    }
    if (synced > 0) {
      console.log(`[Profiles] Synced ${synced} profiles from server`);
      // Force page reload to pick up new profiles (only if we actually synced new data)
      const wasEmpty = !localStorage.getItem('_profiles_synced');
      localStorage.setItem('_profiles_synced', Date.now().toString());
      if (wasEmpty && synced > 0) window.location.reload();
    }
    return serverProfiles;
  } catch (e) {
    console.log('[Profiles] Server sync failed:', e.message);
    return {};
  }
}

function loadHistory(personId) {
  try {
    const saved = localStorage.getItem(`autoscan_history_${personId}`);
    if (!saved) return [];
    return JSON.parse(saved).filter(h => h.timestamp > Date.now() - HISTORY_DAYS * 86400000);
  } catch { return []; }
}

function saveToHistory(personId, profileName, results) {
  const history = loadHistory(personId);
  // Trim results to prevent localStorage overflow (keep analysis + funnel + top 100 companies)
  const trimmed = {
    ...results,
    results: (results.results || []).slice(0, 300), // Keep top 300 by score
  };
  history.unshift({ profileName, results: trimmed, timestamp: Date.now() });
  try {
    localStorage.setItem(`autoscan_history_${personId}`, JSON.stringify(history.slice(0, 20)));
  } catch (e) {
    // If still too big, reduce further
    console.warn('[History] localStorage full, trimming history');
    try {
      localStorage.setItem(`autoscan_history_${personId}`, JSON.stringify(history.slice(0, 5)));
    } catch (e2) { console.error('[History] Cannot save even 5 entries'); }
  }
}

function loadTopPicks(personId) {
  try {
    const saved = localStorage.getItem(`autoscan_toppicks_${personId}`);
    if (!saved) return [];
    return JSON.parse(saved).filter(p => p.addedAt > Date.now() - HISTORY_DAYS * 86400000);
  } catch { return []; }
}

function trimCompanyForStorage(c) {
  // Strip heavy fields to reduce localStorage size
  if (!c) return c;
  const { founders, executives, prior_companies, founder_prior_companies, employee_highlights, highlights, investors, lead_investors, ...light } = c;
  if (light.description && light.description.length > 300) light.description = light.description.slice(0, 300);
  return light;
}

function saveTopPick(personId, company, scanMeta) {
  const picks = loadTopPicks(personId);
  const exists = picks.findIndex(p => p.company?.name === company.name);
  const entry = {
    company: trimCompanyForStorage(company),
    addedAt: Date.now(),
    scanName: company._sourceCategory || company._sourceSearchName || scanMeta?.profileName || 'Scan',
    profileName: scanMeta?.profileName || 'Scan',
    scanMode: scanMeta?.scanMode || 'keywords',
    analysis: (scanMeta?.analysis || '').slice(0, 5000), // Cap analysis at 5KB
    score: company._score || null,
    allWinners: (scanMeta?.allWinners || []).slice(0, 10).map(w => ({ name: w.name, _score: w._score })), // Only names+scores, max 10
  };
  if (exists >= 0) picks[exists] = entry;
  else picks.unshift(entry);
  const trimmed = picks.slice(0, TOP_PICKS_MAX);
  try {
    localStorage.setItem(`autoscan_toppicks_${personId}`, JSON.stringify(trimmed));
  } catch (e) {
    // Still too big — trim more aggressively
    console.warn('[TopPicks] localStorage full, trimming to 10');
    try {
      localStorage.setItem(`autoscan_toppicks_${personId}`, JSON.stringify(trimmed.slice(0, 10).map(p => ({ ...p, analysis: null, allWinners: [] }))));
    } catch (e2) {
      console.error('[TopPicks] Cannot save — clearing old data');
      localStorage.removeItem(`autoscan_toppicks_${personId}`);
    }
  }
}

function autoSaveTopPicks(personId, results, analysis, profileName, scanMode) {
  if (!results?.length) return;
  const scoreMap = {};
  if (analysis) {
    for (const m of analysis.matchAll(/\*\*([^*]+)\*\*[^]*?Score:\s*(\d+)/gi)) {
      scoreMap[m[1].trim().toLowerCase()] = parseInt(m[2]) || 0;
    }
  }
  const scored = results.map(c => ({ ...c, _score: scoreMap[(c.name || '').toLowerCase()] || 0 }));
  const toSave = scored.filter(c => c._score >= 7).length > 0
    ? scored.filter(c => c._score >= 7)
    : scored.slice(0, 5);

  // Build winners list — names + scores of all companies that made the cut
  const allWinners = toSave.map(c => ({ name: c.name, score: c._score }));

  const scanMeta = { profileName, scanMode, analysis, allWinners };
  for (const c of toSave) saveTopPick(personId, c, scanMeta);
}

function getLastScanTime(personId) { try { return parseInt(localStorage.getItem(`autoscan_lastrun_${personId}`) || '0'); } catch { return 0; } }
function setLastScanTime(personId) { localStorage.setItem(`autoscan_lastrun_${personId}`, String(Date.now())); }
function getLastWeeklyScanTime(personId) { try { return parseInt(localStorage.getItem(`autoscan_weekly_lastrun_${personId}`) || '0'); } catch { return 0; } }
function setLastWeeklyScanTime(personId) { localStorage.setItem(`autoscan_weekly_lastrun_${personId}`, String(Date.now())); }

function isProfileEmpty(p) {
  if (!p) return true;
  // savedSearch profiles are never "empty" if they have savedSearchIds
  if (p.scanMode === 'savedSearch' && p.savedSearchIds?.length > 0) return false;
  const hasCustom = !!(p.keywords || p.notes || p.antiKeywords || p.maxValuation || p.foundedAfter);
  if (!hasCustom && (!p.sectors || p.sectors.length === 0)) return true;
  if (!hasCustom && !p._customized) return true;
  return false;
}

// ---- Context ----

const ScanContext = createContext(null);
export function useScan() { return useContext(ScanContext); }

export function ScanProvider({ children }) {
  const [activeScans, setActiveScans] = useState({});
  const [scanResults, setScanResults] = useState({});
  const [dismissed, setDismissed] = useState({});

  // Sync profiles from server on mount (cross-device support)
  useEffect(() => { syncProfilesFromServer(); }, []);

  // Recover scan state from server (survives tab close/reopen/refresh)
  useEffect(() => {
    const recoverScans = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/autoscan/status`);
        if (!r.ok) return;
        const statuses = await r.json();
        const now = Date.now();
        for (const [personId, status] of Object.entries(statuses)) {
          if (status.status === 'done' && status.finishedAt > now - 30 * 60 * 1000) {
            // Scan finished in last 30 min — recover results
            if (!scanResults[personId]) {
              try {
                const rr = await fetch(`${API_BASE}/api/autoscan/last-results/${personId}`);
                if (rr.ok) {
                  const data = await rr.json();
                  if (data.results && !data.error) {
                    setScanResults(prev => ({ ...prev, [personId]: data }));
                    saveToHistory(personId, data.profileName || 'Scan', data);
                    console.log(`[ScanRecovery] Recovered results for ${personId}: ${(data.results || []).length} companies`);
                  }
                }
              } catch (e) {}
            }
          }
          // Reconnect to ALL active scans (any user) — show cross-user scan visibility
          if (status.status === 'scanning' && status.startedAt && (now - status.startedAt) < 15 * 60 * 1000) {
            console.log(`[ScanRecovery] Reconnecting to active scan for ${personId}: "${status.progress}" (${Math.round((now - status.startedAt)/60000)}min ago)`);
            setActiveScans(prev => ({ ...prev, [personId]: { 
              status: 'scanning', 
              profileName: status.profileName,
              progress: status.progress,
              stage: status.stage,
              startedAt: status.startedAt,
              recovered: true
            }}));
            // Poll for updates
            const pollInterval = setInterval(async () => {
              try {
                const sr = await fetch(`${API_BASE}/api/autoscan/status/${personId}`);
                if (!sr.ok) return;
                const s = await sr.json();
                if (s.status === 'done') {
                  clearInterval(pollInterval);
                  const rr = await fetch(`${API_BASE}/api/autoscan/last-results/${personId}`);
                  if (rr.ok) {
                    const data = await rr.json();
                    if (data.results && !data.error) {
                      setScanResults(prev => ({ ...prev, [personId]: data }));
                      setActiveScans(prev => ({ ...prev, [personId]: { status: 'done', finishedAt: Date.now() } }));
                      saveToHistory(personId, data.profileName || 'Scan', data);
                    }
                  }
                } else if (s.status === 'scanning' && s.progress) {
                  // Update progress display
                  setActiveScans(prev => ({ ...prev, [personId]: { 
                    ...prev[personId], 
                    progress: s.progress, 
                    stage: s.stage 
                  }}));
                } else if (s.status !== 'scanning') {
                  clearInterval(pollInterval);
                  setActiveScans(prev => ({ ...prev, [personId]: { status: 'idle' } }));
                }
              } catch (e) {}
            }, 5000); // Poll every 5s for live updates
            setTimeout(() => clearInterval(pollInterval), 10 * 60 * 1000);
          }
        }
      } catch (e) { console.log('[ScanRecovery] Check failed:', e.message); }
    };
    recoverScans();
  }, []);

  const [nextRuns, setNextRuns] = useState(() => {
    const nr = {};
    TEAM.forEach((t, i) => {
      const last = getLastScanTime(t.id);
      nr[t.id] = last ? last + SCAN_INTERVAL_MS + (i * STAGGER_MS) : 0;
    });
    return nr;
  });
  const [nextWeeklyRuns, setNextWeeklyRuns] = useState(() => {
    const nr = {};
    TEAM.forEach((t, i) => {
      const last = getLastWeeklyScanTime(t.id);
      nr[t.id] = last ? last + WEEKLY_INTERVAL_MS + (i * STAGGER_MS) : 0;
    });
    return nr;
  });

  // Sequential scan queue — only ONE scan runs at a time
  const queueRef = useRef([]);
  const runningRef = useRef(false);
  const timerRef = useRef(null);
  const abortRef = useRef({}); // personId → AbortController

  const cancelScan = useCallback((personId) => {
    if (abortRef.current[personId]) {
      abortRef.current[personId].abort();
      delete abortRef.current[personId];
    }
    setActiveScans(prev => ({ ...prev, [personId]: { status: 'cancelled' } }));
    setScanResults(prev => ({ ...prev, [personId]: null }));
    console.log(`[Scan] Cancelled scan for ${personId}`);
  }, []);

  const executeScan = useCallback(async (personId, profile, mode) => {
    setActiveScans(prev => ({ ...prev, [personId]: { status: 'scanning', profileName: profile?.name || 'Scan', scanMode: profile?.scanMode || 'keywords', startedAt: Date.now() } }));
    try {
      const anthropicKey = localStorage.getItem('scout_anthropic_key') || '';
      const harmonicKey = localStorage.getItem('scout_harmonic_key') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (anthropicKey && anthropicKey !== '__SERVER__') headers['x-anthropic-key'] = anthropicKey;
      if (harmonicKey && harmonicKey !== '__SERVER__') headers['x-harmonic-key'] = harmonicKey;

      // Build payload — include savedSearch fields if present
      const payload = { personId, profile, mode };

      const controller = new AbortController();
      abortRef.current[personId] = controller;
      const timeout = setTimeout(() => controller.abort(), 7200000); // 2hr timeout — never timeout on user
      const res = await fetch(`${API_BASE}/api/autoscan`, {
        method: 'POST', headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      // Stream SSE events for live progress updates
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let streamError = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          // Parse SSE progress comments (lines starting with ': ')
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith(': ') && line.length > 2) {
              const progressMsg = line.slice(2).trim();
              if (progressMsg && progressMsg !== 'keepalive') {
                setActiveScans(prev => ({
                  ...prev,
                  [personId]: { ...prev[personId], status: 'scanning', progress: progressMsg }
                }));
              }
            }
          }
        }
      } catch (streamErr) {
        console.warn(`[Scan] Stream interrupted for ${personId}: ${streamErr.message} — will poll for results`);
        streamError = true;
      }

      const text = fullText;
      console.log(`[Scan] Response received: ${text.length} chars`);
      
      // Find the data line — skip SSE comments (lines starting with :)
      const dataLine = text.split('\n').filter(l => l.startsWith('data: ')).pop(); // Use LAST data line

      let data;
      if (dataLine) {
        try {
          data = JSON.parse(dataLine.slice(6));
        } catch (parseErr) {
          console.error('[Scan] Failed to parse data:', dataLine.slice(0, 200));
        }
      }

      // Recovery: if stream ended without data or stream errored, poll server for results
      if (!data || streamError) {
        console.log('[Scan] Stream ended without data — polling server for results...');
        setActiveScans(prev => ({ ...prev, [personId]: { ...prev[personId], progress: 'Recovering results...' } }));
        let idleCount = 0;
        // Poll status until done (max 5 min)
        for (let attempt = 0; attempt < 60; attempt++) {
          await new Promise(r => setTimeout(r, 5000));
          try {
            const statusRes = await fetch(`${API_BASE}/api/autoscan/status`);
            const status = await statusRes.json();
            const personStatus = status[personId];
            if (personStatus?.progress) {
              setActiveScans(prev => ({ ...prev, [personId]: { ...prev[personId], progress: personStatus.progress } }));
            }
            if (personStatus?.status === 'done') {
              // Fetch the results
              const resultsRes = await fetch(`${API_BASE}/api/autoscan/last-results/${personId}`);
              data = await resultsRes.json();
              if (data && !data.error) {
                console.log('[Scan] Recovered results from server:', (data.results||[]).length, 'companies');
                break;
              }
            }
            // If status is idle or missing, the scan may have been cleared — check for cached results
            if (!personStatus || personStatus.status === 'idle') {
              idleCount++;
              // Try fetching cached results in case scan finished but status was cleared
              try {
                const resultsRes = await fetch(`${API_BASE}/api/autoscan/last-results/${personId}`);
                const cached = await resultsRes.json();
                if (cached && !cached.error && cached.results?.length > 0) {
                  console.log('[Scan] Found cached results after status cleared:', cached.results.length, 'companies');
                  data = cached;
                  break;
                }
              } catch (e) { /* no cached results */ }
              // If idle for 3+ consecutive polls, scan is dead — stop waiting
              if (idleCount >= 3) {
                throw new Error('Scan ended without results — the server may have timed out. Try again.');
              }
            } else {
              idleCount = 0; // reset if status is scanning/done/etc
            }
            if (personStatus?.status === 'error') {
              throw new Error(personStatus?.error || 'Scan failed on server');
            }
          } catch(pollErr) {
            if (pollErr.message && !pollErr.message.includes('Scan timed out')) throw pollErr;
            if (attempt >= 59) throw new Error('Scan timed out — check server logs');
          }
        }
        if (!data) throw new Error('Could not recover scan results');
      }
      
      if (data.error) throw new Error(data.error);

      setScanResults(prev => ({ ...prev, [personId]: data }));
      setActiveScans(prev => ({ ...prev, [personId]: { status: 'done', profileName: profile?.name || 'Scan', finishedAt: Date.now() } }));
      saveToHistory(personId, profile?.name || 'Scan', data);
      autoSaveTopPicks(personId, data.results || [], data.analysis || '', profile?.name || 'Scan', profile?.scanMode || 'keywords');

      if (mode === 'weekly') {
        setLastWeeklyScanTime(personId);
        const idx = TEAM.findIndex(t => t.id === personId);
        setNextWeeklyRuns(prev => ({ ...prev, [personId]: Date.now() + WEEKLY_INTERVAL_MS + (idx * STAGGER_MS) }));
      } else {
        setLastScanTime(personId);
        const idx = TEAM.findIndex(t => t.id === personId);
        setNextRuns(prev => ({ ...prev, [personId]: Date.now() + SCAN_INTERVAL_MS + (idx * STAGGER_MS) }));
      }
    } catch (err) {
      console.error(`[Scan] Error for ${personId}:`, err.message);
      setScanResults(prev => ({ ...prev, [personId]: { results: [], message: `Error: ${err.message}` } }));
      setActiveScans(prev => ({ ...prev, [personId]: { status: 'error', error: err.message } }));
    }
  }, []);

  // Process queue: run one at a time, wait 10s between scans
  const processQueue = useCallback(async () => {
    if (runningRef.current) return;
    if (queueRef.current.length === 0) return;

    runningRef.current = true;
    const job = queueRef.current.shift();
    console.log(`[ScanQueue] Running ${job.mode} scan for ${job.personId} (${queueRef.current.length} remaining)`);

    await executeScan(job.personId, job.profile, job.mode);

    // Wait 10 seconds between scans to avoid rate limits
    await new Promise(r => setTimeout(r, 10000));
    runningRef.current = false;

    // Process next in queue
    processQueue();
  }, [executeScan]);

  // Public runScan — adds to queue
  const runScan = useCallback((personId, profile, { auto = false, mode = 'daily' } = {}) => {
    // Don't double-queue
    if (activeScans[personId]?.status === 'scanning') return;
    if (queueRef.current.some(j => j.personId === personId && j.mode === mode)) return;

    queueRef.current.push({ personId, profile, mode });
    console.log(`[ScanQueue] Queued ${mode} scan for ${personId} (queue size: ${queueRef.current.length})`);
    processQueue();
  }, [activeScans, processQueue]);

  const dismissCompany = useCallback(async (personId, company) => {
    setDismissed(prev => {
      const s = new Set(prev[personId] || []);
      s.add(company.name);
      return { ...prev, [personId]: s };
    });
    try {
      await fetch(`${API_BASE}/api/autoscan/dismiss`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personId, companyIds: [company.id || company.name] }) });
    } catch (e) {}
  }, []);

  // Auto-scan timer — check every 2 min, queue ONE overdue scan per tick
  // Spreads ALL scans across 24h cycle with 30-min gaps between each scan globally
  const PROFILE_STAGGER_MS = 30 * 60 * 1000; // 30 min between each scan globally

  // Auto-scan scheduling DISABLED — scans only run on explicit user click
  // useEffect(() => { ... }, [nextRuns, nextWeeklyRuns, activeScans, runScan]);

  // ---- Super Search state ----
  const [superSearchStatus, setSuperSearchStatus] = useState(null); // { status, progress, stage, startedAt, params }
  const [superSearchResults, setSuperSearchResults] = useState(null);
  const [superSearchHistory, setSuperSearchHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('supersearch_history') || '[]'); } catch { return []; }
  });
  const superAbortRef = useRef(null);

  const saveSuperHistory = (entry) => {
    setSuperSearchHistory(prev => {
      const next = [entry, ...prev].slice(0, 20);
      localStorage.setItem('supersearch_history', JSON.stringify(next));
      return next;
    });
  };

  // Recover super search status on mount/refresh
  useEffect(() => {
    const recoverSuper = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/signals/super/status`);
        if (!r.ok) return;
        const statuses = await r.json();
        const now = Date.now();
        for (const [scanId, s] of Object.entries(statuses)) {
          if (s.status === 'done' && s.results && s.finishedAt > now - 10 * 60 * 1000) {
            // Recent completed scan — show results
            if (!superSearchResults) {
              setSuperSearchResults(s.results);
              setSuperSearchStatus({ status: 'done', finishedAt: s.finishedAt });
              console.log('[SuperRecovery] Recovered completed super search results');
            }
          } else if (s.status === 'scanning' && s.progress && s.startedAt && (now - s.startedAt) < 10 * 60 * 1000) {
            // Active scan — reconnect via polling
            console.log(`[SuperRecovery] Reconnecting to active super search: "${s.progress}"`);
            setSuperSearchStatus({ status: 'scanning', progress: s.progress, stage: s.stage, startedAt: s.startedAt, recovered: true });
            
            const pollInterval = setInterval(async () => {
              try {
                const sr = await fetch(`${API_BASE}/api/signals/super/status`);
                if (!sr.ok) return;
                const statuses2 = await sr.json();
                const current = statuses2[scanId];
                if (!current) { clearInterval(pollInterval); return; }
                
                if (current.status === 'done' && current.results) {
                  clearInterval(pollInterval);
                  setSuperSearchResults(current.results);
                  setSuperSearchStatus({ status: 'done', finishedAt: current.finishedAt || Date.now() });
                  saveSuperHistory({
                    id: Date.now(),
                    date: new Date().toISOString(),
                    signals: (current.results.signals || []).filter(sig => sig.signal === 'HIGH').length,
                    totalSignals: current.results.totalSignals || 0,
                    ddPushed: current.results.ddPushed || 0,
                    analysis: current.results.analysis || null,
                    elapsed: current.results.elapsed || 0,
                    cost: current.results.estimatedCost || '0.00',
                    topResults: (current.results.signals || []).filter(sig => sig.signal === 'HIGH').slice(0, 10).map(sig => ({ name: sig.companyName || sig.title, source: sig.source, signal: sig.signal })),
                  });
                } else if (current.status === 'scanning' && current.progress) {
                  setSuperSearchStatus(prev => ({ ...prev, progress: current.progress, stage: current.stage }));
                } else if (current.status !== 'scanning') {
                  clearInterval(pollInterval);
                  setSuperSearchStatus(null);
                }
              } catch (e) {}
            }, 3000);
            setTimeout(() => clearInterval(pollInterval), 10 * 60 * 1000);
            break; // Only reconnect to one scan
          }
        }
      } catch (e) { console.log('[SuperRecovery] Check failed:', e.message); }
    };
    recoverSuper();
  }, []);

  const runSuperSearch = useCallback(async (params) => {
    if (superSearchStatus?.status === 'scanning') return;
    
    const startTime = Date.now();
    setSuperSearchStatus({ status: 'scanning', progress: 'Initializing...', stage: 'import', startedAt: startTime, params });
    setSuperSearchResults(null);

    const controller = new AbortController();
    superAbortRef.current = controller;

    try {
      const anthropicKey = localStorage.getItem('scout_anthropic_key') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (anthropicKey) headers['x-anthropic-key'] = anthropicKey;

      const res = await fetch(`${API_BASE}/api/signals/super`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.progress) {
              setSuperSearchStatus(prev => ({
                ...prev,
                progress: data.progress,
                stage: data.stage || prev?.stage,
                meta: data.meta || prev?.meta,
              }));
            } else {
              // Final results
              setSuperSearchResults(data);
              setSuperSearchStatus({ status: 'done', finishedAt: Date.now(), startedAt: startTime });
              // Save to history
              saveSuperHistory({
                id: Date.now(),
                date: new Date().toISOString(),
                params,
                signals: (data.signals || []).filter(s => s.signal === 'HIGH').length,
                totalSignals: data.totalSignals || 0,
                ddPushed: data.ddPushed || 0,
                analysis: data.analysis || null,
                elapsed: data.elapsed || Math.round((Date.now() - startTime) / 1000),
                cost: data.estimatedCost || '0.00',
                topResults: (data.signals || []).filter(s => s.signal === 'HIGH').slice(0, 10).map(s => ({
                  name: s.companyName || s.title,
                  source: s.source,
                  signal: s.signal,
                  engagement: s.engagement,
                })),
              });
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setSuperSearchResults({ signals: [], error: err.message });
        setSuperSearchStatus({ status: 'error', error: err.message });
      }
    }
    superAbortRef.current = null;
  }, [superSearchStatus]);

  const cancelSuperSearch = useCallback(() => {
    if (superAbortRef.current) {
      superAbortRef.current.abort();
      superAbortRef.current = null;
    }
    setSuperSearchStatus(null);
  }, []);

  const value = {
    team: TEAM,
    activeScans,
    scanResults,
    setScanResults,
    dismissed,
    setDismissed,
    nextRuns,
    nextWeeklyRuns,
    runScan,
    cancelScan,
    dismissCompany,
    loadHistory,
    loadTopPicks,
    // Super Search
    superSearchStatus,
    superSearchResults,
    superSearchHistory,
    runSuperSearch,
    cancelSuperSearch,
  };

  return <ScanContext.Provider value={value}>{children}</ScanContext.Provider>;
}
