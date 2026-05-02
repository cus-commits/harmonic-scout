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
      className="fixed top-3.5 left-3.5 z-50 flex items-center justify-center w-8 h-8 rounded-full border transition-all hover:scale-105"
      style={{
        background: light ? 'rgba(255,255,255,0.85)' : 'rgb(var(--card))',
        backdropFilter: 'blur(12px)',
        borderColor: light ? 'rgba(40,30,20,0.10)' : 'var(--border-2)',
        boxShadow: 'var(--shadow-sm)',
      }}
      title={light ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      <span className="text-sm leading-none">{light ? '☀️' : '🌙'}</span>
    </button>
  );
}
