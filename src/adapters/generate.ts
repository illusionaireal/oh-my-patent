/**
 * CLI entry point for generating tool-specific configurations.
 *
 * Usage (after npm run build):
 *   node dist/adapters/generate.js <tool-name> [options]
 *
 * Examples:
 *   node dist/adapters/generate.js claude-code --plugin-dir . --workspace-dir ..
 *   node dist/adapters/generate.js claude-code --output ./plugins/claude
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { loadPortableDef } from './loader.js';
import { ToolAdapter } from './types.js';
import { ClaudeCodeAdapter } from './claude/index.js';
import { CodexAdapter } from './codex/index.js';
import { OpenCodeAdapter } from './opencode/index.js';

// Available adapters
const adapters: ToolAdapter[] = [
  new ClaudeCodeAdapter(),
  new CodexAdapter(),
  new OpenCodeAdapter(),
];

const adapterMap = new Map<string, ToolAdapter>(adapters.map(a => [a.name, a]));

// ============================================================================
// CLI
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('oh-my-patent config generator');
    console.log('');
    console.log('Usage: node dist/adapters/generate.js <tool> [options]');
    console.log('');
    console.log('Available tools:');
    for (const name of adapterMap.keys()) {
      console.log(`  - ${name}`);
    }
    console.log('');
    console.log('Options:');
    console.log('  --output <dir>   Output directory (default: ./plugins/<tool>)');
    console.log('  --plugin-dir     oh-my-patent plugin directory (default: cwd)');
    console.log('  --workspace-dir  Patents workspace directory (default: parent of plugin-dir)');
    process.exit(0);
  }

  const toolName = args[0];

  // Parse options
  let outputDir = '';
  let pluginDir = process.cwd();
  let workspaceDir = '';

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
      outputDir = args[++i];
    } else if (args[i] === '--plugin-dir' && args[i + 1]) {
      pluginDir = args[++i];
    } else if (args[i] === '--workspace-dir' && args[i + 1]) {
      workspaceDir = args[++i];
    }
  }

  // Resolve adapter
  const adapter = adapterMap.get(toolName);
  if (!adapter) {
    console.error(`Unknown tool: ${toolName}`);
    console.error(`Available: ${Array.from(adapterMap.keys()).join(', ')}`);
    process.exit(1);
  }

  // Load portable definitions
  console.log(`Loading definitions from ${pluginDir}...`);
  const def = await loadPortableDef({
    pluginDir,
    workspaceDir: workspaceDir || undefined,
  });

  console.log(`Loaded: ${def.agents.length} agents, ${def.skills.length} skills, ${def.commands.length} commands, ${def.mcpServers.length} MCP servers`);

  // Resolve config values
  const config: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(def.config)) {
    config[key] = field.default;
  }

  // Generate
  console.log(`Generating ${toolName} configuration...`);
  const result = await adapter.generate(def, config);

  // Default output directory
  if (!outputDir) {
    outputDir = join(pluginDir, 'plugins', toolName);
  }

  // Write files
  let fileCount = 0;
  for (const [relPath, content] of result.files) {
    const fullPath = join(outputDir, relPath);
    const dir = resolve(fullPath, '..');

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(fullPath, content, 'utf-8');
    console.log(`  Written: ${relPath}`);
    fileCount++;
  }

  console.log('');
  console.log(`Generated ${fileCount} files in ${outputDir}`);

  if (result.instructions.length > 0) {
    console.log('');
    console.log('Next steps:');
    for (const line of result.instructions) {
      console.log(`  ${line}`);
    }
  }
}

main().catch(err => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Error:', message);
  process.exit(1);
});
