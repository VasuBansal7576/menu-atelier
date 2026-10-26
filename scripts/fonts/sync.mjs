import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
const root = new URL('./', import.meta.url);
const destination = new URL('../../dist/fonts/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
await mkdir(new URL('licenses/', destination), { recursive: true });
for (const face of manifest.faces) {
  for (const field of ['ttf_path', 'woff2_path']) {
    await copyFile(new URL(face[field], root), new URL(face[field].replace(/^fonts\//, ''), destination));
    face[field] = face[field].replace(/^fonts\//, '');
  }
  const name = face.license_path.split('/')[1];
  await copyFile(new URL(face.license_path, root), new URL(`licenses/${name}.OFL.txt`, destination));
  face.license_path = `licenses/${name}.OFL.txt`;
}
await writeFile(new URL('manifest.json', destination), JSON.stringify(manifest, null, 2) + '\n');
const css = await readFile(new URL('fonts.css', root), 'utf8');
await writeFile(new URL('fonts.css', destination), css.replaceAll('url("fonts/', 'url("'));
await copyFile(new URL('provenance.json', root), new URL('provenance.json', destination));
await copyFile(new URL('verification.json', root), new URL('verification.json', destination));
console.log('Verified font assets copied into dist/fonts.');
