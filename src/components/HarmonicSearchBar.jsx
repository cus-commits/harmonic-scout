import React, { useState, useEffect, useRef } from 'react';
import FindSimilar from './FindSimilar';
import { CrmButton } from './CrmButton';

const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';

function moneyFmt(n) {
  if (!n || typeof n !== 'number') return null;
  if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
  return `$${n}`;
}

export default function HarmonicSearchBar({ addFavorite, isFavorited }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);
  const suggestionsRef = useRef([]);

  // Keep ref in sync for Enter handler
  useEffect(() => { suggestionsRef.current = suggestions; }, [suggestions]);

  // Live typeahead — 150ms debounce, fires as you type
  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSugLoading(true);
      try {
        const r = await fetch(`${API_BASE}/api/harmonic/typeahead?q=${encodeURIComponent(query)}&size=8`);
        if (r.ok) {
          const data = await r.json();
          const res = data.results || [];
          setSuggestions(res);
          if (res.length > 0) setShowSuggestions(true);
        }
      } catch (e) { console.error('Typeahead error:', e); }
      setSugLoading(false);
    }, 150);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowSuggestions(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Select a suggestion
  const handleSelect = (company) => {
    setQuery(company.name || '');
    setShowSuggestions(false);
    setSuggestions([]);
    setResults([{
      id: company.id,
      name: company.name,
      logo_url: company.logo_url,
      website: company.domain ? `https://${company.domain}` : '',
      description: '',
      _selected: true,
    }]);
  };

  // Full NL search
  const handleFullSearch = async () => {
    if (!query.trim()) return;

    // If there are suggestions and one matches, select it instead of full search
    const current = suggestionsRef.current;
    if (current.length > 0) {
      const exactMatch = current.find(s => (s.name || '').toLowerCase() === query.trim().toLowerCase());
      if (exactMatch) { handleSelect(exactMatch); return; }
      // If only 1 suggestion, select it
      if (current.length === 1) { handleSelect(current[0]); return; }
    }

    setShowSuggestions(false);
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const harmonicKey = localStorage.getItem('scout_harmonic_key') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (harmonicKey && harmonicKey !== '__SERVER__') headers['x-harmonic-key'] = harmonicKey;
      const r = await fetch(`${API_BASE}/api/harmonic/enhanced-search`, {
        method: 'POST', headers,
        body: JSON.stringify({ query: query.trim(), size: 30 }),
      });
      const text = await r.text();
      const dataLine = text.split('\n').find(l => l.startsWith('data: '));
      if (!dataLine) throw new Error('No data');
      const data = JSON.parse(dataLine.slice(6));
      if (data.error) throw new Error(data.error);
      setResults(data.results || []);
    } catch (e) { setError(e.message); setResults([]); }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFullSearch();
    }
  };

  return (
    <div className="space-y-3" ref={wrapperRef}>
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input type="text" value={query}
              onChange={e => { setQuery(e.target.value); setResults(null); setError(''); }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder="Type a company name or search query..."
              className="w-full bg-ink/50 border border-border/25 rounded-xl px-4 py-3 text-sm text-bright outline-none focus:border-accent/40 placeholder:text-muted/40 transition-colors" />
            {sugLoading && <div className="absolute right-3 top-3.5 w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />}

            {/* Live suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-[100] top-full left-0 right-0 mt-1 bg-card border border-accent/25 rounded-xl overflow-hidden"
                style={{ boxShadow: '0 12px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(20,184,166,0.1)' }}>
                <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                  <span className="text-[9px] text-accent/65 uppercase tracking-wider font-bold">Companies matching "{query}"</span>
                  <span className="text-[9px] text-muted/40">{suggestions.length} found</span>
                </div>
                {suggestions.map((s, i) => {
                  // Try every possible field name for name and logo
                  const name = s.name || s.display_name || s.title || s.label || s.text || s.company_name || (s._raw_keys ? `[${s._raw_keys.split(',').slice(0,4).join(',')}...]` : '?');
                  const logo = s.logo_url || s.logoUrl || s.logo || s.image_url || s.thumbnail || s.profile_picture_url || '';
                  const domain = s.domain || s.website_domain || '';
                  return (
                  <button key={s.id || i} onClick={() => handleSelect({ ...s, name, logo_url: logo, domain })}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/10 transition-colors text-left border-t border-border/5">
                    {logo ? (
                      <img src={logo} alt="" className="w-9 h-9 rounded-lg bg-ink/80 flex-shrink-0 object-contain" onError={e => { e.target.style.display='none'; }} />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-accent text-sm font-bold">{name[0]}</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-bright truncate">{name}</p>
                      {domain && <p className="text-[10px] text-muted/40 truncate">{domain}</p>}
                    </div>
                    <span className="text-[10px] text-accent/55 flex-shrink-0">→</span>
                  </button>
                  );
                })}
                <button onClick={handleFullSearch}
                  className="w-full text-[11px] text-accent/60 hover:text-accent py-2.5 border-t border-accent/10 hover:bg-accent/5 font-medium">
                  🔎 Search all companies for "{query}"
                </button>
              </div>
            )}
          </div>
          <button onClick={handleFullSearch} disabled={loading || !query.trim()}
            className="px-5 py-3 rounded-xl bg-accent/80 text-bright font-bold text-sm disabled:opacity-30 active:scale-[0.98] transition-all shadow-md shadow-accent/15 whitespace-nowrap">
            {loading ? <span className="w-4 h-4 border-2 border-bright border-t-transparent rounded-full animate-spin inline-block" /> : '🔎'}
          </button>
        </div>
      </div>

      {/* Results */}
      {error && <p className="text-rose/60 text-xs">{error}</p>}
      {results && results.length === 0 && !error && <p className="text-muted/40 text-xs text-center py-2">No results found</p>}
      {results && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-accent/55 font-bold uppercase tracking-wider">{results.length} compan{results.length === 1 ? 'y' : 'ies'} found</p>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {results.map((c, i) => {
              const webUrl = c.website ? (c.website.startsWith('http') ? c.website : `https://${c.website}`) : null;
              const funding = moneyFmt(c.funding_total);
              const stage = c.funding_stage ? String(c.funding_stage).replace(/_/g, ' ') : '';
              const saved = isFavorited && isFavorited(c.name);
              const founders = (c.founders || []).map(f => typeof f === 'string' ? f : f.name).filter(Boolean).slice(0, 3).join(', ');
              return (
                <div key={`${c.name}-${i}`} className="bg-surface/50 border border-border/20 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-start gap-2.5">
                    {c.logo_url ? (
                      <img src={c.logo_url} alt="" className="w-10 h-10 rounded-lg bg-ink/50 flex-shrink-0 object-contain" onError={e => { e.target.style.display='none'; }} />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-accent font-bold">{(c.name || '?')[0]}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-bright">{c.name}</span>
                        {webUrl && (
                          <a href={webUrl} target="_blank" rel="noopener"
                            className="text-[9px] px-1.5 py-0.5 rounded bg-bo/15 text-bo border border-bo/30 hover:bg-bo/20 font-medium">🌐 website</a>
                        )}
                        {c.signal && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${
                            c.signal === 'HIGH' ? 'bg-sm/12 text-sm border-sm/25'
                            : c.signal === 'MEDIUM' ? 'bg-accent/12 text-accent border-accent/25'
                            : 'bg-muted/8 text-muted border-muted/15'
                          }`}>{c.signal}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {stage && <span className="text-[9px] px-1.5 py-0.5 rounded bg-sm/10 text-sm/60 border border-sm/15">{stage}</span>}
                        {funding && <span className="text-[9px] px-1.5 py-0.5 rounded bg-bo/10 text-bo/60 border border-bo/15">💰 {funding}</span>}
                        {c.headcount && <span className="text-[9px] text-muted/40">👥 {c.headcount}</span>}
                        {c.location && <span className="text-[9px] text-muted/40">📍 {c.location}</span>}
                      </div>
                    </div>
                    {addFavorite && (
                      <button onClick={() => !saved && addFavorite({ ...c })}
                        className={`flex-shrink-0 text-base ${saved ? 'text-bo' : 'text-muted/40 hover:text-bo'}`}>
                        {saved ? '★' : '☆'}
                      </button>
                    )}
                  </div>
                  {c.description && <p className="text-[11px] text-muted/50 leading-relaxed line-clamp-2">{c.description}</p>}
                  {founders && <p className="text-[10px] text-muted/35">👤 {founders}</p>}
                  {c.investors?.length > 0 && <p className="text-[10px] text-muted/40">💼 {c.investors.slice(0, 4).join(', ')}</p>}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <FindSimilar addFavorite={addFavorite} isFavorited={isFavorited} companyId={c.id} companyName={c.name} />
                    <CrmButton company={c} />
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
