import React, { useState, useEffect } from 'react';
import FindSimilar from '../components/FindSimilar';


const API_BASE = import.meta.env?.VITE_API_URL || 'https://pigeon-api.up.railway.app';

const PORTFOLIO = [
  { name: 'steel.dev', domain: 'steel.dev', harmonic_id: 61225765 },  // ✓ Steel — steel.dev
  { name: 'Bubblemaps', domain: 'bubblemaps.io' },                     // ✓ bubblemaps.io
  { name: 'pump.fun', domain: 'pump.fun' },                            // ✓ pump.fun
  { name: 'Xverse', domain: 'xverse.app' },                            // ✓ xverse.app
  { name: 'Trendex', domain: 'trendex.vip' },                          // ? trendex.vip
  { name: 'Haloo', domain: 'haloo.ai' },                               // ? haloo.ai
  { name: 'Hirechain', domain: 'hirechain.io' },                       // ? hirechain.io
  { name: 'Botanix Labs', domain: 'botanixlabs.xyz' },                 // ? botanixlabs.xyz
  { name: 'Pear Protocol', domain: 'pear.garden' },                    // ? pear.garden
  { name: 'Lagoon Finance', domain: 'lagoon.finance' },                // ? lagoon.finance
  { name: 'Aura Fun', domain: 'aura.fun' },                            // aura.fun — "Aura" too generic
  { name: 'ord.io', domain: 'ord.io' },                                // ? ord.io
  { name: 'Kind Designs', domain: 'kinddesigns.com' },                 // ✓ kinddesigns.com
  { name: 'Raze', domain: 'raze.finance' },                            // ? raze.finance
  { name: 'Bound Money', domain: 'bound.money' },                      // bound.money — "Bound" too generic
  { name: 'worm.wtf', domain: 'worm.wtf' },                            // ✓ worm.wtf
  { name: 'Cob', domain: 'cobfoods.com' },                             // ✓ cobfoods.com
  { name: 'Vest Markets', domain: 'vest.markets' },                    // ? vest.markets
  { name: 'Theta Neurotech', domain: 'thetaneurotech.com' },           // ✓ thetaneurotech.com
];

function WebGrowthBadge({ company }) {
  const t = company.traction || {};
  const g30 = t.webGrowth30d;
  const g90 = t.webGrowth90d;
  const harmonicUrl = company.id && typeof company.id === 'number' ? `https://console.harmonic.ai/dashboard/company/${company.id}?selectedTab=TRACTION` : null;
  const badges = [];
  if (g30 !== null && g30 !== undefined) {
    if (g30 >= 50) badges.push({ label: `🌐▲${Math.round(g30)}%`, period: '1mo', color: 'bg-sm/15 text-sm border-sm/25', url: harmonicUrl });
    else if (g30 <= -30) badges.push({ label: `🌐▼${Math.abs(Math.round(g30))}%`, period: '1mo', color: 'bg-rose/12 text-rose border-rose/20', url: harmonicUrl });
  }
  if (g90 !== null && g90 !== undefined) {
    if (g90 >= 50) badges.push({ label: `🌐▲${Math.round(g90)}%`, period: '3mo', color: 'bg-sm/12 text-sm/70 border-sm/20', url: harmonicUrl });
    else if (g90 <= -30) badges.push({ label: `🌐▼${Math.abs(Math.round(g90))}%`, period: '3mo', color: 'bg-rose/10 text-rose/70 border-rose/15', url: harmonicUrl });
  }
  if (badges.length === 0) return null;
  return badges.map((b, i) => b.url ? (
    <a key={i} href={b.url} target="_blank" rel="noopener" className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border hover:opacity-80 ${b.color}`} title={`${b.period} web traffic — click for Harmonic`}>{b.label} <span className="text-[7px] opacity-60">{b.period}</span></a>
  ) : (
    <span key={i} className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border ${b.color}`}>{b.label} <span className="text-[7px] opacity-60">{b.period}</span></span>
  ));
}

