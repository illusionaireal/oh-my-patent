/** Installed checks have no dependency on the source tree or CLI installation. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { GENERATED_MARKER } from './generated-marker.js';
import type { InitCheckHost } from '../core/init-checker.js';

export function checkRuntimePath(host: InitCheckHost): string {
  return join('.oh-my-patent', 'runtime', host, 'check.mjs');
}

export function checkRuntimeContent(): string {
  // src/adapters and dist/adapters occupy the same depth below the package root.
  const packageRoot = fileURLToPath(new URL('../../', import.meta.url));
  return `// ${GENERATED_MARKER}\n${readFileSync(join(packageRoot, 'dist/runtime/check.mjs'), 'utf8')}`;
}

export function renderCheckPrompt(content: string, host: InitCheckHost): string {
  return content.split('{{PATENT_CHECK_SCRIPT}}').join(`.oh-my-patent/runtime/${host}/check.mjs`);
}
