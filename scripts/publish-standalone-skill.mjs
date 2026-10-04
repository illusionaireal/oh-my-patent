// Publish exactly the previously verified standalone tarball, without rebuilding.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { standalonePublishPlan } from './standalone-skill-package.mjs';

const options = process.argv.slice(2);
if (options.some(option => option !== '--dry-run')) throw new Error('Only --dry-run is supported');
if (!process.env.npm_execpath) throw new Error('Run through npm run publish:skill');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const plan = standalonePublishPlan(root, resolve(root, 'release-artifacts'), process.env.GITHUB_SHA);
const dryRun = options.includes('--dry-run');
console.log(JSON.stringify({ name: plan.name, version: plan.version, tag: plan.tag, dry_run: dryRun }));
execFileSync(process.execPath, [process.env.npm_execpath, ...plan.args, ...(dryRun ? ['--dry-run'] : [])], { cwd: root, stdio: 'inherit' });
