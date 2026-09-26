import { describe, expect, test } from 'vitest';
import { defaultDiagramSpecsFile } from '../../src/core/diagram-types';

describe('defaultDiagramSpecsFile', () => {
  test('draft is the default, including when phase is omitted', () => {
    expect(defaultDiagramSpecsFile(undefined)).toBe('diagram-specs-draft.json');
    expect(defaultDiagramSpecsFile('draft')).toBe('diagram-specs-draft.json');
  });

  test('final does not fall back to the draft filename', () => {
    expect(defaultDiagramSpecsFile('final')).toBe('diagram-specs-final.json');
    expect(defaultDiagramSpecsFile('FINAL')).toBe('diagram-specs-final.json');
  });
});
