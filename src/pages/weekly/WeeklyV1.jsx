// v1 — Horizontal pill tabs, airy padding, collapsible card filters, per-partner emoji-tinted accent.
import React from 'react';
import { WEEKLY_PARTNERS } from './sharedWeekly';
import useWeeklyController from './useWeeklyController';
import {
  PromptArea, ContextArea, FilterSection, CorpusPill, LastRunLine,
  SaveButton, RunButton, RunStatusLine,
} from './weeklyPanels';

export default function WeeklyV1() {
  const c = useWeeklyController();

  if (c.loading) return <Loading />;
  const a = c.active;

  return (
    <div className="max-w-4xl mx-auto px-5 py-8 space-y-7">
      {/* Partner switcher — horizontal pills */}
      <div className="flex flex-wrap gap-1.5">
        {WEEKLY_PARTNERS.map(p => {
          const active = p.id === c.activeId;
          return (
            <button
              key={p.id}
              onClick={() => c.setActiveId(p.id)}
              className={`text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
                active
                  ? 'border-accent/50 bg-accent/15 text-accent'
                  : 'border-border/30 bg-card/40 text-bright/70 hover:text-bright hover:border-accent/30'
              }`}
            >
              <span className="text-base leading-none">{p.emoji}</span>
              {p.name}
            </button>
          );
        })}
      </div>

      {/* Active partner header */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none">{a.emoji}</span>
          <div>
            <h1 className="text-[22px] font-bold text-bright tracking-tight">{a.name}'s weekly search</h1>
            <LastRunLine partner={a} />
          </div>
        </div>
        <CorpusPill size={a.lastCorpusSize} />
      </header>

      {/* Prompt */}
      <section className="space-y-1.5">
        <label className="text-[11px] uppercase tracking-wider text-muted/70 font-mono font-semibold">Search prompt</label>
        <PromptArea value={a.searchPrompt} onChange={(v) => c.updateActive({ searchPrompt: v })} />
      </section>

      {/* Context */}
      <section className="space-y-1.5">
        <label className="text-[11px] uppercase tracking-wider text-muted/70 font-mono font-semibold">Context</label>
        <ContextArea value={a.context} onChange={(v) => c.updateActive({ context: v })} />
      </section>

      {/* Filters */}
      <FilterSection filters={a.filters} toggleMulti={c.toggleFilterMulti} updateOne={c.updateFilter} defaultOpen={false} variant="card" />

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
        <RunStatusLine runState={c.runState} />
        <div className="flex items-center gap-2 ml-auto">
          <SaveButton onClick={c.save} state={c.saveState} isDirty={c.isDirty} />
          <RunButton onClick={c.run} runState={c.runState} />
        </div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-5 py-12 text-muted text-sm">Loading partner searches…</div>
  );
}
