// Sticky top bar with v1–v7 tabs; renders chosen iteration full-width below.
// Persists choice to localStorage `weekly_iteration_choice`.

import React, { useState, useEffect } from 'react';
import WeeklyV1 from './WeeklyV1';
import WeeklyV2 from './WeeklyV2';
import WeeklyV3 from './WeeklyV3';
import WeeklyV4 from './WeeklyV4';
import WeeklyV5 from './WeeklyV5';
import WeeklyV6 from './WeeklyV6';
import WeeklyV7 from './WeeklyV7';

const ITERATIONS = [
  { key: 'v1', label: 'v1', Comp: WeeklyV1 },
  { key: 'v2', label: 'v2', Comp: WeeklyV2 },
  { key: 'v3', label: 'v3', Comp: WeeklyV3 },
  { key: 'v4', label: 'v4', Comp: WeeklyV4 },
  { key: 'v5', label: 'v5', Comp: WeeklyV5 },
  { key: 'v6', label: 'v6', Comp: WeeklyV6 },
  { key: 'v7', label: 'v7', Comp: WeeklyV7 },
];

export default function WeeklyChooser() {
  const [choice, setChoice] = useState(() => {
    try {
      return localStorage.getItem('weekly_iteration_choice') || 'v1';
    } catch {
      return 'v1';
    }
  });

  useEffect(() => {
    try { localStorage.setItem('weekly_iteration_choice', choice); } catch {}
  }, [choice]);

  const Active = (ITERATIONS.find(i => i.key === choice) || ITERATIONS[0]).Comp;

  return (
    <div>
      <div
        className="sticky top-0 z-30 border-b border-border/30"
        style={{
          background: 'rgba(46, 42, 37, 0.9)',
          backdropFilter: 'blur(16px) saturate(140%)',
          WebkitBackdropFilter: 'blur(16px) saturate(140%)',
        }}
      >
        <div className="max-w-6xl mx-auto px-3 py-2 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-widest text-muted/70 font-mono font-bold mr-1">Iteration</span>
          {ITERATIONS.map(it => {
            const active = choice === it.key;
            return (
              <button
                key={it.key}
                onClick={() => setChoice(it.key)}
                className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-md border transition-colors ${
                  active
                    ? 'border-accent/50 bg-accent/15 text-accent'
                    : 'border-border/30 bg-card/30 text-bright/70 hover:text-bright hover:border-accent/30'
                }`}
              >
                {it.label}
              </button>
            );
          })}
        </div>
      </div>
      <Active />
    </div>
  );
}
