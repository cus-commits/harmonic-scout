import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { updateNickname } from '../utils/api';
import { CrmHistory, CrmIdentity, CrmButton } from './CrmButton';

const APP_ITEMS = [
  { path: '/chat', label: 'Harmonic', icon: ChatIcon, desc: 'AI deal analyst' },
  { path: '/twitter', label: 'X / Twitter', icon: XIcon, desc: 'Signal scanner' },
  { path: '/farcaster', label: 'Farcaster', icon: FarcasterIcon, desc: 'Cast scanner' },
  { path: '/producthunt', label: 'Product Hunt', icon: ProductHuntIcon, desc: 'Launch scanner' },
  { path: '/github', label: 'GitHub', icon: GitHubIcon, desc: 'Repo scanner' },
];

export default function NavBar({ onLogout, favCount, nickname, setNickname, userId, addFavorite, isFavorited }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showScanMenu, setShowScanMenu] = useState(false);
  const [showApps, setShowApps] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const scanRef = useRef(null);
  const debounceRef = useRef(null);
  const appsRef = useRef(null);
  const API_BASE = import.meta.env?.VITE_API_URL || 'https://pigeon-api.up.railway.app';

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(nickname);
  const [wipeConfirm, setWipeConfirm] = useState(false);
  const [wipeDone, setWipeDone] = useState(false);

  const [showKeyEdit, setShowKeyEdit] = useState(null);
  const [keyInput, setKeyInput] = useState('');
  const [keyStatus, setKeyStatus] = useState('idle');
  const [keyError, setKeyError] = useState('');

  // Close overlays on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
    };
    if (showSearch) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSearch]);

  useEffect(() => {
    if (!showScanMenu) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowScanMenu(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showScanMenu]);

  useEffect(() => {
    const handler = (e) => { if (appsRef.current && !appsRef.current.contains(e.target)) setShowApps(false); };
    if (showApps) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showApps]);

  useEffect(() => {
    if (showSearch && searchInputRef.current) searchInputRef.current.focus();
  }, [showSearch]);

  // Search typeahead
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const r = await fetch(`${API_BASE}/api/harmonic/typeahead?q=${encodeURIComponent(searchQuery)}&size=6`);
        if (r.ok) { const data = await r.json(); setSearchResults(data.results || []); }
      } catch (e) {}
      setSearchLoading(false);
    }, 150);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  // Pending vote count
  const [pendingCount, setPendingCount] = useState(0);
  const crmUser = typeof window !== 'undefined' ? localStorage.getItem('crm_user') : null;
  const crmRestricted = false;

  useEffect(() => {
    if (!crmUser || crmRestricted) return;
    const checkPending = async () => {
      try {
        const [boroR, smR] = await Promise.all([
          fetch(`${API_BASE}/api/airtable/companies?stage=BORO&limit=200`).then(r => r.json()),
          fetch(`${API_BASE}/api/airtable/companies?stage=BORO-SM&limit=200`).then(r => r.json()),
        ]);
        const all = [...(boroR.companies || []), ...(smR.companies || [])].filter(c => c.company);
        const pending = all.filter(c => {
          const votes = Array.isArray(c.in_or_out) ? c.in_or_out : (c.in_or_out ? [c.in_or_out] : []);
          return !votes.some(v => typeof v === 'string' && v.toLowerCase().startsWith(crmUser.toLowerCase()));
        });
        setPendingCount(pending.length);
      } catch (e) {}
    };
    checkPending();
    const interval = setInterval(checkPending, 60000);
    return () => clearInterval(interval);
  }, [crmUser]);

  // Reachouts unread count
  const [reachoutsUnread, setReachoutsUnread] = useState(0);
  useEffect(() => {
    const checkReachouts = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/reachouts/summary`);
        if (r.ok) { const d = await r.json(); setReachoutsUnread(d.totalUnread || 0); }
      } catch (e) {}
    };
    checkReachouts();
    const interval = setInterval(checkReachouts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== nickname) {
      setNickname(trimmed);
      updateNickname(userId, trimmed).catch(() => {});
    }
    setEditingName(false);
  };

  const handleSaveKey = async (type) => {
    const val = keyInput.trim();
    if (!val) return;
    setKeyStatus('validating');
    setKeyError('');
    try {
      const r = await fetch(`${API_BASE}/api/validate-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, key: val }),
      });
      const data = await r.json();
      if (data.valid) {
        localStorage.setItem(type === 'anthropic' ? 'scout_anthropic_key' : 'scout_harmonic_key', val);
        setKeyStatus('success');
        setTimeout(() => { setShowKeyEdit(null); setKeyStatus('idle'); setKeyInput(''); }, 1500);
      } else {
        setKeyError(data.error || 'Invalid key');
        setKeyStatus('error');
      }
    } catch (e) {
      setKeyError(e.message);
      setKeyStatus('error');
    }
  };

  const getMaskedKey = (type) => {
    const key = localStorage.getItem(type === 'anthropic' ? 'scout_anthropic_key' : 'scout_harmonic_key') || '';
    if (!key || key === '__SERVER__') return type === 'harmonic' ? 'Server-managed' : 'Not set';
    return key.slice(0, 7) + '...' + key.slice(-4);
  };

  const KeyEditRow = ({ type, label, placeholder }) => (
    <>
      <div className="flex items-center justify-between py-1.5">
        <div>
          <p className="text-[11px] text-bright/70 font-medium">{label}</p>
          <p className="text-[9px] text-muted/40 font-mono">{getMaskedKey(type)}</p>
        </div>
        <button onClick={() => { setShowKeyEdit(showKeyEdit === type ? null : type); setKeyInput(''); setKeyStatus('idle'); setKeyError(''); }}
          className="text-[9px] px-1.5 py-0.5 rounded border border-border/30 text-muted hover:text-accent hover:border-accent/30 transition-colors">
          {showKeyEdit === type ? 'Cancel' : 'Change'}
        </button>
      </div>
      {showKeyEdit === type && (
        <div className="space-y-1 mt-1 mb-2">
          <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder={placeholder}
            className="w-full bg-ink/60 border border-border/30 rounded-lg px-2 py-1.5 text-[11px] text-bright font-mono outline-none focus:border-accent/40" autoComplete="off" />
          {keyStatus === 'error' && <p className="text-[9px] text-rose">{keyError}</p>}
          {keyStatus === 'success' && <p className="text-[9px] text-sm">Key saved</p>}
          <button onClick={() => handleSaveKey(type)} disabled={!keyInput.trim() || keyStatus === 'validating'}
            className="w-full text-[10px] px-2 py-1.5 rounded-lg bg-accent/20 text-accent font-bold disabled:opacity-40 transition-colors">
            {keyStatus === 'validating' ? 'Validating...' : 'Save Key'}
          </button>
        </div>
      )}
    </>
  );

  const SearchTypeahead = ({ onNav }) => (
    <>
      {searchResults.length > 0 && (
        <div className="max-h-[300px] overflow-y-auto border-t border-border/20">
          {searchResults.map((s, i) => {
            const webUrl = s.website ? (s.website.startsWith('http') ? s.website : `https://${s.website}`) : null;
            const ft = s.funding_total;
            const funding = ft && typeof ft === 'number' ? (ft >= 1e9 ? `$${(ft/1e9).toFixed(1)}B` : ft >= 1e6 ? `$${(ft/1e6).toFixed(1)}M` : `$${(ft/1e3).toFixed(0)}K`) : null;
            return (
              <div key={s.id || i} className="px-3 py-2 hover:bg-accent/8 transition-colors border-b border-border/10 last:border-0">
                <div className="flex items-center gap-2">
                  {s.logo_url ? (
                    <img src={s.logo_url} alt="" className="w-7 h-7 rounded-lg bg-ink/60 flex-shrink-0 object-contain" onError={e => { e.target.style.display='none'; }} />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent text-[10px] font-bold">{(s.name || '?')[0]}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <button onClick={() => { onNav(); navigate(`/company/${s.id}`); }}
                      className="text-[11px] font-semibold text-bright hover:text-accent truncate block text-left transition-colors">{s.name}</button>
                    <div className="flex items-center gap-1 flex-wrap">
                      {s.stage && <span className="text-[8px] px-1 rounded bg-sm/10 text-sm/80">{String(s.stage).replace(/_/g,' ')}</span>}
                      {funding && <span className="text-[8px] text-bo/80">{funding}</span>}
                      {webUrl && <a href={webUrl} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-[8px] text-bo/60 hover:text-bo">🌐</a>}
                    </div>
                  </div>
                  <CrmButton company={{ name: s.name, website: s.website, description: s.description, funding_total: s.funding_total, sector: s.stage, socials: { twitter: s.twitter } }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading && (
        <p className="text-muted/40 text-[10px] text-center py-2 border-t border-border/20">No companies found</p>
      )}
      {searchQuery.length >= 2 && (
        <p className="text-[8px] text-muted/40 text-center py-1 border-t border-border/20">Press Enter for full results</p>
      )}
    </>
  );

  const TEAM_NAMES = ['Mark', 'Joe', 'Liam', 'Carlo', 'Jake', 'Serena'];
  const RESTRICTED_NAMES = [];

  function InlineTeamPicker() {
    const [user, setUser] = useState(localStorage.getItem('crm_user') || '');
    const pick = (name) => { localStorage.setItem('crm_user', name); setUser(name); window.location.reload(); };
    const clear = () => { localStorage.removeItem('crm_user'); setUser(''); window.location.reload(); };

    if (user) {
      return (
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-accent">{user}</span>
          <button onClick={clear} className="text-[10px] px-2 py-1 rounded-md border border-rose/20 text-rose/60 hover:text-rose">Change</button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-1.5">
        {TEAM_NAMES.map(name => (
          <button key={name} onClick={() => pick(name)}
            className="text-xs px-3 py-2 rounded-lg border border-accent/15 text-bright/70 hover:bg-accent/10 hover:border-accent/25 font-medium transition-colors text-left">
            {name}
          </button>
        ))}
      </div>
    );
  }

  /* ─── Nav item definitions ─── */
  const navItems = [
    { id: 'home', path: '/', label: 'Home', icon: HomeIcon },
    { id: 'search', label: 'Search', icon: SearchNavIcon, overlay: true },
    { id: 'scan', label: 'Scan', icon: ScreenIcon, overlay: true, badge: null },
    { id: 'apps', label: 'Apps', icon: AppsIcon, overlay: true },
    { id: 'dd', path: '/toppicks', label: 'DD', icon: TopPicksIcon },
    { id: 'crm', path: '/airtable', label: 'CRM', icon: AirtableNavIcon, badge: (!crmRestricted && pendingCount > 0) ? pendingCount : null },
    { id: 'dms', path: '/reachouts', label: 'DMs', icon: ReachoutsIcon, badge: reachoutsUnread > 0 ? reachoutsUnread : null },
    { id: 'favs', path: '/favorites', label: 'Favs', icon: StarIcon, badge: favCount || null },
    { id: 'portcos', path: '/portcos', label: 'Portcos', icon: PortcosIcon },
  ];

  const isActive = (item) => {
    if (item.id === 'home') return location.pathname === '/';
    if (item.id === 'search') return showSearch || location.pathname === '/chat';
    if (item.id === 'scan') return showScanMenu || ['/super', '/searchagent', '/recurring'].includes(location.pathname);
    if (item.id === 'apps') return showApps || ['/chat', '/twitter', '/farcaster', '/producthunt', '/github'].includes(location.pathname);
    if (item.path) return location.pathname === item.path;
    return false;
  };

  const handleNavClick = (item) => {
    if (item.id === 'search') {
      setShowSearch(!showSearch);
      setShowScanMenu(false);
      setShowApps(false);
      setShowMenu(false);
      if (!showSearch) { setSearchQuery(''); setSearchResults([]); }
      return;
    }
    if (item.id === 'scan') {
      setShowScanMenu(!showScanMenu);
      setShowSearch(false);
      setShowApps(false);
      setShowMenu(false);
      return;
    }
    if (item.id === 'apps') {
      setShowApps(!showApps);
      setShowSearch(false);
      setShowScanMenu(false);
      setShowMenu(false);
      return;
    }
    setShowSearch(false);
    setShowScanMenu(false);
    setShowApps(false);
    setShowMenu(false);
    if (item.path) navigate(item.path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(46, 42, 37, 0.92)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        borderTop: '1px solid rgba(230, 199, 154, 0.10)',
        boxShadow: '0 -4px 28px rgba(0,0,0,0.45), 0 -1px 0 rgba(230, 199, 154, 0.06)',
      }}>

      {/* ─── Search overlay ─── */}
      {showSearch && (
        <div ref={searchRef} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[340px] max-w-[calc(100vw-24px)] bg-card border border-accent/20 rounded-xl z-[60] fade-in"
          style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.6)' }}>
          <div className="p-2.5">
            <div className="relative">
              <input ref={searchInputRef} type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
                    setShowSearch(false);
                    navigate(`/chat?search=${encodeURIComponent(searchQuery.trim())}`);
                    setSearchQuery(''); setSearchResults([]);
                  }
                  if (e.key === 'Escape') setShowSearch(false);
                }}
                placeholder="Search companies..."
                className="w-full bg-ink/60 border border-border/30 rounded-lg px-3 py-2 text-sm text-bright outline-none focus:border-accent/40 placeholder:text-muted/40" />
              {searchLoading && <div className="absolute right-3 top-2.5 w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />}
            </div>
          </div>
          <SearchTypeahead onNav={() => setShowSearch(false)} />
        </div>
      )}

      {/* ─── Scan chooser — full modal dialog ─── */}
      {showScanMenu && (
        <div className="sc-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowScanMenu(false); }}>
          <div className="sc-anchor">
            <div className="sc-card" role="dialog" aria-label="Choose scan type">
              <div className="sc-head">
                <div className="sc-head-l">
                  <div className="sc-head-h">Start a scan</div>
                  <div className="sc-head-s">Pick how you want to surface companies today.</div>
                </div>
                <button className="sc-x" onClick={() => setShowScanMenu(false)}>×</button>
              </div>

              <div className="sc-grid">
                <button
                  className="sc-opt sc-opt-scan"
                  onClick={() => { navigate('/searchagent'); setShowScanMenu(false); }}
                >
                  <div className="sc-opt-top">
                    <span className="sc-opt-glyph sc-opt-glyph-scan">🔬</span>
                    <span className="sc-opt-badge">Long Form</span>
                  </div>
                  <div className="sc-opt-h">Scan Agent</div>
                  <div className="sc-opt-d">
                    Run scheduled scans across your saved theses. Reasoning, ranking, and a vetting report.
                  </div>
                  <span className="sc-opt-cta">Open Scan Agent →</span>
                </button>

                <button
                  className="sc-opt sc-opt-super"
                  onClick={() => { navigate('/super'); setShowScanMenu(false); }}
                >
                  <div className="sc-opt-top">
                    <span className="sc-opt-glyph sc-opt-glyph-super">⚡</span>
                    <span className="sc-opt-badge sc-badge-super">One-shot</span>
                  </div>
                  <div className="sc-opt-h">Super Search</div>
                  <div className="sc-opt-d">
                    Ad-hoc search of Harmonic's full universe with custom filters and natural-language refining.
                  </div>
                  <span className="sc-opt-cta">Open Super Search →</span>
                </button>
              </div>

              <div className="sc-foot">
                <span>Scan Agent is best for longer searches that take hours. Super Search is better for searches that take minutes.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Apps overlay ─── */}
      {showApps && (
        <div ref={appsRef} className="absolute bottom-full right-4 mb-2 bg-card border border-accent/20 rounded-xl min-w-[200px] z-[60] fade-in"
          style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' }}>
          <p className="text-[10px] uppercase tracking-widest text-muted/50 font-bold font-mono px-3 pt-2.5 pb-1">Apps</p>
          {APP_ITEMS.map((app) => {
            const active = location.pathname === app.path;
            return (
              <button key={app.path} onClick={() => { navigate(app.path); setShowApps(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  active ? 'bg-accent/10 text-accent' : 'text-bright/80 hover:bg-card-hi'
                }`}>
                <div className={`${active ? 'text-accent' : 'text-muted/60'}`}><app.icon active={active} /></div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{app.label}</p>
                  <p className="text-[10px] text-muted/40">{app.desc}</p>
                </div>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Settings overlay ─── */}
      {showMenu && (
        <div className="absolute bottom-full right-4 mb-2 glass-card p-3 min-w-[240px] fade-in space-y-3 z-[60]">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted font-medium font-mono mb-1.5">Your nickname</p>
            {editingName ? (
              <div className="flex gap-1.5">
                <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  className="flex-1 bg-ink border border-border/50 rounded-lg px-2 py-1.5 text-xs text-bright outline-none focus:border-accent/50" maxLength={24} autoFocus />
                <button onClick={handleSaveName} className="text-xs px-2 py-1.5 rounded-lg bg-accent text-ink font-bold">Save</button>
              </div>
            ) : (
              <button onClick={() => { setNameInput(nickname); setEditingName(true); }}
                className="w-full text-left text-sm text-bright px-2 py-1.5 rounded-lg hover:bg-surface/80 transition-colors flex items-center justify-between">
                <span>🕊️ {nickname}</span>
                <span className="text-[10px] text-muted">tap to edit</span>
              </button>
            )}
          </div>
          <div className="border-t border-border/30" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted font-medium font-mono mb-1.5">API Keys</p>
            <KeyEditRow type="anthropic" label="Anthropic" placeholder="sk-ant-..." />
            <div className="border-t border-border/10 my-1" />
            <KeyEditRow type="harmonic" label="Harmonic" placeholder="Harmonic API key..." />
          </div>
          <div className="border-t border-border/30" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted font-medium font-mono mb-1.5">Scan History</p>
            {wipeConfirm ? (
              <div className="space-y-2">
                <p className="text-[11px] text-rose leading-relaxed">This will clear ALL dismissed companies for every team member. Cannot be undone.</p>
                <div className="flex gap-2">
                  <button onClick={() => setWipeConfirm(false)} className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-border/40 text-muted">Cancel</button>
                  <button onClick={async () => {
                    try {
                      await fetch(`${API_BASE}/api/autoscan/seen`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
                      setWipeConfirm(false); setWipeDone(true); setTimeout(() => setWipeDone(false), 3000);
                    } catch (err) { console.error('Wipe error:', err); }
                  }} className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-rose/20 text-rose border border-rose/30 font-bold">Yes, Wipe</button>
                </div>
              </div>
            ) : wipeDone ? (
              <p className="text-xs text-sm px-2 py-1.5">History cleared</p>
            ) : (
              <button onClick={() => setWipeConfirm(true)} className="w-full text-left text-sm text-muted px-2 py-1.5 rounded-lg hover:bg-surface/80 transition-colors">
                🗑️ Wipe Scan History
              </button>
            )}
          </div>
          <div className="border-t border-border/30" />
          <button onClick={() => { setShowMenu(false); onLogout(); navigate('/setup'); }}
            className="w-full text-left text-sm text-rose px-2 py-1.5 rounded-lg hover:bg-rose/10 transition-colors">
            Disconnect Keys
          </button>
        </div>
      )}

      {/* ─── Bottom nav bar ─── */}
      <div className="flex items-stretch justify-between h-16 max-w-5xl mx-auto px-3 gap-0.5">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={`group relative flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 px-1 transition-colors duration-150 ${
                active ? 'text-accent' : 'text-muted hover:text-bright'
              }`}
            >
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[22px] h-0.5 rounded-b bg-accent" />
              )}
              <div className={`relative transition-all duration-150 ${active ? 'drop-shadow-[0_0_6px_rgba(230,199,154,0.5)]' : ''}`}>
                <item.icon active={active} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 left-1/2 translate-x-1 min-w-[16px] h-[14px] px-1 rounded-full bg-accent text-ink text-[9px] font-bold font-mono flex items-center justify-center leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-semibold tracking-[0.04em] leading-tight">{item.label}</span>
            </button>
          );
        })}

        {/* Settings button */}
        <button
          onClick={() => { setShowMenu(!showMenu); setShowSearch(false); setShowScanMenu(false); setShowApps(false); }}
          className="group flex flex-col items-center justify-center gap-0.5 px-1.5 min-w-0 text-muted hover:text-bright transition-colors duration-150"
        >
          <SettingsIcon />
          <span className="text-[9px] font-semibold tracking-[0.04em] leading-tight">Settings</span>
        </button>

        {/* Nav side — avatar + name + tenant */}
        <div className="flex items-center gap-2 px-2 ml-1 flex-shrink-0">
          <CrmIdentity />
          <a href="https://www.daxos.capital" target="_blank" rel="noopener"
            className="text-[10px] font-mono font-bold tracking-[0.18em] text-accent/60 hover:text-accent transition-opacity">
            daxos.capital
          </a>
        </div>
      </div>

      {/* ─── Vote alert pill (top-right) ─── */}
      {!crmRestricted && pendingCount > 0 && (
        <button onClick={() => navigate('/airtable')}
          className="fixed top-3.5 right-3.5 z-[60] flex items-center gap-1.5 h-8 px-3 rounded-full border transition-all hover:scale-[1.02]"
          style={{
            background: 'rgb(var(--card))',
            borderColor: 'var(--border-2)',
            boxShadow: 'var(--shadow-sm)',
          }}>
          <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          <span className="text-[11px] text-accent font-semibold">{pendingCount} {pendingCount === 1 ? 'vote' : 'votes'}</span>
        </button>
      )}
    </nav>
  );
}

/* ─── Icons ─── */

function HomeIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

function AppsIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ScreenIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function StarIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function AirtableNavIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} strokeLinejoin="round">
      <path d="M12 2L22 6.5L12 11L2 6.5L12 2Z" />
      <path d="M22 10.5L12 15L2 10.5" />
      <path d="M22 14.5L12 19L2 14.5" />
    </svg>
  );
}

function SearchNavIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function TopPicksIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 1.5 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      <circle cx="12" cy="12" r="3" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function ReachoutsIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function PortcosIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ChatIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function XIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FarcasterIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M4 7l4 0l2 -4l4 0l2 4l4 0" />
      <path d="M8 21l0 -4a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v4" />
    </svg>
  );
}

function ProductHuntIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.75}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 7h4.5a3.5 3.5 0 0 1 0 7H8V7z" />
      <path d="M8 14v3" />
    </svg>
  );
}

function GitHubIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.6}>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}
