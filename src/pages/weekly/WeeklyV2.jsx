// v2 — Vertical sidebar partner list, standard density, always-expanded filters, subtle bordered card.
import React from 'react';
import { WEEKLY_PARTNERS } from './sharedWeekly';
import useWeeklyController from './useWeeklyController';
import {
  PromptArea, ContextArea, FilterSection, CorpusPill, LastRunLine,
  SaveButton, RunButton, RunStatusLine,
} from './weeklyPanels';

export default function WeeklyV2() {
  const c = useWeeklyController();
  if (c.loading) return <div className="p-12 text-muted text-sm">Loading…</div>;
  const a = c.active;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[200px,1fr] gap-5">
      {/* Sidebar */}
      <aside className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-muted/60 font-mono font-bold mb-2 px-1">Partners</p>
        {WEEKLY_PARTNERS.map(p => {
          const active = p.id === c.activeId;
          return (
            <button
              key={p.id}
              onClick={() => c.setActiveId(p.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                active
                  ? 'bg-accent/15 border border-accent/40 text-accent'
                  : 'border border-transparent text-bright/70 hover:bg-card-hi/60'
              }`}
            >
              <span className="text-lg leading-none">{p.emoji}</span>
              <span className="text-[12.5px] font-semibold">{p.name}</span>
            </button>
          );
        })}
      </aside>

      {/* Main panel */}
      <main className="space-y-4">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-[20px] font-bold text-bright tracking-tight">
            <span className="mr-2">{a.emoji}</span>{a.name}'s weekly search
          </h1>
          <div className="flex items-center gap-3">
            <LastRunLine partner={a} />
            <CorpusPill size={a.lastCorpusSize} />
          </div>
        </header>

        <div className="border border-border/25 rounded-xl bg-card/30 p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-muted/70 font-mono font-semibold">Search prompt</label>
            <PromptArea value={a.searchPrompt} onChange={(v) => c.updateActive({ searchPrompt: v })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-muted/70 font-mono font-semibold">Context</label>
            <ContextArea value={a.context} onChange={(v) => c.updateActive({ context: v })} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted/70 font-mono font-semibold mb-2">Filters</p>
            <FilterSection filters={a.filters} toggleMulti={c.toggleFilterMulti} updateOne={c.updateFilter} variant="inline" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <RunStatusLine runState={c.runState} />
          <div className="flex items-center gap-2 ml-auto">
            <SaveButton onClick={c.save} state={c.saveState} isDirty={c.isDirty} />
            <RunButton onClick={c.run} runState={c.runState} />
          </div>
        </div>
      </main>
    </div>
  );
}
