import React, { useState, useRef, useEffect } from 'react';
import { chatWithScout } from '../utils/api';
import HarmonicSavedSearches from '../components/HarmonicSavedSearches';
import HarmonicSearchBar from '../components/HarmonicSearchBar';
import FindSimilar from '../components/FindSimilar';
import { CrmButton } from '../components/CrmButton';

function CompanyCard({ company, onFavorite, isSaved }) {
  const fundingDisplay = (() => {
    const n = company.funding_total;
    if (!n || typeof n !== 'number' || isNaN(n)) return null;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
    return `$${n}`;
  })();

  const fundingDateDisplay = (() => {
    if (!company.funding_date) return null;
    const d = company.funding_date;
    try {
      const date = new Date(d);
      if (isNaN(date)) return d;
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  })();

  const lastRoundDisplay = (() => {
    const n = company.last_round_amount;
    if (!n || typeof n !== 'number' || isNaN(n)) return null;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
    return `$${n}`;
  })();

  const stageLabel = (() => {
    let s = company.funding_stage;
    if (!s) return '';
    if (typeof s === 'object') s = s.name || s.value || s.displayValue || s.label || '';
    if (typeof s !== 'string') s = String(s);
    if (!s || s === 'null' || s === 'undefined' || s === '[object Object]') return '';
    return s
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace('Pre Seed', 'Preseed')
      .replace('Series ', 'Series ');
  })();

  const stageClass = (() => {
    const s = (company.funding_stage || '').toLowerCase();
    if (s.includes('pre') || s.includes('preseed')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (s.includes('seed')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (s.includes('series_a') || s.includes('series a')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (s.includes('series_b') || s.includes('series b')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (s.includes('series')) return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  })();

  return (
    <div className="rounded-xl border border-border/40 bg-surface/60 p-3.5 space-y-2.5 hover:border-accent/30 transition-all">
      {/* Header: logo + name + favorite */}
      <div className="flex items-start gap-3">
        {company.logo_url ? (
          <img
            src={company.logo_url}
            alt=""
            className="w-9 h-9 rounded-lg bg-surface object-contain flex-shrink-0"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
            <span className="text-accent font-bold text-sm">{(company.name || '?')[0]}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-bright text-sm truncate">{company.name}</h3>
            <button
              onClick={() => !isSaved && onFavorite(company)}
              className={`flex-shrink-0 text-base leading-none ${isSaved ? 'text-accent' : 'text-muted hover:text-accent'}`}
            >
              {isSaved ? '★' : '☆'}
            </button>
          </div>
        </div>
      </div>

      {/* Description / tagline */}
      {company.description && (
        <p className="text-muted text-xs leading-relaxed line-clamp-2">{company.description}</p>
      )}

      {/* Badges row: stage, funding, founded, location */}
      <div className="flex flex-wrap gap-1.5">
        {stageLabel && stageLabel !== '?' && (
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${stageClass}`}>
            ⛳ {stageLabel}
          </span>
        )}

        {fundingDisplay && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-sky-500/15 text-sky-400 border-sky-500/25">
            💰 {fundingDisplay}
          </span>
        )}

        {lastRoundDisplay && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-violet-500/15 text-violet-400 border-violet-500/25">
            🎯 Last: {lastRoundDisplay}
          </span>
        )}

        {company.founded && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-surface border-border/40 text-muted">
            📅 {company.founded}
          </span>
        )}

        {fundingDateDisplay && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-surface border-border/40 text-muted">
            🕐 Last raise: {fundingDateDisplay}
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

      {/* Socials / links row */}
      <div className="flex flex-wrap gap-2">
        {company.investors && company.investors.length > 0 && (
          <span className="text-[10px] text-muted">
            Backed by: {company.investors.join(', ')}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {company.website && (
          <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener" className="text-[10px] text-accent hover:underline">
            🌐 Website
          </a>
        )}
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
      <div className="flex items-center gap-1.5 flex-wrap"><FindSimilar addFavorite={addFavorite} isFavorited={isFavorited} companyName={company.name} companyId={company.id} /><CrmButton company={company} /></div>
    </div>
  );
}

export default function ChatPage({ addFavorite, isFavorited }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('scout_chat_messages');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        role: 'assistant',
        content:
          "Hey — I'm Pigeon Finder. I search Harmonic's 30M+ company database and analyze deals for Daxos. Ask me anything: filter by sector, rank deals, compare companies, or get a quick take.\n\nTap ★ on any company to save it to Favorites.",
      },
    ];
  });

  // Save messages to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem('scout_chat_messages', JSON.stringify(messages));
  }, [messages]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2000);
  };

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : '',
      }));
      const data = await chatWithScout(msg, [], history);

      // Match company cards to companies mentioned in Claude's response
      const mentionedNames = extractBoldNames(data.response);
      const matchedCards = (data.companies || []).filter((c) =>
        mentionedNames.some((n) => c.name.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(c.name.toLowerCase()))
      );

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          cards: matchedCards.length > 0 ? matchedCards : (data.companies || []).slice(0, 15),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Connection error: ${err.message}`,
        },
      ]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleAddFavorite = (company) => {
    addFavorite({ ...company });
    showToast(`★ ${company.name} saved`);
  };

  const quickPrompts = [
    'Gambling + gamification startups',
    'Crypto betting under $1M raised',
    'Social trading pre-seed companies',
    'Best seed-stage consumer apps',
  ];

  return (
    <div className="flex flex-col h-[100dvh] max-w-5xl mx-auto">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-accent text-ink text-sm font-bold px-4 py-2 rounded-xl shadow-lg fade-in">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-accent" style={{ fontFamily: "'Courier New', monospace" }}>dc</span> Pigeon Finder
        </h1>
        <p className="text-muted text-xs">AI deal analyst • 30M+ companies • Daxos Capital</p>
        <div className="mt-2">
          <HarmonicSavedSearches compact addFavorite={addFavorite} isFavorited={isFavorited} />
        </div>
        <div className="mt-3">
          <HarmonicSearchBar addFavorite={addFavorite} isFavorited={isFavorited} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`fade-in ${msg.role === 'user' ? 'flex justify-end' : ''}`}
          >
            {msg.role === 'user' ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed bg-accent text-ink">
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            ) : (
              <div className="space-y-3 max-w-full">
                {/* Claude's text analysis */}
                <div className="glass-card rounded-2xl px-4 py-3 text-sm leading-relaxed">
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>

                {/* Company cards */}
                {msg.cards && msg.cards.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted font-medium px-1">
                      {msg.cards.length} companies from Harmonic
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {msg.cards.map((c) => (
                        <CompanyCard
                          key={c.name}
                          company={c}
                          onFavorite={handleAddFavorite}
                          isSaved={isFavorited(c.name)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="fade-in">
            <div className="glass-card max-w-[85%] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: '0.4s' }} />
                <span className="text-muted text-xs ml-2">Searching Harmonic + analyzing…</span>
              </div>
            </div>
          </div>
        )}

        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 fade-in">
            {quickPrompts.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setInput(p);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="text-xs px-3 py-2 rounded-xl bg-surface border border-border/40 text-muted hover:text-bright hover:border-accent/30 transition-all"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-20 pt-2 bg-gradient-to-t from-ink via-ink/95 to-transparent">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your deal flow…"
            rows={1}
            className="input-base text-sm resize-none min-h-[44px] max-h-32"
            style={{ height: 'auto' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-accent text-ink flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Extract **bold** company names from Claude's text
function extractBoldNames(text) {
  const names = [];
  const pattern = /\*\*([A-Z][A-Za-z0-9\s.&\-/'()]+?)\*\*/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const name = match[1].trim();
    if (name.length > 2 && name.length < 60 && !isCommonPhrase(name)) {
      names.push(name);
    }
  }
  return names;
}

function isCommonPhrase(name) {
  const skip = [
    'red flags', 'green flags', 'key risks', 'strengths', 'weaknesses',
    'summary', 'analysis', 'recommendation', 'daxos fit', 'score',
    'top picks', 'solid options', 'potential', 'missing data',
    'ideal profile', 'red hot', 'next steps', 'key questions',
    'target criteria', 'bottom line', 'deal analysis', 'pipeline',
  ];
  return skip.some((s) => name.toLowerCase().includes(s));
}
