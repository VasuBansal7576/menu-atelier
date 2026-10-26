const files = {
  'cormorant-semibold': ['MenuAtelier-CormorantGaramond-SemiBold.ttf', 'MenuAtelier Cormorant Garamond', 600, 'normal'],
  'cormorant-medium-italic': ['MenuAtelier-CormorantGaramond-MediumItalic.ttf', 'MenuAtelier Cormorant Garamond', 500, 'italic'],
  'source-sans-regular': ['MenuAtelier-SourceSans3-Regular.ttf', 'MenuAtelier Source Sans 3', 400, 'normal'],
  'source-sans-semibold': ['MenuAtelier-SourceSans3-SemiBold.ttf', 'MenuAtelier Source Sans 3', 600, 'normal'],
  'archivo-black': ['MenuAtelier-ArchivoBlack-Regular.ttf', 'MenuAtelier Archivo Black', 400, 'normal'],
  'bebas-neue': ['MenuAtelier-BebasNeue-Regular.ttf', 'MenuAtelier Bebas Neue', 400, 'normal'],
  'fraunces-display': ['MenuAtelier-Fraunces-SemiBold.ttf', 'MenuAtelier Fraunces', 650, 'normal']
};
export const fontFeatures = { kern: false, liga: false, clig: false, calt: false };
const faces = new Map();
const advances = new Map();
let preparation;
const isNode = typeof process !== 'undefined' && !!process.versions?.node;
export async function prepareTypography() {
  if (!preparation) preparation = (async () => {
    let fontkit;
    if (isNode) fontkit = (await import('@pdf-lib/fontkit')).default;
    else {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = new URL('./vendor/fontkit.umd.min.js', import.meta.url).href;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Menu typography could not load. Reload to try again.'));
        document.head.append(script);
      });
      fontkit = globalThis.fontkit;
    }
    await Promise.all(Object.entries(files).map(async ([id, [file, family, weight, style]]) => {
      const url = new URL(`./fonts/${file}`, import.meta.url);
      let bytes;
      if (isNode) bytes = new Uint8Array(await (await import('node:fs/promises')).readFile(url));
      else {
        const response = await fetch(url);
        if (!response.ok) throw new Error('A menu font could not load. Reload to try again.');
        bytes = new Uint8Array(await response.arrayBuffer());
      }
      const font = fontkit.create(bytes);
      if (typeof FontFace === 'function' && document.fonts) {
        const browserFace = new FontFace(family, bytes, { weight: String(weight), style });
        await browserFace.load();
        document.fonts.add(browserFace);
      }
      faces.set(id, { id, bytes, font, family, weight, style });
    }));
  })().catch(error => { preparation = null; throw error; });
  return preparation;
}
export function fontId(font = 'serif', style = 'normal') {
  if (files[font]) return font;
  if (font === 'sans') return style === 'bold' ? 'source-sans-semibold' : 'source-sans-regular';
  return style === 'italic' ? 'cormorant-medium-italic' : 'cormorant-semibold';
}
export function getFont(id = 'source-sans-regular') {
  const face = faces.get(id);
  if (!face) throw new Error('Menu typography is still loading.');
  return face;
}
export function missingCharacters(value, id = 'source-sans-regular') {
  const { font } = getFont(id);
  return [...new Set([...String(value)].filter(character => !/\s/.test(character) && !font.hasGlyphForCodePoint(character.codePointAt(0))))];
}
export function resolveFont(value, id) {
  if (!missingCharacters(value, id).length) return id;
  const fallback = 'source-sans-semibold';
  const missing = missingCharacters(value, fallback);
  if (missing.length) throw new Error(`These characters need a font outside the current Latin collection: ${missing.slice(0, 8).join(' ')}. Keep the original in your backup or use supported text.`);
  return fallback;
}
export function measure(value, size, id) {
  const key = `${id}|${size}|${value}`;
  if (advances.has(key)) return advances.get(key);
  const { font } = getFont(id);
  const run = font.layout(String(value), fontFeatures);
  const width = run.glyphs.reduce((total, glyph) => total + glyph.advanceWidth, 0) / font.unitsPerEm * size;
  if (advances.size > 4096) advances.clear();
  advances.set(key, width);
  return width;
}
