import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProjectError, projectFile } from './project-store.js';

export interface ProjectConfig {
  jurisdiction: 'CN' | 'US' | 'PCT'; projectDir: string; outputLanguage: 'auto' | 'en' | 'zh';
  figures: { preferredBackend: 'auto' | 'svg' | 'imagegen' | 'mermaid' | 'plantuml' }; remoteTools: false;
}
export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  jurisdiction: 'CN', projectDir: 'projects', outputLanguage: 'auto', figures: { preferredBackend: 'auto' }, remoteTools: false,
};
export function effectiveConfig(workspace: string | undefined, project: string, options: Record<string, unknown>): ProjectConfig {
  const config = structuredClone(DEFAULT_PROJECT_CONFIG);
  const layers: unknown[] = [];
  for (const file of [workspace ? projectFile(workspace, '.oh-my-patent/config.json') : undefined, projectFile(project, '.patent/config.json')]) if (file && existsSync(file)) layers.push(JSON.parse(readFileSync(file, 'utf8')));
  layers.push(Object.fromEntries(Object.entries(options).filter(([key]) => Object.prototype.hasOwnProperty.call(DEFAULT_PROJECT_CONFIG, key))));
  for (const layer of layers) {
    if (!layer || typeof layer !== 'object' || Array.isArray(layer)) throw new ProjectError('INVALID_INPUT', 'Configuration must be an object');
    for (const [key, value] of Object.entries(layer)) {
      if (!Object.prototype.hasOwnProperty.call(DEFAULT_PROJECT_CONFIG, key)) throw new ProjectError('INVALID_INPUT', `Unknown configuration: ${key}`);
      if (key === 'jurisdiction' && !['CN', 'US', 'PCT'].includes(value)) throw new ProjectError('INVALID_INPUT', 'Invalid jurisdiction');
      if (key === 'outputLanguage' && !['auto', 'zh', 'en'].includes(value)) throw new ProjectError('INVALID_INPUT', 'Invalid outputLanguage');
      if (key === 'remoteTools' && value !== false) throw new ProjectError('INVALID_INPUT', 'Configuration cannot enable content disclosure');
      if (key === 'projectDir' && (typeof value !== 'string' || !value.trim() || /^[a-zA-Z]:|^[\/\\]|(^|[\/\\])\.\.([\/\\]|$)/.test(value))) throw new ProjectError('INVALID_INPUT', 'projectDir must be workspace-relative');
      if (key === 'figures') {
        if (!value || typeof value !== 'object' || Object.keys(value).some(k => k !== 'preferredBackend') || !['auto', 'svg', 'imagegen', 'mermaid', 'plantuml'].includes(value.preferredBackend)) throw new ProjectError('INVALID_INPUT', 'Invalid figure preference');
        config.figures = { preferredBackend: value.preferredBackend };
      } else Object.assign(config, { [key]: value });
    }
  }
  return config;
}
