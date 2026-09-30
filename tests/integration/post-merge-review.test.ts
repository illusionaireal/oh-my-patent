import { afterEach, describe, expect, test } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ClaudeCodeAdapter } from '../../src/adapters/claude/index.js';
import { loadPortableDef } from '../../src/adapters/loader.js';
import { pruneGeneratedFiles } from '../../src/adapters/prune.js';
import { createBranchFromNode, listBranches } from '../../src/commands/path-branch.js';
import { createInitialPath, createInitialNode } from '../../src/core/brainstorm-path.js';
import { savePath, saveNode } from '../../src/core/path-persistence.js';
import { writeMcpConfig } from '../../src/core/init-checker.js';
import { execFileSync } from 'child_process';

const dirs: string[] = [];
function temp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'omp-review-'));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const definition = () => loadPortableDef({ pluginDir: process.cwd(), workspaceDir: temp() });

describe('Claude framework contracts', () => {
  test('install preserves existing servers and settings across repeated runs', () => {
    const workspace = temp();
    const fakeHome = temp();
    mkdirSync(join(workspace, '.claude'));
    const settings = '{"permissions":{"allow":["Read"]}}';
    writeFileSync(join(workspace, '.claude', 'settings.json'), settings);
    const existing = { custom: { command: 'mine' }, patsnap_search: { type: 'http', url: 'https://example.com/private' } };
    writeFileSync(join(workspace, '.mcp.json'), JSON.stringify({ mcpServers: existing }));
    for (let i = 0; i < 2; i++) {
      execFileSync(process.execPath, [join(process.cwd(), 'dist/cli.js'), 'adapt', 'install', '--legacy', '--tool', 'claude-code', '--workspace-dir', workspace], {
        env: { ...process.env, HOME: fakeHome, USERPROFILE: fakeHome },
      });
    }
    const saved = JSON.parse(readFileSync(join(workspace, '.mcp.json'), 'utf8'));
    expect(saved.mcpServers).toMatchObject(existing);
    expect(readFileSync(join(workspace, '.claude', 'settings.json'), 'utf8')).toBe(settings);
    expect(existsSync(join(workspace, '.claude', 'skills', 'prior-art-search', 'SKILL.md'))).toBe(true);
    execFileSync(process.execPath, [join(process.cwd(), 'dist/cli.js'), 'adapt', 'uninstall', '--legacy', '--tool', 'claude-code', '--workspace-dir', workspace], {
      env: { ...process.env, HOME: fakeHome, USERPROFILE: fakeHome },
    });
    expect(JSON.parse(readFileSync(join(workspace, '.mcp.json'), 'utf8')).mcpServers).toMatchObject(existing);
  });

  test('generates native MCP configuration, skills, and main-agent delegation', async () => {
    const def = await definition();
    def.mcpServers = [{ id: 'search', transport: 'remote', url: 'https://example.com/mcp', enabled: true }];
    const adapter = new ClaudeCodeAdapter();
    const result = await adapter.generate(def, {});
    expect(result.files.has(join('.claude', 'settings.json'))).toBe(false);
    expect(JSON.parse(result.files.get('.mcp.json')!)).toEqual({ mcpServers: { search: { type: 'http', url: 'https://example.com/mcp' } } });
    for (const skill of def.skills) {
      const file = join('.claude', 'skills', skill.id, 'SKILL.md');
      expect(result.files.get(file)).toMatch(/^---\r?\n/);
      expect(adapter.getGeneratedFilePaths(def)).toContain(file);
    }
    const primary = def.agents.find(agent => agent.role === 'primary')!;
    expect(result.files.get(join('.claude', 'agents', `${primary.id}.md`))).toMatch(/^tools: .*\bAgent\b/m);
  });

  test('MCP setup preserves Claude settings and existing servers', () => {
    const workspace = temp();
    mkdirSync(join(workspace, '.claude'));
    const settings = '{"permissions":{"allow":["Read"]}}';
    writeFileSync(join(workspace, '.claude', 'settings.json'), settings);
    writeFileSync(join(workspace, '.mcp.json'), '{"mcpServers":{"existing":{"command":"server"}}}');
    const result = writeMcpConfig(workspace, 'search', { type: 'streamableHttp', url: 'https://example.com/mcp' });
    expect(result.configPath).toBe(join(workspace, '.mcp.json'));
    expect(readFileSync(join(workspace, '.claude', 'settings.json'), 'utf8')).toBe(settings);
    const saved = JSON.parse(readFileSync(result.configPath, 'utf8'));
    expect(saved.mcpServers.existing).toEqual({ command: 'server' });
    expect(saved.mcpServers.search.type).toBe('http');
  });
});

