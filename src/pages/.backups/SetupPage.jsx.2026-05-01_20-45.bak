import React, { useState, useEffect } from 'react';
import { validateKey } from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL || 'https://pigeon-api.up.railway.app';

export default function SetupPage({ onComplete }) {
  // Pre-fill from localStorage if user entered before
  const [harmonicKey, setHarmonicKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState(() => {
    const saved = localStorage.getItem('scout_anthropic_key') || '';
    return saved && saved !== '__SERVER__' ? saved : '';
  });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [serverHarmonicKey, setServerHarmonicKey] = useState(false);
  const [maskedHKey, setMaskedHKey] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/status`)
      .then((r) => r.json())
      .then((data) => {
        if (data.hasHarmonicKey) {
          setServerHarmonicKey(true);
          setMaskedHKey(data.maskedHarmonicKey);
          localStorage.setItem('scout_harmonic_key', '__SERVER__');
        }
        // Don't auto-set Anthropic from server — always require user to enter their own
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Auto-launch only if user has entered their own Anthropic key previously
  useEffect(() => {
    if (!loading) {
      const hKey = localStorage.getItem('scout_harmonic_key');
      const aKey = localStorage.getItem('scout_anthropic_key');
      // Only auto-launch if Anthropic key is a real key (not __SERVER__)
      if (hKey && aKey && aKey !== '__SERVER__' && aKey.startsWith('sk-')) {
        onComplete();
      }
    }
  }, [loading]);

  const handleConnect = async () => {
    const hKey = serverHarmonicKey ? '__SERVER__' : harmonicKey.trim();
    const aKey = anthropicKey.trim();

    if (!hKey) {
      setError('Harmonic key is required');
      setStatus('error');
      return;
    }

    if (!aKey) {
      setError('Anthropic key is required');
      setStatus('error');
      return;
    }

    setStatus('validating');
    setError('');

    try {
      // Validate Harmonic if user entered it
      if (!serverHarmonicKey) {
        const hRes = await validateKey('harmonic', harmonicKey.trim());
        if (!hRes.valid) {
          setError(`Harmonic key invalid: ${hRes.error || 'check and try again'}`);
          setStatus('error');
          return;
        }
      }

      // Always validate Anthropic key from user input
      if (aKey !== '__SERVER__') {
        const aRes = await validateKey('anthropic', aKey);
        if (!aRes.valid) {
          setError(`Anthropic key invalid: ${aRes.error || 'check and try again'}`);
          setStatus('error');
          return;
        }
      }

      localStorage.setItem('scout_harmonic_key', hKey);
      localStorage.setItem('scout_anthropic_key', aKey);
      setStatus('success');
      setTimeout(() => onComplete(), 1200);
    } catch (err) {
      setError('Connection failed: ' + err.message);
      setStatus('error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm fade-in">
        <div className="text-center mb-10">
          <div className="text-4xl font-bold tracking-tight mb-1" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
            <span className="text-accent">dc</span>
          </div>
          <div className="text-2xl font-bold tracking-tight mb-1">
            Pigeon Finder
          </div>
          <p className="text-muted text-sm">Daxos Capital Deal Intelligence</p>
        </div>

        <div className="glass-card p-5 space-y-5">
          <div>
            <h2 className="font-bold text-lg mb-1">Connect Your Keys</h2>
            <p className="text-muted text-xs leading-relaxed">
              {serverHarmonicKey
                ? 'Harmonic is connected via server. Enter your Anthropic key to get started.'
                : 'Your keys are stored locally in this browser. They persist across sessions.'}
            </p>
          </div>

          <div className="space-y-3">
            {/* Harmonic Key */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted font-medium mb-1.5 block">
                Harmonic API Key
                {serverHarmonicKey && (
                  <span className="ml-2 text-accent">● Server connected</span>
                )}
              </label>
              {serverHarmonicKey ? (
                <div className="w-full bg-surface/50 border border-border/30 rounded-xl px-4 py-3 text-muted font-mono text-sm cursor-not-allowed select-none">
                  {maskedHKey}
                </div>
              ) : (
                <>
                  <input
                    type="password"
                    placeholder="Paste your Harmonic API key"
                    value={harmonicKey}
                    onChange={(e) => setHarmonicKey(e.target.value)}
                    className="input-base text-sm font-mono"
                    autoComplete="off"
                    disabled={status === 'validating' || status === 'success'}
                  />
                  <p className="text-[10px] text-muted mt-1">
                    Find it at{' '}
                    <a href="https://console.harmonic.ai/docs/dashboard" target="_blank" rel="noopener" className="text-accent underline">
                      console.harmonic.ai → Dashboard
                    </a>
                  </p>
                </>
              )}
            </div>

            {/* Anthropic Key — always editable */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted font-medium mb-1.5 block">
                Anthropic API Key
                {anthropicKey && <span className="ml-2 text-sky-400">● {anthropicKey.startsWith('sk-') ? 'Key saved' : ''}</span>}
              </label>
              <input
                type="password"
                placeholder="sk-ant-..."
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                className="input-base text-sm font-mono"
                autoComplete="off"
                disabled={status === 'validating' || status === 'success'}
              />
              <p className="text-[10px] text-muted mt-1">
                Find it at{' '}
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener" className="text-accent underline">
                  console.anthropic.com → API Keys
                </a>
                {' '}— stored locally only.
              </p>
            </div>
          </div>

          {/* Error message */}
          {status === 'error' && error && (
            <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 fade-in">
              {error}
            </div>
          )}

          {/* Connect button */}
          {status === 'success' ? (
            <div className="w-full py-3 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center gap-2 fade-in">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-accent font-bold text-sm">Connected — launching…</span>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={status === 'validating' || (!serverHarmonicKey && !harmonicKey.trim()) || !anthropicKey.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {status === 'validating' ? (
                <>
                  <div className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                  Validating…
                </>
              ) : (
                'Connect & Launch'
              )}
            </button>
          )}
        </div>

        <p className="text-center text-muted text-[10px] mt-6 leading-relaxed px-4">
          Keys are stored locally in your browser. <br />
          They persist across sessions — no login needed.
        </p>
      </div>
    </div>
  );
}
