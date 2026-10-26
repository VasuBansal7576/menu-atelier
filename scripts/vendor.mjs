import { mkdir, copyFile, readdir } from 'node:fs/promises';
import path from 'node:path';

await mkdir('dist/vendor', { recursive: true });
const files = [
  ['pdf-lib/dist/pdf-lib.min.js', 'pdf-lib.min.js'],
  ['pdf-lib/LICENSE.md', 'pdf-lib.LICENSE.md'],
  ['@pdf-lib/fontkit/dist/fontkit.umd.min.js', 'fontkit.umd.min.js'],
  ['@pdf-lib/fontkit/README.md', 'fontkit.README.md'],
  ['pdfjs-dist/build/pdf.mjs', 'pdf.mjs'],
  ['pdfjs-dist/build/pdf.worker.mjs', 'pdf.worker.mjs'],
  ['pdfjs-dist/LICENSE', 'pdfjs.LICENSE'],
  ['tesseract.js/dist/tesseract.min.js', 'tesseract.min.js'],
  ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['tesseract.js/LICENSE.md', 'tesseract.LICENSE.md'],
  ['tesseract.js-core/LICENSE', 'tesseract-core.LICENSE']
];
for (const [source, destination] of files) await copyFile(path.join('node_modules', source), path.join('dist/vendor', destination));
await mkdir('dist/vendor/tesseract-core', { recursive: true });
for (const file of await readdir('node_modules/tesseract.js-core')) {
  if (/\.wasm(?:\.js)?$/.test(file)) await copyFile(path.join('node_modules/tesseract.js-core', file), path.join('dist/vendor/tesseract-core', file));
}
await mkdir('dist/vendor/tessdata', { recursive: true });
const model = 'dist/vendor/tessdata/eng.traineddata.gz';
const { access, writeFile } = await import('node:fs/promises');
try { await access(model); } catch {
  const response = await fetch('https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int/eng.traineddata.gz');
  if (!response.ok) throw new Error('The English OCR model could not be downloaded.');
  await writeFile(model, new Uint8Array(await response.arrayBuffer()));
}
console.log('Browser dependencies copied into dist/vendor.');
