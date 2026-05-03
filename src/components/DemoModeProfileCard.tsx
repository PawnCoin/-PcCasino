import { AlertTriangle } from 'lucide-react';

interface DemoModeProfileCardProps {
  demoMode?: boolean;
}

export function DemoModeProfileCard({ demoMode }: DemoModeProfileCardProps) {
  if (!demoMode) return null;
  return (
    <div
      data-testid="demo-mode-profile-card"
      className="p-4 rounded-xl flex gap-3 items-start"
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.05))',
        border: '1px solid rgba(245,158,11,0.5)',
      }}
    >
      <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#fbbf24]" />
      <div className="space-y-1">
        <div className="text-sm font-bold text-[#fcd34d]">Demo Mode Active</div>
        <p className="text-xs text-[#fde68a] leading-relaxed">
          All $Pc balances on this site are play money. No real $Pc can be deposited or withdrawn yet, and
          balances will be reset before launch.
        </p>
        <p className="text-[10px] text-[#fbbf24]/70 mt-1">
          Last updated by team: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
