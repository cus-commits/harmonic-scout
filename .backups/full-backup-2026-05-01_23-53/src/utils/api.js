// API backend on Railway — no timeout limits
const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';

function getKeys() {
  return {
    harmonicKey: localStorage.getItem('scout_harmonic_key') || '',
    anthropicKey: localStorage.getItem('scout_anthropic_key') || '',
  };
}

function authHeaders() {
  const { harmonicKey, anthropicKey } = getKeys();
  const headers = {
    'Content-Type': 'application/json',
    'x-anthropic-key': anthropicKey,
  };
  if (harmonicKey && harmonicKey !== '__SERVER__') {
    headers['x-harmonic-key'] = harmonicKey;
  }
  return headers;
}

export function isAuthenticated() {
  const { harmonicKey, anthropicKey } = getKeys();
  return !!(harmonicKey && anthropicKey);
}

export function clearKeys() {
  localStorage.removeItem('scout_harmonic_key');
  localStorage.removeItem('scout_anthropic_key');
}

export async function validateKey(type, key) {
  const res = await fetch(`${API_BASE}/api/validate-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, key }),
  });
  if (!res.ok) throw new Error('Validation request failed');
  return res.json();
}

export async function chatWithScout(message, companies = [], history = []) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message, companies, history }),
  });
  if (!res.ok) throw new Error('Chat failed');
  return res.json();
}

export async function fetchCompanies(filters = {}) {
  const params = new URLSearchParams();
  if (filters.sector) params.set('sector', filters.sector);
  if (filters.stage) params.set('stage', filters.stage);
  if (filters.search) params.set('search', filters.search);

  const res = await fetch(`${API_BASE}/api/companies?${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch companies');
  return res.json();
}

export async function fetchCompanyDetail(id) {
  const res = await fetch(`${API_BASE}/api/companies?id=${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch company');
  return res.json();
}

// Shared favorites
export async function getSharedFavorites() {
  const res = await fetch(`${API_BASE}/api/shared/favorites`);
  if (!res.ok) throw new Error('Failed to fetch shared favorites');
  return res.json();
}

export async function addSharedFavorite(userId, nickname, company) {
  const res = await fetch(`${API_BASE}/api/shared/favorites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, nickname, company }),
  });
  if (!res.ok) throw new Error('Failed to share favorite');
  return res.json();
}

export async function removeSharedFavorite(userId, companyName, removeAll = false) {
  const res = await fetch(`${API_BASE}/api/shared/favorites`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, company_name: companyName, remove_all: removeAll }),
  });
  if (!res.ok) throw new Error('Failed to remove shared favorite');
  return res.json();
}

export async function updateNickname(userId, nickname) {
  const res = await fetch(`${API_BASE}/api/shared/nickname`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, nickname }),
  });
  if (!res.ok) throw new Error('Failed to update nickname');
  return res.json();
}

// Trollbox
export async function getTrollboxMessages(since) {
  const url = since
    ? `${API_BASE}/api/trollbox?since=${encodeURIComponent(since)}`
    : `${API_BASE}/api/trollbox`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

export async function postTrollboxMessage(userId, nickname, text) {
  const res = await fetch(`${API_BASE}/api/trollbox`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, nickname, text }),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

// Auto-Scan
export async function runAutoScan(personId, profile) {
  // Use AbortController with 90s timeout — scans take 20-40s
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const res = await fetch(`${API_BASE}/api/autoscan`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ personId, profile }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Scan failed (${res.status}): ${errText.slice(0, 200)}`);
    }
    return res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Scan timed out after 90s. Check Railway logs.');
    }
    throw err;
  }
}
