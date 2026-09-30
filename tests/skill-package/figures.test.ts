import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateSvg, validateFigureSpec } from '../../src/core/figures.js';
const good = readFileSync('src/skill-entry/assets/figure.svg', 'utf8');
it('accepts an editable self-contained figure and validates its specification', () => {
  expect(validateSvg(good).valid).toBe(true);
  expect(validateFigureSpec(JSON.parse(readFileSync('src/skill-entry/assets/figure-spec.example.json', 'utf8'))).parts).toHaveLength(2);
});
it.each([
  '<script>alert(1)</script>', '<foreignObject/>', '<image href="https://example.com/private"/>',
  '<rect onload="alert(1)"/>', '<style>@import "https://example.com";</style>',
  '<path fill="url(https://example.com)"/>', '<use href="#test"/>', '<animate/>',
  '<text font-family="remote-font">private</text>', '<g><rect></g>',
  '<path fill="u\\72l(\\68ttps:\\2f\\2f example.test/secret)"/>',
  '<path fill="url/**/(remote-resource)"/>',
])('rejects active or malformed SVG payload %s', payload => {
  expect(() => validateSvg(`<svg xmlns="http://www.w3.org/2000/svg">${payload}</svg>`)).toThrow();
});
it('rejects entities, excessive depth, and oversized input before preview', () => {
  expect(() => validateSvg('<!DOCTYPE svg [<!ENTITY secret SYSTEM "file:///secret">]>' + good)).toThrow();
  expect(() => validateSvg('<svg xmlns="http://www.w3.org/2000/svg">' + '<g>'.repeat(33) + '</g>'.repeat(33) + '</svg>')).toThrow();
  expect(() => validateSvg(' '.repeat(1024 * 1024 + 1))).toThrow();
});
it('rejects duplicate numbering and dangling topology', () => {
  const spec = JSON.parse(readFileSync('src/skill-entry/assets/figure-spec.example.json', 'utf8'));
  spec.parts[1].number = '101'; expect(() => validateFigureSpec(spec)).toThrow();
  spec.parts[1].number = '102'; spec.connections[0].to = 'invented'; expect(() => validateFigureSpec(spec)).toThrow();
});
it('rejects missing stable IDs and unknown schema fields', () => {
  const example = JSON.parse(readFileSync('src/skill-entry/assets/figure-spec.example.json', 'utf8'));
  const missingFigureId = structuredClone(example); delete missingFigureId.figure_id;
  expect(() => validateFigureSpec(missingFigureId)).toThrow();
  const missingPartId = structuredClone(example); delete missingPartId.parts[0].id;
  expect(() => validateFigureSpec(missingPartId)).toThrow();
  expect(() => validateFigureSpec({ ...example, provider_override: 'unknown' })).toThrow();
});
