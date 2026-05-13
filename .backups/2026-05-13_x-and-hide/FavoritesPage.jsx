import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FindSimilar from '../components/FindSimilar';
import { CrmButton } from '../components/CrmButton';
import RemoveMenu from '../components/RemoveMenu';

function moneyFmt(n) {
  if (!n || typeof n !== 'number' || isNaN(n)) return null;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

function stageColor(stage) {
  const s = (stage || '').toLowerCase();
  if (s.includes('pre') || s.includes('preseed')) return 'bg-amber/12 text-amber border-amber/25';
  if (s.includes('seed')) return 'bg-sm/12 text-sm border-sm/25';
  if (s.includes('series_a') || s.includes('series a')) return 'bg-bo/12 text-bo border-bo/25';
  if (s.includes('series_b') || s.includes('series b')) return 'bg-boro/12 text-boro border-boro/25';
  if (s.includes('series')) return 'bg-boro/12 text-boro border-boro/25';
  return 'bg-muted/12 text-muted border-muted/25';
}

function stageLabel(stage) {
  if (!stage || typeof stage !== 'string') return '';
  return stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).replace('Pre Seed', 'Preseed');
}

function dateFmt(d) {
  if (!d) return null;
  try {
    const date = new Date(d);
    if (isNaN(date)) return d;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return d;
  }
}

export default function FavoritesPage({ favorites, removeFavorite, addFavorite, isFavorited }) {
  const [confirmRemove, setConfirmRemove] = useState(null);
  const navigate = useNavigate();

  const handleRemove = (name) => {
    if (confirmRemove === name) {
      removeFavorite(name);
      setConfirmRemove(null);
    } else {
      setConfirmRemove(name);
      setTimeout(() => setConfirmRemove(null), 3000);
    }
  };

  return (
    <div className="min-h-screen max-w-[1080px] mx-auto px-7 pt-6 pb-28 fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-serif text-xl font-semibold text-bright">Favorites</h1>
          <p className="text-muted text-xs mt-0.5">
            {favorites.length} {favorites.length === 1 ? 'company' : 'companies'} saved
          </p>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-20 fade-in">
          <div className="text-4xl mb-4">☆</div>
          <p className="text-muted text-sm mb-2">No favorites yet</p>
          <p className="text-muted/60 text-xs mb-6 max-w-[260px] mx-auto leading-relaxed">
            Ask Pigeon Finder about companies, then tap ★ on any result to save it here.
          </p>
          <button onClick={() => navigate('/')} className="btn-primary text-sm">
            Go to Pigeon Finder
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {favorites.map((company) => {
            const stage = stageLabel(company.funding_stage);
            const sClass = stageColor(company.funding_stage);
            const totalRaised = moneyFmt(company.funding_total);
            const lastRound = moneyFmt(company.last_round_amount);
            const lastDate = dateFmt(company.funding_date);

            return (
              <div key={company.name} className="rounded-[14px] border border-border/[0.06] hover:border-accent/18 p-4 space-y-2.5 fade-in" style={{ background: 'rgba(46, 42, 37, 0.55)' }}>
                {/* Header */}
                <div className="flex items-start gap-3">
                  {company.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt=""
                      className="w-10 h-10 rounded-lg bg-surface object-contain flex-shrink-0"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent font-bold text-sm">{(company.name || '?')[0]}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-bright text-sm truncate">{company.name}</h3>
                    {company.added_at && (
                      <p className="text-[10px] text-muted">Saved {dateFmt(company.added_at)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(company.name)}
                    className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${
                      confirmRemove === company.name
                        ? 'bg-rose/20 text-rose'
                        : 'text-muted/50 hover:text-rose hover:bg-rose/10'
                    }`}
                    title={confirmRemove === company.name ? 'Tap again to confirm' : 'Remove'}
                  >
                    {confirmRemove === company.name ? (
                      <span className="text-[10px] font-bold px-1">Remove?</span>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                  </button>
                </div>

                {confirmRemove === company.name && (
                  <p className="text-rose text-[10px] fade-in">Tap trash again to remove</p>
                )}

                {/* Description */}
                {company.description && (
                  <p className="text-muted text-xs leading-relaxed line-clamp-2">{company.description}</p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5">
                  {stage && (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${sClass}`}>
                      ⛳ {stage}
                    </span>
                  )}
                  {totalRaised && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-bo/12 text-bo border-bo/20">
                      💰 {totalRaised}
                    </span>
                  )}
                  {lastRound && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-boro/12 text-boro border-boro/20">
                      🎯 Last: {lastRound}
                    </span>
                  )}
                  {company.founded && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-surface border-border/40 text-muted">
                      📅 {company.founded}
                    </span>
                  )}
                  {lastDate && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-surface border-border/40 text-muted">
                      🕐 {lastDate}
                    </span>
                  )}
                  {company.location && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-surface border-border/40 text-muted">
                      📍 {company.location}
                    </span>
                  )}
                  {company.headcount && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-surface border-border/40 text-muted">
                      👥 {company.headcount}
                    </span>
                  )}
                </div>

                {/* Investors */}
                {company.investors && company.investors.length > 0 && (
                  <p className="text-[10px] text-muted">
                    Backed by: {company.investors.join(', ')}
                  </p>
                )}

                {/* Links */}
                <div className="flex gap-2">
                  {company.website && (() => {
                    const ws = typeof company.website === 'object' ? (company.website?.url || '') : (company.website || '');
                    return ws ? (
                      <a href={ws.startsWith('http') ? ws : `https://${ws}`} target="_blank" rel="noopener" className="text-[10px] text-accent hover:underline">
                        🌐 Website
                      </a>
                    ) : null;
                  })()}
                  {company.socials?.linkedin && (
                    <a href={company.socials.linkedin} target="_blank" rel="noopener" className="text-[10px] text-accent hover:underline">
                      💼 LinkedIn
                    </a>
                  )}
                  {company.socials?.twitter && (
                    <a href={company.socials.twitter} target="_blank" rel="noopener" className="text-[10px] text-accent hover:underline">
                      🐦 Twitter
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap"><FindSimilar addFavorite={addFavorite} isFavorited={isFavorited} companyName={company.name} /><CrmButton company={company} /><RemoveMenu company={company} /></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
