import React, { useState, useEffect, useRef } from 'react';
import { CrmButton } from './CrmButton';

const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';

function moneyFmt(n) {
  if (!n || typeof n !== 'number') return null;
  if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
  return `$${n}`;
}

function CompanyMiniCard({ company, addFavorite, isFavorited }) {
  const name = company.name || '?';
  const desc = (company.description || '').slice(0, 140);
  const web = company.website || '';
  const webUrl = web ? (web.startsWith('http') ? web : `https://${web}`) : null;
  const funding = moneyFmt(company.funding_total || null);
  const stage = company.funding_stage || '';
  const hc = company.headcount || null;
  const loc = typeof company.location === 'string' ? company.location : '';
  const logoUrl = company.logo_url || company.logoUrl || '';
  const founders = (company.founders || []).map(f => typeof f === 'string' ? f : f.name).filter(Boolean).join(', ');
  const saved = isFavorited && isFavorited(name);

  return (
    <div className="flex items-start gap-2 px-2.5 py-2 rounded-lg hover:bg-boro/5 transition-colors border border-transparent hover:border-boro/10">
      {logoUrl ? (
        <img src={logoUrl} alt="" className="w-8 h-8 rounded-lg bg-ink/50 flex-shrink-0 object-contain" onError={e => { e.target.style.display='none'; }} />
      ) : (
        <div className="w-8 h-8 rounded-lg bg-boro/10 flex items-center justify-center flex-shrink-0">
          <span className="text-boro font-bold text-xs">{name[0]}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-bright truncate">{name}</span>
          {webUrl && (
            <a href={webUrl} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}
              className="text-[8px] px-1.5 py-0.5 rounded bg-bo/15 text-bo border border-bo/30 hover:bg-bo/20 font-medium flex-shrink-0">
              🌐
            </a>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {stage && <span className="text-[9px] px-1 py-0.5 rounded bg-sm/10 text-sm/60 border border-sm/10">{String(stage).replace(/_/g,' ')}</span>}
          {funding && <span className="text-[9px] text-bo/65">💰 {funding}</span>}
          {hc && <span className="text-[9px] text-muted/40">👥 {hc}</span>}
          {loc && <span className="text-[9px] text-muted/35">📍 {loc}</span>}
        </div>
        {desc && <p className="text-[10px] text-muted/40 mt-0.5 line-clamp-2">{desc}</p>}
        {founders && <p className="text-[9px] text-muted/40 mt-0.5">👤 {founders}</p>}
      </div>
      {addFavorite && (
        <button onClick={(e) => { e.stopPropagation(); if (!saved) addFavorite({ name, description: desc, website: web, logo_url: logoUrl, funding_total: company.funding_total, funding_stage: stage, location: loc, headcount: hc, investors: company.investors }); }}
          className={`flex-shrink-0 text-sm ${saved ? 'text-bo' : 'text-muted/35 hover:text-bo'}`}>
          {saved ? '★' : '☆'}
        </button>
      )}
      <CrmButton company={company} />
    </div>
  );
}

// Live typeahead search component
function LiveSearch({ addFavorite, isFavorited }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [similarResults, setSimilarResults] = useState(null);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API_BASE}/api/harmonic/typeahead?q=${encodeURIComponent(query)}&size=6`);
        if (r.ok) {
          const data = await r.json();
          setSuggestions(data.results || []);
        }
      } catch (e) {}
      setLoading(false);
    }, 300); // 300ms debounce
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelect = async (company) => {
    setSelectedCompany(company);
    setSuggestions([]);
    setQuery(company.name || '');
    setSimilarLoading(true);
    setSimilarResults(null);
    setVisibleCount(10);
    try {
      const id = company.id || company.entity_urn?.split(':').pop();
      const url = id
        ? `${API_BASE}/api/harmonic/similar/${id}?size=100`
        : `${API_BASE}/api/harmonic/find-similar-by-name?name=${encodeURIComponent(company.name)}&size=100`;
      const r = await fetch(url);
      if (r.ok) {
        const data = await r.json();
        setSimilarResults(data.companies || []);
      }
    } catch (e) { setSimilarResults([]); }
    setSimilarLoading(false);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <input type="text" value={query} onChange={e => { setQuery(e.target.value); setSelectedCompany(null); setSimilarResults(null); }}
          placeholder="Type a company name to find similar..."
          className="w-full bg-ink/50 border border-boro/20 rounded-lg px-3 py-2.5 text-xs text-bright outline-none focus:border-boro/40 placeholder-muted/30" />
        {loading && <div className="absolute right-3 top-3 w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />}

        {/* Live suggestions dropdown */}
        {suggestions.length > 0 && !selectedCompany && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-boro/20 rounded-lg shadow-xl overflow-hidden max-h-[250px] overflow-y-auto">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => handleSelect(s)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-boro/8 transition-colors text-left border-b border-border/15 last:border-0">
                {s.logo_url ? (
                  <img src={s.logo_url} alt="" className="w-7 h-7 rounded-md bg-ink/50 flex-shrink-0 object-contain" onError={e => { e.target.style.display='none'; }} />
                ) : (
                  <div className="w-7 h-7 rounded-md bg-boro/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-boro text-[10px] font-bold">{(s.name || '?')[0]}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-bright truncate">{s.name}</p>
                  <p className="text-[9px] text-muted/40 truncate">{s.domain || s.website?.domain || ''}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Similar results */}
      {similarLoading && (
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] text-boro/50">Finding similar companies...</span>
        </div>
      )}

      {similarResults && similarResults.length > 0 && (() => {
        const visible = similarResults.slice(0, visibleCount);
        const remaining = similarResults.length - visibleCount;
        return (
        <div className="space-y-1">
          <p className="text-[9px] text-boro/40 uppercase tracking-wider font-bold">
            Showing {visible.length} of {similarResults.length} similar to {selectedCompany?.name}
          </p>
          <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
            {visible.map((c, i) => (
              <CompanyMiniCard key={`${c.name}-${i}`} company={c} addFavorite={addFavorite} isFavorited={isFavorited} />
            ))}
          </div>
          {remaining > 0 && (
            <button onClick={() => setVisibleCount(prev => prev + 25)}
              className="w-full text-[10px] text-boro/50 hover:text-boro py-2 border-t border-boro/10 font-medium">
              Show {Math.min(25, remaining)} more ({remaining} remaining) ↓
            </button>
          )}
        </div>
        );
      })()}
      {similarResults && similarResults.length === 0 && (
        <p className="text-boro/40 text-[10px] text-center py-2">No similar companies found</p>
      )}
    </div>
  );
}

// Button version (used inline on cards)
export default function FindSimilar({ companyId, companyName, addFavorite, isFavorited }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);

  const handleSearch = async () => {
    if (results) { setOpen(!open); return; }
    setLoading(true);
    setOpen(true);
    setError('');
    setVisibleCount(10);
    try {
      let companies = [];
      if (companyId) {
        const r = await fetch(`${API_BASE}/api/harmonic/similar/${companyId}?size=100`);
        const data = await r.json();
        companies = Array.isArray(data) ? data : (data.companies || []);
        if (data.error) setError(data.error);
      }
      if (companies.length === 0 && companyName) {
        const r = await fetch(`${API_BASE}/api/harmonic/find-similar-by-name?name=${encodeURIComponent(companyName)}&size=100`);
        if (r.ok) {
          const data = await r.json();
          companies = Array.isArray(data) ? data : (data.companies || []);
          if (data.error) setError(data.error);
        }
      }
      setResults(companies);
      if (companies.length === 0 && !error) setError('No similar companies found');
    } catch (e) { setError(e.message); setResults([]); }
    setLoading(false);
  };

  const visibleResults = (results || []).slice(0, visibleCount);
  const remaining = results ? results.length - visibleCount : 0;

  return (
    <div>
      <button onClick={handleSearch} disabled={loading}
        className={`text-[9px] px-2 py-0.5 rounded-md border transition-all font-medium ${
          open && results?.length > 0 ? 'bg-boro/12 border-boro/25 text-boro'
          : 'bg-boro/6 border-boro/15 text-boro/70 hover:border-boro/30 hover:text-boro'
        }`}>
        {loading ? (
          <span className="flex items-center gap-1"><span className="w-2 h-2 border border-accent border-t-transparent rounded-full animate-spin" /> Finding...</span>
        ) : '🔍 Similar'}
      </button>

      {open && results !== null && (
        <div className="mt-2 bg-boro/4 border border-boro/12 rounded-xl p-3 space-y-2">
          {error && (results || []).length === 0 ? (
            <p className="text-boro/40 text-[10px]">{error}</p>
          ) : (results || []).length === 0 ? (
            <p className="text-boro/40 text-[10px]">No similar companies found</p>
          ) : (
            <>
              <p className="text-[9px] text-boro/40 uppercase tracking-wider font-bold">
                Showing {visibleResults.length} of {results.length} similar to {companyName}
              </p>
              <div className="space-y-0.5 max-h-[500px] overflow-y-auto">
                {visibleResults.map((c, i) => (
                  <CompanyMiniCard key={`${c.name}-${i}`} company={c} addFavorite={addFavorite} isFavorited={isFavorited} />
                ))}
              </div>
              {remaining > 0 && (
                <button onClick={() => setVisibleCount(prev => prev + 25)}
                  className="w-full text-[10px] text-boro/50 hover:text-boro py-2 border-t border-boro/10 font-medium">
                  Show {Math.min(25, remaining)} more ({remaining} remaining) ↓
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Export the live search component separately
export { LiveSearch };
