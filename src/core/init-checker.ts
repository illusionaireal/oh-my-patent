import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, renameSync, unlinkSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';

export type CheckStatus = 'ready' | 'missing' | 'warning';

export interface CheckResult {
  category: 'mcp' | 'tool' | 'runtime' | 'project';
  name: string;
  status: CheckStatus;
  detail: string;
  guidance?: string;
}

export interface InitReport {
  timestamp: string;
  adapter: string;
  workspaceDir: string;
  results: CheckResult[];
  blockingCount: number;
  warningCount: number;
  ready: boolean;
  summary: string;
}

export interface McpUserInput {
  key: string;
  label: string;
  placeholder: string;
  description: string;
  docsUrl?: string;
  required: boolean;
}

export interface McpTemplate {
  id: string;
  name: string;
  description: string;
  priority: 'required' | 'recommended' | 'optional';
  transport: 'stdio' | 'streamableHttp';
  urlTemplate?: string;
  command?: string;
  args?: string[];
  userInputs: McpUserInput[];
  docsUrl?: string;
}

export interface McpStatus {
  id: string;
  name: string;
  description: string;
  priority: string;
  configured: boolean;
  template?: McpTemplate;
}

const MCP_TEMPLATES: McpTemplate[] = [
  {
    id: 'patsnap_search',
    name: '智慧芽专利检索',
    description: '全球2.1亿+专利数据，覆盖174个专利受理局，含法律状态/同族/引证/权利要求/全文',
    priority: 'recommended',
    transport: 'streamableHttp',
    urlTemplate: 'https://connect.zhihuiya.com/1458a4/mcp?apikey={apikey}',
    userInputs: [
      {
        key: 'apikey',
        label: 'MCP Key',
        placeholder: 'sk-xxxxxxxxxxxx',
        description: '在智慧芽开放平台创建 MCP Key',
        docsUrl: 'https://open.zhihuiya.com/',
        required: true,
      },
    ],
    docsUrl: 'https://open.zhihuiya.com/',
  },
  {
    id: 'google_scholar',
    name: 'Google Scholar',
    description: '学术文献检索，覆盖面广，引用数据较全',
    priority: 'required',
    transport: 'stdio',
    command: 'mcp-google-scholar',
    args: [],
    userInputs: [],
  },
  {
    id: 'uspto_patent',
    name: 'USPTO Patent',
    description: '美国专利授权与申请，权利要求质量高',
    priority: 'recommended',
    transport: 'stdio',
    command: 'mcp-uspto-patent',
    args: [],
    userInputs: [],
  },
  {
    id: 'cnipa_patent',
    name: 'CNIPA Patent',
    description: '中国国家知识产权局专利，本土布局参考',
    priority: 'recommended',
    transport: 'stdio',
    command: 'mcp-cnipa-patent',
    args: [],
    userInputs: [],
  },
  {
    id: 'semantic_scholar',
    name: 'Semantic Scholar',
    description: 'AI 学术检索 + 结构化引用图',
    priority: 'optional',
    transport: 'stdio',
    command: 'mcp-semantic-scholar',
    args: [],
    userInputs: [],
  },
];

const REQUIRED_TOOLS = [
  {
    name: 'mmdc',
    desc: 'Mermaid CLI - 渲染流程图/架构图',
    command: 'mmdc --version',
    installHint: 'npm install -g @mermaid-js/mermaid-cli',
    blocking: true,
  },
  {
    name: 'git',
    desc: 'Git 版本管理',
    command: 'git --version',
    installHint: 'https://git-scm.com/downloads',
    blocking: true,
  },
] as const;

const MIN_NODE_MAJOR = 18;

