import { getFont, missingCharacters, fontFeatures } from './document-fonts.js';
let pdfLibrary;
async function loadPDFLibrary() {
  if (!pdfLibrary) pdfLibrary = (async () => {
    if (typeof process !== 'undefined' && process.versions?.node) return { library: await import('pdf-lib'), fontkit: (await import('@pdf-lib/fontkit')).default };
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('./vendor/pdf-lib.min.js', import.meta.url).href;
      script.onload = resolve;
      script.onerror = () => reject(new Error('The PDF library could not load. Please try again.'));
      document.head.append(script);
    });
    return { library: globalThis.PDFLib, fontkit: globalThis.fontkit };
  })().catch(error => { pdfLibrary = null; throw error; });
  return pdfLibrary;
}
export function unsupportedCharacters(menu) {
  return missingCharacters([menu.name, menu.subtitle, menu.footer, ...menu.sections.flatMap(section => [section.name, ...section.items.flatMap(item => [item.name, item.description, ...item.tags])])].join('\n'));
}
export async function pdfBytes(pages, title = 'Menu') {
  if (!pages?.length) throw new Error('There is no menu page to export.');
  const { library: { PDFDocument, rgb }, fontkit } = await loadPDFLibrary();
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  document.setTitle(title);
  document.setSubject('Editable menu designed with Menu Atelier');
  document.setCreator('Menu Atelier');
  const fonts = new Map();
  for (const id of new Set(pages.flatMap(page => page.elements.filter(e => e.type === 'text').map(e => e.font)))) {
    fonts.set(id, await document.embedFont(getFont(id).bytes, { subset: false, features: fontFeatures }));
  }
  const color = hex => {
    const value = hex.replace('#', '');
    return rgb(parseInt(value.slice(0, 2), 16) / 255, parseInt(value.slice(2, 4), 16) / 255, parseInt(value.slice(4, 6), 16) / 255);
  };
  for (const scene of pages) {
    const page = document.addPage([scene.width, scene.height]);
    for (const e of scene.elements) {
      if (e.type === 'text') {
        const x = e.x - (e.align === 'right' ? e.advance : e.align === 'center' ? e.advance / 2 : 0);
        page.drawText(e.value, { x, y: scene.height - e.y, size: e.size, font: fonts.get(e.font), color: color(e.color) });
      } else if (e.type === 'line') page.drawLine({ start: { x: e.x1, y: scene.height - e.y1 }, end: { x: e.x2, y: scene.height - e.y2 }, thickness: e.width, color: color(e.color) });
      else if (e.type === 'rect') page.drawRectangle({ x: e.x, y: scene.height - e.y - e.height, width: e.width, height: e.height, color: e.fill ? color(e.fill) : undefined, borderColor: e.stroke ? color(e.stroke) : undefined, borderWidth: e.stroke ? .7 : 0 });
      else if (e.type === 'ellipse') page.drawEllipse({ x: e.cx, y: scene.height - e.cy, xScale: e.rx, yScale: e.ry, color: e.fill ? color(e.fill) : undefined, borderColor: e.stroke ? color(e.stroke) : undefined, borderWidth: e.stroke ? .6 : 0 });
    }
  }
  return document.save();
}
export async function createPDF(pages, title = 'Menu') {
  const bytes = await pdfBytes(pages, title);
  return {
    output(type = 'arraybuffer') {
      if (type === 'arraybuffer') return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      if (type === 'blob') return new Blob([bytes], { type: 'application/pdf' });
      throw new Error('Choose arraybuffer or blob PDF output.');
    },
    save(filename) { downloadBlob(new Blob([bytes], { type: 'application/pdf' }), filename); }
  };
}
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
