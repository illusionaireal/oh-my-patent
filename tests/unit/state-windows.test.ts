import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { StateManager } from '../../src/core/state-manager';
import { createInitialState } from '../../src/core/state';

const TEST_DIR = join(__dirname, '..', 'fixtures', 'test-windows');

describe('StateManager Windows compatibility', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  test('saves state twice (second save overwrites, Windows rename fix)', () => {
    const manager = new StateManager(TEST_DIR);
    const state1 = createInitialState({
      topic: 'first',
      topicSlug: 'test',
      jurisdiction: 'CN',
      projectPath: 'projects/01-test',
    });

    manager.saveState('01-test', state1);
    const statePath = join(TEST_DIR, '01-test', '.patent', 'state.json');
    expect(existsSync(statePath)).toBe(true);
    const content1 = JSON.parse(readFileSync(statePath, 'utf-8'));
    expect(content1.project.topic).toBe('first');

    // Second save should overwrite (previously failed on Windows)
    const state2 = createInitialState({
      topic: 'second',
      topicSlug: 'test',
      jurisdiction: 'US',
      projectPath: 'projects/01-test',
    });
    state2.current_stage = 'RESEARCH';
    manager.saveState('01-test', state2);

    expect(existsSync(statePath)).toBe(true);
    const content2 = JSON.parse(readFileSync(statePath, 'utf-8'));
    expect(content2.project.topic).toBe('second');
    expect(content2.current_stage).toBe('RESEARCH');
  });

  test('temp file cleaned up on success', () => {
    const manager = new StateManager(TEST_DIR);
    const state = createInitialState({
      topic: 'cleanup',
      topicSlug: 'test',
      jurisdiction: 'CN',
      projectPath: 'test',
    });
    manager.saveState('cleanup-test', state);
    const patentDir = join(TEST_DIR, 'cleanup-test', '.patent');
    const files = require('fs').readdirSync(patentDir);
    // Only state.json should exist, no .tmp files left
    expect(files).toEqual(['state.json']);
  });
});
