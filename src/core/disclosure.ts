/** Audited egress. Smoke: npm test tests/skill-package/disclosure.test.ts */
import { readFileSync, mkdirSync, openSync, writeFileSync, fsyncSync, closeSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { digest, json, projectFile, ProjectError } from './project-store.js';

export interface Consent {
  id: string; content_digest: string; recipient: string; purpose: string;
  tool: string; expires_at: string; reuse: 'one_operation'; operation_id: string;
  approved_at: string; approval_reference: string;
}
export interface DisclosureContext { project: string; consent_id: string; operation_id: string; }
function identifier(value: string): string {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new ProjectError('INVALID_INPUT', 'Invalid disclosure ID');
  return value;
}
function persist(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  const fd = openSync(file, 'wx', 0o600);
  try { writeFileSync(fd, json(value)); fsyncSync(fd); } finally { closeSync(fd); }
}
export function recordConsent(project: string, consent: Consent): void {
  identifier(consent.id); identifier(consent.operation_id);
  const recipient = new URL(consent.recipient);
  if (!['https:', 'http:'].includes(recipient.protocol) || recipient.username || recipient.password || recipient.search || recipient.hash) throw new ProjectError('INVALID_INPUT', 'Recipient must be an endpoint without credentials/query/fragment');
  if (!/^[a-f0-9]{64}$/.test(consent.content_digest) || !consent.approval_reference || !consent.tool || !consent.purpose || consent.reuse !== 'one_operation' || !(Date.parse(consent.expires_at) > Date.now()) || !Number.isFinite(Date.parse(consent.approved_at))) throw new ProjectError('INVALID_INPUT', 'Complete, current content-bound approval required');
  persist(projectFile(project, `.patent/disclosures/consents/${consent.id}.json`), consent);
}
/** Caller supplies the source content, not an encoded URL, for digest matching. */
export async function disclosedFetch(url: string, content: string, recipient: string, tool: string, purpose: string, context?: DisclosureContext): Promise<Response> {
  if (!context) throw new ProjectError('DISCLOSURE_DENIED', 'No content-bound disclosure consent; source retained locally');
  const operation = identifier(context.operation_id);
  const record = (outcome: string): void => persist(projectFile(context.project, `.patent/disclosures/events/${operation}-${randomUUID()}.json`), {
    operation_id: operation, consent_id: context.consent_id, content_digest: digest(content),
    recipient, tool, purpose, outcome, time: new Date().toISOString(),
  });
  let consent: Consent;
  try {
    consent = JSON.parse(readFileSync(projectFile(context.project, `.patent/disclosures/consents/${identifier(context.consent_id)}.json`), 'utf8'));
    const target = new URL(url); const approved = new URL(recipient);
    if (consent.operation_id !== operation || consent.content_digest !== digest(content) || consent.recipient !== recipient || consent.tool !== tool || consent.purpose !== purpose || !(Date.parse(consent.expires_at) > Date.now()) || target.origin !== approved.origin || !target.pathname.startsWith(approved.pathname.replace(/\/$/, '') + '/') || target.username || target.password) throw new Error('Consent scope mismatch');
  } catch {
    record('blocked');
    throw new ProjectError('DISCLOSURE_DENIED', 'Missing, expired or mismatched disclosure consent');
  }
  // Reserve each exact request once; a timeout is not permission for automatic retry.
  persist(projectFile(context.project, `.patent/disclosures/attempts/${operation}-${digest(url)}.json`), { consent_id: consent.id, content_digest: digest(content), recipient, outcome: 'attempted', time: new Date().toISOString() });
  record('attempted');
  try {
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
    record('acknowledged');
    return response;
  } catch {
    record('uncertain');
    throw new ProjectError('RENDER_FAILED', 'Remote request outcome uncertain; inspect disclosure ledger before a new operation');
  }
}
