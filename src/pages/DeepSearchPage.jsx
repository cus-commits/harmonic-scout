import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CrmButton } from '../components/CrmButton';

const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';

function authHeaders() {
  const anthropicKey = localStorage.getItem('scout_anthropic_key') || '';
  const harmonicKey = localStorage.getItem('scout_harmonic_key') || '';
  const h = { 'Content-Type': 'application/json', 'x-anthropic-key': anthropicKey };
  if (harmonicKey && harmonicKey !== '__SERVER__') h['x-harmonic-key'] = harmonicKey;
  return h;
}

function moneyFmt(n) {
  if (!n || typeof n !== 'number') return null;
  if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
  return `$${n}`;
}

// ---- Tiers ----
const TIERS = [
  { key: 'quick',    name: 'Quick Scan',   cost: '$4',  emoji: '\u26A1', color: 'sky',    desc: 'Haiku screens 100 similar \u2192 Sonnet scores top 20', time: '1-3 min' },
  { key: 'standard', name: 'Standard',     cost: '$8',  emoji: '\uD83D\uDD0D', color: 'violet', desc: 'Sonnet screens 100 similar \u2192 Opus scores top 30', time: '3-6 min' },
  { key: 'deep',     name: 'Deep Search',  cost: '$15', emoji: '\uD83D\uDD2C', color: 'amber',  desc: 'Sonnet screens all similar + web discovery \u2192 Opus scores top 50', time: '5-10 min' },
  { key: 'maximum',  name: 'Maximum',      cost: '$25', emoji: '\uD83D\uDE80', color: 'emerald', desc: 'Full pipeline: multiple baselines + web discovery + Opus deep analysis', time: '10-20 min' },
];

const tierColors = {
  sky:     { bg: 'bg-bo/10', border: 'border-bo/25', text: 'text-bo', activeBg: 'bg-bo/20', activeBorder: 'border-bo/50' },
  violet:  { bg: 'bg-boro/10', border: 'border-boro/25', text: 'text-boro', activeBg: 'bg-boro/20', activeBorder: 'border-boro/50' },
  amber:   { bg: 'bg-accent/10', border: 'border-accent/25', text: 'text-accent', activeBg: 'bg-accent/20', activeBorder: 'border-accent/50' },
  emerald: { bg: 'bg-sm/10', border: 'border-sm/25', text: 'text-sm', activeBg: 'bg-sm/20', activeBorder: 'border-sm/50' },
};

