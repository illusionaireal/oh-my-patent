/** Shared public CLI and installed checker. Smoke: oh-my-patent check --json. */
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { parseArgs, isDangerousKey } from '../core/cli-args.js';
import { atomicWriteFileSync } from '../core/atomic-write.js';
import { ensureUnlinkedPath } from '../core/path-safety.js';
import { runJsonCheck, runFullCheck, formatReport, getMcpStatuses, buildMcpConfig,
  writeMcpConfig, INIT_CHECK_HOSTS, type InitCheckHost } from '../core/init-checker.js';

export async function runCheck(argv: string[], defaults: { workspaceDir: string; host?: InitCheckHost }): Promise<void> {
  const opts = parseArgs(argv);
  const workspaceDir = resolve(opts['workspace-dir'] || defaults.workspaceDir);
  const hostName = opts.tool || defaults.host;
  if (hostName && !INIT_CHECK_HOSTS.includes(hostName as InitCheckHost)) throw new Error('Unknown check host. Use --tool claude-code|codex|opencode');
  if (defaults.host && hostName !== defaults.host) throw new Error('Installed check runtime cannot select another host');
  const host = hostName as InitCheckHost | undefined;
  if (opts['mcp-add']) {
    if (opts.json || opts.output || opts['mcp-status']) throw new Error('Do not combine --mcp-add with report options');
    const userValues: Record<string, string> = Object.create(null);
    for (const pair of (opts['mcp-key'] || '').split(',')) {
      const [key, ...value] = pair.split('=');
      if (key && value.length && !isDangerousKey(key.trim())) userValues[key.trim()] = value.join('=').trim();
    }
    const config = buildMcpConfig(opts['mcp-add'], userValues);
    if (!config) throw new Error(`Unknown MCP template: ${opts['mcp-add']}`);
    const result = writeMcpConfig(workspaceDir, opts['mcp-add'], config, host);
    const safeConfig = { ...config };
    if (typeof safeConfig.url === 'string') safeConfig.url = safeConfig.url.replace(/apikey=[^&]+/gi, 'apikey=***');
    console.error(result.warning);
    console.log(JSON.stringify({ ok: result.success, mcpId: opts['mcp-add'], message: result.message,
      configPath: result.configPath, warning: result.warning, gitignoreUpdated: result.gitignoreUpdated,
      fileMode: result.fileMode, config: safeConfig }));
    return;
  }
  if (opts['mcp-status']) {
    console.log(JSON.stringify(getMcpStatuses(workspaceDir, host)));
    return;
  }
  const report = opts.json ? runJsonCheck({ workspaceDir, host }) : runFullCheck({ workspaceDir, host });
  const text = opts.json ? JSON.stringify(report) : formatReport(report as ReturnType<typeof runFullCheck>);
  if (opts.output) {
    const output = resolve(workspaceDir, opts.output);
    ensureUnlinkedPath(workspaceDir, output);
    mkdirSync(dirname(output), { recursive: true });
    atomicWriteFileSync(output, text + '\n');
    if (!opts.json) {
      console.log(JSON.stringify({ ok: true, ready: report.ready, blockingCount: report.blockingCount,
        warningCount: report.warningCount, output: opts.output }));
      return;
    }
  }
  console.log(text);
}
