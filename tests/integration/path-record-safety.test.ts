import { afterEach, expect, test } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createInitialNode } from '../../src/core/brainstorm-path.js';
import { saveNode } from '../../src/core/path-persistence.js';

const dirs: string[] = [];
function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), 'omp-record-safety-'));
  dirs.push(dir);
  return dir;
}
function record(dir: string, round: string, data: unknown) {
  const input = join(dir, 'input.json');
  writeFileSync(input, JSON.stringify(data));
  return spawnSync(process.execPath, [resolve('dist/cli.js'), 'path', 'record', dir,
    '--round', round, '--data', '@' + input], { encoding: 'utf8', timeout: 10000 });
}
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

test.each([null, [], { innovations: [{}] }, { innovations: null }, { agentOutputs: [null] },
  { decision: { action: 'ITERATE', reason: '', recommendations: [42] } }, { projectId: 42 },
  { scores: [{ innovationId: 'i', novelty: 'invalid' }] },
])('invalid input preserves the node, snapshot and path: %j', data => {
  const dir = fixture();
  expect(record(dir, '1', { innovations: [] }).status).toBe(0);
  const files = ['path.json', 'nodes/round-1.json', 'snapshots/round-1-innovations.json']
    .map(file => join(dir, '.brainstorm', file));
  const before = files.map(file => existsSync(file) ? readFileSync(file, 'utf8') : null);
  expect(before.every(content => content !== null)).toBe(true);
  expect(record(dir, '1', data).status).not.toBe(0);
  expect(files.map(file => existsSync(file) ? readFileSync(file, 'utf8') : null)).toEqual(before);
});

test.each(['NaN', '1x', '1.5', '0', '-1', '9007199254740992'])('rejects invalid round %s without creating state', round => {
  const dir = fixture();
  expect(record(dir, round, {}).status).not.toBe(0);
  expect(existsSync(join(dir, '.brainstorm'))).toBe(false);
});

test('rejects skipped rounds but accepts consecutive valid records', () => {
  const dir = fixture();
  expect(record(dir, '3', {}).status).not.toBe(0);
  expect(existsSync(join(dir, '.brainstorm'))).toBe(false);
  expect(record(dir, '1', {}).status).toBe(0);
  expect(record(dir, '2', {}).status).toBe(0);
  const path = JSON.parse(readFileSync(join(dir, '.brainstorm', 'path.json'), 'utf8'));
  expect(path.nodes).toEqual(['round-1', 'round-2']);
  expect(path.edges[0]).toMatchObject({ fromNodeId: 'round-1', toNodeId: 'round-2' });
});

test('direct saveNode rejects invalid IDs and rounds without replacing existing data', async () => {
  const dir = fixture();
  const node = createInitialNode(1);
  await saveNode(node, dir);
  const file = join(dir, '.brainstorm', 'nodes', 'round-1.json');
  const before = readFileSync(file, 'utf8');
  await expect(saveNode({ ...node, id: 'round-2' }, dir)).rejects.toThrow('Invalid BrainstormNode');
  await expect(saveNode(createInitialNode(-1), dir)).rejects.toThrow('Invalid BrainstormNode');
  expect(readFileSync(file, 'utf8')).toBe(before);
});
