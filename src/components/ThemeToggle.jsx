import React, { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [light, setLight] = useState(() => localStorage.getItem('pigeon_theme') === 'light');

  useEffect(() => {
    document.body.classList.toggle('light', light);
    localStorage.setItem('pigeon_theme', light ? 'light' : 'dark');
  }, [light]);

  return (
    <button
      onClick={() => setLight(l => !l)}
      className="fixed top-3.5 left-3.5 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-widest border transition-all"
      style={{
        background: light ? 'rgba(255,255,255,0.7)' : 'rgba(46,42,37,0.7)',
        backdropFilter: 'blur(10px)',
        borderColor: light ? 'rgba(20,28,48,0.08)' : 'var(--border-2)',
        color: 'var(--muted)',
      }}
      title={light ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      <span className="text-sm leading-none">{light ? '☀️' : '🌙'}</span>
      <span className="font-semibold">{light ? 'Light' : 'Dark'}</span>
    </button>
  );
}
