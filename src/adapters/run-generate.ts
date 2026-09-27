/**
 * runAdaptGenerate - shared core of `oh-my-patent adapt generate`
 *
 * Extracted from src/cli.ts so the "definition is loaded exactly once, no
 * matter how many targets" guarantee is testable (REQ-027): cli.ts executes
 * main() at import time, so a test cannot import it, but it can import this
 * module and spy on loadPortableDef.
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { loadPortableDef, LoaderOptions } from './loader.js';
import type { PortableDef, ToolAdapter } from './types.js';
import { isDangerousKey } from '../core/cli-args.js';
import { ensureInside, ensureUnlinkedPath, isSafeRelPath } from '../core/path-safety.js';

/**
 * Loader signature — injectable so tests can count calls with a plain spy
 * instead of module mocking (REQ-027).
 */
export type LoadPortableDefFn = (options: LoaderOptions) => Promise<PortableDef>;

export interface RunAdaptGenerateOptions {
  /** Root directory of the oh-my-patent project (contains plugin.jsonc) */
  pluginDir: string;
  /** Workspace directory the definition is loaded against */
  workspaceDir: string;
  /** Adapter names to generate for; empty means all known adapters */
  toolName?: string;
  /** With --output, each adapter gets its own subdirectory under this root */
  outputDir?: string;
  /** Adapters to consider; defaults to the three built-ins */
  adapters?: ToolAdapter[];
  /** Definition loader; defaults to the real loadPortableDef. Injectable for tests. */
  loadDef?: LoadPortableDefFn;
}

/**
 * Generate adapter artifacts for one or more tools.
 *
 * `loadPortableDef` is called ONCE, outside the per-target loop (REQ-027):
 * inside the loop it re-read plugin.jsonc / opencode.jsonc / every agent .md
 * once per target, and any change between iterations could hand different
 * definitions to different adapters.
 */
export async function runAdaptGenerate(options: RunAdaptGenerateOptions): Promise<void> {
  const {
    pluginDir,
    workspaceDir,
    toolName = '',
    outputDir = '',
    adapters,
    loadDef = loadPortableDef,
  } = options;

  const adapterList = adapters ?? [];
  const adapterMap = new Map<string, ToolAdapter>(adapterList.map(a => [a.name, a]));

  // If no tool specified, generate for all adapters
  const targets = toolName ? [toolName] : Array.from(adapterMap.keys());

  // Resolve the definition once for every target (REQ-027)
  const def = await loadDef({ pluginDir, workspaceDir });

  // Resolve config defaults once (derived from the same definition)
  const config: Record<string, unknown> = Object.create(null);
  for (const [key, field] of Object.entries(def.config)) {
    if (isDangerousKey(key)) continue;
    config[key] = field.default;
  }

  for (const name of targets) {
    const adapter = adapterMap.get(name);
    if (!adapter) {
      throw new Error(
        `Unknown adapter: ${name}. Available: ${Array.from(adapterMap.keys()).join(', ')}`
      );
    }

    const result = await adapter.generate(def, config);

    // With --output, give each adapter its own subdirectory. Pointing all three
    // at one directory made them overwrite one another's root-level files
    // (AGENTS.md, CLAUDE.md, codex.json), so the last adapter won (REQ-007).
    const targetDir = outputDir
      ? join(outputDir, name)
      : resolve(pluginDir, 'plugins', name);
    const outputRoot = outputDir ? resolve(outputDir) : resolve(pluginDir);
    for (const relPath of result.files.keys()) {
      if (!isSafeRelPath(relPath)) throw new Error(`Unsafe generated path blocked: ${relPath}`);
      ensureUnlinkedPath(outputRoot, resolve(targetDir, relPath));
    }
    let fileCount = 0;
    for (const [relPath, content] of result.files) {
      if (!isSafeRelPath(relPath)) {
        throw new Error(`Unsafe generated path blocked: ${relPath}`);
      }
      const fullPath = resolve(targetDir, relPath);
      ensureInside(targetDir, fullPath);
      ensureUnlinkedPath(outputRoot, fullPath);
      const dir = resolve(fullPath, '..');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(fullPath, content, 'utf-8');
      fileCount++;
    }

    console.log(JSON.stringify({ ok: true, adapter: name, files: fileCount, output: targetDir }));
  }
}
