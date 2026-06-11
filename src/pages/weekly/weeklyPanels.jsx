// Building-block components shared by every iteration. They render in a
// "neutral" Tailwind style so iteration files can wrap them in whatever
// container / spacing / accent treatment they want.

import React, { useState } from 'react';
import { SECTORS, STAGES, GEOS, MODELS, SIGNALS, corpusLabel, formatLastRun } from './sharedWeekly';

// ---- Corpus pill ----

const toneStyles = {
  warn:  { bg: 'bg-accent/10',  border: 'border-accent/30', text: 'text-accent',  dot: 'bg-accent' },
  ok:    { bg: 'bg-bo/10',      border: 'border-bo/25',     text: 'text-bo',      dot: 'bg-bo' },
  ideal: { bg: 'bg-sm/10',      border: 'border-sm/30',     text: 'text-sm',      dot: 'bg-sm' },
  idle:  { bg: 'bg-card-hi/40', border: 'border-border/30', text: 'text-muted',   dot: 'bg-muted/50' },
};

export function CorpusPill({ size }) {
  const lbl = corpusLabel(size);
  const t = toneStyles[lbl.tone];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10.5px] font-mono font-semibold px-2 py-1 rounded-full border ${t.bg} ${t.border} ${t.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
      {lbl.text}
    </span>
  );
}

// ---- Last-run line ----

export function LastRunLine({ partner, className = '' }) {
  const count = partner?.lastRunResultCount ?? partner?.lastRunCount;
  const text = formatLastRun(partner?.lastRunAt, count);
  return (
    <span className={`text-[10.5px] text-muted/70 font-mono ${className}`}>{text}</span>
  );
}

// ---- Green/red enable toggle ----
// One per partner search. Green = cron will fire it weekly; red = paused.

export function EnableToggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      title={enabled ? 'Weekly auto-run is ON — click to disable' : 'Weekly auto-run is OFF — click to enable'}
      className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border transition-colors ${
        enabled
          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/25'
          : 'bg-rose/15 border-rose/50 text-rose hover:bg-rose/25'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-rose'}`} />
      {enabled ? 'ENABLED' : 'DISABLED'}
    </button>
  );
}

// ---- Search prompt textarea ----

export function PromptArea({ value, onChange, rows = 5, placeholder }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder || 'Describe what kinds of companies you want to surface this week.'}
      className="w-full bg-ink/60 border border-border/30 rounded-lg px-3 py-2 text-[12.5px] text-bright outline-none focus:border-accent/50 placeholder:text-muted/40 leading-relaxed resize-y"
    />
  );
}

export function ContextArea({ value, onChange, rows = 8, placeholder }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder || 'Paste any context, notes, links, prior conversation snippets — anything that should bias the reasoning.'}
      className="w-full bg-ink/60 border border-border/30 rounded-lg px-3 py-2 text-[12.5px] text-bright outline-none focus:border-accent/50 placeholder:text-muted/40 leading-relaxed resize-y"
    />
  );
}

// ---- Multi-select chip group ----

