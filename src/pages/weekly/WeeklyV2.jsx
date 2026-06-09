// v2 — Vertical sidebar partner list, standard density, always-expanded filters,
// subtle bordered card. Now canonical Weekly page. Adds ETA + progress strip and
// the dynamic Context Emphasis (sliders + Auto-vary + Preview-next-roll) section.
import React, { useEffect, useState } from 'react';
import {
  WEEKLY_PARTNERS,
  previewWeights,
  parseContextChunks,
  formatEtaRange,
  formatNextRun,
  formatElapsedMin,
  formatRolledRelative,
} from './sharedWeekly';
import useWeeklyController from './useWeeklyController';
import {
  PromptArea, ContextArea, FilterSection, CorpusPill, LastRunLine,
  SaveButton, RunButton, RunStatusLine,
} from './weeklyPanels';

// ---- ETA / progress strip ----

function EtaLine({ partner }) {
  const eta = formatEtaRange(partner?.etaMinMinutes, partner?.etaMaxMinutes);
  const when = formatNextRun(partner?.nextRunAt);
  if (!when && !eta) return null;
  return (
    <p className="text-[11px] text-muted/70 font-mono">
      Next auto-run: {when || '—'}{eta ? ` · ${eta}` : ''}
    </p>
  );
}

function ProgressStrip({ runState }) {
  if (runState.status !== 'running' && runState.status !== 'starting') return null;
  const phase = runState.phase || runState.message || 'Running';
  const counter = (runState.current != null && runState.total)
    ? `${runState.current} / ${runState.total}`
    : null;
  const elapsed = formatElapsedMin(runState.startedAt);
  const pct = typeof runState.progress === 'number' ? Math.max(0, Math.min(100, runState.progress)) : null;
  return (
    <div className="space-y-1">
      <p className="text-[11px] text-bo/85 font-mono">
        Phase: {phase}
        {counter ? ` · ${counter}` : ''}
        {elapsed ? ` · ${elapsed}` : ''}
      </p>
      {pct != null && (
        <div className="h-1 w-full bg-card-hi/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-bo/70 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ---- Single chunk row ----

function ChunkRow({ chunk, overlayWeight, onWeight, onToggleLock }) {
  const w = overlayWeight != null ? overlayWeight : (chunk.weight ?? 50);
  // Subtle color encoding: low = muted, mid = neutral, high = accent. No glow.
  let tone = 'text-muted/70 border-border/30';
  if (w >= 70) tone = 'text-accent border-accent/40';
  else if (w >= 40) tone = 'text-bright/80 border-border/40';
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span
        title={chunk.text}
        className="flex-1 min-w-0 truncate text-[11.5px] text-bright/80"
      >
        {chunk.text}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={w}
        onChange={(e) => onWeight(chunk.id, Number(e.target.value))}
        disabled={overlayWeight != null}
        className="w-40 accent-accent"
      />
      <span className={`text-[10px] font-mono w-10 text-right border rounded px-1 py-0.5 ${tone}`}>{w}</span>
      <button
        type="button"
        onClick={() => onToggleLock(chunk.id)}
        title={chunk.lockedByUser ? 'Locked — will not be re-rolled' : 'Unlocked — eligible for weekly roll'}
        className={`text-[11px] w-6 h-6 rounded border transition-colors ${
          chunk.lockedByUser
            ? 'border-accent/50 text-accent bg-accent/10'
            : 'border-border/30 text-muted/70 hover:text-bright'
        }`}
      >
        {chunk.lockedByUser ? '🔒' : '🔓'}
      </button>
    </div>
  );
}

// ---- Context-emphasis section ----

function ContextEmphasis({ partner, partnerId, controller }) {
  const chunks = partner?.contextChunks && partner.contextChunks.length > 0
    ? partner.contextChunks
    : parseContextChunks(partner?.context || '');
  const [overlay, setOverlay] = useState(null); // { weightsByChunkId, generatedAt }
  const [loadingPreview, setLoadingPreview] = useState(false);
  const rolled = formatRolledRelative(partner?.weeklyAppliedAt);

  async function handlePreview() {
    if (loadingPreview) return;
    setLoadingPreview(true);
    const out = await previewWeights(partnerId);
    setLoadingPreview(false);
    if (!out) return;
    // Accept either `weights` (array of {chunkId, weight}) or a plain object map.
    let map = {};
    if (Array.isArray(out.weights)) {
      for (const w of out.weights) {
        if (w && w.chunkId != null) map[w.chunkId] = w.weight;
      }
    } else if (out.weights && typeof out.weights === 'object') {
      map = out.weights;
    } else if (out.weightsByChunkId) {
      map = out.weightsByChunkId;
    }
    setOverlay({ weightsByChunkId: map });
  }

  function applyOverlay() {
    if (!overlay) return;
    controller.applyPreviewWeights(overlay.weightsByChunkId);
    setOverlay(null);
  }

  const headerBadge = partner?.weeklyAppliedWeights
    ? `This week's roll: rolled ${rolled || 'recently'}`
    : 'Not yet rolled';

  const autoVary = partner?.autoVaryWeekly !== false;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[11px] uppercase tracking-wider text-muted/70 font-mono font-semibold">Context emphasis</p>
        <span className="text-[10px] text-muted/60 font-mono px-2 py-0.5 border border-border/30 rounded-full bg-card-hi/30">
          {headerBadge}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoVary}
            onChange={(e) => controller.setAutoVary(e.target.checked)}
            className="accent-accent"
          />
          <span className="text-[11.5px] text-bright/85 font-semibold">Auto-vary weekly</span>
        </label>
        <button
          type="button"
          onClick={handlePreview}
          disabled={loadingPreview || chunks.length === 0}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border/40 text-bright/80 hover:border-accent/40 hover:text-accent disabled:opacity-50"
        >
          {loadingPreview ? 'Loading…' : "Preview next week's roll"}
        </button>
      </div>

      <p className="text-[10.5px] text-muted/60">
        {autoVary
          ? "If your prompt + context don't change, emphasis rotates each Monday so results don't stagnate."
          : 'Emphasis stays fixed. Edit each slider directly.'}
      </p>

      <div className="rounded-lg border border-border/25 bg-ink/40 px-3 py-1 divide-y divide-border/10">
        {chunks.length === 0 ? (
          <p className="text-[11px] text-muted/60 py-3">Add context above to weight emphasis.</p>
        ) : (
          chunks.map((ch) => (
            <ChunkRow
              key={ch.id}
              chunk={ch}
              overlayWeight={overlay?.weightsByChunkId?.[ch.id]}
              onWeight={controller.updateChunkWeight}
              onToggleLock={controller.toggleChunkLock}
            />
          ))
        )}
      </div>

      {overlay && (
        <div className="rounded-lg border border-accent/40 bg-accent/5 px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11px] text-accent/90 font-mono">
            Preview overlay — suggested weights for next week's roll. Apply to keep them, or dismiss to revert.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOverlay(null)}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border/40 text-bright/80 hover:text-bright"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={applyOverlay}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-accent/50 bg-accent/15 text-accent hover:bg-accent/25"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WeeklyV2() {
  const c = useWeeklyController();
  // Force a tick so elapsed-minutes counter advances while a scan runs.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (c.runState.status !== 'running' && c.runState.status !== 'starting') return;
    const t = setInterval(() => setTick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, [c.runState.status]);

  if (c.loading) return <div className="p-12 text-muted text-sm">Loading…</div>;
  const a = c.active;
  const showEta = c.runState.status !== 'running' && c.runState.status !== 'starting';

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
            <ContextArea
              value={a.context}
              onChange={(v) => { c.updateActive({ context: v }); c.scheduleContextSync(v); }}
            />
          </div>
          <ContextEmphasis partner={a} partnerId={c.activeId} controller={c} />
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted/70 font-mono font-semibold mb-2">Filters</p>
            <FilterSection filters={a.filters} toggleMulti={c.toggleFilterMulti} updateOne={c.updateFilter} variant="inline" />
          </div>
        </div>

        <div className="space-y-2">
          {showEta ? <EtaLine partner={a} /> : <ProgressStrip runState={c.runState} />}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <RunStatusLine runState={c.runState} />
            <div className="flex items-center gap-2 ml-auto">
              <SaveButton onClick={c.save} state={c.saveState} isDirty={c.isDirty} />
              <RunButton onClick={c.run} runState={c.runState} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
