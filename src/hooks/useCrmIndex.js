import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';
const LS_KEY = 'crm_index_cache_v1';
const TTL_MS = 5 * 60 * 1000;

let _memCache = null;          // shared across hook callers in this session
let _inflight = null;          // dedupe concurrent fetches
const _listeners = new Set();  // notify all subscribers on refresh

function readLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (Date.now() - (parsed.fetchedAt || 0) > TTL_MS) return null;
    return parsed.data;
  } catch { return null; }
}
function writeLS(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ data, fetchedAt: Date.now() })); } catch {}
}

async function fetchIndex() {
  if (_inflight) return _inflight;
  _inflight = (async () => {
    try {
      const r = await fetch(`${API_BASE}/api/airtable/crm-index`);
      if (!r.ok) return null;
      const data = await r.json();
      if (data && (data.byName || data.byDomain || data.byHarmonicId)) {
        _memCache = data;
        writeLS(data);
        _listeners.forEach(fn => { try { fn(data); } catch {} });
        return data;
      }
      return null;
    } catch { return null; }
    finally { _inflight = null; }
  })();
  return _inflight;
}

function normalizeName(s) {
  return (s || '').toString().toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '').trim();
}
function apex(s) {
  if (!s) return '';
  let d = String(s).trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '').replace(/^www\./, '');
  return d.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
}

// Resolve a company-like object to a CRM stage. Tries id → name → domain.
export function lookupCrmStage(idx, company) {
  if (!idx || !company) return null;
  const id = company.harmonic_id || company.id || company.harmonicId;
  if (id && idx.byHarmonicId) {
    const stage = idx.byHarmonicId[String(id)];
    if (stage) return stage;
  }
  const name = company.name || company.companyName || company.company || company.title || '';
  if (name && idx.byName) {
    const stage = idx.byName[normalizeName(name)];
    if (stage) return stage;
  }
  const web = company.website || company.company_link || company.domain || '';
  const _raw = typeof web === 'object' && web ? (web.url || web.domain || '') : web;
  const d = apex(_raw);
  if (d && idx.byDomain) {
    const stage = idx.byDomain[d];
    if (stage) return stage;
  }
  return null;
}

export function useCrmIndex() {
  const [idx, setIdx] = useState(() => _memCache || readLS());

  useEffect(() => {
    let alive = true;
    const sub = (data) => { if (alive) setIdx(data); };
    _listeners.add(sub);

    // If we don't have anything cached, fetch immediately. If we have stale-ish
    // (older than half TTL), refresh in the background but don't block render.
    if (!_memCache && !idx) fetchIndex();
    else if (!_memCache) _memCache = idx;

    // Refresh whenever CrmButton dispatches 'crm-updated' (after add/stage-change)
    const onUpdated = () => fetchIndex();
    window.addEventListener('crm-updated', onUpdated);

    return () => {
      alive = false;
      _listeners.delete(sub);
      window.removeEventListener('crm-updated', onUpdated);
    };
  }, []);

  return idx;
}