function ChipGroup({ options, selected, onToggle, label }) {
  const sel = selected || [];
  return (
    <div>
      {label && <p className="text-[10px] uppercase tracking-wider text-muted/60 font-mono font-semibold mb-1.5">{label}</p>}
      <div className="flex flex-wrap gap-1">
        {options.map(opt => {
          const on = sel.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`text-[10.5px] px-2 py-1 rounded-full border transition-colors ${
                on
                  ? 'bg-accent/20 border-accent/50 text-accent'
                  : 'bg-card-hi/50 border-border/30 text-bright/70 hover:text-bright hover:border-accent/30'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- Text field ----

function TextField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-muted/60 font-mono font-semibold mb-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-ink/60 border border-border/30 rounded-lg px-2.5 py-1.5 text-[11.5px] text-bright outline-none focus:border-accent/50 placeholder:text-muted/40"
      />
    </div>
  );
}

// ---- Filters block — the inner body that every iteration uses ----

export function FilterBody({ filters, toggleMulti, updateOne }) {
  const f = filters || {};
  return (
    <div className="space-y-3">
      <ChipGroup label="Sectors" options={SECTORS} selected={f.sectors} onToggle={(v) => toggleMulti('sectors', v)} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ChipGroup label="Stages" options={STAGES} selected={f.stages} onToggle={(v) => toggleMulti('stages', v)} />
        <ChipGroup label="Geos" options={GEOS} selected={f.geos} onToggle={(v) => toggleMulti('geos', v)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ChipGroup label="Models" options={MODELS} selected={f.models} onToggle={(v) => toggleMulti('models', v)} />
        <ChipGroup label="Signals" options={SIGNALS} selected={f.signals} onToggle={(v) => toggleMulti('signals', v)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <TextField label="Max Raised" value={f.maxRaised} onChange={(v) => updateOne('maxRaised', v)} placeholder="$5M" />
        <TextField label="Max Valuation" value={f.maxValuation} onChange={(v) => updateOne('maxValuation', v)} placeholder="$25M" />
        <TextField label="Founded After" value={f.foundedAfter} onChange={(v) => updateOne('foundedAfter', v)} placeholder="2024" />
        <TextField label="Min Team" value={f.minTeam} onChange={(v) => updateOne('minTeam', v)} placeholder="2" type="number" />
        <TextField label="Max Team" value={f.maxTeam} onChange={(v) => updateOne('maxTeam', v)} placeholder="40" type="number" />
        <TextField label="Keywords" value={f.keywords} onChange={(v) => updateOne('keywords', v)} placeholder="agent infra" />
        <TextField label="Exclude" value={f.excludeKeywords} onChange={(v) => updateOne('excludeKeywords', v)} placeholder="staking, casino" />
      </div>
    </div>
  );
}

// ---- Filter section with optional collapse ----

export function FilterSection({ filters, toggleMulti, updateOne, defaultOpen = false, variant = 'card' }) {
  const [open, setOpen] = useState(defaultOpen);
  // variant 'card' = bordered, 'flat' = no border, 'inline' = always expanded
  if (variant === 'inline') {
    return <FilterBody filters={filters} toggleMulti={toggleMulti} updateOne={updateOne} />;
  }
  const wrap = variant === 'flat'
    ? 'rounded-lg'
    : 'rounded-lg border border-border/25 bg-card/40';
  return (
    <div className={wrap}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-[11.5px] font-semibold text-bright/85">Filters</span>
        <span className="text-[10px] text-muted/60 font-mono">{open ? '▾ hide' : '▸ show'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1">
          <FilterBody filters={filters} toggleMulti={toggleMulti} updateOne={updateOne} />
        </div>
      )}
    </div>
  );
}

// ---- Save / Run buttons ----

export function SaveButton({ onClick, state, isDirty }) {
  const labels = {
    idle: isDirty ? 'Save changes' : 'Saved',
    saving: 'Saving…',
    saved: 'Saved ✓',
    error: 'Save failed — retry',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === 'saving' || (!isDirty && state === 'idle')}
      className={`text-[11.5px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
        state === 'error'
          ? 'border-rose/40 text-rose hover:bg-rose/10'
          : isDirty
            ? 'border-accent/40 text-accent hover:bg-accent/10'
            : 'border-border/30 text-muted/60'
      }`}
    >
      {labels[state]}
    </button>
  );
}

export function RunButton({ onClick, runState }) {
  const running = runState.status === 'running' || runState.status === 'starting';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={running}
      className={`text-[12px] font-bold px-4 py-2 rounded-lg border transition-colors ${
        running
          ? 'border-bo/40 bg-bo/10 text-bo cursor-not-allowed'
          : 'border-accent/50 bg-accent/15 text-accent hover:bg-accent/25'
      }`}
    >
      {running ? (
        <span className="inline-flex items-center gap-2">
          <span className="w-2.5 h-2.5 border-2 border-bo border-t-transparent rounded-full animate-spin" />
          {runState.message || 'Running…'}
        </span>
      ) : (
        "Run this week's search"
      )}
    </button>
  );
}

// ---- Run-status inline line (under buttons) ----

export function RunStatusLine({ runState }) {
  if (runState.status === 'idle') return null;
  if (runState.status === 'done') {
    return <span className="text-[10.5px] text-sm font-mono">Done</span>;
  }
  if (runState.status === 'error') {
    return <span className="text-[10.5px] text-rose font-mono">{runState.message}</span>;
  }
  if (runState.status === 'running' || runState.status === 'starting') {
    const pct = typeof runState.progress === 'number' ? ` · ${Math.round(runState.progress)}%` : '';
    return <span className="text-[10.5px] text-bo/80 font-mono">{runState.message}{pct}</span>;
  }
  return null;
}
