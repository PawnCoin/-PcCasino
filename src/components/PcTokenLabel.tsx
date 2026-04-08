interface PcTokenLabelProps {
  amount?: string | number;
  className?: string;
  size?: number;
}

export function PcTokenLabel({ amount, className, size }: PcTokenLabelProps) {
  return (
    <span
      className={className}
      style={{
        color: '#FFFFFF',
        fontWeight: 800,
        fontSize: size,
        textShadow: '0 0 8px rgba(255,215,0,0.9), 0 0 16px rgba(255,180,0,0.6), 0 0 2px rgba(255,255,255,1)',
        letterSpacing: '0.03em',
      }}
    >
      {amount !== undefined
        ? `$Pc ${typeof amount === 'number' ? amount.toLocaleString() : amount}`
        : '$Pc'}
    </span>
  );
}
