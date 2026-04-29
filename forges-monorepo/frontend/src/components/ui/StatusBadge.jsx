import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

export default function StatusBadge() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    const check = () => {
      fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(4000) })
        .then((r) => setStatus(r.ok ? 'up' : 'down'))
        .catch(() => setStatus('down'));
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  const dot = status === 'up'
    ? 'bg-green-400 animate-pulse'
    : status === 'down'
      ? 'bg-red-400'
      : 'bg-gray-400';

  const label = status === 'up' ? 'API en ligne' : status === 'down' ? 'API hors ligne' : 'Vérification...';

  /* eslint-disable no-undef */
  const commit = typeof __COMMIT_SHA__ !== 'undefined' ? __COMMIT_SHA__ : 'local';
  /* eslint-enable no-undef */

  return (
    <div className="inline-flex items-center gap-2 text-xs text-subtext bg-white border border-border rounded-full px-3 py-1 shadow-sm">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span>{label}</span>
      <span className="text-border">|</span>
      <span className="font-mono">{commit}</span>
    </div>
  );
}
