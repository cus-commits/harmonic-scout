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
  defaultPartner,
} from './sharedWeekly';

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
  const [runState, setRunState] = useState({ status: 'idle', scanId: null, message: '', progress: null });
  const [dirtyMap, setDirtyMap] = useState({}); // partnerId → bool

  const pollTimer = useRef(null);

  // Initial load.
  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await fetchPartners();
      if (!alive) return;
      setPartners(prev => {
        const merged = { ...prev };
        const incoming = (data && data.partners) || {};
        for (const id of Object.keys(merged)) {
          if (incoming[id]) {
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
        setRunState({ status: 'done', scanId, message: 'Scan finished', progress: 100 });
        return;
      }
      if (s.status === 'error' || s.status === 'failed') {
        setRunState({ status: 'error', scanId, message: s.error || 'Scan failed', progress: null });
        return;
      }
      const msg = s.message || s.stage || 'Running…';
      const progress = typeof s.progress === 'number' ? s.progress : null;
      setRunState({ status: 'running', scanId, message: msg, progress });
      pollTimer.current = setTimeout(() => pollOnce(scanId), 4000);
    } catch (e) {
      // Don't abandon on a single failed poll — try again in 6s.
      pollTimer.current = setTimeout(() => pollOnce(scanId), 6000);
    }
  }, [activeId]);

  const run = useCallback(async () => {
    if (runState.status === 'running') return;
    setRunState({ status: 'starting', scanId: null, message: 'Kicking off…', progress: null });
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
        setRunState({ status: 'error', scanId: null, message: 'No scanId returned', progress: null });
        return;
      }
      setRunState({ status: 'running', scanId, message: 'Running…', progress: 0 });
      pollOnce(scanId);
    } catch (e) {
      setRunState({ status: 'error', scanId: null, message: e.message || 'Failed to start', progress: null });
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
  };
}
