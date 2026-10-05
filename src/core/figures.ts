/** Self-contained SVG and specification validation; no visual-approval inference. */
import { SaxesParser } from 'saxes';
import { readFileSync } from 'node:fs';
import { digest, projectFile, ProjectError } from './project-store.js';

export interface FigureSpecification {
  schema_version: 1; figure_id: string; purpose: string; main_sections: string[];
  parts: Array<{ id: string; number: string; label: string }>;
  connections: Array<{ from: string; to: string; label: string }>;
  required_features: string[]; forbidden_structures: string[]; layout_constraints: string[];
  language: 'en' | 'zh'; backend: 'svg' | 'imagegen' | 'mermaid' | 'plantuml';
  formats: string[]; review_criteria: string[]; optional: boolean;
}
const ID = /^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/;
const validId = (value: unknown): value is string => typeof value === 'string' && ID.test(value);
function exactKeys(value: object, names: string[]): boolean {
  return Object.keys(value).every(name => names.includes(name));
}
export function validateFigureSpec(input: unknown): FigureSpecification {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ProjectError('INVALID_INPUT', 'Figure spec must be an object');
  const s = input as FigureSpecification;
  const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string' && x.trim().length > 0);
  if (!exactKeys(s, ['schema_version', 'figure_id', 'purpose', 'main_sections', 'parts', 'connections', 'required_features', 'forbidden_structures', 'layout_constraints', 'language', 'backend', 'formats', 'review_criteria', 'optional']) || s.schema_version !== 1 || !validId(s.figure_id) || typeof s.purpose !== 'string' || !s.purpose.trim() || !['en', 'zh'].includes(s.language) || !['svg', 'imagegen', 'mermaid', 'plantuml'].includes(s.backend) || typeof s.optional !== 'boolean') throw new ProjectError('INVALID_INPUT', 'Invalid figure identity, version, language or backend');
  for (const key of ['main_sections', 'required_features', 'forbidden_structures', 'layout_constraints', 'formats', 'review_criteria'] as const) if (!strings(s[key])) throw new ProjectError('INVALID_INPUT', `Invalid ${key}`);
  if (!s.main_sections.length || !s.review_criteria.length || !s.formats.length || !s.required_features.length || !s.formats.every(f => ['svg', 'png', 'jpg', 'webp'].includes(f))) throw new ProjectError('INVALID_INPUT', 'Sections, features, formats and review criteria required');
  if (!Array.isArray(s.parts) || s.parts.length > 1000 || !s.parts.every(p => p && validId(p.id) && exactKeys(p, ['id', 'number', 'label']) && typeof p.number === 'string' && /^\d+[a-z]?$/.test(p.number) && typeof p.label === 'string' && p.label.trim())) throw new ProjectError('INVALID_INPUT', 'Invalid stable parts');
  if (new Set(s.parts.map(p => p.id)).size !== s.parts.length || new Set(s.parts.map(p => p.number)).size !== s.parts.length) throw new ProjectError('INVALID_INPUT', 'Duplicate part ID or number');
  const ids = new Set(s.parts.map(p => p.id));
  if (!Array.isArray(s.connections) || s.connections.length > 4000 || !s.connections.every(c => c && exactKeys(c, ['from', 'to', 'label']) && ids.has(c.from) && ids.has(c.to) && typeof c.label === 'string')) throw new ProjectError('INVALID_INPUT', 'Connection references unknown part');
  return s;
}

