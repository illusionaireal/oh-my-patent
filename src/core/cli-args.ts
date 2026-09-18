/**
 * CLI argument parsing with prototype pollution protection
 */

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isDangerousKey(key: string): boolean {
  return DANGEROUS_KEYS.has(key);
}

export function parseArgs(argv: string[]): Record<string, string> {
  // Use null-prototype object to prevent prototype pollution via --__proto__
  const opts: Record<string, string> = Object.create(null);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      if (!key || isDangerousKey(key)) continue;
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        const val = argv[++i];
        (opts as Record<string, string>)[key] = val;
      } else {
        (opts as Record<string, string>)[key] = 'true';
      }
    }
  }
  return opts;
}
