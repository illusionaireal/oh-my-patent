// Smoke: npm run verify:artifacts (after package:skill). Uses system tar for npm tgz.
import { readFileSync, readdirSync, mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const artifacts = resolve('release-artifacts');
const manifest = JSON.parse(readFileSync(join(artifacts,'release-manifest.json'),'utf8'));
const sha = data => createHash('sha256').update(data).digest('hex');
const walk = (dir, prefix = '') => readdirSync(dir, {withFileTypes:true}).flatMap(e => {
  if (e.isSymbolicLink()) throw new Error('Linked packaged resource');
  return e.isDirectory() ? walk(join(dir,e.name),prefix+e.name+'/') : [prefix+e.name];
}).sort();
function verifyFolder(folder) {
  const bytes = readFileSync(join(folder,'scripts/manifest.json'));
  if (sha(bytes) !== manifest.skill_manifest_digest) throw new Error('Skill manifest differs from release');
  const skill = JSON.parse(bytes), names = walk(folder);
  if (skill.package_version !== manifest.version || names.filter(n=>n.endsWith('SKILL.md')).length !== 1 || JSON.stringify(names) !== JSON.stringify([...Object.keys(skill.files),'scripts/manifest.json'].sort())) throw new Error('Invalid Skill inventory/version');
  for (const [name,hash] of Object.entries(skill.files)) if (sha(readFileSync(join(folder,name))) !== hash) throw new Error(`Invalid packaged resource: ${name}`);
  return names.length;
}
function crc32(data) {
  let crc=0xffffffff;
  for (const byte of data) { crc ^= byte; for (let bit=0;bit<8;bit++) crc=(crc>>>1) ^ (crc&1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
for (const [name, hash] of Object.entries(manifest.artifact_checksums)) if(createHash('sha256').update(readFileSync(join(artifacts,name))).digest('hex') !== hash) throw new Error(`Artifact changed: ${name}`);
const root = mkdtempSync(join(tmpdir(),'omp 产物 space-'));
try {
  const tarName = Object.keys(manifest.artifact_checksums).find(n=>n.endsWith('.tgz'));
  execFileSync('tar',['-xf',join(artifacts,tarName),'-C',root]);
  const tarCount=verifyFolder(join(root,'package/skills/oh-my-patent'));
  for (const name of ['package.json','plugin.jsonc']) if(JSON.parse(readFileSync(join(root,'package',name),'utf8')).version !== manifest.version) throw new Error(`Version mismatch: ${name}`);
  const script = join(root,'package/skills/oh-my-patent/scripts/runtime.mjs');
  const doctor = JSON.parse(execFileSync(process.execPath,[script,'--doctor'],{cwd:root,encoding:'utf8'}));
  if(!doctor.ok) throw new Error('Packed runtime doctor failed');
  const project = join(root,'project');
  const request={interface_version:1,operation:'project.create',project,operation_id:'packed-create',expected:{revision:null},params:{topic:'Synthetic packed fixture',topic_slug:'packed'}};
  const result=spawnSync(process.execPath,[script],{cwd:root,input:JSON.stringify(request),encoding:'utf8'});
  if(result.status !== 0 || !JSON.parse(result.stdout).ok) throw new Error(`Packed runtime failed: ${result.stdout} ${result.stderr}`);
  // Decode our stored ZIP independently of the package builder and compare every resource.
  const zipName=Object.keys(manifest.artifact_checksums).find(n=>n.endsWith('.zip'));
  const zip=readFileSync(join(artifacts,zipName)); let cursor=0, count=0;
  const entries=new Map();
  while(cursor+30<=zip.length && zip.readUInt32LE(cursor)===0x04034b50) {
    if(zip.readUInt16LE(cursor+8)!==0 || zip.readUInt16LE(cursor+6)!==0x800) throw new Error('Unexpected ZIP encoding');
    const size=zip.readUInt32LE(cursor+18), length=zip.readUInt16LE(cursor+26), extra=zip.readUInt16LE(cursor+28);
    const name=zip.subarray(cursor+30,cursor+30+length).toString('utf8');
    if(!/^oh-my-patent\/[a-zA-Z0-9_./-]+$/.test(name) || name.split('/').some(p=>!p||p==='.'||p==='..') || entries.has(name)) throw new Error('Unsafe/duplicate ZIP entry');
    const start=cursor+30+length+extra, data=zip.subarray(start,start+size);
    if(start+size>zip.length || zip.readUInt32LE(cursor+22)!==size || crc32(data)!==zip.readUInt32LE(cursor+14)) throw new Error('Truncated ZIP or CRC mismatch');
    entries.set(name,{offset:cursor,size,crc:zip.readUInt32LE(cursor+14)});
    const relative=name.slice('oh-my-patent/'.length);
    if(!data.equals(readFileSync(join(root,'package/skills/oh-my-patent',relative)))) throw new Error(`ZIP/tar mismatch: ${relative}`);
    const file=join(root,'zip',name); mkdirSync(resolve(file,'..'),{recursive:true}); writeFileSync(file,data);
    cursor=start+size; count++;
  }
  const centralStart=cursor, seen=new Set();
  while(cursor+46<=zip.length && zip.readUInt32LE(cursor)===0x02014b50) {
    const length=zip.readUInt16LE(cursor+28), extra=zip.readUInt16LE(cursor+30), comment=zip.readUInt16LE(cursor+32);
    const name=zip.subarray(cursor+46,cursor+46+length).toString('utf8'), entry=entries.get(name);
    if(!entry||seen.has(name)||zip.readUInt32LE(cursor+42)!==entry.offset||zip.readUInt32LE(cursor+20)!==entry.size||zip.readUInt32LE(cursor+24)!==entry.size||zip.readUInt32LE(cursor+16)!==entry.crc||zip.readUInt16LE(cursor+10)!==0) throw new Error('ZIP central directory mismatch');
    seen.add(name); cursor+=46+length+extra+comment;
  }
  if(cursor+22!==zip.length||zip.readUInt32LE(cursor)!==0x06054b50||zip.readUInt16LE(cursor+8)!==count||zip.readUInt16LE(cursor+10)!==count||seen.size!==count||zip.readUInt32LE(cursor+12)!==cursor-centralStart||zip.readUInt32LE(cursor+16)!==centralStart||zip.readUInt16LE(cursor+20)!==0) throw new Error('Invalid ZIP end record');
  if(verifyFolder(join(root,'zip/oh-my-patent'))!==tarCount||count!==tarCount) throw new Error('ZIP/tarball inventory mismatch');
  const zippedScript=join(root,'zip/oh-my-patent/scripts/runtime.mjs');
  if(!JSON.parse(execFileSync(process.execPath,[zippedScript,'--doctor'],{cwd:root,encoding:'utf8'})).ok) throw new Error('ZIP runtime failed');
  const zipCreate=spawnSync(process.execPath,[zippedScript],{cwd:root,input:JSON.stringify({...request,project:join(root,'zip-project')}),encoding:'utf8'});
  if(zipCreate.status!==0||!JSON.parse(zipCreate.stdout).ok) throw new Error('ZIP project creation failed');
  console.log(JSON.stringify({ok:true,version:manifest.version,zip_entries:count,tarball:tarName,zip:zipName,node:process.versions.node}));
} finally { rmSync(root,{recursive:true,force:true}); }
