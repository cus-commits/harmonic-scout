// v5 — Big icon row switcher, compact density, collapsible flat filters, single neutral accent.
import React from 'react';
import { WEEKLY_PARTNERS } from './sharedWeekly';
import useWeeklyController from './useWeeklyController';
import {
  PromptArea, ContextArea, FilterSection, CorpusPill, LastRunLine,
  SaveButton, RunButton, RunStatusLine,
} from './weeklyPanels';

export default function WeeklyV5() {
  const c = useWeeklyController();
  if (c.loading) return <div className="p-12 text-muted text-sm">Loading…</div>;
  const a = c.active;

  return (
    <div className="max-w-3xl mx-auto px-3 py-5 space-y-4">
      {/* Icon-row switcher */}
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKLY_PARTNERS.map(p => {
          const active = p.id === c.activeId;
          return (
            <button
              key={p.id}
              onClick={() => c.setActiveId(p.id)}
              className={`flex flex-col items-center gap-0.5 py-2 rounded-lg border transition-colors ${
                active
                  ? 'border-bright/30 bg-bright/5 text-bright'
                  : 'border-border/25 text-bright/60 hover:text-bright hover:border-bright/20'
              }`}
            >
              <span className="text-xl leading-none">{p.emoji}</span>
              <span className="text-[10px] font-semibold">{p.name}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-[16px] font-bold text-bright">{a.name}'s weekly search</h1>
        <div className="flex items-center gap-2">
          <LastRunLine partner={a} />
          <CorpusPill size={a.lastCorpusSize} />
        </div>
      </div>

      <PromptArea value={a.searchPrompt} onChange={(v) => c.updateActive({ searchPrompt: v })} rows={3} placeholder="Search prompt…" />
      <ContextArea value={a.context} onChange={(v) => c.updateActive({ context: v })} rows={5} placeholder="Context — links, notes, paste anything…" />

      <FilterSection filters={a.filters} toggleMulti={c.toggleFilterMulti} updateOne={c.updateFilter} variant="flat" defaultOpen={false} />

      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
        <RunStatusLine runState={c.runState} />
        <div className="flex items-center gap-2 ml-auto">
          <SaveButton onClick={c.save} state={c.saveState} isDirty={c.isDirty} />
          <RunButton onClick={c.run} runState={c.runState} />
        </div>
      </div>
    </div>
  );
}
