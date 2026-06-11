// Shared controller hook. Every iteration mounts this once and gets the same
// state machine: load partners → edit one → save → run → poll until done.
// Visual variation lives in the iteration components; behavior is identical.

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  WEEKLY_PARTNERS,
  fetchPartners,
  updatePartner,
  runPartnerScan,
  pollScanStatus,
  lockChunk,
  parseContextChunks,
  defaultPartner,
} from './sharedWeekly';

const KNOWN_IDS = new Set(WEEKLY_PARTNERS.map(p => p.id));

function buildInitial() {
  const out = {};
  for (const p of WEEKLY_PARTNERS) out[p.id] = defaultPartner(p.id);
  return out;
}

export default function useWeeklyController() {
  const [partners, setPartners] = useState(buildInitial);
  const [activeId, setActiveId] = useState(() => {
    try {
      return localStorage.getItem('weekly_active_partner') || WEEKLY_PARTNERS[0].id;
    } catch {
      return WEEKLY_PARTNERS[0].id;
    }
  });
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [runState, setRunState] = useState({ status: 'idle', scanId: null, message: '', progress: null, startedAt: null, etaMinMinutes: null, etaMaxMinutes: null, phase: null, current: null, total: null });
  const [dirtyMap, setDirtyMap] = useState({}); // partnerId → bool

  const pollTimer = useRef(null);
  const contextDebounceTimer = useRef(null);

  // Initial load.
  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await fetchPartners();
      if (!alive) return;
      setPartners(prev => {
        const merged = { ...prev };
        const incoming = (data && data.partners) || {};
        // Ignore unknown ids (e.g. transiently returned during backend prune).
        for (const id of Object.keys(merged)) {
          if (incoming[id] && KNOWN_IDS.has(id)) {
            merged[id] = { ...merged[id], ...incoming[id] };
            // Defensive merge: ensure filters object always exists.
            merged[id].filters = { ...merged[id].filters, ...(incoming[id].filters || {}) };
          }
        }
        return merged;
      });
      setLoading(false);
    })();
    return () => {
      alive = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  useEffect(() => {
    try { localStorage.setItem('weekly_active_partner', activeId); } catch {}
  }, [activeId]);

  const active = partners[activeId] || defaultPartner(activeId);

  const updateActive = useCallback((patch) => {
    setPartners(prev => ({
      ...prev,
      [activeId]: {
        ...prev[activeId],
        ...patch,
        filters: patch.filters
          ? { ...(prev[activeId]?.filters || {}), ...patch.filters }
          : prev[activeId]?.filters,
      },
    }));
    setDirtyMap(prev => ({ ...prev, [activeId]: true }));
    if (saveState === 'saved' || saveState === 'error') setSaveState('idle');
  }, [activeId, saveState]);

  const updateFilter = useCallback((key, value) => {
    setPartners(prev => ({
      ...prev,
      [activeId]: {
        ...prev[activeId],
        filters: { ...(prev[activeId]?.filters || {}), [key]: value },
      },
    }));
    setDirtyMap(prev => ({ ...prev, [activeId]: true }));
    if (saveState === 'saved' || saveState === 'error') setSaveState('idle');
  }, [activeId, saveState]);

  const toggleFilterMulti = useCallback((key, value) => {
    setPartners(prev => {
      const cur = prev[activeId]?.filters?.[key] || [];
      const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
      return {
        ...prev,
        [activeId]: {
          ...prev[activeId],
          filters: { ...(prev[activeId]?.filters || {}), [key]: next },
        },
      };
    });
    setDirtyMap(prev => ({ ...prev, [activeId]: true }));
    if (saveState === 'saved' || saveState === 'error') setSaveState('idle');
  }, [activeId, saveState]);

  const save = useCallback(async () => {
    if (saveState === 'saving') return;
    setSaveState('saving');
    try {
      const cur = partners[activeId];
      await updatePartner(activeId, {
        searchPrompt: cur.searchPrompt || '',
        context: cur.context || '',
        filters: cur.filters || {},
        isEnabled: cur.isEnabled !== false,
      });
      setSaveState('saved');
      setDirtyMap(prev => ({ ...prev, [activeId]: false }));
      setTimeout(() => setSaveState(s => (s === 'saved' ? 'idle' : s)), 2000);
    } catch (e) {
      setSaveState('error');
    }
  }, [activeId, partners, saveState]);

  // Debounced PUT specifically for context — so the backend can re-parse chunks
  // and return canonical contextChunks (id + weight + lockedByUser). 600ms debounce.
  const scheduleContextSync = useCallback((nextContext) => {
    if (contextDebounceTimer.current) clearTimeout(contextDebounceTimer.current);
    const pid = activeId;
    contextDebounceTimer.current = setTimeout(async () => {
      try {
        const res = await updatePartner(pid, { context: nextContext || '' });
        const chunks = res && (res.contextChunks || res.partner?.contextChunks);
        if (Array.isArray(chunks)) {
          setPartners(prev => ({ ...prev, [pid]: { ...prev[pid], contextChunks: chunks } }));
        }
      } catch {
        // Stay silent — main Save button handles user-visible failure cases.
      }
    }, 600);
  }, [activeId]);

  // Updates a context chunk's weight locally and pings the backend to lock it
  // (dragging implicitly locks so the next roll doesn't overwrite). Fail-soft.
  const updateChunkWeight = useCallback((chunkId, weight) => {
    setPartners(prev => {
      const cur = prev[activeId];
      if (!cur) return prev;
      const chunks = (cur.contextChunks || []).map(ch =>
        ch.id === chunkId ? { ...ch, weight, lockedByUser: true } : ch
      );
      return { ...prev, [activeId]: { ...cur, contextChunks: chunks } };
    });
    lockChunk(activeId, { chunkId, locked: true, weight });
  }, [activeId]);

  const toggleChunkLock = useCallback((chunkId) => {
    setPartners(prev => {
      const cur = prev[activeId];
      if (!cur) return prev;
      let nextLocked = false;
      let nextWeight = 50;
      const chunks = (cur.contextChunks || []).map(ch => {
        if (ch.id !== chunkId) return ch;
        nextLocked = !ch.lockedByUser;
        nextWeight = ch.weight ?? 50;
        return { ...ch, lockedByUser: nextLocked };
      });
      lockChunk(activeId, { chunkId, locked: nextLocked, weight: nextWeight });
      return { ...prev, [activeId]: { ...cur, contextChunks: chunks } };
    });
  }, [activeId]);

  const setAutoVary = useCallback((next) => {
    setPartners(prev => ({
      ...prev,
      [activeId]: { ...prev[activeId], autoVaryWeekly: !!next },
    }));
    setDirtyMap(prev => ({ ...prev, [activeId]: true }));
  }, [activeId]);

  const applyPreviewWeights = useCallback((weightsByChunkId) => {
    setPartners(prev => {
      const cur = prev[activeId];
      if (!cur) return prev;
      const chunks = (cur.contextChunks || []).map(ch =>
        weightsByChunkId[ch.id] != null ? { ...ch, weight: weightsByChunkId[ch.id] } : ch
      );
      return { ...prev, [activeId]: { ...cur, contextChunks: chunks } };
    });
    setDirtyMap(prev => ({ ...prev, [activeId]: true }));
  }, [activeId]);

  const pollOnce = useCallback(async (scanId) => {
    try {
      const s = await pollScanStatus(scanId);
      const corpusSize = s.corpusSize ?? s.corpus_size ?? null;
      // Mirror corpus number back to the partner so the pill stays live.
      if (corpusSize != null) {
        setPartners(prev => ({
          ...prev,
          [activeId]: { ...prev[activeId], lastCorpusSize: corpusSize },
        }));
      }
      if (s.status === 'done' || s.status === 'finished' || s.status === 'complete') {
        const count = s.resultCount ?? s.count ?? null;
        setPartners(prev => ({
          ...prev,
          [activeId]: {
            ...prev[activeId],
            lastRunAt: new Date().toISOString(),
            lastRunCount: count,
            lastCorpusSize: corpusSize ?? prev[activeId]?.lastCorpusSize,
          },
        }));
        setRunState(prev => ({ ...prev, status: 'done', scanId, message: 'Scan finished', progress: 100, phase: null, current: null, total: null }));
        return;
      }
      if (s.status === 'error' || s.status === 'failed') {
        setRunState(prev => ({ ...prev, status: 'error', scanId, message: s.error || 'Scan failed', progress: null }));
        return;
      }
      // Backend may return an object `progress: { phase, current, total }` OR a numeric progress.
      let progress = null;
      let phase = null, current = null, total = null;
      if (s.progress && typeof s.progress === 'object') {
        phase = s.progress.phase ?? null;
        current = s.progress.current ?? null;
        total = s.progress.total ?? null;
        if (current != null && total) progress = Math.round((current / total) * 100);
      } else if (typeof s.progress === 'number') {
        progress = s.progress;
      }
      const msg = s.message || phase || s.stage || 'Running…';
      setRunState(prev => ({ ...prev, status: 'running', scanId, message: msg, progress, phase, current, total }));
      pollTimer.current = setTimeout(() => pollOnce(scanId), 4000);
    } catch (e) {
      // Don't abandon on a single failed poll — try again in 6s.
      pollTimer.current = setTimeout(() => pollOnce(scanId), 6000);
    }
  }, [activeId]);

  const run = useCallback(async () => {
    if (runState.status === 'running') return;
    setRunState({ status: 'starting', scanId: null, message: 'Kicking off…', progress: null, startedAt: null, etaMinMinutes: null, etaMaxMinutes: null, phase: null, current: null, total: null });
    try {
      // Save first so the run uses the latest config.
      if (dirtyMap[activeId]) {
        await updatePartner(activeId, {
          searchPrompt: active.searchPrompt || '',
          context: active.context || '',
          filters: active.filters || {},
          isEnabled: active.isEnabled !== false,
        }).catch(() => {});
        setDirtyMap(prev => ({ ...prev, [activeId]: false }));
      }
      const out = await runPartnerScan(activeId);
      const scanId = out.scanId || out.scan_id;
      if (!scanId) {
        setRunState(prev => ({ ...prev, status: 'error', scanId: null, message: 'No scanId returned', progress: null }));
        return;
      }
      // Optimistically bump nextRunAt locally so the countdown resets immediately
      // without waiting for a refetch. Backend has already persisted now+7d.
      if (out.nextRunAt) {
        setPartners(prev => ({
          ...prev,
          [activeId]: { ...prev[activeId], nextRunAt: out.nextRunAt },
        }));
      }
      setRunState({
        status: 'running',
        scanId,
        message: 'Running…',
        progress: 0,
        startedAt: out.startedAt || new Date().toISOString(),
        etaMinMinutes: out.etaMinMinutes ?? null,
        etaMaxMinutes: out.etaMaxMinutes ?? null,
        phase: null,
        current: null,
        total: null,
      });
      pollOnce(scanId);
    } catch (e) {
      setRunState(prev => ({ ...prev, status: 'error', scanId: null, message: e.message || 'Failed to start', progress: null }));
    }
  }, [active, activeId, dirtyMap, pollOnce, runState.status]);

  return {
    loading,
    partners,
    active,
    activeId,
    setActiveId,
    updateActive,
    updateFilter,
    toggleFilterMulti,
    save,
    saveState,
    run,
    runState,
    isDirty: !!dirtyMap[activeId],
    scheduleContextSync,
    updateChunkWeight,
    toggleChunkLock,
    setAutoVary,
    applyPreviewWeights,
  };
}
