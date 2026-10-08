// Smoke: npm run publish:skill -- --dry-run (after package:skill).
// Publish exactly the previously verified standalone tarball, without rebuilding.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { npmRunner, publicationContext, publishVerifiedPackage, releasePublishPlan } from './release-publication.mjs';

const options = process.argv.slice(2);
if (options.some(option => option !== '--dry-run')) throw new Error('Only --dry-run is supported');
if (!process.env.npm_execpath) throw new Error('Run through npm run publish:skill');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = options.includes('--dry-run');
const plan = releasePublishPlan(root, resolve(root, 'release-artifacts'), 'skill', publicationContext(root, dryRun));
const status = publishVerifiedPackage(plan, { dryRun, npm: npmRunner(root) });
console.log(JSON.stringify({ name: plan.name, version: plan.version, tag: plan.tag, dry_run: dryRun, status }));
