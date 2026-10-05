import { existsSync, readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, win32, posix } from 'node:path';
import { createInitialState, validateState, type PatentState } from '../core/state.js';
import { ProjectStore, ProjectError, digest, inspectProject, json, projectFile, requireCurrentState, type Mutation, type WritePlan } from '../core/project-store.js';
import { WorkflowMachine, WorkflowStage } from '../core/workflow.js';
import { effectiveConfig } from '../core/project-config.js';
import { createInitialPath, createInitialNode, isValidBrainstormNode } from '../core/brainstorm-path.js';
import { loadPath, loadNode, savePath, saveNode, saveInnovationSnapshot } from '../core/path-persistence.js';
import { createBranchFromNode } from '../commands/path-branch.js';
import { restoreInnovation } from '../commands/path-restore.js';
import { validateFigureSpec, validateSvg, inspectFigure, type FigureProvenance } from '../core/figures.js';

export interface RuntimeRequest {
  interface_version: 1; operation: string; project?: string;
  operation_id?: string; expected?: Mutation['expected']; params?: Record<string, unknown>;
}
function string(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new ProjectError('INVALID_INPUT', `${name} must be a non-empty string`);
  return value;
}
function readJson(root: string, name: string): unknown { return JSON.parse(readFileSync(projectFile(root, name), 'utf8')); }
function tree(root: string, relative: string): Record<string, string> {
  const result: Record<string, string> = Object.create(null);
  const dir = projectFile(root, relative);
  if (!existsSync(dir)) return result;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const name = `${relative}/${entry.name}`;
    projectFile(root, name);
    if (entry.isDirectory()) Object.assign(result, tree(root, name));
    else result[name] = readFileSync(projectFile(root, name), 'utf8');
  }
  return result;
}
/** Run existing path algorithms in private staging; formal writes use one transaction. */
async function stagePath(root: string, operation: (staging: string) => Promise<unknown>): Promise<WritePlan> {
  const before = tree(root, '.brainstorm');
  const staging = mkdtempSync(join(tmpdir(), 'omp-stage-'));
  try {
    for (const [name, content] of Object.entries(before)) {
      const file = projectFile(staging, name);
      mkdirSync(resolve(file, '..'), { recursive: true }); writeFileSync(file, content);
    }
    const data = await operation(staging);
    const after = tree(staging, '.brainstorm');
    const files: Record<string, string | null> = {};
    for (const name of new Set([...Object.keys(before), ...Object.keys(after)])) if (before[name] !== after[name]) files[name] = after[name] ?? null;
    return { data, files };
  } finally { rmSync(staging, { recursive: true, force: true }); }
}

function migrateArtifact(name: string, oldRoot: string, root: string): string {
  const pathApi = /^[A-Za-z]:|^\\\\/.test(oldRoot) ? win32 : posix;
  const relative = (pathApi.isAbsolute(name) ? pathApi.relative(oldRoot, name) : name).replace(/\\/g, '/');
  if (!existsSync(projectFile(root, relative))) throw new ProjectError('MISSING_FILE', `Resolve legacy artifact before migration: ${relative}`);
  return relative;
}
function migratePathFiles(state: PatentState, root: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const [name, before] of Object.entries(tree(root, '.brainstorm'))) {
    if (!name.endsWith('.json')) continue;
    const document = JSON.parse(before);
    let changed = false;
    const visit = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) {
        if (key === 'outputFile') {
          const path = migrateArtifact(string(child, 'outputFile'), state.project.path, root);
          if (path !== child) { (value as Record<string, unknown>)[key] = path; changed = true; }
        } else visit(child);
      }
    };
    visit(document);
    if (changed) files[name] = json(document);
  }
  return files;
}
function migrate(state: PatentState, root: string): PatentState {
  const validation = validateState(state);
  if (!validation.valid || state.schema_version !== undefined) throw new ProjectError('INVALID_STATE', 'Only valid legacy state can migrate');
  const next = structuredClone(state);
  const oldRoot = next.project.path;
  for (const stage of Object.values(next.stages)) {
    stage.artifacts = stage.artifacts?.map(name => migrateArtifact(name, oldRoot, root));
  }
  next.schema_version = 1; next.revision = 1; next.project.path = '.';
  return next;
}

