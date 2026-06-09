// v3 — Segmented control switcher, compact density, drawer-style filters, borderless flat sections.
import React, { useState } from 'react';
import { WEEKLY_PARTNERS } from './sharedWeekly';
import useWeeklyController from './useWeeklyController';
import {
  PromptArea, ContextArea, FilterBody, CorpusPill, LastRunLine,
  SaveButton, RunButton, RunStatusLine,
} from './weeklyPanels';

export default function WeeklyV3() {
  const c = useWeeklyController();
  const [drawer, setDrawer] = useState(false);
  if (c.loading) return <div className="p-12 text-muted text-sm">Loading…</div>;
  const a = c.active;

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      {/* Segmented control */}
      <div className="inline-flex p-0.5 rounded-lg border border-border/30 bg-card/40 overflow-x-auto max-w-full">
        {WEEKLY_PARTNERS.map(p => {
          const active = p.id === c.activeId;
          return (
            <button
              key={p.id}
              onClick={() => c.setActiveId(p.id)}
              className={`text-[11.5px] font-semibold px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
                active ? 'bg-accent/20 text-accent' : 'text-bright/60 hover:text-bright'
              }`}
            >
              <span className="text-sm leading-none">{p.emoji}</span>
              {p.name}
            </button>
          );
        })}
      </div>

      {/* Compact header */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
        <h1 className="text-[18px] font-bold text-bright">
          <span className="mr-2">{a.emoji}</span>{a.name}'s weekly search
        </h1>
        <div className="flex items-center gap-2">
          <LastRunLine partner={a} />
          <CorpusPill size={a.lastCorpusSize} />
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted/60 font-mono font-semibold mb-1">Search prompt</p>
        <PromptArea value={a.searchPrompt} onChange={(v) => c.updateActive({ searchPrompt: v })} rows={4} />
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted/60 font-mono font-semibold mb-1">Context</p>
        <ContextArea value={a.context} onChange={(v) => c.updateActive({ context: v })} rows={6} />
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          className="text-[11.5px] font-semibold px-3 py-1.5 rounded-lg border border-border/30 text-bright/80 hover:border-accent/30 hover:text-bright"
        >
          Advanced filters →
        </button>
        <div className="flex items-center gap-2 ml-auto">
          <RunStatusLine runState={c.runState} />
          <SaveButton onClick={c.save} state={c.saveState} isDirty={c.isDirty} />
          <RunButton onClick={c.run} runState={c.runState} />
        </div>
      </div>

      {/* Drawer */}
      {drawer && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setDrawer(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-[61] w-[480px] max-w-[92vw] bg-card border-l border-border/30 overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border/20 px-4 py-3 flex items-center justify-between z-10">
              <h2 className="text-[14px] font-bold text-bright">Filters · {a.name}</h2>
              <button onClick={() => setDrawer(false)} className="text-muted/70 hover:text-bright text-xl leading-none">×</button>
            </div>
            <div className="p-4 pb-24">
              <FilterBody filters={a.filters} toggleMulti={c.toggleFilterMulti} updateOne={c.updateFilter} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
