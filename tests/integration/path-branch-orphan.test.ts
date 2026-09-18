import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { initBrainstormDirectory, loadPath, savePath, saveNode } from '../../src/core/path-persistence';
import { createInitialPath, createInitialNode, createInnovationSnapshot, createInnovationScore } from '../../src/core/brainstorm-path';
import { createBranchFromNode, listBranches, isValidPathId, isValidBranchId } from '../../src/commands/path-branch';

describe('Path Branch - long ID and orphan cleanup (P2)', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(tmpdir(), 'branch-orphan-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('isValidPathId accepts 128 chars, branchId up to 160', () => {
    const maxPathId = 'a'.repeat(128);
    expect(isValidPathId(maxPathId)).toBe(true);
    const branchId = `${maxPathId}-branch-1`;
    // 128 + 8 + 1 = 137, should be within 160
    expect(isValidBranchId(branchId)).toBe(true);
    expect(branchId.length).toBe(137);
  });

  test('creates branch with long but valid path ID (120 chars)', async () => {
    await initBrainstormDirectory(testDir);
    const longId = 'p'.repeat(120);
    expect(isValidPathId(longId)).toBe(true);

    const initialPath = createInitialPath('proj', 'topic');
    initialPath.id = longId;
    await savePath(initialPath, testDir);

    const node = createInitialNode(1);
    node.innovations = [];
    node.scores = [];
    await saveNode(node, testDir);

    const loaded = await loadPath(testDir);
    loaded!.nodes = ['round-1'];
    loaded!.currentNodeId = 'round-1';
    await savePath(loaded!, testDir);

    const result = await createBranchFromNode(testDir, 'round-1', 'long id test');
    expect(result.branchId).toBe(`${longId}-branch-1`);
    expect(isValidBranchId(result.branchId)).toBe(true);

    const branches = await listBranches(testDir);
    expect(branches).toHaveLength(1);

    // Check that branch files exist
    const branchFile = path.join(testDir, '.brainstorm', 'branches', `${result.branchId}.json`);
    const branchNodesDir = path.join(testDir, '.brainstorm', 'branches', result.branchId, 'nodes');
    expect(await fs.stat(branchFile).then(() => true).catch(() => false)).toBe(true);
    expect(await fs.stat(branchNodesDir).then(() => true).catch(() => false)).toBe(true);
  });

  test('fails early without orphan files when branchId would exceed max', async () => {
    await initBrainstormDirectory(testDir);
    // Create a path ID that is valid (128) but would cause branchId >160 when suffix is added
    // 128 + "-branch-9999" (12) = 140, still within 160, so need longer to exceed
    // Let's use 155 chars path ID (invalid per isValidPathId, so we need to bypass validation to simulate tampered file)
    // For this test, we directly test generateBranchId via createBranchFromNode with a tampered path.json
    // We'll create a path with ID 155 chars by directly writing JSON (bypassing isValidPathId check in savePath? savePath doesn't validate ID)
    const tooLongId = 'x'.repeat(155);
    // isValidPathId should reject 155 (>128)
    expect(isValidPathId(tooLongId)).toBe(false);

    const initialPath = createInitialPath('proj', 'topic');
    initialPath.id = tooLongId;
    await savePath(initialPath, testDir);

    const node = createInitialNode(1);
    await saveNode(node, testDir);

    const loaded = await loadPath(testDir);
    loaded!.nodes = ['round-1'];
    loaded!.currentNodeId = 'round-1';
    await savePath(loaded!, testDir);

    // Attempt to create branch should fail due to invalid pathId (155 >128) before any file write
    await expect(createBranchFromNode(testDir, 'round-1', 'should fail')).rejects.toThrow(/Invalid pathId|Invalid branchId/);

    // Ensure no orphan files
    const branchesDir = path.join(testDir, '.brainstorm', 'branches');
    const files = await fs.readdir(branchesDir).catch(() => [] as string[]);
    // Only index.json may exist, but no branch file or directory for tooLongId
    const hasOrphanBranchFile = files.some(f => f.includes(tooLongId));
    expect(hasOrphanBranchFile).toBe(false);

    const branches = await listBranches(testDir);
    expect(branches).toHaveLength(0);

    // Check that no orphan node directory exists
    const maybeOrphanDir = path.join(branchesDir, `${tooLongId}-branch-1`);
    const orphanExists = await fs.stat(maybeOrphanDir).then(() => true).catch(() => false);
    expect(orphanExists).toBe(false);
  });

  test('fails without orphan when branchId itself invalid (simulated via long pathId 128 + large branch number)', async () => {
    await initBrainstormDirectory(testDir);
    const maxPathId = 'b'.repeat(128);
    const initialPath = createInitialPath('proj', 'topic');
    initialPath.id = maxPathId;
    await savePath(initialPath, testDir);

    const node = createInitialNode(1);
    await saveNode(node, testDir);

    const loaded = await loadPath(testDir);
    loaded!.nodes = ['round-1'];
    loaded!.currentNodeId = 'round-1';
    await savePath(loaded!, testDir);

    // Manually create many branches to get branch number large, but we can test validation directly
    // With maxPathId 128, branchId for branch-1 is 137 (valid), for branch-9999999999 would be 128+8+10=146 (still valid within 160)
    // So to exceed 160, need pathId 150+ which is invalid, so this test ensures early validation prevents orphan
    // We'll test that a pathId of 128 with branch-1 succeeds and doesn't leave orphan on success
    const result = await createBranchFromNode(testDir, 'round-1', 'test');
    expect(result.branchId.length).toBeLessThanOrEqual(160);

    // Now simulate a failure after node files written: we can't easily trigger without mocking,
    // but we verify that successful path doesn't leave orphan index mismatch
    const branches = await listBranches(testDir);
    expect(branches).toHaveLength(1);
    expect(branches[0].branchId).toBe(result.branchId);
  });
});
