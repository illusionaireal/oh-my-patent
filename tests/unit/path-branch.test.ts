import { describe, it, expect } from 'vitest';
import { isValidBranchId, isValidPathId } from '../../src/commands/path-branch';

describe('Path Branch Validation', () => {
  it('should reject traversal in branchId', () => {
    expect(isValidBranchId('../../etc')).toBe(false);
    expect(isValidBranchId('branch/../evil')).toBe(false);
    expect(isValidBranchId('')).toBe(false);
    expect(isValidBranchId('a/b')).toBe(false);
  });

  it('should accept valid branchId', () => {
    expect(isValidBranchId('path-1712345678-branch-1')).toBe(true);
    expect(isValidBranchId('my_branch-1')).toBe(true);
  });

  it('should reject traversal in pathId', () => {
    expect(isValidPathId('../../etc/passwd')).toBe(false);
    expect(isValidPathId('path/../evil')).toBe(false);
  });

  it('should accept valid pathId', () => {
    expect(isValidPathId('path-1712345678')).toBe(true);
  });
});