export async function runOperation(request: RuntimeRequest): Promise<unknown> {
  if (request?.interface_version !== 1) throw new ProjectError('INVALID_INPUT', 'interface_version must be 1');
  if (request.params !== undefined && (!request.params || typeof request.params !== 'object' || Array.isArray(request.params))) throw new ProjectError('INVALID_INPUT', 'params must be an object');
  if (request.operation === 'version' || request.operation === 'doctor') return {
    interface_version: 1, state_schema: 1, node: process.versions.node,
    node_supported: Number(process.versions.node.split('.')[0]) >= 22,
    egress_enforcement: 'runtime_only', host_egress_enforcement: 'instruction_only',
    filesystem: 'local-only', directory_fsync: false, imagegen: 'host-owned-unverified',
  };
  const root = resolve(string(request.project, 'project'));
  const params = request.params ?? {};
  if (request.operation === 'project.inspect') return inspectProject(root);
  if (['project.validate', 'workflow.inspect', 'figure.inspect', 'path.query'].includes(request.operation)) {
    const inspected = inspectProject(root);
    const coordination = inspected.coordination;
    if (coordination.locked || coordination.recovery_required) throw new ProjectError('RECOVERY_REQUIRED', 'Inspect owner/recover the interrupted transaction before reading formal artifacts');
    requireCurrentState(inspected.state);
  }
  if (request.operation === 'project.validate' || request.operation === 'workflow.inspect') {
    const current = inspectProject(root); requireCurrentState(current.state); return current;
  }
  if (request.operation === 'figure.validateSpec') return validateFigureSpec(params.spec);
  if (request.operation === 'figure.validateSvg') return validateSvg(readFileSync(projectFile(root, string(params.path, 'path')), 'utf8'));
  if (request.operation === 'figure.inspect') return inspectFigure(root, string(params.figure_id, 'figure_id'));
  if (request.operation === 'path.query') return { path: await loadPath(root), files: tree(root, '.brainstorm') };
  if (request.operation === 'project.migrate' && params.dry_run === true) {
    const current = inspectProject(root); if (!current.state) throw new ProjectError('MISSING_FILE', 'State missing');
    return { proposed: migrate(current.state, root), path_files: Object.keys(migratePathFiles(current.state, root)), state_digest: current.state_digest, writes: false };
  }
  if (request.operation === 'project.recoverLock') { new ProjectStore(root).recoverLock(string(params.owner_token, 'owner_token')); return { recovered: true }; }
  const operations = ['project.create', 'project.migrate', 'workflow.advance', 'path.record', 'path.branch', 'path.restore', 'figure.register'];
  if (!operations.includes(request.operation)) throw new ProjectError('UNKNOWN_OPERATION', `Unknown operation: ${request.operation}`);
  const mutation: Mutation = { ...request, operation_id: string(request.operation_id, 'operation_id'), expected: request.expected! };
  return new ProjectStore(root).mutate(mutation, async current => {
    if (request.operation === 'project.create') {
      if (current || request.expected?.revision !== null) throw new ProjectError('CONFLICT', 'Creation requires absent state');
      const topic = string(params.topic, 'topic'); const slug = string(params.topic_slug, 'topic_slug');
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(slug)) throw new ProjectError('INVALID_INPUT', 'Invalid topic_slug');
      const config = effectiveConfig(typeof params.workspace === 'string' ? resolve(params.workspace) : undefined, root, params);
      const jurisdiction = config.jurisdiction;
      const state = createInitialState({ topic, topicSlug: slug, jurisdiction: jurisdiction as 'CN' | 'US' | 'PCT', projectPath: '.' });
      const files = {
        '.patent/state.json': json(state), '.brainstorm/path.json': json(createInitialPath(slug, topic)),
        '.patent/config.json': json(config),
        'MAIN.md': `# ${topic}\n\nTechnical drafting assistance, not legal advice. Have a qualified patent professional review before reliance or filing.\n\nEvidence and technical details pending.\n`,
      };
      for (const name of Object.keys(files)) if (name !== '.patent/config.json' && existsSync(projectFile(root, name))) throw new ProjectError('CONFLICT', `Creation would replace existing ${name}`);
      return { files, data: { created: true } };
    }
    if (request.operation === 'project.migrate') {
      if (!current) throw new ProjectError('MISSING_FILE', 'State missing');
      if (!request.expected?.state_digest) throw new ProjectError('INVALID_INPUT', 'Migration requires the inspected state digest');
      const state = migrate(current, root);
      const paths = migratePathFiles(current, root);
      const backups = Object.fromEntries(Object.keys(paths).map(name => [`.patent/backups/${request.operation_id}/${name}`, readFileSync(projectFile(root, name), 'utf8')]));
      return { files: { ...paths, ...backups, '.patent/state.json': json(state), [`.patent/backups/${request.operation_id}-legacy-state.json`]: readFileSync(projectFile(root, '.patent/state.json'), 'utf8') }, data: { migrated: true, path_files: Object.keys(paths) } };
    }
    requireCurrentState(current);
    const files: Record<string, string | null> = {};
    let data: unknown;
    if (request.operation === 'workflow.advance') {
      const target = string(params.target, 'target') as WorkflowStage;
      const artifacts = params.artifacts;
      if (!Array.isArray(artifacts) || !artifacts.length || !artifacts.every(a => typeof a === 'string')) throw new ProjectError('INVALID_INPUT', 'Saved stage artifacts required');
      for (const name of artifacts) {
        const file = projectFile(root, name);
        if (!existsSync(file)) throw new ProjectError('MISSING_FILE', `Missing artifact: ${name}`);
        if (!request.expected?.inputs?.[name]) throw new ProjectError('INVALID_INPUT', 'Each artifact needs an expected input digest');
      }
      if ([WorkflowStage.DRAFT, WorkflowStage.DONE].includes(target) && params.human_decision !== true) throw new ProjectError('INVALID_STATE', 'Human innovation selection/final acceptance required');
      if (target === WorkflowStage.DONE) {
        const entries = existsSync(projectFile(root, 'figures')) ? readdirSync(projectFile(root, 'figures'), { withFileTypes: true }).filter(x => x.isDirectory()) : [];
        const omitted = params.omitted_figures ?? [];
        if (!Array.isArray(omitted) || !omitted.every(item => item && typeof item.figure_id === 'string' && typeof item.reason === 'string' && item.reason.trim()) || new Set(omitted.map(item => item.figure_id)).size !== omitted.length) throw new ProjectError('INVALID_INPUT', 'Omissions require unique figure IDs and reasons');
        for (const item of omitted) if (!entries.some(entry => entry.name === item.figure_id)) throw new ProjectError('INVALID_INPUT', 'Cannot omit an unknown figure');
        if (!entries.length && params.figures_not_required !== true) throw new ProjectError('INVALID_STATE', 'Explicitly record that no figures are required before final completion');
        for (const entry of entries) {
          if (omitted.some(item => item.figure_id === entry.name)) {
            const path = `figures/${entry.name}/figure-spec.json`;
            if (!request.expected?.inputs?.[path]) throw new ProjectError('INVALID_INPUT', 'Omitted specification needs an expected input digest');
            if (!validateFigureSpec(readJson(root, path)).optional) throw new ProjectError('INVALID_STATE', 'Required figures cannot be omitted');
            continue;
          }
          const figure = inspectFigure(root, entry.name);
          if (!figure.review_current || figure.review.status !== 'passed' || !figure.review.technical || !figure.review.visual) throw new ProjectError('INVALID_STATE', `Current technical/visual review required: ${entry.name}`);
        }
        files[`.patent/decisions/${request.operation_id}.json`] = json({ target, human_decision: true, figures_not_required: params.figures_not_required === true, omitted_figures: omitted, artifacts, recorded_at: new Date().toISOString() });
      }
      const machine = WorkflowMachine.fromState(current);
      if (!Object.values(WorkflowStage).includes(target) || !machine.canTransition(target)) throw new ProjectError('INVALID_STATE', `Illegal transition: ${current.current_stage} -> ${target}`);
      const completed = current.current_stage;
      machine.transition(target);
      current.current_stage = target;
      current.stages[completed] = { status: 'completed', timestamp: new Date().toISOString(), artifacts };
      current.stages[target] = { status: 'pending' };
      data = { current_stage: target };
    } else if (request.operation.startsWith('path.')) {
      const staged = await stagePath(root, async temp => {
        if (request.operation === 'path.branch') return createBranchFromNode(temp, string(params.node_id, 'node_id'), string(params.reason, 'reason'));
        if (request.operation === 'path.restore') {
          const nodeId = string(params.node_id, 'node_id');
          const result = await restoreInnovation(temp, nodeId, string(params.innovation_id, 'innovation_id'));
          const restored = await loadNode(temp, nodeId);
          if (!restored) throw new ProjectError('MISSING_FILE', 'Restored node is missing');
          await saveInnovationSnapshot(restored.innovations, temp, restored.round);
          return result;
        }
        const path = await loadPath(temp);
        if (!path) throw new ProjectError('MISSING_FILE', 'Path missing');
        const node = { ...createInitialNode(path.nodes.length + 1), ...(params.node as object) };
        if (!isValidBrainstormNode(node) || node.round !== path.nodes.length + 1 || node.id !== `round-${node.round}`) throw new ProjectError('INVALID_INPUT', 'Valid consecutive path node required');
        for (const output of node.agentOutputs) {
          if (!existsSync(projectFile(root, output.outputFile)) || !request.expected?.inputs?.[output.outputFile]) throw new ProjectError('MISSING_FILE', 'Actual role artifacts and expected input digests required');
        }
        if (path.currentNodeId) path.edges.push({ id: `edge-${path.currentNodeId}-to-${node.id}`, fromNodeId: path.currentNodeId, toNodeId: node.id, transformation: { type: 'refine', description: `Round ${node.round - 1} -> Round ${node.round}`, changes: [] } });
        path.nodes.push(node.id); path.currentNodeId = node.id;
        await saveNode(node, temp); await saveInnovationSnapshot(node.innovations, temp, node.round); await savePath(path, temp);
        return { node_id: node.id };
      });
      Object.assign(files, staged.files); data = staged.data;
    } else if (request.operation === 'figure.register') {
      const specPath = string(params.spec_path, 'spec_path');
      const specText = readFileSync(projectFile(root, specPath), 'utf8');
      const spec = validateFigureSpec(JSON.parse(specText));
      const base = `figures/${spec.figure_id}`;
      if (specPath !== `${base}/figure-spec.json`) throw new ProjectError('INVALID_INPUT', 'Specification must be in its figure directory');
      const resultPath = string(params.result_path, 'result_path');
      if (!resultPath.startsWith(`${base}/`)) throw new ProjectError('INVALID_INPUT', 'Result must be in its figure directory');
      const extension = resultPath.split('.').pop()!;
      if (!spec.formats.includes(extension) || resultPath === specPath || ['provenance.json', 'registered-spec.json'].some(name => resultPath === `${base}/${name}`)) throw new ProjectError('INVALID_INPUT', 'Result must use a declared image format');
      const result = readFileSync(projectFile(root, resultPath));
      if (resultPath.endsWith('.svg')) validateSvg(result.toString('utf8'));
      else if (spec.backend === 'svg') throw new ProjectError('INVALID_INPUT', 'SVG backend requires SVG result');
      for (const name of [specPath, resultPath, 'MAIN.md']) if (!request.expected?.inputs?.[name]) throw new ProjectError('INVALID_INPUT', `Expected input digest required: ${name}`);
      const review = params.review as FigureProvenance['review'] | undefined;
      if (review && (!['pending', 'passed', 'failed'].includes(review.status) || !['model', 'human'].includes(review.reviewer_type) || typeof review.reviewer !== 'string' || !review.reviewer.trim() || !Array.isArray(review.findings) || !review.findings.every(f => typeof f === 'string') || typeof review.technical !== 'boolean' || typeof review.visual !== 'boolean' || review.status === 'passed' && (!review.technical || !review.visual))) throw new ProjectError('INVALID_INPUT', 'Invalid review');
      const priorPath = `${base}/provenance.json`;
      if (existsSync(projectFile(root, priorPath))) {
        // Stable IDs are checked against the previously registered specification snapshot.
        const snapshotPath = `${base}/registered-spec.json`;
        if (existsSync(projectFile(root, snapshotPath))) {
          const old = validateFigureSpec(readJson(root, snapshotPath));
          for (const part of spec.parts) if (old.parts.some(p => p.id === part.id && p.number !== part.number)) throw new ProjectError('INVALID_INPUT', 'Existing part numbers must remain stable');
        }
      }
      const provenance: FigureProvenance = {
        figure_id: spec.figure_id, spec_digest: digest(specText), result_digest: digest(result), main_digest: digest(readFileSync(projectFile(root, 'MAIN.md'))),
        result_path: resultPath, backend: spec.backend, tool: string(params.tool, 'tool'), generated_at: new Date().toISOString(),
        review: review ?? { status: 'pending', reviewer_type: 'model', reviewer: 'unreviewed', technical: false, visual: false, findings: [] },
      };
      if (spec.backend === 'imagegen') {
        provenance.consent_reference = string(params.consent_reference, 'consent_reference');
        provenance.disclosure_reference = string(params.disclosure_reference, 'disclosure_reference');
        const payloadPath = string(params.payload_path, 'payload_path');
        if (!provenance.consent_reference.startsWith('.patent/disclosures/consents/') || !provenance.disclosure_reference.startsWith('.patent/disclosures/events/')) throw new ProjectError('INVALID_INPUT', 'Use saved consent and disclosure ledger references');
        for (const ref of [provenance.consent_reference, provenance.disclosure_reference, payloadPath]) if (!request.expected?.inputs?.[ref]) throw new ProjectError('INVALID_INPUT', 'Disclosure evidence needs expected input digests');
        const consent = readJson(root, provenance.consent_reference) as Record<string, unknown>;
        const event = readJson(root, provenance.disclosure_reference) as Record<string, unknown>;
        const payloadDigest = digest(readFileSync(projectFile(root, payloadPath)));
        if (!consent || !event || consent.content_digest !== payloadDigest || event.content_digest !== payloadDigest || consent.id !== event.consent_id || consent.operation_id !== event.operation_id || consent.tool !== provenance.tool || event.tool !== provenance.tool || consent.recipient !== event.recipient || consent.purpose !== event.purpose || !consent.approval_reference || consent.reuse !== 'one_operation' || event.outcome !== 'acknowledged' || !(Date.parse(String(event.time)) >= Date.parse(String(consent.approved_at))) || !(Date.parse(String(event.time)) <= Date.parse(String(consent.expires_at)))) throw new ProjectError('DISCLOSURE_DENIED', 'Image generation requires matching approved payload and acknowledged disclosure evidence');
        const recipient = new URL(string(consent.recipient, 'recipient'));
        if (!['https:', 'http:'].includes(recipient.protocol) || recipient.username || recipient.password || recipient.search || recipient.hash) throw new ProjectError('INVALID_INPUT', 'Invalid disclosure recipient');
        provenance.provider = string(params.provider, 'provider');
      }
      if (typeof params.provider === 'string') provenance.provider = params.provider;
      if (typeof params.model === 'string') provenance.model = params.model;
      if (typeof params.source_path === 'string') {
        if (!params.source_path.startsWith(`${base}/`) || !request.expected?.inputs?.[params.source_path]) throw new ProjectError('INVALID_INPUT', 'Source must be in figure directory with expected digest');
        provenance.source_path = params.source_path;
        provenance.source_digest = digest(readFileSync(projectFile(root, params.source_path)));
      }
      files[`${base}/provenance.json`] = json(provenance); files[`${base}/registered-spec.json`] = specText;
      data = provenance;
    }
    files['.patent/state.json'] = json(current);
    return { files, data };
  }, { migrate: request.operation === 'project.migrate' });
}
