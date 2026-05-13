import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';
const CRM_STAGES = ['BO', 'BORO', 'BORO-SM', 'Backburn'];
const TEAM_MEMBERS = ['Mark', 'Joe', 'Liam', 'Carlo', 'Jake', 'Serena'];
const RESTRICTED = [];
const TEAM_EMOJIS = { Mark: '🦅', Jake: '🐺', Joe: '🦁', Carlo: '🐻', Liam: '🦊', Serena: '🦋' };

// Get/set the claimed identity
function getCrmUser() { return localStorage.getItem('crm_user') || ''; }
function setCrmUser(name) { localStorage.setItem('crm_user', name); }

// Confetti for BORO-SM
function Confetti({ active, onDone }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#14b8a6', '#38bdf8', '#a78bfa', '#f59e0b', '#10b981', '#ec4899', '#6366f1'];
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width, y: canvas.height + 10,
      vx: (Math.random() - 0.5) * 6, vy: -(Math.random() * 12 + 6),
      size: Math.random() * 6 + 3, color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360, rotSpeed: (Math.random() - 0.5) * 10, opacity: 1,
    }));
    let frame = 0;
    const maxFrames = 90;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.vy += 0.25; p.y += p.vy; p.rotation += p.rotSpeed;
        p.opacity = Math.max(0, 1 - frame / maxFrames);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity; ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6); ctx.restore();
      });
      frame++;
      if (frame < maxFrames) requestAnimationFrame(animate);
      else { ctx.clearRect(0, 0, canvas.width, canvas.height); onDone && onDone(); }
    };
    animate();
  }, [active]);
  if (!active) return null;
  return <canvas ref={canvasRef} className="fixed inset-0 z-[200] pointer-events-none" />;
}

