// Shared data layer for the Weekly Search page (v1 .. v7 iterations).
// Keep this file framework-agnostic where possible; React components import the
// constants + helpers below.

const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';

export const WEEKLY_PARTNERS = [
  { id: 'mark',   name: 'Mark',   emoji: '🦅' },
  { id: 'jake',   name: 'Jake',   emoji: '🐺' },
  { id: 'joe',    name: 'Joe',    emoji: '🦁' },
  { id: 'carlo',  name: 'Carlo',  emoji: '🐻' },
  { id: 'liam',   name: 'Liam',   emoji: '🦊' },
  { id: 'serena', name: 'Serena', emoji: '🦋' },
  { id: 'nick',   name: 'Nick',   emoji: '🦈' },
];

// Filter option arrays — mirror RecurringScanPage so the lists stay consistent.
// We duplicate (not import) on purpose: RecurringScanPage doesn't export them,
// and we don't want a coupling that breaks if that page is refactored.
export const SECTORS = [
  'Crypto / Web3', 'DeFi', 'NFT / Digital Assets', 'Fintech', 'Payments',
  'AI / ML', 'SaaS / Enterprise', 'Gaming / Esports', 'Gambling / Betting',
  'Consumer', 'Social', 'Climate / Cleantech', 'Marketplace',
  'Creator Economy', 'Cybersecurity', 'Robotics / Automation', 'PropTech',
  'EdTech', 'Healthcare / Biotech', 'Logistics', 'Insurance / Insurtech',
  'Legal Tech', 'Media / Entertainment', 'Defense / Aerospace',
];

export const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Any'];

export const GEOS = [
  'US Only', 'US + Canada', 'North America', 'Europe', 'Asia',
  'LATAM', 'MENA', 'Africa', 'Global',
];

export const MODELS = [
  'B2C', 'B2B', 'B2B2C', 'Marketplace', 'Platform / Infra',
  'API / DevTools', 'Hardware', 'Protocol / Token',
];

export const SIGNALS = [
  'Revenue / ARR traction', 'User growth signals', 'Token / protocol activity',
  'Recent funding round', 'Headcount growth', 'Web traffic growth',
  'YC / top accelerator', 'Notable investors', 'Open source / GitHub',
  'Press / media coverage',
];

function authHeaders() {
  const anthropicKey = localStorage.getItem('scout_anthropic_key') || '';
  const crmUser = localStorage.getItem('crm_user') || '';
  const h = { 'Content-Type': 'application/json', 'x-anthropic-key': anthropicKey };
  if (crmUser) h['x-user-id'] = crmUser;
  return h;
}

// ---- Network helpers ----

export async function fetchPartners() {
  try {
    const r = await fetch(`${API_BASE}/api/partner-searches`, { headers: authHeaders() });
    if (!r.ok) return { partners: {} };
    return await r.json();
  } catch {
    return { partners: {} };
  }
}

export async function updatePartner(id, patch) {
  const r = await fetch(`${API_BASE}/api/partner-searches/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`Save failed (${r.status})`);
  return await r.json().catch(() => ({}));
}

export async function runPartnerScan(id) {
  const r = await fetch(`${API_BASE}/api/partner-searches/${id}/run`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error(`Run failed (${r.status})`);
  return await r.json();
}

export async function pollScanStatus(scanId) {
  const r = await fetch(`${API_BASE}/api/recurring-scan/status?scanId=${encodeURIComponent(scanId)}`, {
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error(`Status failed (${r.status})`);
  return await r.json();
}

// ---- Corpus pill helper ----
// Returns the visual descriptor for the corpus-size pill. The numeric thresholds
// come from the spec: < 2500 warn, > 10000 ideal, otherwise neutral ok.

export function corpusLabel(size) {
  if (size == null) return { tone: 'idle', text: 'No estimate yet' };
  const n = Number(size) || 0;
  if (n <= 0) return { tone: 'idle', text: 'No estimate yet' };
  const formatted = n.toLocaleString();
  if (n < 2500) return { tone: 'warn', text: `${formatted} in pool — narrow` };
  if (n > 10000) return { tone: 'ideal', text: `${formatted} in pool — ideal` };
  return { tone: 'ok', text: `${formatted} in pool` };
}

// ---- Date format ----

export function formatLastRun(lastRunAt, lastRunCount) {
  if (!lastRunAt) return '—';
  let d;
  try { d = new Date(lastRunAt); } catch { return '—'; }
  if (Number.isNaN(d.getTime())) return '—';
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  if (typeof lastRunCount === 'number' && lastRunCount > 0) {
    return `Last run ${day} · ${lastRunCount} to DD`;
  }
  return `Last run ${day}`;
}

// ---- Default partner shape so iterations never crash on empty backend ----

export function defaultPartner(id) {
  const p = WEEKLY_PARTNERS.find(x => x.id === id);
  return {
    id,
    name: p?.name || id,
    emoji: p?.emoji || '⭐',
    searchPrompt: '',
    context: '',
    filters: {
      sectors: [],
      stages: [],
      geos: [],
      models: [],
      signals: [],
      maxRaised: '',
      maxValuation: '',
      foundedAfter: '',
      minTeam: '',
      maxTeam: '',
      keywords: '',
      excludeKeywords: '',
    },
    isEnabled: true,
    lastRunAt: null,
    lastRunCount: null,
    lastCorpusSize: null,
  };
}
