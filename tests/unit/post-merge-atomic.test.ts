import { afterEach, expect, test, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { writeMcpConfig } from '../../src/core/init-checker.js';
import { createBranchFromNode, listBranches } from '../../src/commands/path-branch.js';
import { createInitialPath, createInitialNode } from '../../src/core/brainstorm-path.js';
import { savePath, saveNode } from '../../src/core/path-persistence.js';

vi.mock('fs', async importOriginal => {
  const fs = await importOriginal<typeof import('fs')>();
  return { ...fs, renameSync: vi.fn(fs.renameSync) };
});
const dirs: string[] = [];
function temp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'omp-atomic-review-'));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  vi.mocked(renameSync).mockReset();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

test('MCP replacement failure keeps the original file and removes only the temporary file', () => {
  const workspace = temp();
  mkdirSync(join(workspace, '.claude'));
  const target = join(workspace, '.mcp.json');
  const original = '{"mcpServers":{"existing":{"command":"server"}}}';
  writeFileSync(target, original);
  vi.mocked(renameSync).mockImplementation(() => {
    throw Object.assign(new Error('locked'), { code: 'EPERM' });
  });
  expect(() => writeMcpConfig(workspace, 'new', { command: 'new-server' })).toThrow('locked');
  expect(readFileSync(target, 'utf8')).toBe(original);
  expect(readdirSync(workspace).filter(name => name.endsWith('.tmp'))).toEqual([]);
});

test('branch index replacement failure preserves existing branches and rolls back the new branch', async () => {
  const workspace = temp();
  const data = createInitialPath('project', 'topic');
  data.nodes = ['round-1'];
  data.currentNodeId = 'round-1';
  await savePath(data, workspace);
  await saveNode(createInitialNode(1), workspace);
  const first = await createBranchFromNode(workspace, 'round-1', 'first');
  const branchDir = join(workspace, '.brainstorm', 'branches');
  const previous = readFileSync(join(branchDir, 'index.json'), 'utf8');
  const actual = await vi.importActual<typeof import('fs')>('fs');
  vi.mocked(renameSync).mockImplementation((from, to) => {
    if (to === join(branchDir, 'index.json')) throw new Error('index locked');
    actual.renameSync(from, to);
  });
  await expect(createBranchFromNode(workspace, 'round-1', 'second')).rejects.toThrow('index locked');
  expect(readFileSync(join(branchDir, 'index.json'), 'utf8')).toBe(previous);
  expect((await listBranches(workspace)).map(branch => branch.branchId)).toEqual([first.branchId]);
  expect(readdirSync(branchDir).sort()).toEqual([first.branchId, `${first.branchId}.json`, 'index.json'].sort());
});
