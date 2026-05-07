import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

// Deep Search has been integrated into Super Search.
// This component just redirects, preserving any baseline params.
export default function DeepSearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams();
    const name = searchParams.get('name');
    const id = searchParams.get('id');
    const logo = searchParams.get('logo');
    if (name) params.set('baselineName', name);
    if (id) params.set('baselineId', id);
    if (logo) params.set('baselineLogo', logo);
    navigate(`/super${params.toString() ? '?' + params.toString() : ''}`, { replace: true });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-muted/50">Redirecting to Super Search…</p>
      </div>
    </div>
  );
}
