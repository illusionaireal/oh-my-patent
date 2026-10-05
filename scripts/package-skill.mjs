// Smoke: npm run package:skill. No third-party archive executable is required.
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { packStandaloneSkill } from './standalone-skill-package.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'release-artifacts'); mkdirSync(out, { recursive: true });
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const skill = join(root, 'skills/oh-my-patent');
const manifest = JSON.parse(readFileSync(join(skill, 'scripts/manifest.json'), 'utf8'));
const sha = data => createHash('sha256').update(data).digest('hex');
const walk = (dir, prefix = '') => readdirSync(dir, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name, 'en')).flatMap(e => {
  if (e.isSymbolicLink()) throw new Error(`Linked package resource: ${prefix}${e.name}`);
  return e.isDirectory() ? walk(join(dir,e.name), prefix + e.name + '/') : [prefix + e.name];
});
const names = walk(skill);
if (manifest.package_version !== pkg.version || names.filter(n => n.endsWith('SKILL.md')).length !== 1) throw new Error('Invalid package version/entry count');
if (JSON.stringify([...Object.keys(manifest.files), 'scripts/manifest.json'].sort()) !== JSON.stringify([...names].sort())) throw new Error('Unmanifested or missing package resource');
for (const [name, hash] of Object.entries(manifest.files)) if (sha(readFileSync(join(skill,name))) !== hash) throw new Error(`Checksum mismatch: ${name}`);
const table = Array.from({length:256}, (_,n) => { for(let k=0;k<8;k++) n = (n & 1) ? (0xedb88320 ^ (n >>> 1)) : n >>> 1; return n >>> 0; });
function crc32(data) { let c = 0xffffffff; for (const byte of data) c = table[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
// ZIP stored entries with fixed DOS date 1980-01-01, UTF-8 filenames and CRC32.
const local = [], central = []; let offset = 0;
for (const name of names) {
  const data = readFileSync(join(skill,name)), filename = Buffer.from(`oh-my-patent/${name}`), crc = crc32(data);
  const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50); h.writeUInt16LE(20,4); h.writeUInt16LE(0x800,6); h.writeUInt16LE(33,12); h.writeUInt32LE(crc,14); h.writeUInt32LE(data.length,18); h.writeUInt32LE(data.length,22); h.writeUInt16LE(filename.length,26);
  local.push(h,filename,data);
  const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50); c.writeUInt16LE(20,4); c.writeUInt16LE(20,6); c.writeUInt16LE(0x800,8); c.writeUInt16LE(33,14); c.writeUInt32LE(crc,16); c.writeUInt32LE(data.length,20); c.writeUInt32LE(data.length,24); c.writeUInt16LE(filename.length,28); c.writeUInt32LE(offset,42);
  central.push(c,filename); offset += h.length + filename.length + data.length;
}
const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(names.length,8); end.writeUInt16LE(names.length,10); end.writeUInt32LE(directory.length,12); end.writeUInt32LE(offset,16);
const zip = Buffer.concat([...local,directory,end]);
if(zip.length > 8 * 1024 * 1024) throw new Error('Skill ZIP exceeds 8 MiB');
const zipName = `oh-my-patent-skill-${pkg.version}.zip`; writeFileSync(join(out,zipName),zip);
if (!process.env.npm_execpath) throw new Error('Run through npm run package:skill');
const packed = JSON.parse(execFileSync(process.execPath,[process.env.npm_execpath,'pack','--ignore-scripts','--json','--pack-destination',out],{cwd:root,encoding:'utf8'}));
const tarName = packed[0].filename;
const standalone = packStandaloneSkill(root, skill, out, names);
const release = { version:pkg.version, source_commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(), source_dirty: Boolean(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim()), source_tag: process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : null, skill_manifest_digest: sha(readFileSync(join(skill,'scripts/manifest.json'))), npm_packages: { plugin: { name: pkg.name, version: pkg.version, tarball: tarName }, skill: standalone }, artifact_checksums:{[zipName]:sha(zip),[tarName]:sha(readFileSync(join(out,tarName))),[standalone.tarball]:sha(readFileSync(join(out,standalone.tarball)))}, host_verification:'pending', catalog_status:'not_submitted' };
writeFileSync(join(out,'release-manifest.json'),JSON.stringify(release,null,2)+'\n');
writeFileSync(join(out,'SHA256SUMS'),Object.entries(release.artifact_checksums).map(([n,h])=>`${h}  ${n}`).join('\n')+'\n');
console.log(JSON.stringify({ ...release, zip_bytes:zip.length }));
