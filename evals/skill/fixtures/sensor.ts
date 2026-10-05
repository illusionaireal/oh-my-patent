/** Fictional local algorithm for code-analysis/refactoring scenarios. */
export function median(values: readonly number[]): number | null {
  const sorted = values.filter(Number.isFinite).slice(-8).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
