// v4 — Dropdown switcher, standard density, inline chip filters mid-form, divided sections.
import React, { useState, useRef, useEffect } from 'react';
import { WEEKLY_PARTNERS } from './sharedWeekly';
import useWeeklyController from './useWeeklyController';
import {
  PromptArea, ContextArea, FilterSection, CorpusPill, LastRunLine,
  SaveButton, RunButton, RunStatusLine,
} from './weeklyPanels';

export default function WeeklyV4() {
  const c = useWeeklyController();
  const [open, setOpen] = useState(false);
  const ddRef = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ddRef.current && !ddRef.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  if (c.loading) return <div className="p-12 text-muted text-sm">Loading…</div>;
  const a = c.active;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Dropdown partner switcher */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative" ref={ddRef}>
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/30 bg-card/40 text-bright hover:border-accent/30"
          >
            <span className="text-xl leading-none">{a.emoji}</span>
            <span className="text-[13px] font-bold">{a.name}'s weekly search</span>
            <span className="text-muted/70 text-[10px]">▾</span>
          </button>
          {open && (
            <div className="absolute top-full left-0 mt-1 min-w-[200px] z-20 bg-card border border-border/30 rounded-lg overflow-hidden shadow-lg">
              {WEEKLY_PARTNERS.map(p => {
                const active = p.id === c.activeId;
                return (
                  <button
                    key={p.id}
                    onClick={() => { c.setActiveId(p.id); setOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] ${
                      active ? 'bg-accent/15 text-accent' : 'text-bright/80 hover:bg-card-hi'
                    }`}
                  >
                    <span className="text-base leading-none">{p.emoji}</span>{p.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <LastRunLine partner={a} />
          <CorpusPill size={a.lastCorpusSize} />
        </div>
      </div>

      {/* Divided sections */}
      <div className="space-y-5 divide-y divide-border/20">
        <div className="pb-1">
          <p className="text-[10px] uppercase tracking-wider text-muted/60 font-mono font-semibold mb-1.5">Search prompt</p>
          <PromptArea value={a.searchPrompt} onChange={(v) => c.updateActive({ searchPrompt: v })} />
        </div>
        <div className="pt-4 pb-1">
          <p className="text-[10px] uppercase tracking-wider text-muted/60 font-mono font-semibold mb-1.5">Context</p>
          <ContextArea value={a.context} onChange={(v) => c.updateActive({ context: v })} />
        </div>
        <div className="pt-4">
          <FilterSection filters={a.filters} toggleMulti={c.toggleFilterMulti} updateOne={c.updateFilter} variant="flat" defaultOpen={false} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap pt-1 border-t border-border/20">
        <RunStatusLine runState={c.runState} />
        <div className="flex items-center gap-2 ml-auto">
          <SaveButton onClick={c.save} state={c.saveState} isDirty={c.isDirty} />
          <RunButton onClick={c.run} runState={c.runState} />
        </div>
      </div>
    </div>
  );
}
