import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import FindSimilar from '../components/FindSimilar';
import { CrmButton } from '../components/CrmButton';

const API_BASE = import.meta.env?.VITE_API_URL || 'https://pigeon-api.up.railway.app';

function moneyFmt(n) {
  if (!n) return null;
  if (typeof n === 'number') {
    if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`;
    if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
    return `$${n}`;
  }
  return typeof n === 'string' ? n : null;
}

export default function CompanyDetail({ addFavorite, isFavorited }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedPerson, setExpandedPerson] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        let companyId = id;
        if (id.includes('.')) {
          const name = searchParams.get('name') || '';
          const r = await fetch(`${API_BASE}/api/harmonic/company-by-domain?domain=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`);
          if (r.ok) { const d = await r.json(); if (d.id) companyId = d.id; }
        }
        const r = await fetch(`${API_BASE}/api/harmonic/company/${companyId}/full`);
        if (r.ok) { const d = await r.json(); if (d.id) setCompany(d); }
      } catch (e) { console.error('Company detail error:', e); }
      setLoading(false);
    };
    fetchDetail();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!company) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <p className="text-muted mb-4">Company not found</p>
      <button onClick={() => navigate(-1)} className="text-accent text-sm">← Back</button>
    </div>
  );

  const founders = company.people?.filter(p => p.is_founder) || [];
  const team = company.people?.filter(p => !p.is_founder) || [];
  const funding = moneyFmt(company.funding_total);
  const rounds = company.funding_rounds || [];
  const investors = company.investors || [];
  const webUrl = company.website || '';
  const tabs = ['overview', 'funding', 'team', 'contact'];

  return (
    <div className="max-w-[1080px] mx-auto px-7 pt-5 pb-28 fade-in">
      <button onClick={() => navigate(-1)} className="text-accent/70 hover:text-accent text-sm mb-3">← Back</button>

      {/* Header */}
      <div className="flex items-start gap-4 mb-3">
        {company.logo_url ? (
          <img src={company.logo_url} alt="" className="w-14 h-14 rounded-[14px] object-contain bg-ink-2" onError={e => { e.target.style.display='none'; }} />
        ) : (
          <div className="w-14 h-14 rounded-[14px] bg-ink-2 flex items-center justify-center">
            <span className="font-serif italic font-semibold text-accent text-xl">{(company.name || '?')[0]}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-lg font-semibold text-bright">{company.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {webUrl && <a href={webUrl} target="_blank" rel="noopener" className="text-[10px] px-1.5 py-0.5 rounded bg-bo/10 text-bo border border-bo/15 hover:bg-bo/20">🌐 {webUrl.replace(/https?:\/\//, '').replace(/\/$/, '')}</a>}
            {company.socials?.twitter && <a href={company.socials.twitter} target="_blank" rel="noopener" className="text-[10px] px-1.5 py-0.5 rounded bg-bo/10 text-bo border border-bo/15 hover:bg-bo/20">𝕏</a>}
            {company.socials?.linkedin && <a href={company.socials.linkedin} target="_blank" rel="noopener" className="text-[10px] px-1.5 py-0.5 rounded bg-bo/10 text-bo border border-bo/15 hover:bg-bo/20">💼</a>}
            {company.socials?.crunchbase && <a href={company.socials.crunchbase} target="_blank" rel="noopener" className="text-[10px] px-1.5 py-0.5 rounded bg-amber/10 text-amber border border-amber/15 hover:bg-amber/20">CB</a>}
            {company.socials?.github && <a href={company.socials.github} target="_blank" rel="noopener" className="text-[10px] px-1.5 py-0.5 rounded bg-muted/10 text-muted border border-muted/15">GH</a>}
            {company.socials?.pitchbook && <a href={company.socials.pitchbook} target="_blank" rel="noopener" className="text-[10px] px-1.5 py-0.5 rounded bg-sm/10 text-sm border border-sm/15">PB</a>}
          </div>
        </div>
      </div>

      {/* Meta tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {company.stage && <span className="text-[9px] px-2 py-0.5 rounded-full bg-sm/10 text-sm border border-sm/20 font-bold">{company.stage.replace(/_/g, ' ')}</span>}
        {company.location && <span className="text-[9px] px-2 py-0.5 rounded-full bg-surface/40 border border-border/[0.06] text-muted/60">📍 {company.location}</span>}
        {company.founded_year && <span className="text-[9px] px-2 py-0.5 rounded-full bg-surface/40 border border-border/[0.06] text-muted/60">🗓 {company.founded_year}</span>}
        {(company.tags || []).slice(0, 4).map((t, i) => (
          <span key={i} className="text-[8px] px-1.5 py-0.5 rounded border bg-bo/8 border-bo/12 text-bo/60">{typeof t === 'string' ? t : t.name || ''}</span>
        ))}
      </div>

      {company.description && <p className="text-[11px] text-bright/60 leading-relaxed mb-4">{company.description}</p>}

      {/* Actions */}
      <div className="flex items-center gap-2 mb-4">
        <CrmButton company={{ name: company.name, website: company.website, description: company.description, funding_total: company.funding_total, sector: company.stage, socials: company.socials }} />
        <FindSimilar addFavorite={addFavorite} isFavorited={isFavorited} companyId={company.id} companyName={company.name} />
        {addFavorite && (
          <button onClick={() => { if (!(isFavorited && isFavorited(company.name))) addFavorite({ name: company.name, description: company.description, website: company.website, logo_url: company.logo_url, funding_total: company.funding_total }); }}
            className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium ${isFavorited && isFavorited(company.name) ? 'bg-accent/12 text-accent border-accent/20' : 'text-muted/50 border-border/[0.06] hover:text-accent'}`}>
            {isFavorited && isFavorited(company.name) ? '★' : '☆'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border/15 pb-1">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`text-[10px] px-3 py-1.5 rounded-t font-bold uppercase tracking-wider transition-colors ${activeTab === t ? 'text-accent border-b-2 border-accent' : 'text-muted/50 hover:text-bright/60'}`}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {funding && <StatCard label="Funding Total" value={funding} color="bo" />}
            {company.headcount && <StatCard label="Headcount" value={company.headcount} color="boro" />}
            {company.num_funding_rounds && <StatCard label="Funding Rounds" value={company.num_funding_rounds} color="accent" />}
          </div>
          {/* Traction Signals — web traffic + headcount + eng growth */}
          {(company.web_traffic || company.headcount_growth_90d != null || company.eng_headcount_growth_90d != null) && (
            <div className="p-3 bg-sm/[0.04] border border-sm/12 rounded-xl">
              <div className="flex items-start gap-3">
                {/* Web Traffic */}
                {company.web_traffic && (
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-sm/60 uppercase font-bold mb-1">Web Traffic</p>
                    <p className="text-lg font-bold text-sm">{typeof company.web_traffic === 'number' ? company.web_traffic.toLocaleString() : company.web_traffic}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {company.web_traffic_change_30d != null && (
                        <span className={`text-[10px] font-bold ${company.web_traffic_change_30d > 0 ? 'text-sm' : 'text-rose'}`}>
                          {company.web_traffic_change_30d > 0 ? '▲' : '▼'} {Math.abs(company.web_traffic_change_30d).toFixed(1)}% <span className="text-[8px] opacity-60">30d</span>
                        </span>
                      )}
                      {company.web_traffic_change_365d != null && (
                        <span className={`text-[10px] font-bold ${company.web_traffic_change_365d > 0 ? 'text-sm' : 'text-rose'}`}>
                          {company.web_traffic_change_365d > 0 ? '▲' : '▼'} {Math.abs(company.web_traffic_change_365d).toFixed(1)}% <span className="text-[8px] opacity-60">1yr</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[8px] text-sm/30 mt-0.5">monthly visits</p>
                  </div>
                )}

                {/* Headcount Growth */}
                {company.headcount_growth_90d != null && (
                  <div className="text-center px-2.5 py-1.5 rounded-lg bg-boro/[0.06] border border-boro/10 min-w-[72px]">
                    <p className="text-[7px] text-boro/50 uppercase font-bold mb-0.5">Headcount</p>
                    <p className={`text-sm font-bold ${company.headcount_growth_90d > 0 ? 'text-boro' : company.headcount_growth_90d < 0 ? 'text-rose' : 'text-muted/50'}`}>
                      {company.headcount_growth_90d > 0 ? '+' : ''}{company.headcount_growth_90d.toFixed(0)}%
                    </p>
                    <p className="text-[7px] text-boro/30">90d</p>
                    {company.headcount_growth_180d != null && (
                      <p className={`text-[8px] font-semibold mt-0.5 ${company.headcount_growth_180d > 0 ? 'text-boro/50' : 'text-rose/40'}`}>
                        {company.headcount_growth_180d > 0 ? '+' : ''}{company.headcount_growth_180d.toFixed(0)}% <span className="text-[6px] opacity-60">180d</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Engineering Headcount Growth */}
                {company.eng_headcount_growth_90d != null && (
                  <div className="text-center px-2 py-1.5 rounded-lg bg-bo/[0.06] border border-bo/10 min-w-[72px]">
                    <p className="text-[6px] text-bo/50 uppercase font-bold mb-0.5 tracking-wide">Engineering</p>
                    <p className={`text-sm font-bold ${company.eng_headcount_growth_90d > 0 ? 'text-bo' : company.eng_headcount_growth_90d < 0 ? 'text-rose' : 'text-muted/50'}`}>
                      {company.eng_headcount_growth_90d > 0 ? '+' : ''}{company.eng_headcount_growth_90d.toFixed(0)}%
                    </p>
                    <p className="text-[7px] text-bo/30">90d</p>
                    {company.eng_headcount_growth_180d != null && (
                      <p className={`text-[8px] font-semibold mt-0.5 ${company.eng_headcount_growth_180d > 0 ? 'text-bo/50' : 'text-rose/40'}`}>
                        {company.eng_headcount_growth_180d > 0 ? '+' : ''}{company.eng_headcount_growth_180d.toFixed(0)}% <span className="text-[6px] opacity-60">180d</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Mini sparkline chart */}
              {company.web_traffic_history && company.web_traffic_history.length > 2 && (
                <div className="mt-2 h-10 flex items-end gap-px">
                  {company.web_traffic_history.map((point, i) => {
                    const val = point.metric_value || point.value || 0;
                    const maxVal = Math.max(...company.web_traffic_history.map(p => p.metric_value || p.value || 0));
                    const height = maxVal > 0 ? Math.max(4, (val / maxVal) * 40) : 4;
                    return (
                      <div key={i} className="flex-1 bg-sm/30 rounded-t hover:bg-sm/50 transition-colors relative group"
                        style={{ height: `${height}px` }}>
                        <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-card border border-sm/20 rounded px-1.5 py-0.5 text-[8px] text-sm whitespace-nowrap z-10">
                          {(val / 1000).toFixed(0)}K · {point.timestamp ? new Date(point.timestamp).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {founders.length > 0 && (
            <div>
              <p className="text-[10px] text-bright/50 uppercase font-bold mb-2">Founders & CEO ({founders.length})</p>
              <div className="space-y-2">
                {founders.map((p, i) => <PersonCard key={p.id || i} person={p} expanded={expandedPerson === (p.id || i)} onToggle={() => setExpandedPerson(expandedPerson === (p.id || i) ? null : (p.id || i))} />)}
              </div>
            </div>
          )}
          {investors.length > 0 && (
            <div>
              <p className="text-[10px] text-bright/50 uppercase font-bold mb-2">Investors ({investors.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {investors.slice(0, 12).map((inv, i) => {
                  const name = typeof inv === 'string' ? inv : inv.name || inv.investor_name || '';
                  return name ? <span key={i} className="text-[9px] px-2 py-0.5 rounded-lg bg-boro/10 border border-boro/15 text-boro/70">{name}</span> : null;
                })}
                {investors.length > 12 && <span className="text-[9px] text-muted/40">+{investors.length - 12} more</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'funding' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {funding && <StatCard label="Funding Total" value={funding} color="bo" />}
            {company.num_funding_rounds && <StatCard label="Rounds" value={company.num_funding_rounds} color="accent" />}
            {company.headcount && <StatCard label="Headcount" value={company.headcount} color="boro" />}
          </div>
          {investors.length > 0 && (
            <div className="p-3 bg-boro/[0.04] border border-boro/12 rounded-xl">
              <p className="text-[9px] text-boro/60 uppercase font-bold mb-2">Investors ({investors.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {investors.map((inv, i) => {
                  const name = typeof inv === 'string' ? inv : inv.name || inv.investor_name || '';
                  return name ? <span key={i} className="text-[9px] px-2 py-1 rounded-lg bg-boro/10 border border-boro/15 text-boro/70">{name}</span> : null;
                })}
              </div>
            </div>
          )}
          {rounds.length > 0 ? (
            <div>
              <p className="text-[10px] text-bright/50 uppercase font-bold mb-2">Funding Events</p>
              <div className="space-y-2">
                {rounds.map((r, i) => (
                  <div key={i} className="p-3 bg-bo/[0.03] border border-bo/10 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-bo/15 text-bo font-bold border border-bo/20">{r.funding_type || r.round_type || r.series || 'Round'}</span>
                      <span className="text-[10px] text-bright/40">{r.announced_date || r.date ? new Date(r.announced_date || r.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : ''}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {(r.money_raised || r.amount) && <span className="text-sm font-bold text-bo">{moneyFmt(r.money_raised?.amount || r.money_raised || r.amount)}</span>}
                      {r.post_money_valuation && <span className="text-[9px] text-sm/60">{moneyFmt(r.post_money_valuation?.amount || r.post_money_valuation)} post</span>}
                    </div>
                    {r.investors && r.investors.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {r.investors.slice(0, 6).map((inv, j) => {
                          const n = typeof inv === 'string' ? inv : inv.name || inv.investor_name || '';
                          return n ? <span key={j} className="text-[8px] px-1.5 py-0.5 rounded bg-surface/60 border border-border/15 text-bright/40">{n}</span> : null;
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-[11px] text-muted/40 text-center py-6">No detailed funding round data available</p>}
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-4">
          {founders.length > 0 && (
            <div>
              <p className="text-[10px] text-bright/50 uppercase font-bold mb-2">Founders & CEO ({founders.length})</p>
              <div className="space-y-2">{founders.map((p, i) => <PersonCard key={p.id || i} person={p} expanded={expandedPerson === (p.id || i)} onToggle={() => setExpandedPerson(expandedPerson === (p.id || i) ? null : (p.id || i))} />)}</div>
            </div>
          )}
          {team.length > 0 && (
            <div>
              <p className="text-[10px] text-bright/50 uppercase font-bold mb-2">Team ({team.length})</p>
              <div className="space-y-2">{team.map((p, i) => <PersonCard key={p.id || `t-${i}`} person={p} expanded={expandedPerson === (p.id || `t-${i}`)} onToggle={() => setExpandedPerson(expandedPerson === (p.id || `t-${i}`) ? null : (p.id || `t-${i}`))} />)}</div>
            </div>
          )}
          {founders.length === 0 && team.length === 0 && <p className="text-[11px] text-muted/40 text-center py-6">No team data available</p>}
        </div>
      )}

      {activeTab === 'contact' && (
        <div className="space-y-4">
          {company.contact?.executive_emails?.length > 0 && (
            <div className="p-3 bg-accent/[0.04] border border-accent/12 rounded-xl">
              <p className="text-[9px] text-accent/60 uppercase font-bold mb-2">Executive Emails</p>
              {company.contact.executive_emails.map((e, i) => {
                const email = typeof e === 'string' ? e : e.email || e.value || '';
                return email ? <p key={i} className="text-[11px] text-bright/70 font-mono">{email}</p> : null;
              })}
            </div>
          )}
          {company.contact?.company_emails?.length > 0 && (
            <div className="p-3 bg-bo/[0.04] border border-bo/12 rounded-xl">
              <p className="text-[9px] text-bo/60 uppercase font-bold mb-2">Company Emails</p>
              {company.contact.company_emails.map((e, i) => {
                const email = typeof e === 'string' ? e : e.email || e.value || '';
                return email ? <p key={i} className="text-[11px] text-bright/70 font-mono">{email}</p> : null;
              })}
            </div>
          )}
          {company.contact?.phone?.length > 0 && (
            <div className="p-3 bg-sm/[0.04] border border-sm/12 rounded-xl">
              <p className="text-[9px] text-sm/60 uppercase font-bold mb-2">Phone</p>
              {company.contact.phone.map((p, i) => {
                const ph = typeof p === 'string' ? p : p.number || p.value || '';
                return ph ? <p key={i} className="text-[11px] text-bright/70 font-mono">{ph}</p> : null;
              })}
            </div>
          )}
          {(!company.contact?.executive_emails?.length && !company.contact?.company_emails?.length && !company.contact?.phone?.length) && (
            <p className="text-[11px] text-muted/40 text-center py-6">No contact information available</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = { bo: 'bg-bo/[0.06] border-bo/15 text-bo', boro: 'bg-boro/[0.06] border-boro/15 text-boro', accent: 'bg-accent/[0.06] border-accent/15 text-accent', sm: 'bg-sm/[0.06] border-sm/15 text-sm' };
  return (
    <div className={`p-3 rounded-xl border ${colors[color] || colors.bo}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[8px] uppercase font-bold opacity-50 mt-0.5">{label}</p>
    </div>
  );
}

function PersonCard({ person, expanded, onToggle }) {
  const exp = person.experience || [];
  const hasName = person.name && person.name.trim();
  return (
    <div className="border border-border/[0.06] rounded-xl bg-surface/30 backdrop-blur-sm overflow-hidden">
      <div className="px-3 py-2.5 flex items-center gap-3">
        {person.photo ? (
          <img src={person.photo} alt="" className="w-10 h-10 rounded-full bg-ink/60 object-cover flex-shrink-0" onError={e => { e.target.style.display='none'; }} />
        ) : (
          <div className="w-10 h-10 rounded-full bg-boro/10 flex items-center justify-center flex-shrink-0">
            <span className="text-boro text-sm font-bold">{hasName ? person.name[0] : '?'}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-bold text-bright">{hasName ? person.name : '(Name not available)'}</span>
            {person.is_founder && <span className="text-[7px] px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/20 font-bold">Founder</span>}
          </div>
          <p className="text-[10px] text-bright/50 mt-0.5">{person.title}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {person.linkedin && <a href={person.linkedin} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-[8px] px-1.5 py-0.5 rounded bg-bo/10 text-bo border border-bo/12 hover:bg-bo/20">💼 LinkedIn</a>}
            {person.twitter && <a href={person.twitter} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-[8px] px-1.5 py-0.5 rounded bg-bo/10 text-bo border border-bo/12 hover:bg-bo/20">𝕏</a>}
            {exp.length > 0 && (
              <button onClick={onToggle} className={`text-[8px] px-1.5 py-0.5 rounded border font-medium transition-colors ${expanded ? 'bg-accent/15 text-accent border-accent/20' : 'text-muted/50 border-border/[0.06] hover:text-accent'}`}>
                {expanded ? '▲ Hide' : `▼ Experience (${exp.length})`}
              </button>
            )}
          </div>
        </div>
      </div>
      {expanded && exp.length > 0 && (
        <div className="px-3 pb-3 border-t border-border/12 pt-2 ml-[52px]">
          <div className="space-y-2">
            {exp.map((job, i) => (
              <div key={i} className="flex gap-2">
                <div className="w-1 bg-accent/20 rounded-full flex-shrink-0 mt-0.5" style={{ minHeight: '24px' }} />
                <div>
                  <p className="text-[11px] text-bright/70 font-semibold">{job.title || job.role || 'Role'}</p>
                  <p className="text-[10px] text-bright/50">{job.company_name || job.company || job.organization || ''}</p>
                  <p className="text-[8px] text-muted/40">
                    {job.start_date || job.started_at ? new Date(job.start_date || job.started_at).getFullYear() : ''}
                    {(job.start_date || job.started_at) && ' → '}
                    {job.end_date || job.ended_at ? new Date(job.end_date || job.ended_at).getFullYear() : (job.is_current ? 'Present' : '')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
