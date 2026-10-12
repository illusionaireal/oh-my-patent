/** stdin / --input JSON file protocol. Smoke: node scripts/runtime.mjs --version */
import { runRuntime } from './entry.js';
await runRuntime(process.argv.slice(2));
