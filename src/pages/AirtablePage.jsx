import React, { useState, useEffect, useRef } from 'react';
import FindSimilar from '../components/FindSimilar';

const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';

function parseReachoutDate(raw) {
  const cleaned = raw.replace(/[\[\]()]/g, '').replace(/.*·\s*/, '').replace(' EST', '').trim();
  // Handle M/D without year — assume current year
  const shortMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (shortMatch) {
    const d = new Date(new Date().getFullYear(), parseInt(shortMatch[1]) - 1, parseInt(shortMatch[2]));
    return isNaN(d.getTime()) ? null : d;
  }
  // Handle M/D/YY or M/D/YYYY
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

function getLastReachoutDate(notes) {
  if (!notes) return null;
  let latest = null;
  // Match (M/D/YYYY), (M/D/YY), (M/D), and [Author · Date] formats
  const matches = notes.match(/\(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\)|\[.*?·\s*([A-Za-z]+ \d+,?\s*\d{4}.*?)\]/g) || [];
  for (const m of matches) {
    const d = parseReachoutDate(m);
    if (d && (!latest || d > latest)) latest = d;
  }
  return latest;
}

function WebGrowthBadge({ traction, harmonicId }) {
  const t = traction || {};
  const g30 = t.webGrowth30d;
  const g90 = t.webGrowth90d;
  const harmonicUrl = harmonicId ? `https://console.harmonic.ai/dashboard/company/${harmonicId}?selectedTab=TRACTION` : null;
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
    <a key={i} href={b.url} target="_blank" rel="noopener" className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border hover:opacity-80 ${b.color}`} title={`${b.period} web traffic`}>{b.label} <span className="text-[7px] opacity-60">{b.period}</span></a>
  ) : (
    <span key={i} className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border ${b.color}`}>{b.label} <span className="text-[7px] opacity-60">{b.period}</span></span>
  ));
}

// Map identity names to Airtable multi-select option names
const VOTER_MAP = { 'Joe': 'Joe C', 'Mark': 'Mark', 'Carlo': 'Carlo', 'Jake': 'Jake', 'Liam': 'Liam' };
const getAirtableVoter = (user) => VOTER_MAP[user] || user;

function moneyFmt(n) {
  if (!n) return null;
  if (typeof n === 'number') {
    if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`;
    if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
    return `$${n}`;
  }
  if (typeof n === 'string') {
    // Extract dollar amount from text like "Funding Summary\nLast Round...\nSeed $3.1M..."
    const match = n.match(/\$[\d,.]+[BMKbmk]?/);
    if (match) return match[0];
    // If it's a clean short value, return it
    if (n.length < 15 && n.includes('$')) return n;
    // Otherwise just show first line truncated
    const firstLine = n.split('\n')[0].trim();
    return firstLine.length > 12 ? firstLine.slice(0, 12) + '…' : firstLine;
  }
  return null;
}

function StageBadge({ stage }) {
  const colors = {
    'Website Applications': 'bg-bright/10 text-bright/60 border-bright/20',
    'Warm': 'bg-amber/15 text-amber border-amber/25',
    'BO': 'bg-bo/12 text-bo border-bo/28',
    'BORO': 'bg-boro/12 text-boro border-boro/28',
    'BORO-SM': 'bg-sm/12 text-sm border-sm/28',
    'Backburn': 'bg-rose/15 text-rose/70 border-rose/20',
  };
  const label = stage === 'BORO-SM' ? '🏆SM' : stage || '—';
  return (
    <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full border font-bold whitespace-nowrap ${colors[stage] || 'bg-muted/10 text-muted border-muted/20'}`}>
      {label}
    </span>
  );
}

