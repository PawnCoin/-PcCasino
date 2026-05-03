import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const DISMISS_KEY = 'pc_demo_banner_dismissed_v1';

interface DemoModeBannerProps {
  demoMode?: boolean;
}

export function DemoModeBanner({ demoMode }: DemoModeBannerProps) {
  const [serverDemo, setServerDemo] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof demoMode === 'boolean') return;
    let cancelled = false;
    fetch('/api/demo-mode')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d) setServerDemo(!!d.demoMode); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [demoMode]);

  const isDemo = typeof demoMode === 'boolean' ? demoMode : serverDemo;
  if (!isDemo || dismissed) return null;

  const handleDismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setDismissed(true);
  };

  return (
    <div
      data-testid="demo-mode-site-banner"
      className="sticky top-0 z-[100] w-full px-4 py-2 flex items-center justify-center gap-3 text-sm"
      style={{
        background: 'linear-gradient(90deg, rgba(245,158,11,0.18), rgba(245,158,11,0.28), rgba(245,158,11,0.18))',
        borderBottom: '1px solid rgba(245,158,11,0.55)',
        color: '#fde68a',
        backdropFilter: 'blur(6px)',
      }}
    >
      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#fbbf24]" />
      <span className="text-center leading-snug">
        <strong className="text-[#fcd34d] font-bold">Demo Mode —</strong>{' '}
        All $Pc balances on this site are play money. No real $Pc can be deposited or withdrawn yet, and balances will be reset before launch.
      </span>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss demo mode banner"
        className="ml-2 p-1 rounded hover:bg-amber-500/20 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
