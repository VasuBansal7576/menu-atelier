import { compositions } from './print-compositions.js';
import { validateMenu } from './model.js';
import { freeze } from './print-kit.js';

const ARCHITECTURES = Object.freeze({
  trattoria: { orientation: 'portrait', type: 'editorial', motif: 'produce', title: 'Market Letter', description: 'A generous illustrated masthead and independent category lanes.' },
  atelier: { orientation: 'portrait', type: 'condensed', motif: 'none', title: 'Editorial Journal', description: 'A typographic masthead with aligned names, descriptions and prices.' },
  botanical: { orientation: 'landscape', type: 'editorial', motif: 'sun', title: 'Daylight Poster', description: 'An identity island beside two flowing menu columns.' },
  midnight: { orientation: 'landscape', type: 'modern', motif: 'moon', title: 'Supper Broadsheet', description: 'An indexed category rail and adaptive dish grid.' }
});
const KEYS = ['version', 'id', 'name', 'brief', 'seed', 'template', 'palette', 'motif', 'type', 'density', 'rationale'];
const PALETTE_KEYS = ['paper', 'ink', 'accent', 'muted', 'tint', 'header', 'headingInk'];
const COLORS = {
  green: ['#224B36', '#D9E8C8', '#B9DF93'], blue: ['#183F78', '#D9E7F4', '#ADCFFF'],
  red: ['#9C2B2B', '#F4DAD3', '#FFB6A5'], pink: ['#8C315F', '#F7DFEA', '#FFB9DB'],
  orange: ['#9A3D19', '#F6E1C5', '#FFBE80'], black: ['#232323', '#E8E5DF', '#F2EEE4'],
  white: ['#292722', '#EBE9E2', '#FFFFFF'], cream: ['#68472E', '#EDE2C4', '#FFE0A3'],
  burgundy: ['#702438', '#EED9DE', '#F5B4C3'], lime: ['#3C5918', '#E2EDC9', '#D8F348'],
  navy: ['#173455', '#DBE4EE', '#ADC8F0'], terracotta: ['#9B432E', '#F0DFD2', '#FFB194'],
  saffron: ['#80500D', '#F3E8C3', '#F8CD59'], olive: ['#45512B', '#E4E7CC', '#D3DE97']
};
const ORIGINALS = {
  trattoria: { '#FFF0BD': 'paper', '#143F2E': 'ink', '#E73825': 'accent', '#506348': 'muted', '#F8DA90': 'tint', '#F95332': 'accent', '#F8BD57': 'tint' },
  atelier: { '#F2EEDC': 'paper', '#25463C': 'ink', '#AA442C': 'accent', '#CFD0BC': 'tint', '#839788': 'muted' },
  botanical: { '#FFF7E5': 'paper', '#382B20': 'ink', '#ED522A': 'accent', '#F8CB46': 'tint', '#D9CBB0': 'muted' },
  midnight: { '#102B65': 'paper', '#F0F1E7': 'ink', '#D8F348': 'tint', '#B8C7DF': 'muted', '#1845D5': 'header', '#111711': 'headingInk' }
};
const ALIASES = { 'market-bloom': 'trattoria', folio: 'atelier', sunroom: 'botanical', 'night-press': 'midnight' };
const control = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
function object(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error(`${field} must be a plain object.`);
}
function exactKeys(value, keys, field) {
  object(value, field);
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !keys.includes(key))) throw new Error(`${field} has missing or unknown fields.`);
}
function string(value, field, max, required = true) {
  if (typeof value !== 'string' || value.length > max || control.test(value) || (required && !value.trim())) throw new Error(`${field} must be ${required ? 'nonempty ' : ''}text of at most ${max} characters.`);
  return value;
}
function luminance(color) {
  const rgb = color.slice(1).match(/../g).map(part => parseInt(part, 16) / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
export function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
export function validateRecipe(input, expected = {}) {
  exactKeys(input, KEYS, 'Design recipe');
  if (input.version !== 1) throw new Error('This design recipe needs version 1.');
  if (!Object.hasOwn(ARCHITECTURES, input.template)) throw new Error('The design recipe names an unknown composition.');
  const template = typeof expected === 'string' ? expected : expected.template;
  if (template && input.template !== template) throw new Error('The design recipe does not match the selected composition.');
  string(input.id, 'Recipe id', 100); if (!/^[a-zA-Z0-9_-]+$/.test(input.id)) throw new Error('Recipe id contains unsupported characters.');
  string(input.name, 'Direction name', 100); string(input.brief, 'Design brief', 4000, false);
  if (!Number.isSafeInteger(input.seed) || input.seed < 0 || input.seed > 4294967295) throw new Error('Recipe seed must be an unsigned 32-bit integer.');
  exactKeys(input.palette, PALETTE_KEYS, 'Recipe palette');
  for (const key of PALETTE_KEYS) if (typeof input.palette[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(input.palette[key])) throw new Error(`Palette ${key} needs a six-digit hex color.`);
  for (const [a, b] of [['ink', 'paper'], ['accent', 'paper'], ['muted', 'paper'], ['headingInk', 'tint']]) if (contrast(input.palette[a], input.palette[b]) < 4.5) throw new Error(`Palette ${a} has insufficient contrast against ${b}.`);
  if (Math.max(...['ink', 'headingInk', 'paper'].map(key => contrast(input.palette[key], input.palette.header))) < 4.5) throw new Error('Header needs a readable ink color.');
  if (!['produce', 'sun', 'moon', 'none'].includes(input.motif) || !['editorial', 'modern', 'condensed'].includes(input.type) || !['compact', 'balanced', 'spacious'].includes(input.density)) throw new Error('The recipe contains an unsupported motif, type or density.');
  if (!Array.isArray(input.rationale) || !input.rationale.length || input.rationale.length > 10) throw new Error('A recipe needs between one and ten rationale notes.');
  input.rationale.forEach(note => string(note, 'Rationale', 700));
  return freeze({ ...input, palette: { ...input.palette }, rationale: [...input.rationale] });
}
function hash(value) { let n = 2166136261; for (const character of value) n = Math.imul(n ^ character.charCodeAt(0), 16777619); return n >>> 0; }
function constraints(brief) {
  const value = brief.toLowerCase(), colorMatches = [...value.matchAll(/\b(green|blue|red|pink|orange|black|white|cream|burgundy|wine|lime|navy|terracotta|saffron|olive)\b/g)].filter(match => !/\b(?:no|without|avoid)\s+$/.test(value.slice(Math.max(0, match.index - 14), match.index)) && (match[1] !== 'wine' || !/^\s+bar\b/.test(value.slice(match.index + 4))));
  const monochrome = /\b(?:black\s*(?:and|&|\/)\s*white|monochrome|gr[ae]yscale)\b/.test(value);
  return {
    color: monochrome ? 'black' : colorMatches.filter(match => !['cream', 'white'].includes(match[1])).at(-1)?.[1] || colorMatches.at(-1)?.[1], monochrome,
    dark: /\b(?:dark|night|midnight|black background)\b/.test(value) && !/\b(?:light|bright|white background)\b/.test(value),
    cream: /\b(?:cream|ivory|warm paper)\b/.test(value),
    white: /\bwhite\b/.test(value),
    ink: /\b(?:green|blue|red|pink|orange|black|burgundy|wine|lime|navy|terracotta|saffron|olive)\s+ink\b/.test(value),
    quiet: /\b(?:no illustrations?|without illustrations?|no graphics?|no motifs?|typographic|quiet|minimal|restrained)\b/.test(value),
    orientation: /\bportrait\b/.test(value) ? 'portrait' : /\blandscape\b/.test(value) ? 'landscape' : null,
    density: [...value.matchAll(/\b(compact|dense|tight|airy|spacious|breathing room|generous space|balanced)\b/g)].reduce((_, match) => /compact|dense|tight/.test(match[1]) ? 'compact' : match[1] === 'balanced' ? 'balanced' : 'spacious', 'balanced'),
    preferred: /\b(?:journal|editorial|wine bar|fine dining)\b/.test(value) ? 'atelier' : /\b(?:coastal|cafe|café|sunny|sunshine)\b/.test(value) ? 'botanical' : /\b(?:modern|bold|broadsheet|tasting room)\b/.test(value) ? 'midnight' : /\b(?:pizzeria|pizza|market|produce|tomato)\b/.test(value) ? 'trattoria' : null,
    motif: /\b(?:moon|lunar)\b/.test(value) ? 'moon' : /\b(?:sun|sunny|sunshine)\b/.test(value) ? 'sun' : /\b(?:produce|tomato|vegetables?|fruit|botanical)\b/.test(value) ? 'produce' : null
  };
}
function colorFor(c, index, seed) {
  const names = ['green', 'blue', 'red', 'orange', 'pink'];
  const color = c.color || names[(seed + index * 2) % names.length];
  return color === 'wine' ? 'burgundy' : color;
}
function paletteFor(c, index, seed) {
  const color = colorFor(c, index, seed), [accent, tint, bright] = COLORS[color];
  const dark = c.dark;
  if (dark) return { paper: '#161C22', ink: '#F8F4E8', accent: bright, muted: '#C3CBD0', tint: bright, header: '#242E38', headingInk: '#161C22' };
  const paper = c.monochrome || c.white || color === 'white' ? '#FFFFFF' : c.cream || index === 0 ? '#FFF8E8' : index === 1 ? '#F7F5EF' : '#FFFFFF';
  return { paper, ink: c.monochrome ? '#202020' : c.ink ? accent : '#222D29', accent, muted: '#565A55', tint, header: index === 1 ? accent : tint, headingInk: '#20251F' };
}
function assertPrintable(pages, menu) {
  if (!pages.length || pages.length > 300) throw new Error('The composition did not produce a bounded printable menu.');
  const ids = new Set(pages.flatMap(page => page.hits.map(hit => hit.id)));
  for (const section of menu.sections) for (const item of section.items) if (!ids.has(item.id)) throw new Error('The composition omitted a dish.');
  for (const page of pages) for (const element of page.elements.filter(element => element.type === 'text')) {
    const b = element.inkBounds;
    if (!b || !Object.values(b).every(Number.isFinite) || b.left < 12 || b.right > page.width - 12 || b.top < 12 || b.bottom > page.height - 10) throw new Error('The composition places text beyond the printable page.');
  }
}
export function generateDirections(input, brief, { seed = 0, pageSize = 'a4' } = {}) {
  const menu = validateMenu(input); string(brief, 'Design brief', 4000, false);
  if (!['a4','letter'].includes(pageSize)) throw new Error('Choose A4 or Letter paper before generating directions.');
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 4294967295) throw new Error('Generation seed must be an unsigned 32-bit integer.');
  const c = constraints(brief), entropy = hash(`${seed}|${brief}|${menu.name}`), count = menu.sections.reduce((n, section) => n + section.items.length, 0);
  const rank = ([key, design]) => (c.orientation && design.orientation === c.orientation ? 20 : 0) + (c.preferred === key ? 9 : 0) + (c.quiet && key === 'atelier' ? 8 : 0) + (c.dark && key === 'midnight' ? 7 : 0) + ((hash(`${entropy}|${key}`) % 1000) / 1000);
  const ranked = Object.entries(ARCHITECTURES).filter(([, design]) => !c.orientation || design.orientation === c.orientation).sort((a, b) => rank(b) - rank(a)), results = [], failures = [];
  for (const [template, architecture] of ranked) {
    if (results.length === 3) break;
    const density = c.density, directionSeed = (entropy + results.length) >>> 0;
    try {
      const design = compositions[template], pages = design.layout(menu, { density, pageSize }, design.variant);
      assertPrintable(pages, menu);
      const color = colorFor(c, results.length, entropy), colorName = color[0].toUpperCase() + color.slice(1);
      const treatment = `${c.dark ? 'Dark' : c.cream ? 'Cream' : 'Light'} paper, ${color} accents and ${density === 'spacious' ? 'airy' : density} spacing.`;
      const motif = c.quiet || template === 'atelier' ? 'none' : c.motif || architecture.motif;
      const rationale = [motif === 'none' && template === 'trattoria' ? 'A generous typographic masthead and independent category lanes.' : architecture.description, `${count} dishes fit across ${pages.length} ${pageSize === 'letter' ? 'Letter' : 'A4'} ${architecture.orientation} page${pages.length === 1 ? '' : 's'}.`, `${treatment}${c.quiet ? ' No illustration.' : motif === 'none' ? ' A purely typographic treatment.' : ''}`];
      const recipe = validateRecipe({ version: 1, id: `direction-${template}-${directionSeed.toString(36)}`, name: `${colorName} ${architecture.title}`, brief, seed: directionSeed, template, palette: paletteFor(c, results.length, entropy), motif, type: architecture.type, density, rationale });
      applyRecipe(pages, recipe);
      results.push(recipe);
    } catch (error) {
      if (/typography is still loading/.test(error.message)) throw new Error('Prepare the bundled typography before generating design directions.');
      failures.push(`${architecture.title}: ${error.message}`);
    }
  }
  if (!results.length) throw new Error(`No printable direction could be generated. Your draft is unchanged. ${failures.join(' ')}`);
  return freeze(results);
}
function bounds(e) {
  if (e.type === 'ellipse') return { left: e.cx - e.rx, right: e.cx + e.rx, top: e.cy - e.ry, bottom: e.cy + e.ry };
  if (e.type === 'line') return { left: Math.min(e.x1, e.x2), right: Math.max(e.x1, e.x2), top: Math.min(e.y1, e.y2), bottom: Math.max(e.y1, e.y2) };
  return e.inkBounds;
}
function originalMotif(e, page, key) {
  if (e.type === 'text' || e.type === 'rect') return false;
  const b = bounds(e);
  if (key === 'trattoria') return e.type === 'ellipse' && e.cy < page.bodyTop - 25 || e.type === 'line' && b.left > page.width - 220 && b.bottom < page.bodyTop - 25;
  if (key === 'botanical') return e.type === 'ellipse' || e.type === 'line' && b.left < 245 && b.right < 245 && b.top > 50;
  if (key === 'midnight') return e.type === 'ellipse' || e.type === 'line' && b.left > page.width - 125 && b.bottom < page.bodyTop - 12;
  return false;
}
function motifZone(page, key) {
  if (key === 'botanical') {
    const identity = page.elements.filter(e => e.type === 'text' && ['masthead', 'subtitle'].includes(e.role));
    const top = Math.max(65, ...identity.map(e => e.inkBounds.bottom)) + 16;
    return { left: 38, right: 207, top, bottom: page.height - 65 };
  }
  if (key === 'trattoria') return { left: page.width - 205, right: page.width - 24, top: 24, bottom: Math.min(215, page.bodyTop - 35) };
  if (key === 'midnight') return { left: page.width - 120, right: page.width - 28, top: 17, bottom: Math.min(107, page.bodyTop - 20) };
  return null;
}
function overlaps(a, b, gap = 5) { return a.left < b.right + gap && a.right > b.left - gap && a.top < b.bottom + gap && a.bottom > b.top - gap; }
function motifElements(page, recipe) {
  const zone = motifZone(page, recipe.template);
  if (!zone || recipe.motif === 'none' || zone.bottom - zone.top < 30) return [];
  if (page.elements.some(e => e.type === 'text' && overlaps(zone, e.inkBounds))) return [];
  const cx = (zone.left + zone.right) / 2, cy = (zone.top + zone.bottom) / 2, radius = Math.min(zone.right - zone.left, zone.bottom - zone.top) * .34;
  const c = recipe.palette, elements = [];
  const ellipse = (x, y, rx, ry, fill) => elements.push({ type: 'ellipse', cx: x, cy: y, rx, ry, fill, recipeDecoration: true });
  const line = (x1, y1, x2, y2, width, color = c.accent) => elements.push({ type: 'line', x1, y1, x2, y2, width, color, recipeDecoration: true });
  if (recipe.motif === 'sun') {
    ellipse(cx, cy, radius * .72, radius * .72, c.accent);
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; line(cx + Math.cos(a) * radius * .9, cy + Math.sin(a) * radius * .9, cx + Math.cos(a) * radius * 1.2, cy + Math.sin(a) * radius * 1.2, 2); }
  } else if (recipe.motif === 'moon') {
    ellipse(cx, cy, radius, radius, c.accent);
    const background = recipe.template === 'botanical' ? c.tint : recipe.template === 'midnight' ? c.header : c.paper;
    ellipse(cx + radius * .45, cy - radius * .2, radius * .85, radius * .85, background);
  } else {
    ellipse(cx - radius * .22, cy + radius * .12, radius * .76, radius * .8, c.accent);
    ellipse(cx + radius * .3, cy + radius * .12, radius * .7, radius * .79, c.accent);
    for (const [dx, dy] of [[-.65, -.5], [-.25, -.95], [.2, -.9], [.65, -.45]]) line(cx, cy - radius * .3, cx + radius * dx, cy + radius * dy, Math.max(2, radius * .12), c.ink);
  }
  return elements.filter(e => { const b = bounds(e); return b.left >= zone.left && b.right <= zone.right && b.top >= zone.top && b.bottom <= zone.bottom; });
}
export function applyRecipe(pages, input) {
  if (input == null) return pages;
  const recipe = validateRecipe(input), c = recipe.palette;
  if (!Array.isArray(pages) || !pages.length) throw new Error('A design recipe needs printable pages.');
  const transformed = pages.map(page => {
    const key = ALIASES[page.template] || page.template;
    if (key !== recipe.template) throw new Error('The design recipe does not match the page composition.');
    const mapping = ORIGINALS[key];
    const recolor = value => value && mapping[value.toUpperCase()] ? c[mapping[value.toUpperCase()]] : value;
    const retained = page.elements.filter(e => !e.recipeDecoration && !originalMotif(e, page, key));
    const elements = retained.map(e => {
      if (e.type === 'text') return { ...e };
      const result = { ...e };
      if (e.fill) result.fill = recolor(e.fill);
      if (e.stroke) result.stroke = recolor(e.stroke);
      if (e.color) result.color = recolor(e.color);
      if (e.type === 'rect' && key === 'atelier' && e.x === 0 && e.y === 0 && e.height < page.height) result.fill = c.header;
      return result;
    });
    for (let i = 0; i < elements.length; i++) {
      const e = elements[i]; if (e.type !== 'text') continue;
      const b = e.inkBounds, x = (b.left + b.right) / 2, y = (b.top + b.bottom) / 2;
      const background = elements.slice(0, i).filter(shape => shape.type === 'rect' && shape.fill && x >= shape.x && x <= shape.x + shape.width && y >= shape.y && y <= shape.y + shape.height).at(-1)?.fill || c.paper;
      let color = ['price', 'category', 'counter', 'currency'].includes(e.role) ? c.accent : ['description', 'tags', 'footer', 'continuation'].includes(e.role) ? c.muted : c.ink;
      if (contrast(color, background) < 4.5) color = [c.ink, c.headingInk, '#FFFFFF', '#111111'].sort((a, b) => contrast(b, background) - contrast(a, background))[0];
      elements[i] = { ...e, color };
    }
    elements.push(...motifElements(page, recipe));
    return { ...page, elements, recipeId: recipe.id, compositionName: recipe.name };
  });
  return freeze(transformed);
}