const ELEMENTS = new Set(['svg', 'g', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path', 'text', 'tspan', 'title', 'desc']);
const ATTRIBUTES = new Set(['xmlns', 'viewBox', 'width', 'height', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'fill-rule', 'opacity', 'fill-opacity', 'stroke-opacity', 'font-size', 'font-family', 'font-weight', 'text-anchor', 'dominant-baseline', 'dx', 'dy', 'transform', 'id', 'role', 'aria-label']);
export function validateSvg(source: string): { valid: true; elements: number; digest: string } {
  if (Buffer.byteLength(source) > 1024 * 1024 || /<!|<\?/.test(source)) throw new ProjectError('INVALID_INPUT', 'SVG exceeds limit or contains declarations/entities/instructions');
  const parser = new SaxesParser({ xmlns: true });
  let depth = 0, count = 0;
  const ids = new Set<string>();
  parser.on('error', error => { throw new ProjectError('INVALID_INPUT', `Malformed SVG: ${error.message}`); });
  parser.on('opentag', tag => {
    count++; depth++;
    if (count > 10000 || depth > 32 || !ELEMENTS.has(tag.name) || tag.uri !== 'http://www.w3.org/2000/svg' || (count === 1 && tag.name !== 'svg') || (count > 1 && tag.name === 'svg')) throw new ProjectError('INVALID_INPUT', 'SVG element/namespace/depth not permitted');
    for (const attr of Object.values(tag.attributes)) {
      const { name, value } = attr;
      if (!ATTRIBUTES.has(name) || value.length > 100000 || /\\|\/\*|\*\/|[\u0000-\u001f\u007f]/.test(value) || /url\s*\(|[<>]|(?:https?:|data:|javascript:|file:|\/\/)/i.test(value) && name !== 'xmlns') throw new ProjectError('INVALID_INPUT', `SVG attribute not permitted: ${name}`);
      if (name === 'xmlns' && value !== 'http://www.w3.org/2000/svg') throw new ProjectError('INVALID_INPUT', 'Invalid SVG namespace');
      if (['fill', 'stroke'].includes(name) && !/^(?:none|black|white|currentColor|#[0-9a-fA-F]{3,8})$/.test(value)) throw new ProjectError('INVALID_INPUT', 'Only simple SVG paint is allowed');
      if (name === 'font-family' && !['sans-serif', 'serif', 'monospace'].includes(value)) throw new ProjectError('INVALID_INPUT', 'Only generic local font families allowed');
      if (name === 'id') {
        if (!ID.test(value) || ids.has(value)) throw new ProjectError('INVALID_INPUT', 'Invalid/duplicate SVG ID');
        ids.add(value);
      }
    }
  });
  parser.on('closetag', () => { depth--; });
  parser.write(source).close();
  if (!count || depth) throw new ProjectError('INVALID_INPUT', 'Incomplete SVG');
  return { valid: true, elements: count, digest: digest(source) };
}

export interface FigureProvenance {
  figure_id: string; spec_digest: string; result_digest: string; main_digest: string;
  source_digest?: string; source_path?: string; result_path: string; backend: string;
  tool: string; provider?: string; model?: string; generated_at: string;
  consent_reference?: string; disclosure_reference?: string;
  review: { status: 'pending' | 'passed' | 'failed'; reviewer_type: 'model' | 'human'; reviewer: string; technical: boolean; visual: boolean; findings: string[] };
}
export function inspectFigure(root: string, id: string): FigureProvenance & { review_current: boolean } {
  if (!ID.test(id)) throw new ProjectError('INVALID_INPUT', 'Invalid figure ID');
  const base = `figures/${id}`;
  const spec = readFileSync(projectFile(root, `${base}/figure-spec.json`), 'utf8');
  validateFigureSpec(JSON.parse(spec));
  const p = JSON.parse(readFileSync(projectFile(root, `${base}/provenance.json`), 'utf8')) as FigureProvenance;
  const current = digest(spec) === p.spec_digest && digest(readFileSync(projectFile(root, p.result_path))) === p.result_digest && digest(readFileSync(projectFile(root, 'MAIN.md'))) === p.main_digest && (!p.source_path || digest(readFileSync(projectFile(root, p.source_path))) === p.source_digest);
  return { ...p, review: current ? p.review : { ...p.review, status: 'pending' }, review_current: current };
}
