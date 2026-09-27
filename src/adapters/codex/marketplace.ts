import { isDeepStrictEqual } from 'node:util';

type Marketplace = Record<string, unknown> & { plugins: Record<string, unknown>[] };

function parseMarketplace(content: string): Marketplace {
  const data: unknown = JSON.parse(content);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid Codex marketplace');
  }
  const plugins = (data as Record<string, unknown>).plugins;
  if (!Array.isArray(plugins) || !plugins.every(entry =>
    entry && typeof entry === 'object' && !Array.isArray(entry) && typeof entry.name === 'string')) {
    throw new Error('Invalid Codex marketplace plugins');
  }
  return data as Marketplace;
}

/** Add our registration without replacing someone else's entry or metadata. */
export function mergeMarketplace(existing: string, generated: string): string {
  const data = parseMarketplace(existing);
  const owned = parseMarketplace(generated).plugins[0];
  const matches = data.plugins.filter(entry => entry.name === owned.name);
  if (matches.some(entry => !isDeepStrictEqual(entry, owned))) {
    throw new Error('Conflicting Codex marketplace registration; existing file preserved');
  }
  if (matches.length === 0) data.plugins.push(owned);
  return JSON.stringify(data, null, 2) + '\n';
}

/** Remove only an unchanged registration; preserve unrelated entries and fields. */
export function removeMarketplaceEntry(existing: string, generated: string): string | null {
  const data = parseMarketplace(existing);
  const owned = parseMarketplace(generated).plugins[0];
  const remaining = data.plugins.filter(entry => !isDeepStrictEqual(entry, owned));
  if (remaining.length === data.plugins.length) return null;
  return JSON.stringify({ ...data, plugins: remaining }, null, 2) + '\n';
}
