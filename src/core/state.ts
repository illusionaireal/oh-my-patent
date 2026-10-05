import {
  JurisdictionCode,
  SUPPORTED_JURISDICTIONS,
  isValidJurisdiction
} from '../skills/jurisdiction.js';
import {
  WORKFLOW_STAGE_ORDER,
  isValidStage,
} from './workflow-stages.js';
import type { WorkflowStageName } from './workflow-stages.js';

/**
 * 法域字面量联合（REQ-017 / DEC-3）：由唯一定义点 `JurisdictionCode`
 * （`src/skills/jurisdiction.ts`）派生，与 `plugin.jsonc` 的
 * `config.jurisdiction.enum` 同源。不要在本文件再写第二份清单。
 */
export type Jurisdiction = `${JurisdictionCode}`;

export interface PatentState {
  /** Absent only on explicitly unmigrated legacy projects. */
  schema_version?: 1;
  revision?: number;
  project: {
    path: string;
    topic: string;
    topic_slug: string;
    created_at: string;
    jurisdiction: Jurisdiction;
  };
  /**
   * 当前阶段（REQ-039）：由 `workflow-stages.js` 的 `WorkflowStage` 枚举派生。
   * 此处**不得**再写字面量联合 —— 阶段清单在全仓库只有一处定义。
   */
  current_stage: WorkflowStageName;
  stages: Record<string, { status: string; timestamp?: string; artifacts?: string[] }>;
  innovation_candidates: unknown[];
  selected_innovation: unknown | null;
  qa_rounds_completed: number;
  last_modified: string;
}

export interface CreateStateInput {
  topic: string;
  topicSlug: string;
  jurisdiction: Jurisdiction;
  projectPath: string;
}

export function createInitialState(input: CreateStateInput): PatentState {
  const now = new Date().toISOString();
  return {
    project: {
      path: input.projectPath,
      topic: input.topic,
      topic_slug: input.topicSlug,
      created_at: now,
      jurisdiction: input.jurisdiction
    },
    current_stage: 'INIT',
    // 阶段清单由 WorkflowStage 枚举派生（REQ-039），不再手工列举。
    stages: Object.fromEntries(
      WORKFLOW_STAGE_ORDER.map((stage) => [stage, { status: 'pending' }])
    ),
    innovation_candidates: [],
    selected_innovation: null,
    qa_rounds_completed: 0,
    last_modified: now
  };
}

export function validateState(state: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof state !== 'object' || state === null) {
    return { valid: false, errors: ['State must be an object'] };
  }

  const s = state as Record<string, unknown>;
  if (s.schema_version !== undefined && s.schema_version !== 1) errors.push('Unsupported schema_version');
  if (s.schema_version === 1 && (!Number.isSafeInteger(s.revision) || (s.revision as number) < 0)) errors.push('Invalid revision');
  if (s.schema_version === 1 && (s.project as Record<string, unknown> | undefined)?.path !== '.') errors.push('Versioned project.path must be relative root');
  if (s.schema_version === 1) {
    if (!s.stages || typeof s.stages !== 'object' || Array.isArray(s.stages)) errors.push('Versioned stages must be a record');
    else for (const stage of WORKFLOW_STAGE_ORDER) {
      const value = (s.stages as Record<string, unknown>)[stage] as Record<string, unknown> | undefined;
      if (!value || !['pending', 'completed'].includes(value.status as string)) errors.push(`Invalid stage record: ${stage}`);
      if (value?.artifacts !== undefined && (!Array.isArray(value.artifacts) || !value.artifacts.every(v => typeof v === 'string' && !/^[\/\\]|:|\\|(^|\/)\.\.(\/|$)/.test(v)))) errors.push(`Invalid relative artifacts: ${stage}`);
    }
  }

  if (!s.project || typeof s.project !== 'object') {
    errors.push('Missing or invalid project field');
  } else {
    const p = s.project as Record<string, unknown>;
    if (!p.path || typeof p.path !== 'string') {
      errors.push('Missing or invalid project.path');
    }
    if (!p.topic || typeof p.topic !== 'string') {
      errors.push('Missing or invalid project.topic');
    }
    // REQ-022: topic_slug feeds file naming downstream; empty or non-string
    // values would silently produce broken paths.
    if (!p.topic_slug || typeof p.topic_slug !== 'string') {
      errors.push('Missing or invalid project.topic_slug');
    }
    // REQ-017: jurisdiction 集合的唯一定义点是 `JurisdictionCode` 枚举；
    // 校验消息同时列出受支持取值，使"不支持"成为明确反馈而非静默拒绝。
    if (!(p.jurisdiction as string) || !isValidJurisdiction(p.jurisdiction as string)) {
      errors.push(
        `Invalid jurisdiction: ${p.jurisdiction} (supported: ${SUPPORTED_JURISDICTIONS.join(', ')})`
      );
    }
  }

  // REQ-039: 阶段清单的唯一定义点是 `workflow-stages.js` 的 WorkflowStage 枚举。
  if (!isValidStage(s.current_stage)) {
    errors.push(`Invalid current_stage: ${String(s.current_stage)}`);
  }

  if (!s.stages || typeof s.stages !== 'object') {
    errors.push('Missing or invalid stages field');
  }

  // REQ-022: qa_rounds_completed drives the "two quiet rounds" exit rule, so
  // a negative or non-numeric value can end the QA loop early.
  if (typeof s.qa_rounds_completed !== 'number' || !Number.isInteger(s.qa_rounds_completed) || s.qa_rounds_completed < 0) {
    errors.push(`Invalid qa_rounds_completed: ${String(s.qa_rounds_completed)} (must be a non-negative integer)`);
  }

  // REQ-022: innovation_candidates is always an array in every producer.
  if (!Array.isArray(s.innovation_candidates)) {
    errors.push('Missing or invalid innovation_candidates field (must be an array)');
  }

  if (!s.last_modified || typeof s.last_modified !== 'string') {
    errors.push('Missing or invalid last_modified');
  }

  return { valid: errors.length === 0, errors };
}
