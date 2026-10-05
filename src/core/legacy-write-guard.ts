import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { ProjectError } from './project-store.js';
/** Older APIs remain available for legacy projects, never for coordinated projects. */
export function assertLegacyWriter(root: string): void {
  const file = join(root, '.patent/state.json');
  if (existsSync(join(root, '.patent/write.lock'))) throw new ProjectError('LOCKED', 'Project is being written');
  if (existsSync(file) && JSON.parse(readFileSync(file, 'utf8')).schema_version !== undefined) throw new ProjectError('INVALID_STATE', 'Versioned projects require the Skill runtime JSON interface (oh-my-patent runtime --input request.json)');
}
export function assertLegacyOutput(directory: string): void {
  let current = resolve(directory);
  while (true) {
    assertLegacyWriter(current);
    if (dirname(current) === current) return;
    current = dirname(current);
  }
}