export default function PortcosPage({ addFavorite, isFavorited }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingName, setLoadingName] = useState('');
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      for (let i = 0; i < PORTFOLIO.length; i++) {
        const co = PORTFOLIO[i];
        setLoadingName(co.name);
        setLoaded(i);
        let entry = null;
        try {
          // If we have a known Harmonic ID, use it directly
          if (co.harmonic_id) {
            const r3 = await fetch(`${API_BASE}/api/harmonic/company/${co.harmonic_id}/full`);
            if (r3.ok) {
              const data3 = await r3.json();
              if (data3.id) entry = { ...data3, portfolio_name: co.name, portfolio_domain: co.domain };
            }
          }
          // Otherwise try domain lookup
          if (!entry) {
            const r2 = await fetch(`${API_BASE}/api/harmonic/company-by-domain?domain=${encodeURIComponent(co.domain)}&name=${encodeURIComponent(co.name)}`);
            if (r2.ok) {
              const data2 = await r2.json();
              if (data2.id) {
                // Verify the returned domain matches what we asked for
                const returnedDomain = (data2.domain || data2.website || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
                const expectedBase = co.domain.toLowerCase().split('.')[0];
                const returnedBase = returnedDomain.split('.')[0];
                if (returnedDomain === co.domain.toLowerCase() || returnedBase === expectedBase) {
                  entry = { ...data2, portfolio_name: co.name, portfolio_domain: co.domain };
                } else {
                  console.warn(`[Portcos] Domain mismatch for ${co.name}: expected ${co.domain}, got ${returnedDomain}`);
                }
              }
            }
          }
          if (!entry) {
            entry = { name: co.name, portfolio_name: co.name, portfolio_domain: co.domain, notFound: true };
          }
        } catch (e) {
          entry = { name: co.name, portfolio_name: co.name, portfolio_domain: co.domain, notFound: true };
        }
        // Append to state — found companies stay in order, notFound go to bottom
        setCompanies(prev => {
          const updated = [...prev, entry];
          return updated.sort((a, b) => (a.notFound ? 1 : 0) - (b.notFound ? 1 : 0));
        });
        await new Promise(r => setTimeout(r, 150));
      }
      setLoading(false);
      setLoadingName('');
    };
    fetchAll();
  }, []);

  return (
    <div className="max-w-[1080px] mx-auto px-7 pt-6 pb-28 fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-serif text-lg font-semibold text-bright">Portfolio Companies</h1>
          <p className="text-[10px] text-muted/40">{companies.filter(c => !c.notFound).length} matched on Harmonic · {PORTFOLIO.length} total</p>
        </div>
        {loading && (
          <span className="text-[10px] text-accent/65 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 border border-accent border-t-transparent rounded-full animate-spin" />
            {loaded + 1}/{PORTFOLIO.length}: {loadingName}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {companies.map((c, i) => {
          if (c.notFound) {
            return (
              <div key={i} className="px-3 py-2.5 rounded-xl border border-border/15 bg-surface/20 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-rose/65 text-xs font-bold">?</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-bright/40">{c.portfolio_name}</p>
                  <p className="text-[9px] text-muted/35">{c.portfolio_domain}</p>
                  <p className="text-[9px] text-rose/40">Not found on Harmonic</p>
                </div>
              </div>
            );
          }

          const webUrl = c.website ? (c.website.startsWith('http') ? c.website : `https://${c.website}`) : null;
          const ft = c.funding_total;
          const funding = ft && typeof ft === 'number' ? (ft >= 1e9 ? `$${(ft/1e9).toFixed(1)}B` : ft >= 1e6 ? `$${(ft/1e6).toFixed(1)}M` : ft >= 1e3 ? `$${(ft/1e3).toFixed(0)}K` : `$${ft}`) : null;

          return (
            <div key={c.id || i} className="px-4 py-3.5 rounded-[14px] border border-border/[0.06] hover:border-accent/18 shadow-sm hover:shadow-md transition-all will-change-transform" style={{ background: 'rgba(46, 42, 37, 0.55)' }}>
              <div className="flex items-start gap-3">
                {c.logo_url ? (
                  <img src={c.logo_url} alt="" className="w-9 h-9 rounded-[7px] bg-ink-2 flex-shrink-0 object-contain" onError={e => { e.target.style.display='none'; }} />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-ink-2 flex items-center justify-center flex-shrink-0">
                    <span className="font-serif italic font-semibold text-accent text-xs">{(c.name || '?')[0]}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-bright">{c.name}</span>
                    {c.name !== c.portfolio_name && <span className="text-[8px] text-muted/35">({c.portfolio_name})</span>}
                    {webUrl && <a href={webUrl} target="_blank" rel="noopener" className="text-bo text-[10px] hover:text-bo/80">🌐</a>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {c.stage && <span className="text-[8px] px-1 py-0.5 rounded bg-sm/10 text-sm/65 border border-sm/10">{String(c.stage).replace(/_/g,' ')}</span>}
                    {funding && <span className="text-[8px] text-bo/65">💰 {funding}</span>}
                    <WebGrowthBadge company={c} />
                    {c.headcount && <span className="text-[8px] text-muted/35">👥 {c.headcount}</span>}
                    {c.location && <span className="text-[8px] text-muted/40">📍 {c.location}</span>}
                  </div>
                  {c.description && <p className="text-[9px] text-bright/50 mt-0.5 line-clamp-1">{c.description}</p>}
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1.5 mt-2 ml-12">
                {c.id && typeof c.id === "number" && <a href={`/company/${c.id}`} className="h-pill" title="Company Card">H</a>}<FindSimilar addFavorite={addFavorite} isFavorited={isFavorited} companyId={c.id} companyName={c.name} />
                {addFavorite && (
                  <button onClick={() => { if (!(isFavorited && isFavorited(c.name))) addFavorite({ name: c.name, description: c.description, website: c.website, logo_url: c.logo_url, funding_total: c.funding_total }); }}
                    className={`text-[8px] px-1.5 py-0.5 rounded border font-medium ${
                      isFavorited && isFavorited(c.name) ? 'bg-accent/10 text-accent border-accent/15' : 'text-muted/35 border-border/15 hover:text-accent'
                    }`}>
                    {isFavorited && isFavorited(c.name) ? '★' : '☆'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