// ---- Company Result Card ----
function ResultCard({ company, addFavorite, isFavorited, rank }) {
  const name = company.name || '?';
  const desc = (company.description || '').slice(0, 200);
  const web = company.website || '';
  const webUrl = web ? (web.startsWith('http') ? web : `https://${web}`) : null;
  const funding = moneyFmt(company.funding_total || null);
  const stage = company.funding_stage || '';
  const hc = company.headcount || null;
  const loc = typeof company.location === 'string' ? company.location : '';
  const logoUrl = company.logo_url || company.logoUrl || '';
  const score = company._score || company.score || 0;
  const analysis = company._analysis || company.analysis || '';
  const saved = isFavorited && isFavorited(name);

  const scoreColor = score >= 8 ? 'text-sm' : score >= 6 ? 'text-accent' : score >= 4 ? 'text-bo' : 'text-muted/50';

  return (
    <div className="glass-card p-3 space-y-1.5 border border-border/20 hover:border-accent/20 transition-all">
      <div className="flex items-start gap-2.5">
        <div className="flex items-center gap-1.5 flex-shrink-0 w-8 text-center">
          <span className="text-[10px] text-muted/40 font-mono">#{rank}</span>
        </div>
        {logoUrl ? (
          <img src={logoUrl} alt="" className="w-8 h-8 rounded-lg bg-ink/50 flex-shrink-0 object-contain" onError={e => { e.target.style.display='none'; }} />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-boro/10 flex items-center justify-center flex-shrink-0">
            <span className="text-boro font-bold text-xs">{name[0]}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[12px] font-semibold text-bright truncate">{name}</span>
            {webUrl && (
              <a href={webUrl} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}
                className="text-[8px] px-1.5 py-0.5 rounded bg-bo/15 text-bo border border-bo/30 hover:bg-bo/20 font-medium flex-shrink-0">
                \uD83C\uDF10
              </a>
            )}
            {score > 0 && (
              <span className={`text-[10px] font-bold ${scoreColor} px-1.5 py-0.5 rounded bg-surface border border-border/15`}>
                {score.toFixed(1)}/10
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {stage && <span className="text-[9px] px-1 py-0.5 rounded bg-sm/10 text-sm/60 border border-sm/10">{String(stage).replace(/_/g,' ')}</span>}
            {funding && <span className="text-[9px] text-bo/65">\uD83D\uDCB0 {funding}</span>}
            {hc && <span className="text-[9px] text-muted/40">\uD83D\uDC65 {hc}</span>}
            {loc && <span className="text-[9px] text-muted/35">\uD83D\uDCCD {loc}</span>}
          </div>
          {desc && <p className="text-[10px] text-muted/50 mt-0.5 line-clamp-2">{desc}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {addFavorite && (
            <button onClick={(e) => { e.stopPropagation(); if (!saved) addFavorite({ name, description: desc, website: web, logo_url: logoUrl, funding_total: company.funding_total, funding_stage: stage, location: loc, headcount: hc }); }}
              className={`text-sm ${saved ? 'text-bo' : 'text-muted/35 hover:text-bo'}`}>
              {saved ? '\u2605' : '\u2606'}
            </button>
          )}
          <CrmButton company={company} />
        </div>
      </div>
      {analysis && (
        <div className="ml-10 text-[10px] text-muted/60 bg-surface/50 rounded-lg p-2 border border-border/10 leading-relaxed">
          {analysis}
        </div>
      )}
    </div>
  );
}

// ---- Baseline Company Chip ----
function BaselineChip({ company, onRemove }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-boro/8 border border-boro/20 text-[11px]">
      {company.logo_url ? (
        <img src={company.logo_url} alt="" className="w-5 h-5 rounded flex-shrink-0 object-contain" onError={e => { e.target.style.display='none'; }} />
      ) : (
        <div className="w-5 h-5 rounded bg-boro/15 flex items-center justify-center flex-shrink-0">
          <span className="text-boro text-[8px] font-bold">{(company.name || '?')[0]}</span>
        </div>
      )}
      <span className="text-bright font-medium truncate max-w-[140px]">{company.name}</span>
      <button onClick={onRemove} className="text-muted/40 hover:text-rose text-[10px] flex-shrink-0 ml-1">\u2715</button>
    </div>
  );
}

// ---- Main Page ----
export default function DeepSearchPage({ addFavorite, isFavorited }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Baseline companies
  const [baselines, setBaselines] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef(null);

  // Config
  const [selectedTier, setSelectedTier] = useState('standard');
  const [keywords, setKeywords] = useState('');
  const [industries, setIndustries] = useState('');
  const [notes, setNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);

  // Load baseline from URL params (coming from FindSimilar)
  useEffect(() => {
    const name = searchParams.get('name');
    const id = searchParams.get('id');
    const logo = searchParams.get('logo');
    if (name) {
      setBaselines([{ name, id: id || null, logo_url: logo ? decodeURIComponent(logo) : null }]);
    }
  }, []);

  // Typeahead search for adding baselines
  useEffect(() => {
    if (searchQuery.length < 2) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const r = await fetch(`${API_BASE}/api/harmonic/typeahead?q=${encodeURIComponent(searchQuery)}&size=6`, { headers: authHeaders() });
        if (r.ok) {
          const data = await r.json();
          setSuggestions(data.results || []);
        }
      } catch (e) {}
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const addBaseline = (company) => {
    const id = company.id || company.entity_urn?.split(':').pop() || null;
    if (baselines.some(b => b.name === company.name)) return;
    setBaselines(prev => [...prev, { name: company.name, id, logo_url: company.logo_url || null, description: company.description || '' }]);
    setSearchQuery('');
    setSuggestions([]);
  };

  const removeBaseline = (idx) => {
    setBaselines(prev => prev.filter((_, i) => i !== idx));
  };

  // Run the deep search
  const runSearch = async () => {
    if (baselines.length === 0) return;
    setScanning(true);
    setError('');
    setResults(null);
    setProgress({ stage: 'starting', message: 'Initializing deep search...', pct: 0 });
    setVisibleCount(20);

    try {
      const res = await fetch(`${API_BASE}/api/deep-search`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          baselines: baselines.map(b => ({ name: b.name, id: b.id })),
          tier: selectedTier,
          keywords: keywords.trim() || null,
          industries: industries.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Search failed (${res.status}): ${errText.slice(0, 200)}`);
      }

      // SSE streaming response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.progress) {
                setProgress(data.progress);
              }
              if (data.results) {
                setResults(data);
                setScanning(false);
                setProgress(null);
              }
              if (data.error) {
                setError(data.error);
                setScanning(false);
                setProgress(null);
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      setError(e.message);
      setScanning(false);
      setProgress(null);
    }
  };

  const tier = TIERS.find(t => t.key === selectedTier);
  const sortedResults = results?.results?.slice().sort((a, b) => (b._score || b.score || 0) - (a._score || a.score || 0)) || [];
  const visibleResults = sortedResults.slice(0, visibleCount);
  const remaining = sortedResults.length - visibleCount;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-20 pb-24 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold text-bright tracking-tight">\uD83D\uDD2C Deep Search</h1>
        <p className="text-xs text-muted/50 max-w-md mx-auto">
          Start with baseline companies, then let Claude find and score similar companies using Harmonic data + AI analysis.
        </p>
      </div>

      {/* Setup Panel (hidden during scan/results) */}
      {!scanning && !results && (
        <div className="space-y-5">

          {/* Baseline Companies */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-bold text-bright uppercase tracking-wider">Baseline Companies</h2>
              <span className="text-[10px] text-muted/40">{baselines.length} selected</span>
            </div>

            {baselines.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {baselines.map((b, i) => (
                  <BaselineChip key={b.name} company={b} onRemove={() => removeBaseline(i)} />
                ))}
              </div>
            )}

            <div className="relative">
              <input
                type="text" value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search to add more companies..."
                className="w-full bg-ink/50 border border-border/30 rounded-lg px-3 py-2.5 text-xs text-bright outline-none focus:border-boro/40 placeholder-muted/30"
              />
              {searchLoading && <div className="absolute right-3 top-3 w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />}

              {suggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-boro/20 rounded-lg shadow-xl overflow-hidden max-h-[200px] overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => addBaseline(s)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-boro/8 transition-colors text-left border-b border-border/15 last:border-0">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt="" className="w-6 h-6 rounded-md bg-ink/50 flex-shrink-0 object-contain" onError={e => { e.target.style.display='none'; }} />
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-boro/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-boro text-[9px] font-bold">{(s.name || '?')[0]}</span>
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
          </div>

          {/* Advanced Options (collapsible) */}
          <div className="glass-card p-4 space-y-3">
            <button onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full">
              <h2 className="text-[11px] font-bold text-bright uppercase tracking-wider">Search Context</h2>
              <span className="text-[10px] text-muted/40">{showAdvanced ? '\u25B2 Hide' : '\u25BC Optional'}</span>
            </button>

            {showAdvanced && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[10px] text-muted/50 font-medium block mb-1">Keywords / Themes</label>
                  <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)}
                    placeholder="e.g. AI infrastructure, developer tools, real-time data..."
                    className="w-full bg-ink/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-bright outline-none focus:border-accent/40 placeholder-muted/25" />
                </div>
                <div>
                  <label className="text-[10px] text-muted/50 font-medium block mb-1">Industries / Sectors</label>
                  <input type="text" value={industries} onChange={e => setIndustries(e.target.value)}
                    placeholder="e.g. fintech, defense tech, crypto, healthcare..."
                    className="w-full bg-ink/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-bright outline-none focus:border-accent/40 placeholder-muted/25" />
                </div>
                <div>
                  <label className="text-[10px] text-muted/50 font-medium block mb-1">Additional Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    placeholder="Any specific criteria, stage preferences, geography, etc..."
                    className="w-full bg-ink/50 border border-border/30 rounded-lg px-3 py-2 text-xs text-bright outline-none focus:border-accent/40 placeholder-muted/25 resize-none" />
                </div>
              </div>
            )}
          </div>

          {/* Tier Selection */}
          <div className="glass-card p-4 space-y-3">
            <h2 className="text-[11px] font-bold text-bright uppercase tracking-wider">Search Depth</h2>
            <div className="grid grid-cols-2 gap-2">
              {TIERS.map(t => {
                const c = tierColors[t.color];
                const isActive = selectedTier === t.key;
                return (
                  <button key={t.key} onClick={() => setSelectedTier(t.key)}
                    className={`text-left rounded-xl border p-3 transition-all ${
                      isActive ? `${c.activeBg} ${c.activeBorder} ring-1 ring-border/5` : `${c.bg} ${c.border} hover:${c.activeBg}`
                    }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-bright">{t.emoji} {t.name}</span>
                      <span className={`text-[11px] font-bold ${c.text}`}>{t.cost}</span>
                    </div>
                    <p className="text-[9px] text-muted/40 leading-relaxed">{t.desc}</p>
                    <p className="text-[9px] text-muted/30 mt-1">\u23F1 {t.time}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Run Button */}
          <button onClick={runSearch} disabled={baselines.length === 0}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
              baselines.length > 0
                ? 'bg-accent/20 border border-accent/40 text-accent hover:bg-accent/30 glow-accent'
                : 'bg-surface border border-border/20 text-muted/30 cursor-not-allowed'
            }`}>
            {baselines.length === 0
              ? 'Add at least one baseline company'
              : `\uD83D\uDD2C Run Deep Search \u00B7 ~${tier?.cost || '$8'}`
            }
          </button>
        </div>
      )}

      {/* Progress Panel */}
      {scanning && progress && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="text-[12px] font-semibold text-bright">{progress.message || 'Working...'}</p>
              <p className="text-[10px] text-muted/40 mt-0.5">{progress.stage || ''}</p>
            </div>
          </div>
          {progress.pct > 0 && (
            <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${progress.pct}%` }} />
            </div>
          )}
          {progress.details && (
            <div className="text-[10px] text-muted/40 space-y-0.5 max-h-32 overflow-y-auto font-mono">
              {progress.details.map((d, i) => <p key={i}>{d}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass-card p-4 border-rose/30">
          <p className="text-[11px] text-rose font-medium">{error}</p>
          <button onClick={() => { setError(''); setResults(null); }}
            className="text-[10px] text-muted/50 hover:text-bright mt-2">\u2190 Try again</button>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-bold text-bright">
                {sortedResults.length} companies found and scored
              </h2>
              {results.funnel && (
                <p className="text-[10px] text-muted/40 mt-0.5">
                  {results.funnel.similar || 0} from Harmonic
                  {results.funnel.discovered ? ` \u00B7 ${results.funnel.discovered} AI-discovered` : ''}
                  {results.funnel.scored ? ` \u00B7 ${results.funnel.scored} scored` : ''}
                </p>
              )}
            </div>
            <button onClick={() => { setResults(null); setError(''); }}
              className="text-[10px] text-muted/50 hover:text-bright px-3 py-1.5 rounded-lg border border-border/20 hover:border-border/40">
              \u2190 New Search
            </button>
          </div>

          {results.analysis && (
            <div className="glass-card p-3">
              <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1.5">\uD83E\uDDE0 AI Summary</p>
              <p className="text-[11px] text-muted/60 leading-relaxed whitespace-pre-line">{results.analysis}</p>
            </div>
          )}

          <div className="space-y-2">
            {visibleResults.map((c, i) => (
              <ResultCard key={`${c.name}-${i}`} company={c} addFavorite={addFavorite} isFavorited={isFavorited} rank={i + 1} />
            ))}
          </div>

          {remaining > 0 && (
            <button onClick={() => setVisibleCount(prev => prev + 20)}
              className="w-full text-[10px] text-boro/50 hover:text-boro py-2 border-t border-boro/10 font-medium">
              Show {Math.min(20, remaining)} more ({remaining} remaining) \u2193
            </button>
          )}
        </div>
      )}
    </div>
  );
}
