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
    expect(result.errors).toContain('Invalid jurisdiction: INVALID (supported: CN, US, PCT)');
  });

  test('validateState rejects EP and names the supported list (REQ-017)', () => {
    const epState = {
      project: { jurisdiction: 'EP' },
      current_stage: 'INIT',
      stages: {}
    };
    const result = validateState(epState);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid jurisdiction: EP (supported: CN, US, PCT)');
  });

  test('validateState rejects JP (REQ-017)', () => {
    const jpState = {
      project: { jurisdiction: 'JP' },
      current_stage: 'INIT',
      stages: {}
    };
    const result = validateState(jpState);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid jurisdiction: JP (supported: CN, US, PCT)');
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
    expect(isValidProjectSlug('a\\b')).toBe(false); // one backslash, not two
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

describe('validateState key fields (REQ-022)', () => {
  const baseState = () => {
    const state = createInitialState({
      topic: 'Test',
      topicSlug: 'test',
      jurisdiction: 'CN',
      projectPath: 'test'
    });
    return state as unknown as Record<string, unknown>;
  };

  test('negative qa_rounds_completed is rejected', () => {
    const state = baseState();
    state.qa_rounds_completed = -1;
    const result = validateState(state);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('qa_rounds_completed'))).toBe(true);
  });

  test('non-integer qa_rounds_completed is rejected', () => {
    const state = baseState();
    state.qa_rounds_completed = 1.5;
    expect(validateState(state).valid).toBe(false);
  });

  test('non-numeric qa_rounds_completed is rejected', () => {
    const state = baseState();
    state.qa_rounds_completed = 'two';
    expect(validateState(state).valid).toBe(false);
  });

  test('empty topic_slug is rejected', () => {
    const state = baseState();
    (state.project as Record<string, unknown>).topic_slug = '';
    expect(validateState(state).valid).toBe(false);
  });

  test('non-string topic_slug is rejected', () => {
    const state = baseState();
    (state.project as Record<string, unknown>).topic_slug = 42;
    expect(validateState(state).valid).toBe(false);
  });

  test('non-array innovation_candidates is rejected', () => {
    const state = baseState();
    state.innovation_candidates = 'none';
    expect(validateState(state).valid).toBe(false);
  });

  test('a fully populated state still validates', () => {
    const state = baseState();
    state.qa_rounds_completed = 2;
    state.innovation_candidates = [{ id: 'INN-001' }];
    expect(validateState(state)).toEqual({ valid: true, errors: [] });
  });
});
