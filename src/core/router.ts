import { isValidJurisdiction } from '../skills/jurisdiction.js';

export enum IntentType {
  NEW_PROJECT = 'NEW_PROJECT',
  SEARCH = 'SEARCH',
  BRAINSTORM = 'BRAINSTORM',
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  DIAGRAM = 'DIAGRAM',
  STATUS = 'STATUS',
  CONTINUE_WORKFLOW = 'CONTINUE_WORKFLOW',
  UNKNOWN = 'UNKNOWN'
}

export interface IntentResult {
  type: IntentType;
  confidence: number;
  extracted?: {
    topic?: string;
    query?: string;
    scope?: string;
    jurisdiction?: string;
  };
}

interface IntentPattern {
  pattern: RegExp;
  confidence: number;
}

const INTENT_PATTERNS: Record<IntentType, IntentPattern[]> = {
  [IntentType.NEW_PROJECT]: [
    { pattern: /(我有.{0,5}(想法|方案|发明|创新))/, confidence: 0.8 },
    { pattern: /(想申请.{0,10}专利)/, confidence: 0.9 },
    { pattern: /(基于.{1,30}的.{1,30}(方法|系统|装置|方案))/, confidence: 0.95 }
  ],
  [IntentType.SEARCH]: [
    { pattern: /(检索|搜索|查找).{0,30}(现有技术|专利|文献|prior art)/i, confidence: 0.9 },
    { pattern: /(查一下).{0,10}(相关|类似).{0,20}(专利|技术|文献)/, confidence: 0.85 },
    { pattern: /(帮我查).{0,15}(专利|技术|文献)/, confidence: 0.85 },
    { pattern: /(找一下).{0,10}(相关|类似).{0,20}(专利|技术|文献)/, confidence: 0.85 },
    { pattern: /(补检).{0,15}(专利|技术|文献)/, confidence: 0.88 },
    { pattern: /(search|find|look\s+up)\s.{0,30}(patents?|prior\s+art|literature)/i, confidence: 0.88 },
    { pattern: /prior\s+art\s+search/i, confidence: 0.95 }
  ],
  [IntentType.BRAINSTORM]: [
    { pattern: /(头脑风暴|创新点|创意)/, confidence: 0.9 },
    { pattern: /(生成.{0,5}创新点)/, confidence: 0.85 }
  ],
  [IntentType.DRAFT]: [
    { pattern: /(写|撰写|生成).{0,10}(交底书|说明书)/, confidence: 0.9 },
    { pattern: /(帮我写).{0,10}(交底书|专利)/, confidence: 0.85 }
  ],
  [IntentType.REVIEW]: [
    { pattern: /(审核|检查|审查).{0,10}(交底书|专利)/, confidence: 0.9 },
    { pattern: /(写得怎么样)/, confidence: 0.8 }
  ],
  [IntentType.DIAGRAM]: [
    { pattern: /(生成|画|绘制).{0,10}(图|附图|架构图|流程图)/, confidence: 0.9 },
    { pattern: /(专利图|交底书图|技术图)/, confidence: 0.85 },
    { pattern: /(重新生成|重画|修改).{0,10}(图|附图)/, confidence: 0.85 }
  ],
  [IntentType.STATUS]: [
    { pattern: /(状态|进度)/, confidence: 0.8 },
    { pattern: /(到哪里了)/, confidence: 0.7 }
  ],
  [IntentType.CONTINUE_WORKFLOW]: [
    { pattern: /^(继续|下一步|continue)$/i, confidence: 0.9 }
  ],
  [IntentType.UNKNOWN]: []
};

