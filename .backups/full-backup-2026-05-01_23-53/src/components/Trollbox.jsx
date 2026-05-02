import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getTrollboxMessages, postTrollboxMessage } from '../utils/api';

const AVATAR_COLORS = [
  'bg-pink-500/40 text-pink-200',
  'bg-cyan-500/40 text-cyan-200',
  'bg-amber-500/40 text-amber-200',
  'bg-violet-500/40 text-violet-200',
  'bg-emerald-500/40 text-emerald-200',
  'bg-rose-500/40 text-rose-200',
  'bg-blue-500/40 text-blue-200',
  'bg-orange-500/40 text-orange-200',
];

function userColor(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// Make URLs clickable
function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0; // Reset
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener"
          className="text-accent underline break-all"
        >
          {part.length > 40 ? part.slice(0, 37) + '...' : part}
        </a>
      );
    }
    return part;
  });
}

export default function Trollbox({ userId, nickname }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [lastSeen, setLastSeen] = useState(() => {
    return localStorage.getItem('trollbox_last_seen') || '';
  });
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  // Fetch messages
  const fetchMessages = useCallback(async (initial = false) => {
    try {
      const data = await getTrollboxMessages(initial ? null : undefined);
      if (data.messages?.length > 0) {
        setMessages((prev) => {
          if (initial) return data.messages;
          // Merge new messages
          const existingIds = new Set(prev.map((m) => m.id));
          const newMsgs = data.messages.filter((m) => !existingIds.has(m.id));
          if (newMsgs.length === 0) return prev;
          return [...prev, ...newMsgs];
        });
      }
    } catch (e) {
      console.warn('Trollbox fetch error:', e.message);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMessages(true);
  }, [fetchMessages]);

  // Polling every 5 seconds
  useEffect(() => {
    pollRef.current = setInterval(() => fetchMessages(false), 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  // Count unread when closed
  useEffect(() => {
    if (!open && messages.length > 0) {
      const newCount = messages.filter(
        (m) => m.ts > lastSeen && m.user_id !== userId
      ).length;
      setUnread(newCount);
    }
  }, [messages, open, lastSeen, userId]);

  // Mark as read when opened
  useEffect(() => {
    if (open && messages.length > 0) {
      const latest = messages[messages.length - 1].ts;
      setLastSeen(latest);
      localStorage.setItem('trollbox_last_seen', latest);
      setUnread(0);
    }
  }, [open, messages]);

  // Auto-scroll
  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const data = await postTrollboxMessage(userId, nickname, text);
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (e) {
      console.warn('Send error:', e.message);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  return (
    <>
      {/* Chat bubble button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-accent text-ink flex items-center justify-center shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-transform"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-80 max-h-[420px] rounded-2xl border border-border/50 bg-ink shadow-2xl shadow-black/40 flex flex-col overflow-hidden fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-surface/50">
            <div className="flex items-center gap-2">
              <span className="text-sm">🕊️</span>
              <span className="text-xs font-bold text-bright">Pigeon Chat</span>
              <span className="text-[10px] text-muted">({messages.length})</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted hover:text-bright p-1 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0" style={{ maxHeight: '300px' }}>
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted text-xs">No messages yet. Say something!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.user_id === userId;
                return (
                  <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                    {!isMe && (
                      <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${userColor(msg.user_id)}`}>
                        {(msg.nickname || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && (
                        <p className="text-[10px] text-muted font-medium mb-0.5 px-1">
                          {msg.nickname}
                        </p>
                      )}
                      <div
                        className={`px-3 py-1.5 rounded-2xl text-xs leading-relaxed break-words ${
                          isMe
                            ? 'bg-accent/20 text-bright rounded-br-md'
                            : 'bg-surface text-bright rounded-bl-md'
                        }`}
                      >
                        {linkify(msg.text)}
                      </div>
                      <p className={`text-[9px] text-muted/50 mt-0.5 px-1 ${isMe ? 'text-right' : ''}`}>
                        {timeAgo(msg.ts)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={scrollRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-border/30 bg-surface/30">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Type a message..."
                maxLength={500}
                className="flex-1 bg-ink border border-border/40 rounded-xl px-3 py-2 text-xs text-bright outline-none focus:border-accent/40 placeholder-muted/50"
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="w-8 h-8 rounded-xl bg-accent text-ink flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all flex-shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