function tryExec(command: string): string | null {
  try {
    return execSync(command, { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

function detectAdapter(workspaceDir: string): string {
  if (existsSync(join(workspaceDir, '.claude'))) return 'Claude Code';
  if (existsSync(join(workspaceDir, '.codex')) || existsSync(join(workspaceDir, 'codex.json'))) return 'Codex';
  if (existsSync(join(workspaceDir, 'opencode.jsonc'))) return 'OpenCode';
  return 'Unknown';
}

interface McpConfigTarget {
  path: string;
  key: 'mcpServers' | 'mcp';
  adapter: 'claude' | 'codex' | 'opencode';
}

function getMcpConfigTarget(workspaceDir: string): McpConfigTarget {
  if (existsSync(join(workspaceDir, '.claude'))) {
    return {
      path: join(workspaceDir, '.claude', 'settings.json'),
      key: 'mcpServers',
      adapter: 'claude',
    };
  }
  if (existsSync(join(workspaceDir, '.codex')) || existsSync(join(workspaceDir, 'codex.json'))) {
    return {
      path: join(workspaceDir, 'codex.json'),
      key: 'mcpServers',
      adapter: 'codex',
    };
  }
  return {
    path: join(workspaceDir, 'opencode.jsonc'),
    key: 'mcp',
    adapter: 'opencode',
  };
}

function stripJsonComments(content: string): string {
  let result = '';
  let index = 0;
  let inString = false;

  while (index < content.length) {
    const current = content[index];
    const next = content[index + 1];

    if (inString) {
      result += current;
      if (current === '\\') {
        index++;
        if (index < content.length) result += content[index];
      } else if (current === '"') {
        inString = false;
      }
      index++;
    } else if (current === '"') {
      inString = true;
      result += current;
      index++;
    } else if (current === '/' && next === '/') {
      while (index < content.length && content[index] !== '\n') index++;
    } else if (current === '/' && next === '*') {
      index += 2;
      while (index < content.length - 1 && !(content[index] === '*' && content[index + 1] === '/')) index++;
      index += 2;
    } else {
      result += current;
      index++;
    }
  }

  return result;
}

function parseConfig(content: string, configPath: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(stripJsonComments(content));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('root value must be an object');
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot update invalid configuration ${configPath}: ${message}`);
  }
}

function readMcpConfig(workspaceDir: string): Record<string, unknown> | null {
  const target = getMcpConfigTarget(workspaceDir);
  if (!existsSync(target.path)) return null;

  try {
    const parsed = parseConfig(readFileSync(target.path, 'utf-8'), target.path);
    const servers = parsed[target.key];
    return servers && typeof servers === 'object' && !Array.isArray(servers)
      ? servers as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export function getMcpTemplates(): McpTemplate[] {
  return MCP_TEMPLATES;
}

export function getMcpStatuses(workspaceDir: string): McpStatus[] {
  const mcpConfig = readMcpConfig(workspaceDir);
  return MCP_TEMPLATES.map((tpl) => {
    const configured = !!(mcpConfig && tpl.id in mcpConfig);
    return {
      id: tpl.id,
      name: tpl.name,
      description: tpl.description,
      priority: tpl.priority,
      configured,
      template: configured ? undefined : tpl,
    };
  });
}

export function buildMcpConfig(
  templateId: string,
  userInputValues: Record<string, string>
): Record<string, unknown> | null {
  const tpl = MCP_TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) return null;

  if (tpl.transport === 'streamableHttp') {
    let url = tpl.urlTemplate ?? '';
    for (const input of tpl.userInputs) {
      const val = userInputValues[input.key] ?? '';
      url = url.replace(`{${input.key}}`, encodeURIComponent(val));
    }
    return { url, type: 'streamableHttp' };
  }

  return {
    command: tpl.command,
    args: tpl.args ?? [],
  };
}

export function writeMcpConfig(
  workspaceDir: string,
  mcpId: string,
  config: Record<string, unknown>
): { success: boolean; message: string; configPath: string } {
  const target = getMcpConfigTarget(workspaceDir);
  const configPath = target.path;
  let existing: Record<string, unknown> = {};

  if (existsSync(configPath)) {
    existing = parseConfig(readFileSync(configPath, 'utf-8'), configPath);
  }

  if (!existing[target.key] || typeof existing[target.key] !== 'object' || Array.isArray(existing[target.key])) {
    existing[target.key] = {};
  }
  const storedConfig = target.adapter === 'opencode'
    ? toOpenCodeMcpConfig(config)
    : config;
  (existing[target.key] as Record<string, unknown>)[mcpId] = storedConfig;

  const dir = dirname(configPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const tempPath = `${configPath}.${Date.now()}.${randomBytes(4).toString('hex')}.tmp`;
  try {
    writeFileSync(tempPath, JSON.stringify(existing, null, 2), { encoding: 'utf-8', flag: 'wx' });
    try {
      renameSync(tempPath, configPath);
    } catch (renameErr) {
      const code = (renameErr as NodeJS.ErrnoException).code;
      if (code === 'EEXIST' || code === 'EACCES' || code === 'EPERM') {
        // Windows: destination exists, need to unlink first
        try {
          unlinkSync(configPath);
        } catch {
          // ignore
        }
        renameSync(tempPath, configPath);
      } else {
        throw renameErr;
      }
    }
  } catch (error) {
    if (existsSync(tempPath)) {
      try { unlinkSync(tempPath); } catch { /* ignore */ }
    }
    throw error;
  }

  return {
    success: true,
    message: `已写入 ${mcpId} 配置到 ${configPath}`,
    configPath,
  };
}

function toOpenCodeMcpConfig(config: Record<string, unknown>): Record<string, unknown> {
  if (typeof config.url === 'string') {
    return { type: 'remote', url: config.url };
  }

  const command = typeof config.command === 'string' ? config.command : '';
  const args = Array.isArray(config.args) ? config.args.map(String) : [];
  return { type: 'local', command: [command, ...args].filter(Boolean) };
}

export function checkMcpServers(workspaceDir: string): CheckResult[] {
  const mcpConfig = readMcpConfig(workspaceDir);
  const results: CheckResult[] = [];

  for (const tpl of MCP_TEMPLATES) {
    if (mcpConfig && tpl.id in mcpConfig) {
      results.push({
        category: 'mcp',
        name: tpl.id,
        status: 'ready',
        detail: `${tpl.name} - 已配置`,
      });
    } else {
      const isRequired = tpl.priority === 'required';
      results.push({
        category: 'mcp',
        name: tpl.id,
        status: isRequired ? 'missing' : 'warning',
        detail: `${tpl.name} - 未配置 (${tpl.priority})`,
      });
    }
  }

  return results;
}

export function checkExternalTools(): CheckResult[] {
  const results: CheckResult[] = [];

  for (const tool of REQUIRED_TOOLS) {
    const version = tryExec(tool.command);
    if (version) {
      results.push({
        category: 'tool',
        name: tool.name,
        status: 'ready',
        detail: `${tool.desc} - ${version}`,
      });
    } else {
      results.push({
        category: 'tool',
        name: tool.name,
        status: 'missing',
        detail: `${tool.desc} - 未找到`,
        guidance: `安装: ${tool.installHint}`,
      });
    }
  }

  return results;
}

export function checkRuntime(workspaceDir: string): CheckResult[] {
  const results: CheckResult[] = [];

  const nodeVersion = tryExec('node --version');
  if (nodeVersion) {
    const majorMatch = nodeVersion.match(/v(\d+)/);
    const major = majorMatch ? parseInt(majorMatch[1], 10) : 0;
    if (major >= MIN_NODE_MAJOR) {
      results.push({ category: 'runtime', name: 'node', status: 'ready', detail: `Node.js ${nodeVersion}` });
    } else {
      results.push({ category: 'runtime', name: 'node', status: 'missing', detail: `Node.js ${nodeVersion} 版本过低`, guidance: '升级 Node.js' });
    }
  } else {
    results.push({ category: 'runtime', name: 'node', status: 'missing', detail: 'Node.js 未找到', guidance: '安装 Node.js' });
  }

  const testDir = join(workspaceDir, '.init-check-tmp');
  try {
    mkdirSync(testDir, { recursive: true });
    rmSync(testDir, { recursive: true });
    results.push({ category: 'runtime', name: 'workspace-writable', status: 'ready', detail: '工作目录可写' });
  } catch {
    results.push({ category: 'runtime', name: 'workspace-writable', status: 'missing', detail: '工作目录不可写', guidance: '检查目录权限' });
  }

  return results;
}

export function checkProjects(workspaceDir: string): CheckResult[] {
  const results: CheckResult[] = [];
  const projectsDir = join(workspaceDir, 'projects');

  if (!existsSync(projectsDir)) {
    results.push({ category: 'project', name: 'projects-dir', status: 'ready', detail: 'projects/ 目录不存在（新环境）' });
    return results;
  }

  let projectCount = 0;
  try {
    const entries = readdirSync(projectsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && /^\d+-/.test(entry.name)) {
        projectCount++;
        const statePath = join(projectsDir, entry.name, '.patent', 'state.json');
        if (existsSync(statePath)) {
          try {
            const stateContent = readFileSync(statePath, 'utf-8');
            const state = JSON.parse(stateContent);
            results.push({ category: 'project', name: `project-${entry.name}`, status: 'ready', detail: `阶段: ${state.current_stage ?? 'unknown'}` });
          } catch {
            results.push({ category: 'project', name: `project-${entry.name}`, status: 'warning', detail: 'state.json 解析失败' });
          }
        } else {
          results.push({ category: 'project', name: `project-${entry.name}`, status: 'warning', detail: '无 state.json' });
        }
      }
    }
  } catch {
    // ignore
  }

  if (projectCount === 0) {
    results.push({ category: 'project', name: 'projects-dir', status: 'ready', detail: 'projects/ 目录存在但无项目' });
  }

  return results;
}

export function runFullCheck(options: { workspaceDir?: string }): InitReport {
  const workspaceDir = resolve(options.workspaceDir ?? process.cwd());
  const adapter = detectAdapter(workspaceDir);

  const results: CheckResult[] = [
    ...checkMcpServers(workspaceDir),
    ...checkExternalTools(),
    ...checkRuntime(workspaceDir),
    ...checkProjects(workspaceDir),
  ];

  const blockingCount = results.filter(
    (r) => r.status === 'missing' && (r.category === 'tool' || r.category === 'runtime')
  ).length;

  const warningCount = results.filter(
    (r) => r.status === 'warning' || (r.status === 'missing' && r.category === 'mcp')
  ).length;

  const ready = blockingCount === 0;

  const summary = ready
    ? warningCount > 0
      ? `环境基本就绪，${warningCount} 个警告项建议处理`
      : '环境完全就绪，所有检测项通过'
    : `${blockingCount} 个阻塞项需要解决后才能正常使用`;

  return { timestamp: new Date().toISOString(), adapter, workspaceDir, results, blockingCount, warningCount, ready, summary };
}

export interface JsonReport {
  ready: boolean;
  blockingCount: number;
  warningCount: number;
  summary: string;
  adapter: string;
  mcpStatuses: McpStatus[];
  results: CheckResult[];
}

export function runJsonCheck(options: { workspaceDir?: string }): JsonReport {
  const report = runFullCheck(options);
  const mcpStatuses = getMcpStatuses(resolve(options.workspaceDir ?? process.cwd()));
  return {
    ready: report.ready,
    blockingCount: report.blockingCount,
    warningCount: report.warningCount,
    summary: report.summary,
    adapter: report.adapter,
    mcpStatuses,
    results: report.results,
  };
}

export function formatReport(report: InitReport): string {
  const lines: string[] = [];
  lines.push('# 环境就绪报告');
  lines.push('');
  lines.push(`**检测时间**: ${report.timestamp}`);
  lines.push(`**适配器**: ${report.adapter}`);
  lines.push(`**工作目录**: ${report.workspaceDir}`);
  lines.push('');

  const categories = ['mcp', 'tool', 'runtime', 'project'] as const;
  const categoryLabels: Record<string, string> = { mcp: 'MCP 服务器', tool: '外部工具', runtime: '运行时', project: '项目状态' };

  lines.push('## 检测结果总览');
  lines.push('');
  lines.push('| 类别 | 就绪 | 缺失 | 警告 |');
  lines.push('|------|------|------|------|');
  for (const cat of categories) {
    const catResults = report.results.filter((r) => r.category === cat);
    const ready = catResults.filter((r) => r.status === 'ready').length;
    const missing = catResults.filter((r) => r.status === 'missing').length;
    const warning = catResults.filter((r) => r.status === 'warning').length;
    lines.push(`| ${categoryLabels[cat]} | ${ready} | ${missing} | ${warning} |`);
  }
  lines.push('');

  for (const cat of categories) {
    const catResults = report.results.filter((r) => r.category === cat);
    if (catResults.length === 0) continue;
    lines.push(`## ${categoryLabels[cat]}`);
    lines.push('');
    lines.push('| 名称 | 状态 | 详情 |');
    lines.push('|------|------|------|');
    for (const r of catResults) {
      const statusLabel = r.status === 'ready' ? '就绪' : r.status === 'missing' ? '缺失' : '警告';
      lines.push(`| ${r.name} | ${statusLabel} | ${r.detail} |`);
    }
    lines.push('');
  }

  lines.push('## 就绪判定');
  lines.push('');
  lines.push(`- **总体状态**: ${report.ready ? '就绪' : '有阻塞项'}`);
  lines.push(`- **阻塞项**: ${report.blockingCount}`);
  lines.push(`- **警告项**: ${report.warningCount}`);
  lines.push(`- **摘要**: ${report.summary}`);

  return lines.join('\n');
}
