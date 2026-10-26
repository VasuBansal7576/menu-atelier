import { prepareTypography as prepareFonts, getFont, missingCharacters } from './document-fonts.js';
import { freeze } from './print-kit.js';
import { compositions } from './print-compositions.js';
import { applyRecipe, validateRecipe } from './design-generator.js';
export { textWidth, wrapText } from './print-kit.js';
export const templates = compositions;
export const pageSizes = Object.freeze({ a4: [595.28, 841.89], letter: [612, 792] });
export async function prepareTypography() { await prepareFonts(); }
export function layoutMenu(menu, settings = {}) {
  const key = templates[settings.template] ? settings.template : 'trattoria';
  const design = templates[key];
  if (settings.recipe) {
    const recipe = validateRecipe(settings.recipe, {template:key});
    if (recipe.density !== (settings.density || 'balanced')) throw new Error('The design recipe and spacing setting must match.');
  }
  const allText = [menu.name, menu.subtitle, menu.footer, ...menu.sections.flatMap(section => [section.name, ...section.items.flatMap(item => [item.name, item.description, ...item.tags])])].join('\n');
  const missing = missingCharacters(allText);
  if (missing.length) throw new Error(`These characters need a font outside the current Latin collection: ${missing.slice(0, 8).join(' ')}. Your current draft is unchanged.`);
  return applyRecipe(freeze(design.layout(menu, settings, design.variant).map(page => ({
    ...page, template: key, compositionName: design.name,
    format: { name: `${settings.pageSize === 'letter' ? 'Letter' : 'A4'}${page.width > page.height ? ' landscape' : ''}`, family: settings.pageSize === 'letter' ? 'letter' : 'a4', width: page.width, height: page.height, unit: 'pt' },
    hits: page.hits.map(hit => {
      const top = Math.max(page.bodyTop, hit.y), bottom = Math.min(page.bodyBottom, hit.y + hit.height);
      return { ...hit, y: top, height: Math.max(0, bottom - top) };
    })
  }))), settings.recipe);
}
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
export function renderSVG(page, { interactive = false, selected = '' } = {}) {
  const content = page.elements.map(e => {
    if (e.type === 'rect') return `<rect x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" rx="${e.radius || 0}" fill="${e.fill || 'none'}" stroke="${e.stroke || 'none'}" stroke-width=".7"/>`;
    if (e.type === 'line') return `<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="${e.color}" stroke-width="${e.width}"/>`;
    if (e.type === 'ellipse') return `<ellipse cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}" fill="${e.fill || 'none'}" stroke="${e.stroke || 'none'}" stroke-width=".6"/>`;
    const face = getFont(e.font);
    return `<text x="${e.x}" y="${e.y}" font-size="${e.size}" font-family="${escape(face.family)}" font-weight="${face.weight}" font-style="${face.style}" text-anchor="${e.align === 'center' ? 'middle' : e.align === 'right' ? 'end' : 'start'}" fill="${e.color}" textLength="${e.advance}" lengthAdjust="spacingAndGlyphs" style="font-kerning:none;font-variant-ligatures:none;font-feature-settings:'kern' 0,'liga' 0,'clig' 0,'calt' 0">${escape(e.value)}</text>`;
  }).join('');
  const hits = interactive ? page.hits.map(hit => `<g class="preview-hit ${selected === hit.id ? 'is-selected' : ''}" data-item="${escape(hit.id)}" data-section="${escape(hit.sectionId)}" tabindex="0" role="button" aria-label="Edit ${escape(hit.label)}"><rect x="${hit.x}" y="${hit.y}" width="${hit.width}" height="${hit.height}" rx="3"/><title>Edit ${escape(hit.label)}</title></g>`).join('') : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${page.width} ${page.height}" role="${interactive ? 'group' : 'img'}" aria-label="Designed menu page">${content}${hits}</svg>`;
}