// Identity claim widget — used in NavBar area
export function CrmIdentity() {
  const [user, setUser] = useState(getCrmUser());
  const [picking, setPicking] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setPicking(false); };
    if (picking) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [picking]);

  const handlePick = (name) => {
    setCrmUser(name);
    setUser(name);
    setPicking(false);
  };

  if (user) {
    const emoji = TEAM_EMOJIS[user] || '';
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-accent/70">{emoji} {user}</span>
        <button onClick={() => { setCrmUser(''); setUser(''); }} className="text-[8px] text-muted/40 hover:text-rose/65">✕</button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setPicking(!picking)}
        className="text-[9px] px-2 py-1 rounded-md border border-accent/20 text-accent/60 hover:text-accent hover:border-accent/30 font-medium animate-pulse">
        Claim your name
      </button>
      {picking && (
        <div className="absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-1 bg-card border border-accent/20 rounded-lg overflow-hidden shadow-xl" style={{ minWidth: '140px', boxShadow: '0 -8px 30px rgba(0,0,0,0.6)' }}>
          <p className="text-[8px] text-muted/40 uppercase tracking-wider font-bold px-2.5 pt-2 pb-1">Who are you?</p>
          {TEAM_MEMBERS.map(name => (
            <button key={name} onClick={() => handlePick(name)}
              className="w-full text-left text-[11px] px-2.5 py-1.5 border-t border-border/5 font-medium transition-colors text-bright/70 hover:bg-accent/10">
              {TEAM_EMOJIS[name] || ''} {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// CRM Stage button
export function CrmButton({ company }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmSM, setConfirmSM] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const ref = useRef(null);
  const portalDropdownRef = useRef(null);

  const user = getCrmUser();
  const isRestricted = RESTRICTED.includes(user);

  useEffect(() => {
    const handler = (e) => {
      // Close only if click is outside BOTH the trigger button and the portaled dropdown
      const insideButton = ref.current && ref.current.contains(e.target);
      const insideDropdown = portalDropdownRef.current && portalDropdownRef.current.contains(e.target);
      if (!insideButton && !insideDropdown) {
        setOpen(false);
        setConfirmSM(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const addToCRM = async (stage) => {
    setLoading(true);
    setResult(null);
    try {
      const body = {
        company: company.name || company.company || '?',
        stage,
        website: company.website || company.company_link || '',
        twitter: company.socials?.twitter || company.twitter_link || '',
        funding: company.funding_total || company.total_funding || null,
        sector: company.sector || (company.tags || []).slice(0, 3).join(', ') || '',
        source: 'Pigeon Finder',
        notes: company.description ? company.description.slice(0, 200) : '',
        addedBy: user || 'Unknown',
      };
      const r = await fetch(`${API_BASE}/api/airtable/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (data.success) {
        setResult({ stage, action: data.action });
        const history = JSON.parse(localStorage.getItem('crm_history') || '[]');
        history.unshift({ company: body.company, stage, action: data.action, time: Date.now(), addedBy: user || 'Unknown' });
        localStorage.setItem('crm_history', JSON.stringify(history.slice(0, 50)));
        if (stage === 'BORO-SM') setShowConfetti(true);
        if (stage === 'Backburn') {
          const dismissed = JSON.parse(localStorage.getItem('crm_dismissed') || '[]');
          if (!dismissed.includes(body.company.toLowerCase())) {
            dismissed.push(body.company.toLowerCase());
            localStorage.setItem('crm_dismissed', JSON.stringify(dismissed));
          }
        }
        // Notify CRM page to refresh
        window.dispatchEvent(new Event('crm-updated'));
        setTimeout(() => { setOpen(false); setResult(null); setConfirmSM(false); }, 2000);
      } else {
        setResult({ error: data.error || 'Failed' });
      }
    } catch (e) { setResult({ error: e.message }); }
    setLoading(false);
  };

  const handleStageClick = (stage) => {
    if (stage === 'BORO-SM') { setConfirmSM(true); return; }
    addToCRM(stage);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (!user) { alert('Please claim your name first (bottom of the nav bar)'); return; }
    if (isRestricted) { alert(`${user} has view-only access`); return; }
    setOpen(!open); setConfirmSM(false); setResult(null);
  };

  const stageColors = {
    'BO': 'bg-bo/15 text-bo border-bo/25 hover:bg-bo/25',
    'BORO': 'bg-boro/15 text-boro border-boro/25 hover:bg-boro/25',
    'BORO-SM': 'bg-sm/15 text-sm border-sm/25 hover:bg-sm/25',
    'Backburn': 'bg-rose/10 text-rose/60 border-rose/15 hover:bg-rose/20',
  };

  return (
    <div ref={ref} className="relative inline-flex" style={{ zIndex: open ? 90 : 'auto' }}>
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />

      <button onClick={handleClick}
        className={`text-[9px] px-2 py-0.5 rounded-md border transition-all font-medium ${
          result?.stage ? 'bg-sm/12 border-sm/25 text-sm'
          : isRestricted ? 'bg-muted/6 border-muted/10 text-muted/30 cursor-not-allowed'
          : !user ? 'bg-muted/6 border-muted/15 text-muted/40'
          : 'bg-accent/6 border-accent/15 text-accent/60 hover:border-accent/30 hover:text-accent'
        }`}>
        {loading ? (
          <span className="flex items-center gap-1"><span className="w-2 h-2 border border-accent border-t-transparent rounded-full animate-spin" /> Saving...</span>
        ) : result?.stage ? `✓ ${result.stage}` : (
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12.07 1.63L21.3 5.73c.55.24.55.64 0 .89L12.07 10.7c-.37.16-.77.16-1.14 0L1.7 6.62c-.55-.25-.55-.65 0-.89l9.23-4.1c.37-.16.77-.16 1.14 0zM22.3 10.3l-2.07-.92-7.1 3.15c-.37.17-.77.17-1.14 0l-7.1-3.15-2.07.92c-.55.24-.55.64 0 .89l9.23 4.08c.37.17.77.17 1.14 0l9.23-4.08c.55-.25.55-.65 0-.89zm0 4.58l-2.07-.92-7.1 3.15c-.37.17-.77.17-1.14 0l-7.1-3.15-2.07.92c-.55.24-.55.64 0 .89l9.23 4.08c.37.17.77.17 1.14 0l9.23-4.08c.55-.25.55-.65 0-.89z"/></svg>
            CRM
          </span>
        )}
      </button>

      {open && !result?.stage && ref.current && createPortal(
        (() => {
          const rect = ref.current.getBoundingClientRect();
          const menuW = 160;
          const menuH = confirmSM ? 130 : 200;
          const pad = 8;

          // Horizontal: prefer left-align (menu opens to right). If that overflows the
          // viewport right edge, right-align instead (menu's right edge = button's right edge).
          let left;
          if (rect.left + menuW + pad <= window.innerWidth) {
            left = rect.left;
          } else if (rect.right - menuW >= pad) {
            left = rect.right - menuW;
          } else {
            left = Math.max(pad, window.innerWidth - menuW - pad);
          }

          // Vertical: open downward by default; flip up only when there's no room below.
          const fitsBelow = rect.bottom + menuH + pad <= window.innerHeight;
          const fitsAbove = rect.top - menuH - pad >= 0;
          const openUp = !fitsBelow && fitsAbove;
          const positionStyle = openUp
            ? { bottom: window.innerHeight - rect.top + 4, left }
            : { top: rect.bottom + 4, left };

          // Portal to document.body — bypasses any parent transform/filter/will-change
          // that would otherwise break position:fixed coordinate behavior.
          return (
            <div
              ref={portalDropdownRef}
              className="fixed z-[200] bg-card border border-accent/20 rounded-lg overflow-visible shadow-2xl"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.7)', width: '160px', ...positionStyle }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {!confirmSM ? (
                <>
                  <p className="text-[8px] text-muted/40 uppercase tracking-wider font-bold px-2.5 pt-2 pb-1">Add to CRM as {user}</p>
                  {CRM_STAGES.map(stage => (
                    <button key={stage} onClick={(e) => { e.stopPropagation(); handleStageClick(stage); }}
                      className={`w-full text-left text-[11px] px-2.5 py-2 border-t border-border/5 font-medium transition-colors ${stageColors[stage]}`}>
                      {stage === 'BORO-SM' ? '🏆 ' : ''}{stage}
                    </button>
                  ))}
                  {result?.error && <p className="text-rose/60 text-[9px] px-2.5 py-1">{result.error}</p>}
                </>
              ) : (
                <div className="p-3 space-y-2">
                  <p className="text-[11px] text-bright font-medium text-center">Add to <span className="text-sm font-bold">BORO-SM</span>?</p>
                  <p className="text-[9px] text-muted/50 text-center">Highest conviction bucket</p>
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setConfirmSM(false); }}
                      className="flex-1 text-[10px] py-1.5 rounded-md border border-border/20 text-muted/50 hover:text-bright hover:border-border/40">Cancel</button>
                    <button onClick={(e) => { e.stopPropagation(); addToCRM('BORO-SM'); }}
                      className="flex-1 text-[10px] py-1.5 rounded-md bg-sm/20 border border-sm/30 text-sm hover:bg-sm/30 font-bold">🏆 Confirm</button>
                  </div>
                </div>
              )}
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
}

// History panel
export function CrmHistory() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentCompanies, setRecentCompanies] = useState([]);
  const [airtableData, setAirtableData] = useState({ bo: 0, boro: 0, borosm: 0 });
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [boR, boroR, smR] = await Promise.all([
        fetch(`${API_BASE}/api/airtable/companies?stage=BO&limit=200`).then(r => r.json()),
        fetch(`${API_BASE}/api/airtable/companies?stage=BORO&limit=200`).then(r => r.json()),
        fetch(`${API_BASE}/api/airtable/companies?stage=BORO-SM&limit=200`).then(r => r.json()),
      ]);
      setAirtableData({ bo: boR.total || 0, boro: boroR.total || 0, borosm: smR.total || 0 });

      // Combine all companies, tag with stage
      const all = [
        ...(boR.companies || []).map(c => ({ ...c, _stage: 'BO' })),
        ...(boroR.companies || []).map(c => ({ ...c, _stage: 'BORO' })),
        ...(smR.companies || []).map(c => ({ ...c, _stage: 'BORO-SM' })),
      ];

      // Filter to last 30 days using last stage modification time
      const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const recent = all.filter(c => {
        if (!c.created_time) return false;
        return new Date(c.created_time).getTime() >= cutoff;
      });

      // Sort most recently modified first
      recent.sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime());

      // Optionally enrich with local crm_history for "added by" info
      const localHistory = JSON.parse(localStorage.getItem('crm_history') || '[]');
      const historyMap = {};
      for (const h of localHistory) {
        const key = (h.company || '').toLowerCase().trim();
        if (!historyMap[key] || h.time > historyMap[key].time) historyMap[key] = h;
      }
      for (const c of recent) {
        const local = historyMap[(c.company || '').toLowerCase().trim()];
        c.addedBy = local?.addedBy || null;
      }

      setRecentCompanies(recent);
    } catch (e) {
      console.error('[CrmHistory] Load error:', e);
    }
    setLoading(false);
  };

  const handleOpen = () => { setOpen(!open); if (!open) loadData(); };

  const timeSince = (iso) => {
    if (!iso) return '';
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  // Parse vote array into in/out lists
  const parseVotes = (votes) => {
    const arr = Array.isArray(votes) ? votes : (typeof votes === 'string' && votes ? [votes] : []);
    const inVotes = [];
    const outVotes = [];
    for (const v of arr) {
      if (typeof v !== 'string') continue;
      const parts = v.split(':');
      const name = parts[0].trim();
      const vote = (parts[1] || '').trim().toUpperCase();
      if (vote.includes('IN')) inVotes.push(name);
      else if (vote.includes('OUT')) outVotes.push(name);
    }
    return { inVotes, outVotes };
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={handleOpen}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-[10px] font-medium ${
          open ? 'bg-accent/10 border-accent/25 text-accent' : 'border-border/15 text-muted/40 hover:text-accent hover:border-accent/20'
        }`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.07 1.63L21.3 5.73c.55.24.55.64 0 .89L12.07 10.7c-.37.16-.77.16-1.14 0L1.7 6.62c-.55-.25-.55-.65 0-.89l9.23-4.1c.37-.16.77-.16 1.14 0zM22.3 10.3l-2.07-.92-7.1 3.15c-.37.17-.77.17-1.14 0l-7.1-3.15-2.07.92c-.55.24-.55.64 0 .89l9.23 4.08c.37.17.77.17 1.14 0l9.23-4.08c.55-.25.55-.65 0-.89zm0 4.58l-2.07-.92-7.1 3.15c-.37.17-.77.17-1.14 0l-7.1-3.15-2.07.92c-.55.24-.55.64 0 .89l9.23 4.08c.37.17.77.17 1.14 0l9.23-4.08c.55-.25.55-.65 0-.89z"/></svg>
        CRM
      </button>

      {open && (
        <div className="absolute z-[90] top-full right-0 mt-1 w-[320px] bg-card border border-accent/20 rounded-xl overflow-hidden"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {/* Pipeline counts */}
          <div className="px-3 pt-3 pb-2 border-b border-border/5">
            <p className="text-[9px] text-muted/40 uppercase tracking-wider font-bold mb-2">Pipeline</p>
            <div className="flex gap-2">
              <div className="flex-1 text-center px-2 py-1.5 rounded-md bg-bo/8 border border-bo/15">
                <p className="text-lg font-bold text-bo">{airtableData.bo}</p>
                <p className="text-[8px] text-bo/65 font-medium">BO</p>
              </div>
              <div className="flex-1 text-center px-2 py-1.5 rounded-md bg-boro/8 border border-boro/15">
                <p className="text-lg font-bold text-boro">{airtableData.boro}</p>
                <p className="text-[8px] text-boro/50 font-medium">BORO</p>
              </div>
              <div className="flex-1 text-center px-2 py-1.5 rounded-md bg-sm/8 border border-sm/15">
                <p className="text-lg font-bold text-sm">{airtableData.borosm}</p>
                <p className="text-[8px] text-sm/50 font-medium">🏆 SM</p>
              </div>
            </div>
          </div>

          {/* Recently added (72h) */}
          <div className="px-3 pt-2 pb-1 flex items-center justify-between">
            <p className="text-[9px] text-muted/40 uppercase tracking-wider font-bold">
              Recent activity (30d) {recentCompanies.length > 0 && <span className="text-accent/60">({recentCompanies.length})</span>}
            </p>
            {loading && <span className="text-[9px] text-accent/50 animate-pulse">loading…</span>}
            {!loading && <button onClick={loadData} className="text-[9px] text-muted/30 hover:text-accent/60">↻</button>}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {recentCompanies.length === 0 && !loading ? (
              <p className="text-muted/40 text-[10px] text-center py-4">No activity in the last 30 days</p>
            ) : (
              recentCompanies.map((c, i) => {
                const { inVotes, outVotes } = parseVotes(c.in_or_out);
                const hasVotes = inVotes.length > 0 || outVotes.length > 0;
                return (
                  <div key={`${c.company}-${i}`} className="px-3 py-2 border-t border-border/3 hover:bg-surface/[0.02]">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                        c._stage === 'BO' ? 'bg-bo/15 text-bo' :
                        c._stage === 'BORO' ? 'bg-boro/15 text-boro' :
                        'bg-sm/15 text-sm'
                      }`}>{c._stage === 'BORO-SM' ? '🏆' : c._stage}</span>
                      <span className="text-[11px] text-bright/80 truncate flex-1 font-medium">{c.company}</span>
                      <span className="text-[8px] text-bright/25 flex-shrink-0">{timeSince(c.created_time)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 ml-0.5">
                      {c.addedBy && <span className="text-[8px] text-accent/50 font-medium">by {c.addedBy}</span>}
                      {hasVotes && c.addedBy && <span className="text-[7px] text-muted/20">·</span>}
                      {inVotes.map(name => (
                        <span key={name} className="text-[8px] px-1.5 py-0.5 rounded-full bg-sm text-bright font-bold">{name}✓</span>
                      ))}
                      {outVotes.map(name => (
                        <span key={name} className="text-[8px] px-1.5 py-0.5 rounded-full bg-rose/80 text-bright font-bold">{name}✗</span>
                      ))}
                      {!hasVotes && !c.addedBy && <span className="text-[8px] text-muted/25 italic">No votes yet</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Check if a company was backburned by this user
export function isDismissed(companyName) {
  if (!companyName) return false;
  const dismissed = JSON.parse(localStorage.getItem("crm_dismissed") || "[]");
  return dismissed.includes(companyName.toLowerCase());
}