function extractSearchQuery(input: string): string | undefined {
  const cnMatch =
    input.match(/(?:检索|搜索|查找|查一下|找一下|帮我查|补检)\s*(.{2,80}?)(?:的相关|的类似|的|相关|类似|专利|文献|现有技术|prior art|技术)/i) ||
    input.match(/(?:检索|搜索|查找|查一下|找一下|帮我查|补检)\s*(.{2,80})/);
  const enMatch =
    input.match(/(?:search\s+for|find|look\s+up)\s+(.{2,80}?)(?:\s+patent|\s+prior\s+art|\s+literature)/i) ||
    input.match(/(?:search\s+for|find|look\s+up)\s+(.{2,80})/i);

  const matched = cnMatch || enMatch;
  if (!matched) return undefined;
  const query = matched[1].trim();
  if (query.length < 2) return undefined;
  return query;
}

function extractScope(input: string): string | undefined {
  const m = input.match(/(?:最近|近)\s*(\d+)\s*年/);
  if (!m) return undefined;
  const years = parseInt(m[1], 10);
  if (years <= 1) return '1year';
  if (years <= 3) return '3years';
  if (years <= 5) return '5years';
  if (years <= 10) return '10years';
  return 'all';
}

/** Latin jurisdiction codes must be whole tokens. `/US/i` also matches "useful" and "user". */
function hasJurisdictionCode(input: string, code: string): boolean {
  return new RegExp(`(?:^|[^A-Za-z0-9])${code}(?:[^A-Za-z0-9]|$)`, 'i').test(input);
}

export function extractJurisdiction(input: string): string | undefined {
  // REQ-017 / DEC-3：识别已知法域关键词，但只返回受支持的取值
  // （`JurisdictionCode` 成员，判定来自 `isValidJurisdiction`）。
  // 'EP' / 'JP' 会被识别但当前不受支持 —— 若原样返回，就会产生
  // "路由返回 A、validateState/getJurisdictionRules 拒绝 A" 的断裂；
  // 现在统一丢弃，由技能文档向用户明确提示"暂不支持"。
  // 若日后枚举新增取值，此处无需改动即可自动跟随。
  const recognized = [
    (/国内|中国/.test(input) || hasJurisdictionCode(input, 'CN')) ? 'CN' : null,
    (/美国/.test(input) || hasJurisdictionCode(input, 'US')) ? 'US' : null,
    (/欧洲/.test(input) || hasJurisdictionCode(input, 'EP')) ? 'EP' : null,
    (/日本/.test(input) || hasJurisdictionCode(input, 'JP')) ? 'JP' : null,
    (/国际/.test(input) || hasJurisdictionCode(input, 'PCT')) ? 'PCT' : null,
  ].filter((code): code is string => code !== null);
  return recognized.find(code => isValidJurisdiction(code));
}

export function classifyIntent(input: string): IntentResult {
  const normalizedInput = input.trim();
  let bestMatch: { type: IntentType; confidence: number } | null = null;

  for (const [intentType, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (intentType === IntentType.UNKNOWN) continue;

    for (const { pattern, confidence } of patterns) {
      if (pattern.test(normalizedInput)) {
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { type: intentType as IntentType, confidence };
        }
      }
    }
  }

  if (bestMatch) {
    const result: IntentResult = {
      type: bestMatch.type,
      confidence: bestMatch.confidence
    };

    if (bestMatch.type === IntentType.NEW_PROJECT) {
      const topicMatch = normalizedInput.match(/基于(.{1,50})的/) ||
        normalizedInput.match(/(.{2,50})(方法|系统|装置|方案)$/);
      if (topicMatch) {
        result.extracted = { topic: topicMatch[1] };
      }
    }

    if (bestMatch.type === IntentType.SEARCH) {
      const query = extractSearchQuery(normalizedInput);
      const scope = extractScope(normalizedInput);
      const jurisdiction = extractJurisdiction(normalizedInput);
      if (query || scope || jurisdiction) {
        result.extracted = {};
        if (query) result.extracted.query = query;
        if (scope) result.extracted.scope = scope;
        if (jurisdiction) result.extracted.jurisdiction = jurisdiction;
      }
    }

    return result;
  }

  return { type: IntentType.UNKNOWN, confidence: 0.3 };
}
