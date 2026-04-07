export function formatPcAmount(n: number): string {
  if (n >= 1_000_000_000) return `${parseFloat((n / 1_000_000_000).toFixed(3))}B`;
  if (n >= 1_000_000)     return `${parseFloat((n / 1_000_000).toFixed(2))}M`;
  if (n >= 1_000)         return `${parseFloat((n / 1_000).toFixed(1))}K`;
  return n.toLocaleString();
}