describe('prune boundaries', () => {
  test('rejects managed paths outside the workspace', async () => {
    const adapter = new ClaudeCodeAdapter();
    adapter.getManagedDirectories = () => ['../outside'];
    const def = await definition();
    expect(() => pruneGeneratedFiles(adapter, def, temp())).toThrow(/Unsafe managed path/);
  });
  test.each(['ancestor', 'managed', 'nested'])('preserves files through a %s directory link', async placement => {
    const workspace = temp();
    const outside = temp();
    const def = await definition();
    let link: string;
    let victim: string;
    if (placement === 'ancestor') {
      link = join(workspace, '.claude');
      mkdirSync(join(outside, 'agents'));
      victim = join(outside, 'agents', 'old.md');
    } else {
      mkdirSync(join(workspace, '.claude', 'agents'), { recursive: true });
      link = placement === 'managed' ? join(workspace, '.claude', 'commands') : join(workspace, '.claude', 'agents', 'linked');
      victim = join(outside, 'old.md');
    }
    writeFileSync(victim, '<!-- Generated by oh-my-patent. -->\nkeep');
    symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
    try {
      pruneGeneratedFiles(new ClaudeCodeAdapter(), def, workspace);
      expect(existsSync(victim)).toBe(true);
    } finally {
      rmSync(link);
    }
  });
});

describe('branch persistence', () => {
  async function setup(): Promise<string> {
    const workspace = temp();
    const data = createInitialPath('project', 'topic');
    data.nodes = ['round-1'];
    data.currentNodeId = 'round-1';
    await savePath(data, workspace);
    await saveNode(createInitialNode(1), workspace);
    return workspace;
  }

  test.each([{}, null, { branches: [], lastBranchNumber: '1' }, { branches: [], lastBranchNumber: -1 }])('rejects malformed branch indexes: %j', async index => {
    const workspace = await setup();
    mkdirSync(join(workspace, '.brainstorm', 'branches'));
    writeFileSync(join(workspace, '.brainstorm', 'branches', 'index.json'), JSON.stringify(index));
    await expect(listBranches(workspace)).rejects.toThrow(/Invalid branch index/);
  });

  test('does not overwrite an existing branch when the counter is stale', async () => {
    const workspace = await setup();
    const first = await createBranchFromNode(workspace, 'round-1', 'original');
    const root = join(workspace, '.brainstorm', 'branches');
    const file = join(root, `${first.branchId}.json`);
    const original = readFileSync(file, 'utf8');
    writeFileSync(join(root, 'index.json'), '{"branches":[],"lastBranchNumber":0}');
    await expect(createBranchFromNode(workspace, 'round-1', 'collision')).rejects.toThrow(/already exists/);
    expect(readFileSync(file, 'utf8')).toBe(original);
  });

  test('rejects a missing source node instead of publishing an incomplete branch', async () => {
    const workspace = await setup();
    rmSync(join(workspace, '.brainstorm', 'nodes', 'round-1.json'));
    await expect(createBranchFromNode(workspace, 'round-1', 'missing')).rejects.toThrow(/not found/);
    expect(await listBranches(workspace)).toEqual([]);
  });
});
