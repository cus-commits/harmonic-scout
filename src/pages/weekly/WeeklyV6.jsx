// v6 — Accordion per-partner switcher, airy padding, always-expanded filters, subtle bg sections.
import React from 'react';
import { WEEKLY_PARTNERS } from './sharedWeekly';
import useWeeklyController from './useWeeklyController';
import {
  PromptArea, ContextArea, FilterSection, CorpusPill, LastRunLine,
  SaveButton, RunButton, RunStatusLine,
} from './weeklyPanels';

export default function WeeklyV6() {
  const c = useWeeklyController();
  if (c.loading) return <div className="p-12 text-muted text-sm">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-5 py-7 space-y-2.5">
      {WEEKLY_PARTNERS.map(p => {
        const a = c.partners[p.id];
        const open = p.id === c.activeId;
        return (
          <div
            key={p.id}
            className={`rounded-xl border transition-colors ${
              open ? 'border-accent/30 bg-card/40' : 'border-border/25 bg-card/15 hover:border-accent/20'
            }`}
          >
            <button
              type="button"
              onClick={() => c.setActiveId(open ? null : p.id)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl leading-none">{p.emoji}</span>
                <div>
                  <p className="text-[14px] font-bold text-bright">{p.name}</p>
                  <LastRunLine partner={a} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CorpusPill size={a?.lastCorpusSize} />
                <span className="text-muted/60 text-[12px]">{open ? '▾' : '▸'}</span>
              </div>
            </button>

            {open && a && (
              <div className="px-4 pb-5 pt-1 space-y-4 border-t border-border/15">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted/60 font-mono font-semibold mb-1.5">Search prompt</p>
                  <PromptArea value={a.searchPrompt} onChange={(v) => c.updateActive({ searchPrompt: v })} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted/60 font-mono font-semibold mb-1.5">Context</p>
                  <ContextArea value={a.context} onChange={(v) => c.updateActive({ context: v })} />
                </div>
                <FilterSection filters={a.filters} toggleMulti={c.toggleFilterMulti} updateOne={c.updateFilter} variant="inline" />
                <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                  <RunStatusLine runState={c.runState} />
                  <div className="flex items-center gap-2 ml-auto">
                    <SaveButton onClick={c.save} state={c.saveState} isDirty={c.isDirty} />
                    <RunButton onClick={c.run} runState={c.runState} />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
