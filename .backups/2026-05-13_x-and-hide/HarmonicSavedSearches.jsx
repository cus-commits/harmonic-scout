import React, { useState, useEffect } from 'react';
import FindSimilar from './FindSimilar';
import { CrmButton } from './CrmButton';
import RemoveMenu from './RemoveMenu';

const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';

function CompanyCard({ company, addFavorite, isFavorited }) {
  if (!company || !company.name) return null;
  const web = company.website || company.company_link || '';
  const webUrl = web && typeof web === 'string' ? (web.startsWith('http') ? web : `https://${web}`) : null;
  const saved = isFavorited && isFavorited(company.name);
  const logo = company.logo_url || company.logo || company.logoUrl || '';
  const stage = company.funding_stage || company.stage || '';
  const ft = company.funding_total || company.fundingTotal || null;
  const funding = typeof ft === 'number' && ft > 0 ? (ft >= 1e9 ? `$${(ft/1e9).toFixed(1)}B` : ft >= 1e6 ? `$${(ft / 1e6).toFixed(1)}M` : `$${(ft / 1e3).toFixed(0)}K`) : null;
  const desc = typeof company.description === 'string' ? company.description.slice(0, 200) : '';
  const hc = company.headcount || null;
  const loc = typeof company.location === 'string' ? company.location : '';
  const foundersRaw = company.founders;
  const founders = Array.isArray(foundersRaw) ? foundersRaw.map(f => typeof f === 'string' ? f : f.name).filter(Boolean).join(', ') : (typeof foundersRaw === 'string' ? foundersRaw : '');

  return (
    <div className="bg-surface/50 border border-border/20 rounded-xl p-3 space-y-1.5">
      <div className="flex items-start gap-2.5">
        {logo && (
          <img src={logo} alt="" className="w-9 h-9 rounded-lg bg-ink/50 flex-shrink-0" onError={e => { e.target.style.display = 'none'; }} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-semibold text-bright leading-snug truncate">{company.name}</p>
            {webUrl && (
              <a href={webUrl} target="_blank" rel="noopener"
                className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-bo/15 text-bo border border-bo/30 hover:bg-bo/20 font-medium">
                🌐
              </a>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            {stage && <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/12 text-accent border border-accent/20 font-medium">{String(stage).replace(/_/g, ' ')}</span>}
            {funding && <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/12 text-accent border border-accent/20 font-medium">💰 {funding}</span>}
            {hc && <span className="text-[9px] text-muted/50">👥 {hc}</span>}
          </div>
        </div>
        {addFavorite && (
          <button onClick={() => !saved && addFavorite({ name: company.name, description: desc, website: web, logo_url: logo, funding_total: ft, funding_stage: stage, location: loc, headcount: hc })}
            className={`flex-shrink-0 text-base ${saved ? 'text-bo' : 'text-muted/35 hover:text-bo'}`}>
            {saved ? '★' : '☆'}
          </button>
        )}
      </div>
      {desc && <p className="text-[11px] text-bright/60 leading-relaxed line-clamp-2">{desc}</p>}
      <div className="flex items-center gap-2 text-[10px] text-muted/50 flex-wrap">
        {founders && <span>👤 {founders}</span>}
        {loc && <span>📍 {loc}</span>}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <FindSimilar addFavorite={addFavorite} isFavorited={isFavorited} companyName={company.name} companyId={company.id} />
        <CrmButton company={company} />
        <RemoveMenu company={company} />
      </div>
    </div>
  );
}

export default function HarmonicSavedSearches({ compact = false, addFavorite, isFavorited }) {
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeSearch, setActiveSearch] = useState(null);
  const [results, setResults] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [netNew, setNetNew] = useState(false);

  const fetchSearches = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/harmonic/saved-searches`);
      const data = await r.json();
      setSearches(data.searches || []);
    } catch (e) { console.error('Failed to load saved searches:', e); }
    setLoading(false);
  };

  useEffect(() => { fetchSearches(); }, []);

  const loadResults = async (search) => {
    setActiveSearch(search);
    setLoadingResults(true);
    setResults(null);
    try {
      const r = await fetch(`${API_BASE}/api/harmonic/saved-searches/${search.id}/results?size=30&netNew=${netNew}`);
      const data = await r.json();
      setResults(data);
    } catch (e) { setResults({ error: e.message, companies: [] }); }
    setLoadingResults(false);
  };

  if (searches.length === 0 && !loading) return null;

  return (
    <div className={`border border-accent/15 rounded-xl ${compact ? '' : 'mb-4'}`}
      style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.03) 0%, rgba(56,189,248,0.03) 100%)' }}>
      
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-accent/5 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-sm">🔮</span>
          <div className="text-left">
            <p className="text-xs font-bold text-bright/90">Harmonic Saved Searches</p>
            <p className="text-[10px] text-muted/50">
              {loading ? 'Loading...' : `${searches.length} search${searches.length !== 1 ? 'es' : ''} from Harmonic console`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeSearch && results?.companies?.length > 0 && !expanded && (
            <span className="text-[10px] text-accent/60">{activeSearch.name} · {results.companies.length} results</span>
          )}
          {searches.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium">{searches.length}</span>
          )}
          <span className={`text-muted/40 text-xs transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>

      {/* Search list (collapsible) */}
      {expanded && (
        <div className="border-t border-accent/10 px-3.5 py-3 space-y-2">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : searches.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted/50 text-xs">No saved searches found</p>
              <p className="text-[10px] text-muted/40 mt-1">Create them in the Harmonic console → they'll appear here</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted/50">Tap a search to load results</p>
                <button onClick={() => setNetNew(!netNew)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${netNew ? 'bg-accent/12 border-accent/30 text-accent' : 'border-border/20 text-muted/40'}`}>
                  {netNew ? '✨ Net new only' : 'All results'}
                </button>
              </div>
              <div className="space-y-1">
                {searches.map(s => (
                  <button key={s.id} onClick={() => loadResults(s)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${
                      activeSearch?.id === s.id ? 'bg-accent/10 border border-accent/25' : 'hover:bg-surface/3 border border-transparent'
                    }`}>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-bright/80 truncate">{s.name}</p>
                      {s.count != null && <p className="text-[10px] text-muted/40">{s.count} companies</p>}
                    </div>
                    {activeSearch?.id === s.id && loadingResults && (
                      <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              <button onClick={fetchSearches} className="w-full text-[10px] text-muted/40 hover:text-accent transition-colors py-1">↻ Refresh</button>
            </>
          )}
        </div>
      )}

      {/* Results — ALWAYS visible when they exist, even when search list is collapsed */}
      {results && !loadingResults && (
        <div className="border-t border-accent/10 px-3.5 py-3 space-y-2">
          {results.error ? (
            <p className="text-rose/80 text-xs">{results.error}</p>
          ) : results.companies?.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted/40">
                  {activeSearch?.name} — {results.companies.length} companies{results.totalCount > results.companies.length ? ` (of ${results.totalCount})` : ''}
                </p>
                <button onClick={() => { setResults(null); setActiveSearch(null); }} className="text-[10px] text-muted/40 hover:text-rose transition-colors">✕ Clear</button>
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {results.companies.map((c, i) => <CompanyCard key={c.id || c.name || i} company={c} addFavorite={addFavorite} isFavorited={isFavorited} />)}
              </div>
            </>
          ) : (
            <p className="text-muted/40 text-xs text-center py-3">
              {netNew ? 'No new results since last check' : 'No companies found'}
            </p>
          )}
        </div>
      )}

      {loadingResults && (
        <div className="border-t border-accent/10 px-3.5 py-4 flex justify-center">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
