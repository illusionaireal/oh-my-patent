import { describe, test, expect } from 'vitest';
import { validateState, createInitialState } from '../../src/core/state';
import { StateManager, isValidProjectSlug } from '../../src/core/state-manager';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('State Management', () => {
  test('createInitialState creates valid state object', () => {
    const state = createInitialState({
      topic: '基于区块链的跨境支付',
      topicSlug: 'blockchain-crossborder',
      jurisdiction: 'CN',
      projectPath: 'projects/01-blockchain-crossborder'
    });

    expect(state.project.topic).toBe('基于区块链的跨境支付');
    expect(state.project.topic_slug).toBe('blockchain-crossborder');
    expect(state.project.jurisdiction).toBe('CN');
    expect(state.current_stage).toBe('INIT');
    expect(state.stages.INIT.status).toBe('pending');
    expect(state.stages.RESEARCH.status).toBe('pending');
  });

  test('validateState rejects invalid jurisdiction', () => {
    const invalidState = {
      project: { jurisdiction: 'INVALID' },
      current_stage: 'INIT',
      stages: {}
    };
    const result = validateState(invalidState);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid jurisdiction: INVALID');
  });

  test('validateState accepts valid CN jurisdiction', () => {
    const validState = createInitialState({
      topic: 'Test',
      topicSlug: 'test',
      jurisdiction: 'CN',
      projectPath: 'test'
    });
    const result = validateState(validState);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('isValidProjectSlug rejects path traversal', () => {
    expect(isValidProjectSlug('../../etc')).toBe(false);
    expect(isValidProjectSlug('../secret')).toBe(false);
    expect(isValidProjectSlug('a/b')).toBe(false);
    expect(isValidProjectSlug('a\\b')).toBe(false);
    expect(isValidProjectSlug('')).toBe(false);
  });

  test('isValidProjectSlug accepts safe slugs', () => {
    expect(isValidProjectSlug('01-blockchain')).toBe(true);
    expect(isValidProjectSlug('my_project-1.0')).toBe(true);
    expect(isValidProjectSlug('test')).toBe(true);
  });

  test('StateManager rejects traversal in saveState', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'state-test-'));
    const mgr = new StateManager(tmp);
    const state = createInitialState({
      topic: 'Test',
      topicSlug: 'test',
      jurisdiction: 'CN',
      projectPath: 'test'
    });
    expect(() => mgr.saveState('../../evil', state)).toThrow(/Invalid projectSlug/);
    rmSync(tmp, { recursive: true, force: true });
  });

  test('StateManager rejects traversal in loadState', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'state-test-'));
    const mgr = new StateManager(tmp);
    expect(() => mgr.loadState('../../evil')).toThrow(/Invalid projectSlug/);
    rmSync(tmp, { recursive: true, force: true });
  });
});
