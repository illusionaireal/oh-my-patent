import { afterEach, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { disclosedFetch, recordConsent } from '../../src/core/disclosure.js';
import { digest } from '../../src/core/project-store.js';
import { DiagramRenderer } from '../../src/core/diagram-renderer.js';

const roots: string[] = [];
function setup() {
  const root = mkdtempSync(join(tmpdir(), 'omp-egress-')); roots.push(root);
  const content = '@startuml\nSYNTHETIC_CONFIDENTIAL_MARKER -> sensor\n@enduml';
  const recipient = 'https://renderer.example/plantuml';
  const context = { project: root, consent_id: 'approval', operation_id: 'render1' };
  recordConsent(root, { id: 'approval', content_digest: digest(content), recipient, purpose: 'diagram.render', tool: 'plantuml', expires_at: new Date(Date.now() + 60000).toISOString(), approved_at: new Date().toISOString(), approval_reference: 'synthetic-user-response', operation_id: 'render1', reuse: 'one_operation' });
  return { root, content, recipient, context };
}
afterEach(() => { vi.unstubAllGlobals(); for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
it('blocks shared rendering with no consent, even with a configured endpoint', async () => {
  const { root, content, recipient } = setup(); const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  const result = await new DiagramRenderer({ plantumlServerUrl: recipient }).renderPlantUML({ figureId: 'fig1', figureNumber: 1, title: 'test', description: '', diagramType: 'flowchart', engine: 'plantuml', phase: 'draft', source: content }, root);
  expect(result.success).toBe(false); expect(fetcher).not.toHaveBeenCalled();
});
it('persists the attempted event before the request and prohibits automatic repeats', async () => {
  const { root, content, recipient, context } = setup();
  const fetcher = vi.fn(async (_url, options) => {
    expect(options.redirect).toBe('error');
    expect(readdirSync(join(root, '.patent/disclosures/attempts'))).toHaveLength(1);
    expect(readdirSync(join(root, '.patent/disclosures/events')).some(n => readFileSync(join(root, '.patent/disclosures/events', n), 'utf8').includes('attempted'))).toBe(true);
    return new Response('synthetic');
  });
  vi.stubGlobal('fetch', fetcher);
  await disclosedFetch(`${recipient}/svg/test`, content, recipient, 'plantuml', 'diagram.render', context);
  await expect(disclosedFetch(`${recipient}/svg/test`, content, recipient, 'plantuml', 'diagram.render', context)).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
  const ledger = readdirSync(join(root, '.patent/disclosures/events')).map(n => readFileSync(join(root, '.patent/disclosures/events', n), 'utf8')).join('');
  expect(ledger).not.toContain(content); expect(ledger).toContain('acknowledged');
});
it.each(['content', 'recipient', 'operation', 'tool'])('rejects changed %s without networking', async kind => {
  const { content, recipient, context } = setup(); const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  await expect(disclosedFetch(`${recipient}/svg/test`, kind === 'content' ? content + 'changed' : content, kind === 'recipient' ? 'https://other.example/plantuml' : recipient, kind === 'tool' ? 'other' : 'plantuml', 'diagram.render', kind === 'operation' ? { ...context, operation_id: 'other' } : context)).rejects.toMatchObject({ code: 'DISCLOSURE_DENIED' });
  expect(fetcher).not.toHaveBeenCalled();
});
it('records uncertain outcome after timeout and never follows a redirect', async () => {
  const { root, content, recipient, context } = setup(); const fetcher = vi.fn().mockRejectedValue(new Error('timeout')); vi.stubGlobal('fetch', fetcher);
  await expect(disclosedFetch(`${recipient}/svg/test`, content, recipient, 'plantuml', 'diagram.render', context)).rejects.toMatchObject({ code: 'RENDER_FAILED' });
  const events = readdirSync(join(root, '.patent/disclosures/events')).map(n => JSON.parse(readFileSync(join(root, '.patent/disclosures/events', n), 'utf8')));
  expect(events.some(e => e.outcome === 'uncertain')).toBe(true);
  expect(fetcher.mock.calls[0][1].redirect).toBe('error');
});
it('fails closed when the audit directory cannot be written', async () => {
  const { root, content, recipient, context } = setup(); const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  writeFileSync(join(root, '.patent/disclosures/events'), 'not a directory');
  await expect(disclosedFetch(`${recipient}/svg/test`, content, recipient, 'plantuml', 'diagram.render', context)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
