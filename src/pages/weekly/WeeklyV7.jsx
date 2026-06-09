// v7 — Kanban-style column-header switcher (top bar of 7 vertical "lanes"),
// standard density, collapsible card filters, per-section accent treatment.
import React from 'react';
import { WEEKLY_PARTNERS } from './sharedWeekly';
import useWeeklyController from './useWeeklyController';
import {
  PromptArea, ContextArea, FilterSection, CorpusPill, LastRunLine,
  SaveButton, RunButton, RunStatusLine,
} from './weeklyPanels';

export default function WeeklyV7() {
  const c = useWeeklyController();
  if (c.loading) return <div className="p-12 text-muted text-sm">Loading…</div>;
  const a = c.active;

  return (
    <div className="max-w-5xl mx-auto px-3 py-5 space-y-5">
      {/* Column headers — kanban style */}
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKLY_PARTNERS.map(p => {
          const ap = c.partners[p.id];
          const active = p.id === c.activeId;
          return (
            <button
              key={p.id}
              onClick={() => c.setActiveId(p.id)}
              className={`flex flex-col items-start gap-1 p-2 rounded-md border-t-2 transition-colors text-left ${
                active
                  ? 'border-t-accent bg-card/50 text-bright'
                  : 'border-t-border/40 bg-card/15 text-bright/60 hover:text-bright hover:bg-card/30'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none">{p.emoji}</span>
                <span className="text-[11.5px] font-bold">{p.name}</span>
              </div>
              <span className="text-[9px] text-muted/60 font-mono leading-tight truncate w-full">
                {ap?.lastRunCount != null ? `${ap.lastRunCount} to DD` : '—'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Header line */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-[19px] font-bold text-bright">
          <span className="mr-2">{a.emoji}</span>{a.name}'s weekly search
        </h1>
        <div className="flex items-center gap-2">
          <LastRunLine partner={a} />
          <CorpusPill size={a.lastCorpusSize} />
        </div>
      </div>

      {/* Prompt — accent left border */}
      <section className="border-l-2 border-accent/40 pl-3">
        <p className="text-[10px] uppercase tracking-wider text-accent/70 font-mono font-semibold mb-1">Search prompt</p>
        <PromptArea value={a.searchPrompt} onChange={(v) => c.updateActive({ searchPrompt: v })} />
      </section>

      {/* Context — bo left border */}
      <section className="border-l-2 border-bo/40 pl-3">
        <p className="text-[10px] uppercase tracking-wider text-bo/70 font-mono font-semibold mb-1">Context</p>
        <ContextArea value={a.context} onChange={(v) => c.updateActive({ context: v })} />
      </section>

      {/* Filters — sm left border, collapsible card */}
      <section className="border-l-2 border-sm/40 pl-3">
        <FilterSection filters={a.filters} toggleMulti={c.toggleFilterMulti} updateOne={c.updateFilter} variant="card" defaultOpen={false} />
      </section>

      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
        <RunStatusLine runState={c.runState} />
        <div className="flex items-center gap-2 ml-auto">
          <SaveButton onClick={c.save} state={c.saveState} isDirty={c.isDirty} />
          <RunButton onClick={c.run} runState={c.runState} />
        </div>
      </div>
    </div>
  );
}