export default function AirtablePage() {
  const [authed, setAuthed] = useState(() => localStorage.getItem('crm_authed') === 'true');
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeStage, setActiveStage] = useState('BO');
  const [enriching, setEnriching] = useState(null);
  const [enrichPreview, setEnrichPreview] = useState(null);
  const [enrichCommitting, setEnrichCommitting] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null); // { message, type: 'info'|'error'|'success' }

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };
  const [lastRefresh, setLastRefresh] = useState(null);
  const [twitterActivity, setTwitterActivity] = useState({}); // { companyName: { status, last_tweet_date, days_since } }
  const [twitterChecking, setTwitterChecking] = useState(false);
  const [votingOn, setVotingOn] = useState(null);
  const [expandedNote, setExpandedNote] = useState(null);
  const [noteModal, setNoteModal] = useState(null); // { company, existing }
  const [noteText, setNoteText] = useState('');
  const [reachoutModal, setReachoutModal] = useState(null); // { company, notes, loading }
  const [serenaMissing, setSerenaMissing] = useState(null); // { sm: [], boro: [] }
  const [serenaDismissed, setSerenaDismissed] = useState(false);
  const [savingNote, setSavingNote] = useState(false); // "company-IN" or "company-OUT"
  const crmUser = typeof window !== 'undefined' ? localStorage.getItem('crm_user') || '' : '';

  const handleVote = async (company, vote) => {
    if (!crmUser) { showToast('Claim your identity first', 'error'); return; }
    setVotingOn(`${company.company}-${vote}`);
    try {
      const r = await fetch(`${API_BASE}/api/airtable/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.company, voter: crmUser, vote }),
      });
      const data = await r.json();
      if (data.success) {
        showToast(`Voted ${vote} on ${company.company}`, 'success');
        // Remove from pending votes immediately
        setPendingVotes(prev => prev.filter(c => c.company !== company.company));
        silentRefresh();
      } else {
        showToast(`Vote failed: ${data.error}`, 'error');
      }
    } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
    setVotingOn(null);
  };

  // Undo vote — remove current user's vote
  const handleUndoVote = async (company) => {
    if (!crmUser) return;
    setVotingOn(`${company.company}-UNDO`);
    try {
      // Find existing vote to determine what to remove
      const votes = Array.isArray(company.in_or_out) ? company.in_or_out : [];
      const myVote = votes.find(v => typeof v === 'string' && v.toLowerCase().startsWith(`${getAirtableVoter(crmUser).toLowerCase()}:`));
      if (!myVote) { setVotingOn(null); return; }

      // Remove by voting the opposite then removing both — or use a direct PATCH
      const formula = encodeURIComponent(`{Company} = "${company.company.replace(/"/g, '\\"')}"`);
      const findRes = await fetch(`${API_BASE}/api/airtable/companies?stage=${activeStage}&limit=200`);
      // Simpler: just call vote endpoint to toggle
      const currentIsIn = myVote.toUpperCase().includes('IN');
      // We need a remove-vote endpoint, but we can fake it by setting votes without this user
      const newVotes = votes.filter(v => !(typeof v === 'string' && v.toLowerCase().startsWith(`${getAirtableVoter(crmUser).toLowerCase()}:`)));

      const findR = await fetch(`${API_BASE}/api/airtable/companies?stage=${encodeURIComponent(company.crm_stage)}&limit=200`);
      const findData = await findR.json();
      const rec = (findData.companies || []).find(c => c.company === company.company);
      if (rec?.airtable_id) {
        const patchR = await fetch(`${API_BASE}/api/airtable/update-field`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ airtable_id: rec.airtable_id, field: 'IN or OUT', value: newVotes }),
        });
        const patchData = await patchR.json();
        if (patchData.success || patchR.ok) {
          showToast(`Removed your vote on ${company.company}`, 'info');
          // Add back to pending votes
          setPendingVotes(prev => [...prev, company]);
          silentRefresh();
        }
      }
    } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
    setVotingOn(null);
  };

  const handleSaveNote = async () => {
    if (!noteModal || !noteText.trim()) return;
    setSavingNote(true);
    try {
      const r = await fetch(`${API_BASE}/api/airtable/save-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: noteModal.company, author: crmUser, note: noteText.trim() }),
      });
      const data = await r.json();
      if (data.success) {
        showToast('Note saved', 'success');
        silentRefresh();
      } else {
        showToast(`Failed: ${data.error}`, 'error');
      }
    } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
    setSavingNote(false);
    setNoteModal(null);
    setNoteText('');
  };

  const checkTwitterActivity = async () => {
    const withTwitter = companies.filter(c => c.twitter_link);
    if (withTwitter.length === 0) { showToast('No companies with Twitter links', 'info'); return; }
    setTwitterChecking(true);
    showToast(`Checking ${withTwitter.length} Twitter accounts...`, 'info');
    try {
      const r = await fetch(`${API_BASE}/api/twitter/check-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: withTwitter.map(c => ({ name: c.company, twitter_url: c.twitter_link })) }),
      });
      const data = await r.json();
      console.log('[Twitter Activity Response]', data);
      if (data.error) {
        showToast(`Twitter: ${data.error}`, 'error');
      } else {
        const results = data.results || {};
        const count = Object.keys(results).length;
        setTwitterActivity(prev => ({ ...prev, ...results }));
        if (count > 0) {
          const inactive = Object.values(results).filter(r => r.days_since > 10).length;
          showToast(`Checked ${count} accounts${inactive > 0 ? ` — ${inactive} inactive!` : ' — all active'}`, inactive > 0 ? 'error' : 'success');
        } else {
          showToast('No Twitter data returned — check Railway logs', 'info');
        }
      }
    } catch (e) {
      console.error('Twitter activity error:', e);
      showToast(`Twitter check failed: ${e.message}`, 'error');
    }
    setTwitterChecking(false);
  };

  const stages = ['BO', 'BORO', 'BORO-SM', 'Website Applications', 'Warm'];
  const stageLabels = { 'BO': 'BO', 'BORO': 'BORO', 'BORO-SM': '🏆 SM', 'Website Applications': 'Applications', 'Warm': 'Warm' };
  const [allReachouts, setAllReachouts] = useState([]);

  const fetchCompanies = async (stage, silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (stage === 'Reachouts') {
        // Fetch all 3 pipeline stages and combine companies with reachout notes
        const [bo, boro, sm] = await Promise.all([
          fetch(`${API_BASE}/api/airtable/companies?stage=BO&limit=200`).then(r => r.json()),
          fetch(`${API_BASE}/api/airtable/companies?stage=BORO&limit=200`).then(r => r.json()),
          fetch(`${API_BASE}/api/airtable/companies?stage=BORO-SM&limit=200`).then(r => r.json()),
        ]);
        const all = [...(bo.companies||[]), ...(boro.companies||[]), ...(sm.companies||[])].filter(c => c.company && c.company.trim());
        // Store all BORO/SM for missing reachouts calculation
        setAllReachouts(all.filter(c => c.crm_stage === 'BORO' || c.crm_stage === 'BORO-SM'));
        const withNotes = all.filter(c => c.reachout_notes && c.reachout_notes.trim());
        // Sort: entries with actual dates first (newest up), legacy/no-date at bottom
        withNotes.sort((a, b) => {
          const dateA = (getLastReachoutDate(a.reachout_notes) || new Date(0)).getTime();
          const dateB = (getLastReachoutDate(b.reachout_notes) || new Date(0)).getTime();
          // Both have dates: sort newest first
          if (dateA > 0 && dateB > 0) return dateB - dateA;
          // One has date, other doesn't: dated first
          if (dateA > 0 && dateB <= 0) return -1;
          if (dateB > 0 && dateA <= 0) return 1;
          // Neither has dates: sort by created_time
          const ctA = a.created_time ? new Date(a.created_time).getTime() : 0;
          const ctB = b.created_time ? new Date(b.created_time).getTime() : 0;
          return ctB - ctA;
        });
        setAllReachouts(withNotes);
        setCompanies(withNotes);
      } else {
        const url = `${API_BASE}/api/airtable/companies?limit=200${stage ? `&stage=${encodeURIComponent(stage)}` : ''}`;
        const r = await fetch(url);
        const data = await r.json();
        setCompanies((data.companies || []).filter(c => c.company && c.company.trim()));
      }
      setLastRefresh(new Date());
    } catch (e) { console.error('Airtable fetch error:', e); }
    if (!silent) setLoading(false);
  };

  // Silent refresh helper — no loading spinner
  const silentRefresh = () => fetchCompanies(activeStage, true);

  useEffect(() => { fetchCompanies(activeStage); }, [activeStage]);

  // Serena notification: fetch missing reachouts on CRM load
  useEffect(() => {
    const identity = (localStorage.getItem('crm_identity') || '').toLowerCase();
    if (identity !== 'serena') return;
    const fetchMissing = async () => {
      try {
        const [boro, sm] = await Promise.all([
          fetch(`${API_BASE}/api/airtable/companies?stage=BORO&limit=200`).then(r => r.json()),
          fetch(`${API_BASE}/api/airtable/companies?stage=BORO-SM&limit=200`).then(r => r.json()),
        ]);
        const now = Date.now();
        const ONE_WEEK = 7 * 86400000;
        const ONE_MONTH = 30 * 86400000;
        const missingSM = (sm.companies||[]).filter(c => { const d = getLastReachoutDate(c.reachout_notes); return !d || now - d.getTime() > ONE_WEEK; });
        const missingBORO = (boro.companies||[]).filter(c => { const d = getLastReachoutDate(c.reachout_notes); return !d || now - d.getTime() > ONE_MONTH; });
        if (missingSM.length > 0 || missingBORO.length > 0) {
          setSerenaMissing({ sm: missingSM.map(c => c.company), boro: missingBORO.map(c => c.company) });
        }
      } catch(e) {}
    };
    fetchMissing();
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchCompanies(activeStage, true), 60000);
    return () => clearInterval(interval);
  }, [activeStage]);

  // Listen for CRM additions from CrmButton (custom event)
  useEffect(() => {
    const handler = () => fetchCompanies(activeStage, true);
    window.addEventListener('crm-updated', handler);
    return () => window.removeEventListener('crm-updated', handler);
  }, [activeStage]);

  // Pending votes — companies in BORO/BORO-SM where current user hasn't voted
  const isRestricted = ['Dean', 'Brett'].includes(crmUser);
  const noVotePrompt = ['Dean', 'Brett', 'Serena'].includes(crmUser);
  const [pendingVotes, setPendingVotes] = useState([]);

  useEffect(() => {
    if (!crmUser || noVotePrompt) { setPendingVotes([]); return; }
    const fetchPending = async () => {
      try {
        const [boR, boroR, smR] = await Promise.all([
          fetch(`${API_BASE}/api/airtable/companies?stage=BO&limit=200`).then(r => r.json()),
          fetch(`${API_BASE}/api/airtable/companies?stage=BORO&limit=200`).then(r => r.json()),
          fetch(`${API_BASE}/api/airtable/companies?stage=BORO-SM&limit=200`).then(r => r.json()),
        ]);
        const all = [...(boR.companies || []), ...(boroR.companies || []), ...(smR.companies || [])].filter(c => c.company);
        const pending = all.filter(c => {
          const votes = Array.isArray(c.in_or_out) ? c.in_or_out : (c.in_or_out ? [c.in_or_out] : []);
          const userVoted = votes.some(v => typeof v === 'string' && v.toLowerCase().startsWith(`${getAirtableVoter(crmUser).toLowerCase()}:`));
          return !userVoted;
        });
        setPendingVotes(pending);
      } catch (e) {}
    };
    fetchPending();
    const interval = setInterval(fetchPending, 60000);
    return () => clearInterval(interval);
  }, [crmUser]);

  // Step 1: Preview — fetch Harmonic data without writing
  const handleEnrich = async (company) => {
    setEnriching(company.company);
    try {
      const r = await fetch(`${API_BASE}/api/airtable/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.company, airtable_id: company.airtable_id, website: company.company_link, twitter: company.twitter_link, preview: true }),
      });
      const data = await r.json();
      if (data.success && data.updates && Object.keys(data.updates).length > 0) {
        setEnrichPreview({ ...data, airtable_id: company.airtable_id, original: company });
      } else if (data.error) {
        showToast(`Enrich failed: ${data.error}`, 'error');
      } else {
        showToast('No new data found in Harmonic for this company', 'info');
      }
    } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
    setEnriching(null);
  };

  // Step 2: Commit — write to Airtable after user confirms
  const handleEnrichCommit = async () => {
    if (!enrichPreview) return;
    setEnrichCommitting(true);
    try {
      // Use direct write endpoint with exact preview data
      const r = await fetch(`${API_BASE}/api/airtable/write-enrichment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: enrichPreview.company,
          airtable_id: enrichPreview.airtable_id,
          updates: enrichPreview.updates,
        }),
      });
      const data = await r.json();
      console.log('[Enrich commit response]', data);
      if (data.success && !data.partial) {
        // Remove lightning bolt for this company
        setEnrichAvailable(prev => { const next = { ...prev }; delete next[enrichPreview.company]; return next; });
        silentRefresh();
      } else if (data.success && data.partial) {
        setEnrichAvailable(prev => { const next = { ...prev }; delete next[enrichPreview.company]; return next; });
        showToast(`Wrote: ${data.succeeded?.join(', ')}. Failed: ${data.failed?.length || 0}`, 'info');
        silentRefresh();
      } else {
        showToast(`Write failed: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
    setEnrichCommitting(false);
    setEnrichPreview(null);
  };

  // Change CRM stage for a company
  const [changingStage, setChangingStage] = useState(null); // company name
  const handleStageChange = async (company, newStage) => {
    setChangingStage(company.company);
    try {
      const r = await fetch(`${API_BASE}/api/airtable/update-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.company, stage: newStage }),
      });
      const data = await r.json();
      if (data.success) {
        silentRefresh();
      } else {
        showToast(`Failed: ${data.error || 'Unknown'}`, 'error');
      }
    } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
    setChangingStage(null);
  };

  const [enrichAvailable, setEnrichAvailable] = useState({}); // { companyName: true }
  const [bulkScanning, setBulkScanning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');
  const [fundingData, setFundingData] = useState({}); // { companyName: { funding_total, last_round, ... } }
  const [fundingLoading, setFundingLoading] = useState(false);

  // Auto-fetch funding from Harmonic — cached per session
  const fetchFunding = async (companyList) => {
    if (!companyList || companyList.length === 0) return;
    setFundingLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/harmonic/batch-funding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companies: companyList.map(c => ({ name: c.company, website: c.company_link || '', twitter: c.twitter_link || '' })) }),
      });
      if (r.ok) {
        const data = await r.json();
        const results = data.results || {};
        setFundingData(prev => ({ ...prev, ...results }));
      }
    } catch (e) {}
    setFundingLoading(false);
  };

  // Clear any stale funding caches from previous versions
  useEffect(() => {
    try { Object.keys(sessionStorage).filter(k => k.startsWith('funding_')).forEach(k => sessionStorage.removeItem(k)); } catch(e) {}
  }, []);

  useEffect(() => {
    if (companies.length > 0) {
      fetchFunding(companies);
      // Auto-check Twitter activity for companies with Twitter links
      const withTwitter = companies.filter(c => c.twitter_link);
      if (withTwitter.length > 0 && Object.keys(twitterActivity).length === 0) {
        checkTwitterActivity();
      }
    }
  }, [activeStage, companies.length]);

  const handleBulkScan = async () => {
    setBulkScanning(true);
    const toCheck = companies.filter(c => !c.total_funding && !c.cb_link && c.company);
    setBulkProgress(`Checking 0/${toCheck.length}...`);
    const available = {};
    for (let i = 0; i < toCheck.length && i < 30; i++) {
      const c = toCheck[i];
      setBulkProgress(`Checking ${i + 1}/${Math.min(toCheck.length, 30)}: ${c.company.slice(0, 15)}...`);
      try {
        const r = await fetch(`${API_BASE}/api/airtable/enrich`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company: c.company, website: c.company_link, twitter: c.twitter_link, preview: true }),
        });
        const data = await r.json();
        if (data.success && data.updates && Object.keys(data.updates).length > 0) {
          available[c.company] = Object.keys(data.updates).length;
        }
      } catch (e) {}
      await new Promise(r => setTimeout(r, 300));
    }
    setEnrichAvailable(available);
    setBulkScanning(false);
    setBulkProgress('');
    const count = Object.keys(available).length;
    if (count > 0) {
      showToast(`Found Harmonic data for ${count} companies — look for ⚡ icons`, 'success');
    } else {
      showToast('No new enrichment data found', 'info');
    }
  };

  // Human-readable field names
  const fieldLabels = {
    'Total Funding': '💰 Total Funding',
    'Company Link': '🌐 Website',
    'Twitter Link': '𝕏 Twitter',
    'CB Link': '📊 Crunchbase',
    'Original Notes + Ongoing Negotiation Notes': '📝 Notes/Description',
    'Sector': '📂 Sector',
  };

  const filtered = search
    ? companies.filter(c => (c.company || '').toLowerCase().includes(search.toLowerCase()))
    : companies;

  const stageCounts = {};
  companies.forEach(c => { stageCounts[c.crm_stage] = (stageCounts[c.crm_stage] || 0) + 1; });

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-32 text-center">
        <h2 className="text-xl font-bold text-bright mb-1">CRM Access</h2>
        <p className="text-[11px] text-muted/50 mb-6">Enter password to continue</p>
        <div className="flex gap-2">
          <input
            type="password"
            value={pwInput}
            onChange={e => { setPwInput(e.target.value); setPwError(false); }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (pwInput === 'daxos2027') { localStorage.setItem('crm_authed', 'true'); setAuthed(true); }
                else setPwError(true);
              }
            }}
            placeholder="Password"
            className="flex-1 input-base"
            autoFocus
          />
          <button
            onClick={() => {
              if (pwInput === 'daxos2027') { localStorage.setItem('crm_authed', 'true'); setAuthed(true); }
              else setPwError(true);
            }}
            className="btn-primary text-sm">
            Enter
          </button>
        </div>
        {pwError && <p className="text-rose text-[11px] mt-2">Incorrect password</p>}
      </div>
    );
  }

  return (
    <div className="px-5 pt-5 pb-28 max-w-[1080px] mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-serif text-lg font-semibold text-bright">Airtable CRM</h1>
          <p className="font-mono text-[10px] text-muted/40">
            {companies.length} companies
            {lastRefresh && <span className="ml-1.5 text-bright/50">· {lastRefresh.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={handleBulkScan} disabled={bulkScanning || !!enriching}
            className="text-[9px] px-2.5 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 font-medium disabled:opacity-30">
            {bulkScanning ? bulkProgress : `🔍 Enrich scan`}
          </button>
          <button onClick={checkTwitterActivity} disabled={twitterChecking}
            className="text-[9px] px-2.5 py-1.5 rounded-lg bg-bo/10 border border-bo/20 text-bo hover:bg-bo/20 font-medium disabled:opacity-30">
            {twitterChecking ? '𝕏 Checking...' : '𝕏 Activity'}
          </button>
          {Object.keys(enrichAvailable).length > 0 && (
            <span className="text-[9px] text-amber-400 font-bold">{Object.keys(enrichAvailable).length} ⚡</span>
          )}
          <button onClick={() => setActiveStage('Reachouts')}
            className={`text-[9px] px-2.5 py-1.5 rounded-lg font-medium ${activeStage === 'Reachouts' ? 'bg-accent/20 border border-accent/30 text-accent' : 'bg-accent/10 border border-accent/20 text-accent/70 hover:bg-accent/20'}`}>
            📞 Reachout History
          </button>
          <button onClick={() => fetchCompanies(activeStage)}
            className="text-[9px] px-2 py-1.5 rounded-lg border border-border/20 text-muted/40 hover:text-bright">↻</button>
        </div>
      </div>

      {/* Stage tabs */}
      <div className="flex gap-2 mb-3">
        {stages.map(s => {
          const tabColors = {
            'BO': { active: 'bg-bo/15 text-bo border border-bo/30', inactive: 'text-bo/40 hover:text-bo/70' },
            'BORO': { active: 'bg-boro/15 text-boro border border-boro/30', inactive: 'text-boro/40 hover:text-boro/70' },
            'BORO-SM': { active: 'bg-sm/15 text-sm border border-sm/30', inactive: 'text-sm/40 hover:text-sm/70' },
            'Website Applications': { active: 'bg-bright/10 text-bright border border-bright/15', inactive: 'text-bright/30 hover:text-bright/50' },
            'Warm': { active: 'bg-amber/20 text-amber border border-amber/35', inactive: 'text-amber/35 hover:text-amber/60' },
          };
          const tc = tabColors[s] || tabColors['Website Applications'];
          return (
          <button key={s} onClick={() => setActiveStage(s)}
            className={`text-[11px] px-5 py-2 rounded-full font-bold transition-all whitespace-nowrap ${
              s === 'Website Applications' ? 'ml-auto' : ''
            } ${
              activeStage === s ? tc.active
              : `${tc.inactive} border border-transparent`
            }`}>
            {stageLabels[s]}
            <span className="ml-1 opacity-50">{stageCounts[s] || ''}</span>
          </button>
        );})}
      </div>

      {/* Pending votes notification */}
      {crmUser && !noVotePrompt && pendingVotes.length > 0 && (() => {
        const pendBO = pendingVotes.filter(c => c.crm_stage === 'BO');
        const pendBORO = pendingVotes.filter(c => c.crm_stage === 'BORO');
        const pendSM = pendingVotes.filter(c => c.crm_stage === 'BORO-SM');
        return (
          <div className="mb-2 px-3 py-2.5 bg-accent/8 border border-accent/20 rounded-[14px]">
            <p className="text-[11px] text-accent/80 font-medium mb-2">
              🗳️ {crmUser}, <span className="text-accent font-bold">{pendingVotes.length}</span> awaiting your vote
            </p>
            <div className="flex gap-3">
              {pendBO.length > 0 && (
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-[7px] text-bo/55 font-bold uppercase tracking-wider">BO</span>
                  <div className="flex gap-1 mt-0.5 flex-wrap">
                    {pendBO.map((c, i) => (
                      <button key={i} onClick={() => { setActiveStage('BO'); setSearch(c.company); }}
                        className="text-[8px] px-1.5 py-0.5 rounded bg-bo/8 border border-bo/10 text-bo/65 hover:text-bo transition-colors">
                        {c.company}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {pendBORO.length > 0 && (
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-[8px] text-boro/70 font-bold uppercase tracking-wider">BORO</span>
                  <div className="flex gap-1 mt-0.5 flex-wrap">
                    {pendBORO.map((c, i) => (
                      <button key={i} onClick={() => { setActiveStage('BORO'); setSearch(c.company); }}
                        className="text-[9px] px-2 py-0.5 rounded-md bg-boro/10 border border-boro/20 text-boro/80 hover:text-boro transition-colors font-medium">
                        {c.company}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {pendSM.length > 0 && (
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-[9px] text-sm font-bold uppercase tracking-wider">🏆 SM</span>
                  <div className="flex gap-1 mt-0.5 flex-wrap">
                    {pendSM.map((c, i) => (
                      <button key={i} onClick={() => { setActiveStage('BORO-SM'); setSearch(c.company); }}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-sm/15 border border-sm/30 text-sm hover:text-sm/80 transition-colors font-bold">
                        {c.company}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Serena notification — missing reachouts */}
      {serenaMissing && !serenaDismissed && (
        <div className="mb-2 p-3 bg-rose/8 border border-red-400/20 rounded-xl relative">
          <button onClick={() => setSerenaDismissed(true)} className="absolute top-2 right-2 text-muted/30 hover:text-muted/60 text-sm">×</button>
          <p className="text-[11px] text-rose/80 font-bold mb-2">📞 Serena — Reachout reminders</p>
          {serenaMissing.sm.length > 0 && (
            <div className="mb-1.5">
              <p className="text-[9px] text-sm/70 font-bold uppercase tracking-wider">🏆 SM — Not reached in 1+ week ({serenaMissing.sm.length})</p>
              <p className="text-[10px] text-bright/50 mt-0.5">{serenaMissing.sm.join(' · ')}</p>
            </div>
          )}
          {serenaMissing.boro.length > 0 && (
            <div>
              <p className="text-[9px] text-boro/70 font-bold uppercase tracking-wider">BORO — Not reached in 1+ month ({serenaMissing.boro.length})</p>
              <p className="text-[10px] text-bright/50 mt-0.5">{serenaMissing.boro.join(' · ')}</p>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Filter…"
        className="input-base text-xs mb-3" />

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeStage === 'Reachouts' ? (
        <div>
          {/* Missing reachouts — BORO-SM: 2 weeks, BORO: 1 month */}
          {(() => {
            const now = Date.now();
            const ONE_WEEK = 7 * 86400000;
            const ONE_MONTH = 30 * 86400000;
            const allBoroSmCompanies = allReachouts || [];

            // Uses shared getLastReachoutDate() from top of file

            const missingSM = [];
            const missingBORO = [];
            allBoroSmCompanies.forEach(c => {
              const lastDate = getLastReachoutDate(c.reachout_notes);
              const elapsed = lastDate ? now - lastDate.getTime() : Infinity;
              if (c.crm_stage === 'BORO-SM' && elapsed > ONE_WEEK) missingSM.push(c);
              else if (c.crm_stage === 'BORO' && elapsed > ONE_MONTH) missingBORO.push(c);
            });

            if (missingSM.length === 0 && missingBORO.length === 0) return null;
            return (
              <div className="mb-3 space-y-2">
                {missingSM.length > 0 && (
                  <div className="p-2.5 bg-rose/5 border border-red-400/15 rounded-xl">
                    <p className="text-[9px] text-rose/70 font-bold uppercase tracking-wider mb-1.5">⚠ 🏆 SM — No reachout in 1+ week ({missingSM.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {missingSM.map((c, i) => (
                        <button key={i} onClick={() => setReachoutModal({ company: c.company, stage: c.crm_stage, notes: c.reachout_notes || '', loading: false })}
                          className="text-[9px] px-2 py-0.5 rounded-full border border-sm/20 text-sm/70 hover:bg-surface/30">
                          {c.company}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {missingBORO.length > 0 && (
                  <div className="p-2.5 bg-amber-500/5 border border-amber-400/15 rounded-xl">
                    <p className="text-[9px] text-accent/70 font-bold uppercase tracking-wider mb-1.5">⚠ BORO — No reachout in 1+ month ({missingBORO.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {missingBORO.map((c, i) => (
                        <button key={i} onClick={() => setReachoutModal({ company: c.company, stage: c.crm_stage, notes: c.reachout_notes || '', loading: false })}
                          className="text-[9px] px-2 py-0.5 rounded-full border border-boro/20 text-boro/70 hover:bg-surface/30">
                          {c.company}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Reachout history — every individual entry as its own row */}
          {(() => {
            const allEntries = [];
            filtered.forEach(c => {
              const notes = c.reachout_notes || '';
              const dateMatches = notes.match(/\(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\)|\[.*?·\s*([A-Za-z]+ \d+,?\s*\d{4}.*?)\]/g) || [];
              const parts = notes.split(/(?<=\(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\))\s*/);
              parts.forEach(part => {
                const trimmed = part.trim();
                if (!trimmed) return;
                const dm = trimmed.match(/\((\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\)\s*$/);
                if (dm) {
                  const text = trimmed.slice(0, dm.index).trim();
                  const parsed = parseReachoutDate(dm[0]);
                  allEntries.push({ company: c.company, stage: c.crm_stage, date: parsed, dateRaw: dm[1], text: text || '(no details)', notes: c.reachout_notes });
                }
              });
              const bracketPattern = /\[([^\]]+?)\s*·\s*([^\]]+)\]([\s\S]*?)(?=\[|$)/g;
              let bm;
              while ((bm = bracketPattern.exec(notes)) !== null) {
                const parsed = parseReachoutDate(bm[2]);
                allEntries.push({ company: c.company, stage: c.crm_stage, date: parsed, dateRaw: bm[2].replace(' EST', '').trim(), text: bm[3].trim() || '(no details)', author: bm[1].trim(), notes: c.reachout_notes });
              }
            });
            allEntries.sort((a, b) => ((b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0)));

            if (allEntries.length === 0) return <p className="text-muted/35 text-xs text-center py-8">No reachout notes found across pipeline</p>;

            return (
              <div className="space-y-1">
                <div className="flex items-center gap-3 px-3 py-1.5 text-[9px] text-muted/30 uppercase tracking-wider font-bold border-b border-border/15">
                  <span className="w-[70px]">Date</span>
                  <span className="w-[100px]">Company</span>
                  <span className="flex-1">Reachout</span>
                  <span className="w-[50px] text-center">Stage</span>
                </div>
                {allEntries.map((e, i) => {
                  const dateStr = e.date ? e.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date';
                  const hasTime = e.date && (e.date.getHours() !== 0 || e.date.getMinutes() !== 0);
                  const timeStr = hasTime ? e.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';

                  return (
                    <div key={i} className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-border/10 bg-surface/30 hover:bg-surface/50 transition-colors cursor-pointer"
                      onClick={() => setReachoutModal({ company: e.company, stage: e.stage, notes: e.notes || '', loading: false })}>
                      <div className="w-[70px] flex-shrink-0">
                        <span className={`text-[10px] font-mono block ${e.date ? 'text-bright/60' : 'text-rose/50'}`}>{dateStr}</span>
                        {timeStr && <span className="text-[8px] text-muted/30 block">{timeStr}</span>}
                      </div>
                      <span className="w-[100px] text-[10px] font-semibold text-bright truncate flex-shrink-0">{e.company}</span>
                      <p className="flex-1 text-[10px] text-muted/50 truncate">{e.text}</p>
                      <span className={`w-[50px] text-center text-[8px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${
                        e.stage === 'BO' ? 'bg-bo/15 text-bo' :
                        e.stage === 'BORO' ? 'bg-boro/15 text-boro' :
                        'bg-sm/15 text-sm'
                      }`}>{e.stage}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted/35 text-xs text-center py-8">No companies</p>
      ) : (
        <div>
          {/* Grid Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted/40 font-bold uppercase tracking-wider">Pipeline</span>
            {fundingLoading && <span className="text-[9px] text-amber-400/55 flex items-center gap-1"><span className="w-2.5 h-2.5 border border-amber-400 border-t-transparent rounded-full animate-spin" /> Loading...</span>}
          </div>
          {/* Rows — DD-style cards in 2-col grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {filtered.map((c, i) => {
              const airtableFunding = moneyFmt(c.total_funding);
              const hd = fundingData[c.company];
              const funding = hd?.funding_total || airtableFunding;
              const webUrl = c.company_link || hd?.website || null;
              const twitterUrl = c.twitter_link || hd?.twitter || null;
              const description = hd?.description || c.notes?.split('\n').filter(l => !l.trim().startsWith('[')).join(' ').trim().slice(0, 200) || null;
              const stage = hd?.stage || hd?.last_round || '';
              const location = hd?.location || null;
              const headcount = hd?.headcount || null;
              const logoUrl = hd?.logo_url || null;
              const userNotes = c.notes ? (c.notes || '').split('\n').filter(l => l.trim().startsWith('[')).join('\n').trim() : '';
              const ta = twitterActivity[c.company];
              const twitterWarn = ta && ta.days_since !== null && ta.days_since > 10;

              return (
                <div key={c.airtable_id || i} className="rounded-[14px] border border-border/[0.06] hover:border-accent/18 transition-all relative" style={{ background: 'rgba(46, 42, 37, 0.55)' }}>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (c.reachout_notes) {
                        setReachoutModal({ company: c.company, stage: c.crm_stage, notes: c.reachout_notes || 'No reachout notes found.', loading: false });
                      } else {
                        setReachoutModal({ company: c.company, stage: c.crm_stage, notes: '', loading: true });
                        try {
                          const resp = await fetch(`${API_BASE}/api/airtable/reachout-notes?company=${encodeURIComponent(c.company)}`);
                          const data = await resp.json();
                          setReachoutModal({ company: c.company, stage: c.crm_stage, notes: data.reachoutNotes || 'No reachout notes found.', loading: false });
                        } catch(err) {
                          setReachoutModal({ company: c.company, stage: c.crm_stage, notes: 'Error loading notes: ' + err.message, loading: false });
                        }
                      }
                    }}
                    className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors z-10"
                    title="View initial reachout notes"
                  >
                    Reachouts
                  </button>
                  <div className="p-3 space-y-1.5">
                    {/* Row 1: Logo + Name + Website + Twitter */}
                    <div className="flex items-start gap-3">
                      {logoUrl ? (
                        <img src={logoUrl} alt="" className="w-11 h-11 rounded-[10px] bg-ink-2 object-contain flex-shrink-0" onError={e => { e.target.style.display='none'; }} />
                      ) : (
                        <div className="w-11 h-11 rounded-[10px] bg-ink-2 flex items-center justify-center flex-shrink-0">
                          <span className="font-serif italic font-semibold text-accent text-lg">{(c.company||'?')[0]}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-bright text-sm">{c.company}</h3>
                          {webUrl && (
                            <a href={webUrl} target="_blank" rel="noopener"
                              className="text-[10px] px-2 py-0.5 rounded-md bg-bo/12 text-bo border border-bo/20 hover:bg-bo/20 font-medium">
                              🌐 website
                            </a>
                          )}
                          {twitterUrl && (
                            <a href={twitterUrl} target="_blank" rel="noopener"
                              className="text-[10px] px-2 py-0.5 rounded-md bg-card/40 border border-border/20 text-muted/50 hover:text-bright/60 font-medium inline-flex items-center gap-1">
                              𝕏{ta && ta.days_since !== null && ta.days_since <= 10 ? <span className="w-1.5 h-1.5 rounded-full bg-sm" /> : ta && ta.days_since > 30 ? <span className="w-1.5 h-1.5 rounded-full bg-rose" /> : null}
                            </a>
                          )}
                        </div>
                        {/* Badges: Stage + Funding */}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {stage && stage !== 'VENTURE_UNKNOWN' && <span className="font-mono text-[8px] font-semibold px-1.5 py-0.5 rounded border bg-amber/15 text-amber border-amber/25">{stage}</span>}
                          {stage === 'VENTURE_UNKNOWN' && <span className="font-mono text-[8px] font-semibold px-1.5 py-0.5 rounded border bg-muted/12 text-muted/50 border-muted/20">💰 ?</span>}
                          {funding && <span className="font-mono text-[8px] font-semibold px-1.5 py-0.5 rounded border bg-bo/12 text-bo border-bo/20">💰 {funding}</span>}
                          <WebGrowthBadge traction={hd?.traction} harmonicId={hd?.harmonic_id} />
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {description && <p className="text-bright/42 text-xs leading-relaxed line-clamp-2">{description}</p>}

                    {(location || headcount) && <div className="flex flex-wrap gap-1.5 text-[10px]">
                      {location && <span className="px-1.5 py-0.5 rounded border bg-card/40 border-border/[0.06] text-muted/50">📍 {location}</span>}
                      {headcount && <span className="px-1.5 py-0.5 rounded border bg-card/40 border-border/[0.06] text-muted/50">👥 {headcount}</span>}
                    </div>}

                    {/* User notes */}
                    {userNotes ? (() => {
                      const expanded = expandedNote === c.company;
                      const isLong = userNotes.length > 60;
                      return (
                        <p className="text-[9px] text-accent/55 leading-relaxed">
                          📝 {expanded || !isLong ? userNotes : userNotes.slice(0, 60) + '...'}
                          {isLong && <button onClick={() => setExpandedNote(expanded ? null : c.company)} className="text-amber-400/55 ml-1 text-[8px]">{expanded ? 'less' : 'more'}</button>}
                        </p>
                      );
                    })() : null}

                    {/* Twitter warning */}
                    {twitterWarn && (
                      <div className={`text-[9px] rounded px-2 py-0.5 font-semibold inline-block ${ta.days_since > 30 ? 'text-rose/70 bg-rose/10 border border-rose/15' : 'text-accent/70 bg-accent/8 border border-accent/12'}`}>
                        ⚠ 𝕏 {ta.days_since > 30 ? 'inactive' : 'quiet'} {ta.days_since}d
                      </div>
                    )}

                    {/* Vote summary line — DD style */}
                    <div className="flex items-center gap-1.5">
                      {(() => {
                        const votes = Array.isArray(c.in_or_out) ? c.in_or_out : (c.in_or_out ? [c.in_or_out] : []);
                        const inVotes = votes.filter(v => typeof v === 'string' && v.toUpperCase().includes('IN'));
                        const outVotes = votes.filter(v => typeof v === 'string' && v.toUpperCase().includes('OUT'));
                        const totalVoters = 5;
                        const pendingCount = totalVoters - inVotes.length - outVotes.length;
                        return (
                          <>
                            {inVotes.length > 0 && <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-sm/12 text-sm border border-sm/20 font-medium">{inVotes.length} In</span>}
                            {outVotes.length > 0 && <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-rose/12 text-rose border border-rose/20 font-medium">{outVotes.length} Out</span>}
                            {pendingCount > 0 && <span className="text-[10px] text-muted/40">{pendingCount} pending</span>}
                          </>
                        );
                      })()}
                    </div>

                    {/* Vote pills — individual votes + IN/OUT buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {c.in_or_out && (Array.isArray(c.in_or_out) ? c.in_or_out : typeof c.in_or_out === 'string' && c.in_or_out ? [c.in_or_out] : []).map((v, j) => {
                        const isIn = typeof v === 'string' && v.toUpperCase().includes('IN');
                        const name = typeof v === 'string' ? v.split(':')[0].trim() : '';
                        const isMe = crmUser && name.toLowerCase() === crmUser.toLowerCase();
                        if (isMe) {
                          return (
                            <button key={j} onClick={() => handleUndoVote(c)}
                              disabled={votingOn === `${c.company}-UNDO`}
                              className={`font-mono text-[9px] px-2 py-0.5 rounded-full font-bold cursor-pointer hover:opacity-60 border ${
                                isIn ? 'text-ink bg-sm border-sm/50' : 'text-bright bg-rose/80 border-rose/50'
                              }`} title="Click to undo">
                              {votingOn === `${c.company}-UNDO` ? '...' : `${name}${isIn ? '✓' : '✗'}`}
                            </button>
                          );
                        }
                        return (
                          <span key={j} className={`font-mono text-[9px] px-2 py-0.5 rounded-full font-bold ${isIn ? 'text-ink bg-sm' : 'text-bright bg-rose/80'}`}>
                            {name}{isIn ? '✓' : '✗'}
                          </span>
                        );
                      })}
                      {crmUser && (() => {
                        const votes = Array.isArray(c.in_or_out) ? c.in_or_out : [];
                        const hasVoted = votes.some(v => typeof v === 'string' && v.toLowerCase().startsWith(`${getAirtableVoter(crmUser).toLowerCase()}:`));
                        if (hasVoted) return null;
                        return (
                          <>
                            <button onClick={() => handleVote(c, 'IN')} disabled={!!votingOn}
                              className="text-[9px] px-2.5 py-0.5 rounded-lg bg-sm/15 text-sm border border-sm/20 font-bold hover:bg-sm/25 disabled:opacity-30">
                              {votingOn === `${c.company}-IN` ? '...' : 'IN'}
                            </button>
                            <button onClick={() => handleVote(c, 'OUT')} disabled={!!votingOn}
                              className="text-[9px] px-2.5 py-0.5 rounded-lg bg-rose/[0.08] text-rose/60 border border-rose/10 font-bold hover:bg-rose/20 disabled:opacity-30">
                              {votingOn === `${c.company}-OUT` ? '...' : 'OUT'}
                            </button>
                          </>
                        );
                      })()}
                    </div>

                    {/* Actions: H + Similar + Enrich + Note + Stage */}
                    <div className="flex items-center gap-1.5 md:gap-3 flex-wrap pt-1 md:justify-center">
                      {hd?.harmonic_id && (
                        <a href={`/company/${hd.harmonic_id}`} className="text-[8px] px-1.5 py-0.5 rounded bg-rose/10 text-rose border border-rose/15 hover:bg-rose/20 font-bold" title="Company Card">H</a>
                      )}
                      <FindSimilar companyName={c.company} companyId={null} />
                      {enrichAvailable[c.company] && <button onClick={() => handleEnrich(c)} disabled={enriching === c.company} className="text-[9px] text-amber-400 font-bold animate-pulse">⚡</button>}
                      <div className="ml-auto flex items-center gap-1.5 md:gap-3">
                        <button onClick={() => { setNoteModal({ company: c.company, existing: c.notes || '' }); setNoteText(''); }}
                          className="text-[10px] opacity-30 hover:opacity-60" title="Add note">📝</button>
                        <select value={c.crm_stage} onChange={(e) => handleStageChange(c, e.target.value)} disabled={changingStage === c.company}
                          className="text-[9px] bg-transparent border border-border/30 rounded px-1.5 py-0.5 text-muted/50 outline-none cursor-pointer hover:border-accent/20">
                          <option value="BO">BO</option>
                          <option value="BORO">BORO</option>
                          <option value="BORO-SM">SM</option>
                          <option value="Backburn">Burn</option>
                          <option value="Warm">Warm</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[300] px-4 py-2.5 rounded-xl shadow-xl border text-sm font-medium max-w-[90vw] flex items-center gap-2 animate-[fadeIn_0.2s] ${
          toast.type === 'error' ? 'bg-rose/20 border-rose/30 text-rose' :
          toast.type === 'success' ? 'bg-sm/20 border-sm/30 text-sm' :
          'bg-card border-accent/25 text-bright/80'
        }`}>
          <span>{toast.type === 'error' ? '✗' : toast.type === 'success' ? '✓' : 'ℹ'}</span>
          <span className="text-[12px]">{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-muted/40 hover:text-bright ml-2">✕</button>
        </div>
      )}

      {/* Note Modal */}
      {noteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setNoteModal(null)}>
          <div className="bg-card border border-accent/20 rounded-2xl w-[380px] max-w-[90vw] shadow-2xl" onClick={e => e.stopPropagation()}
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
            <div className="px-5 pt-4 pb-3 border-b border-border/[0.06]">
              <p className="text-sm font-bold text-bright">📝 Add Note</p>
              <p className="text-[11px] text-accent/70 mt-0.5">{noteModal.company}</p>
            </div>
            <div className="px-5 py-3">
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="Type your note..."
                className="w-full bg-ink/60 border border-border/25 rounded-lg px-3 py-2 text-sm text-bright outline-none focus:border-amber-400/40 placeholder:text-bright/60 min-h-[80px] resize-none"
                autoFocus />
              {noteModal.existing && (
                <div className="mt-2 max-h-[120px] overflow-y-auto">
                  <p className="text-[8px] text-muted/40 uppercase font-bold mb-1">Previous notes</p>
                  <p className="text-[9px] text-bright/40 whitespace-pre-wrap">{noteModal.existing}</p>
                </div>
              )}
            </div>
            <div className="px-5 pb-4 pt-2 flex gap-2.5 border-t border-border/[0.06]">
              <button onClick={() => setNoteModal(null)}
                className="flex-1 text-[11px] py-2.5 rounded-lg border border-border/30 text-bright/60 hover:text-bright font-medium">Cancel</button>
              <button onClick={handleSaveNote} disabled={savingNote || !noteText.trim()}
                className="flex-1 text-[11px] py-2.5 rounded-lg bg-accent/20 border border-accent/30 text-accent hover:bg-accent/30 font-bold disabled:opacity-30">
                {savingNote ? 'Saving...' : '💾 Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enrich Preview Modal */}
      {enrichPreview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEnrichPreview(null)}>
          <div className="bg-card border border-accent/25 rounded-2xl w-[380px] max-w-[90vw] shadow-2xl" onClick={e => e.stopPropagation()}
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-border/[0.06]">
              <p className="text-sm font-bold text-bright">Enrich from Harmonic</p>
              <p className="text-[11px] text-accent/70 mt-0.5">{enrichPreview.company}</p>
            </div>

            {/* Changes list */}
            <div className="px-5 py-3 space-y-2.5">
              <p className="text-[10px] text-bright/60 uppercase tracking-wider font-bold">Proposed changes to Airtable:</p>
              {Object.entries(enrichPreview.updates || {}).map(([field, value]) => (
                <div key={field} className="bg-white/[0.03] rounded-lg px-3 py-2">
                  <p className="text-[10px] text-bright/60 font-medium">{fieldLabels[field] || field}</p>
                  <p className="text-[12px] text-bright mt-0.5 break-words leading-relaxed">
                    {String(value).length > 150 ? String(value).slice(0, 150) + '...' : String(value)}
                  </p>
                </div>
              ))}
              {Object.keys(enrichPreview.updates || {}).length === 0 && (
                <p className="text-bright/60 text-xs text-center py-2">No changes to make</p>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 pb-4 pt-2 flex gap-2.5 border-t border-border/[0.06]">
              <button onClick={() => setEnrichPreview(null)}
                className="flex-1 text-[11px] py-2.5 rounded-lg border border-border/30 text-bright/60 hover:text-bright hover:border-white/20 font-medium transition-colors">
                Cancel
              </button>
              <button onClick={handleEnrichCommit} disabled={enrichCommitting || Object.keys(enrichPreview.updates || {}).length === 0}
                className="flex-1 text-[11px] py-2.5 rounded-lg bg-accent/20 border border-accent/30 text-accent hover:bg-accent/30 font-bold transition-colors disabled:opacity-30">
                {enrichCommitting ? 'Writing...' : `✓ Write ${Object.keys(enrichPreview.updates || {}).length} fields to Airtable`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reachout Notes Modal */}
      {reachoutModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setReachoutModal(null)}>
          <div className="bg-surface border border-border/50 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-bright font-semibold text-lg">Reachout Notes — {reachoutModal.company}</h3>
                {reachoutModal.stage && <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                  reachoutModal.stage === 'BO' ? 'bg-bo/15 text-bo' :
                  reachoutModal.stage === 'BORO' ? 'bg-boro/15 text-boro' :
                  reachoutModal.stage === 'BORO-SM' ? 'bg-sm/15 text-sm' :
                  'bg-white/10 text-white/50'
                }`}>{reachoutModal.stage}</span>}
                {fundingData[reachoutModal.company]?.harmonic_id && (
                  <a href={`/company/${fundingData[reachoutModal.company].harmonic_id}`}
                    className="text-[9px] px-2 py-0.5 rounded bg-rose/10 text-rose border border-rose/15 hover:bg-rose/20 font-bold no-underline"
                    title="Harmonic Company Card">
                    H
                  </a>
                )}
              </div>
              <button onClick={() => setReachoutModal(null)} className="text-muted hover:text-bright text-xl">×</button>
            </div>
            {reachoutModal.loading ? (
              <p className="text-muted text-sm">Loading...</p>
            ) : (
              <div className="space-y-0">
                {reachoutModal.notes ? (() => {
                  const raw = reachoutModal.notes.replace(/--- Legacy[^\n]*/g, '').replace(/--- New[^\n]*/g, '').replace(/---/g, '').trim();
                  const entries = [];

                  // Handle two formats:
                  // 1. [Author · Date] content (date at start, text after)
                  // 2. Text content (M/D/YYYY) (date at END of note text)

                  // First, extract all [Author · Date] entries
                  // Split on bracket entries, then handle remaining text with inline dates
                  const bracketPattern = /\[([^·]+)·\s*(.+?)\]\s*/g;
                  let lastIdx = 0;
                  let match;
                  const segments = [];

                  // Collect bracket-format entries and the text between them
                  while ((match = bracketPattern.exec(raw)) !== null) {
                    if (match.index > lastIdx) {
                      segments.push({ type: 'text', content: raw.slice(lastIdx, match.index).trim() });
                    }
                    // Find text after bracket until next bracket or end
                    const afterStart = bracketPattern.lastIndex;
                    const nextBracket = raw.indexOf('[', afterStart);
                    const nextInline = raw.slice(afterStart).search(/\(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\)/);
                    let endPos = raw.length;
                    if (nextBracket > -1) endPos = Math.min(endPos, nextBracket);
                    // For bracket entries, grab text until next entry
                    const content = raw.slice(afterStart, endPos).trim();
                    segments.push({ type: 'bracket', author: match[1].trim(), date: match[2].trim(), content });
                    lastIdx = endPos;
                  }
                  if (lastIdx < raw.length) {
                    segments.push({ type: 'text', content: raw.slice(lastIdx).trim() });
                  }

                  // Process segments
                  segments.forEach(seg => {
                    if (seg.type === 'bracket') {
                      entries.push({ author: seg.author, date: seg.date, text: seg.content });
                    } else if (seg.content) {
                      // Split inline-dated text: "text (M/D/YYYY) text (M/D/YYYY)"
                      // Dates appear at the END of each note, so split AFTER each date
                      const inlineParts = seg.content.split(/(?<=\(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\))\s*/);
                      inlineParts.forEach(part => {
                        const trimmed = part.trim();
                        if (!trimmed) return;
                        const dateMatch = trimmed.match(/\((\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\)\s*$/);
                        if (dateMatch) {
                          const noteText = trimmed.slice(0, dateMatch.index).trim();
                          entries.push({ author: '', date: dateMatch[1], text: noteText || '(no details)' });
                        } else if (trimmed.length > 2) {
                          entries.push({ author: '', date: '', text: trimmed });
                        }
                      });
                    }
                  });

                  // Sort by date descending (newest first)
                  entries.sort((a, b) => {
                    if (!a.date && !b.date) return 0;
                    if (!a.date) return 1;
                    if (!b.date) return -1;
                    const parseDate = (d) => {
                      const clean = d.replace(' EST', '').trim();
                      const short = clean.match(/^(\d{1,2})\/(\d{1,2})$/);
                      if (short) return new Date(new Date().getFullYear(), parseInt(short[1]) - 1, parseInt(short[2])).getTime();
                      const ts = new Date(clean);
                      return isNaN(ts) ? 0 : ts.getTime();
                    };
                    return parseDate(b.date) - parseDate(a.date);
                  });

                  if (entries.length === 0) return <p className="text-muted italic text-sm p-3">No reachout notes yet.</p>;

                  return entries.map((e, i) => (
                    <div key={i} className="py-3 border-b border-border/20 last:border-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] font-mono font-semibold text-bo/80">{e.date ? e.date.replace(' EST', '') : 'No date'}</span>
                        {e.author && <span className="text-[10px] text-amber-400/60 font-medium">— {e.author}</span>}
                      </div>
                      <p className="text-sm text-bright/80 leading-relaxed whitespace-pre-wrap">{e.text}</p>
                    </div>
                  ));
                })() : <p className="text-muted italic text-sm p-3">No reachout notes yet.</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
