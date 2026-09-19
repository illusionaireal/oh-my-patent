// Optional design utility; Sharp is not a runtime dependency of oh-my-patent.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

async function render() {
  const source = path.join(__dirname, 'github-social-preview.svg');
  const mark = path.join(__dirname, '../png/mark-primary-512.png');
  const output = path.join(__dirname, '../social/github-social-preview.png');
  const [svg, image] = await Promise.all([fs.readFile(source, 'utf8'), fs.readFile(mark)]);
  const reference = '../png/mark-primary-512.png';
  if (svg.split(reference).length !== 2) throw new Error('Expected one source mark reference');
  // Embed the existing PNG only in memory. Preserve the original artwork bytes.
  const resolved = svg.replace(reference, 'data:image/png;base64,' + image.toString('base64'));
  const png = await sharp(Buffer.from(resolved), {density: 72}).png().toBuffer();
  const info = await sharp(png).metadata();
  if (info.width !== 1280 || info.height !== 640 || png.length >= 1000000) {
    throw new Error('Social preview must be 1280x640 and under 1 MB');
  }
  await fs.mkdir(path.dirname(output), {recursive: true});
  await fs.writeFile(output, png);
  console.log(JSON.stringify({output, width: info.width, height: info.height,
    bytes: png.length, sha256: crypto.createHash('sha256').update(png).digest('hex')}));
}

render().catch(error => { console.error(error); process.exitCode = 1; });
