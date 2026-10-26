import { formatPrice } from './model.js';
import { prepareTypography as prepareFonts, fontId, getFont, fontFeatures, missingCharacters, resolveFont, measure } from './document-fonts.js';
import { compositions, physicalFormat, drawOven } from './print-compositions.js';
import { getArt } from './print-art.js';
export const templates = compositions;
export const pageSizes = Object.freeze({ a4: [595.28, 841.89], letter: [612, 792] });
export async function prepareTypography() { await prepareFonts(); }
export function textWidth(value, size, font = 'serif', style = 'normal') { return measure(String(value), size, resolveFont(value, fontId(font, style))); }
export function wrapText(value, width, size, font = 'serif', style = 'normal') {
  if (!(width > 0)) throw new Error('The menu has no room for readable text.');
  const id = resolveFont(value, fontId(font, style)), result = [];
  for (const paragraph of String(value || '').split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (measure(word, size, id) > width) {
        if (line) { result.push(line); line = ''; }
        let part = '';
        for (const character of word) {
          if (part && measure(part + character, size, id) > width) { result.push(part); part = ''; }
          part += character;
        }
        line = part;
      } else if (line && measure(`${line} ${word}`, size, id) > width) { result.push(line); line = word; }
      else line += (line ? ' ' : '') + word;
    }
    if (line) result.push(line);
  }
  return result;
}
function inkBounds(value, size, id, x = 0, y = 0, align = 'left') {
  const { font } = getFont(id), run = font.layout(String(value), fontFeatures), scale = size / font.unitsPerEm;
  let pen = 0;
  const boxes = run.glyphs.map((glyph, index) => {
    const position = run.positions[index];
    const box = { left: (pen + glyph.bbox.minX + position.xOffset) * scale, right: (pen + glyph.bbox.maxX + position.xOffset) * scale, top: -(glyph.bbox.maxY + position.yOffset) * scale, bottom: -(glyph.bbox.minY + position.yOffset) * scale };
    pen += glyph.advanceWidth;
    return box;
  });
  const shift = align === 'right' ? measure(value, size, id) : align === 'center' ? measure(value, size, id) / 2 : 0;
  return { left: x - shift + Math.min(0, ...boxes.map(b => b.left)), right: x - shift + Math.max(0, ...boxes.map(b => b.right)), top: y + Math.min(0, ...boxes.map(b => b.top)), bottom: y + Math.max(0, ...boxes.map(b => b.bottom)) };
}
function text(p, value, x, y, size, font, color, extra = {}) {
  const selectedFont = resolveFont(value, font);
  const element = { type: 'text', value: String(value), x, y, size, font: selectedFont, style: 'normal', color, advance: measure(value, size, selectedFont), ...extra };
  element.inkBounds = inkBounds(value, size, selectedFont, x, y, element.align);
  p.elements.push(element);
  return element;
}
function line(p, x1, y1, x2, y2, color, width = .6) { p.elements.push({ type: 'line', x1, y1, x2, y2, color, width }); }
function rect(p, x, y, width, height, fill) { p.elements.push({ type: 'rect', x, y, width, height, fill }); }
function freeze(value) { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
const BODY = 'source-sans-regular', PRICE = 'source-sans-semibold';
function measuredLines(value, width, size, font, role) {
  return wrapText(value, width, size, font).map(value => ({ value, size, font: resolveFont(value, font), role }));
}
function stackLines(runs, gap = 0, start = 0) {
  let cursor = start;
  return runs.map(run => {
    const bounds = inkBounds(run.value, run.size, run.font);
    const y = cursor - bounds.top;
    cursor = Math.max(y + bounds.bottom + gap, cursor + run.size * 1.2);
    return { ...run, y };
  });
}
const runBottom = runs => Math.max(0, ...runs.map(run => inkBounds(run.value, run.size, run.font, 0, run.y).bottom));
function dishBlock(item, width, nameSize, descSize, t) {
  const price = formatPrice(item.price, item.currency), priceSize = 11.8;
  const priceFont = resolveFont(price, PRICE), gutter = measure(price, priceSize, priceFont) + 14;
  const names = stackLines(measuredLines(item.name, width - gutter, nameSize, t.nameFont, 'name'), 2);
  const firstBaseline = names[0]?.y || nameSize;
  const runs = [...names, { value: price, y: firstBaseline, size: priceSize, font: priceFont, role: 'price', align: 'right' }];
  let bottom = runBottom(runs);
  const descriptions = stackLines(measuredLines(item.description, width, descSize, BODY, 'description'), 3, bottom + 7);
  runs.push(...descriptions); bottom = runBottom(runs);
  const tags = stackLines(measuredLines(item.tags.join(' · '), width, 8.3, PRICE, 'tags'), 2, bottom + 7);
  runs.push(...tags);
  return { item, width, runs, height: runBottom(runs), gutter };
}
function headingBlock(section, width, t, continued = false, index = 0) {
  const label = section.name + (continued ? ' (continued)' : '');
  if (t.mode === 'index') {
    const names = stackLines(measuredLines(label, width - 82, t.sectionSize, t.sectionFont, 'category'), 3, 14).map(run => ({ ...run, x: 72 }));
    const number = String(index + 1).padStart(2, '0'), numberFont = 'archivo-black';
    const runs = [{ value: number, size: 31, font: numberFont, role: 'index', x: 11, y: 14 - inkBounds(number, 31, numberFont).top }, ...names];
    return { runs, height: Math.max(54, runBottom(runs) + 13), panel: true };
  }
  const runs = stackLines(measuredLines(label, width, t.sectionSize, t.sectionFont, 'category'), 3);
  return { runs, height: runBottom(runs) };
}
function chooseRegions(menu, t, width, measureSection) {
  const m = t.margin, available = width - m * 2;
  if (t.mode === 'featured' && menu.sections.length > 1) {
    const feature = menu.sections.reduce((best, section) => measureSection(section, available * .59, t.nameSize) > measureSection(best, available * .59, t.nameSize) ? section : best, menu.sections[0]);
    const sideWidth = available * .33, mainX = m + sideWidth + t.gap;
    return [{ x: m, width: sideWidth, nameSize: 16.5, sections: menu.sections.filter(s => s !== feature), shaded: true }, { x: mainX, width: width - m - mainX, nameSize: t.nameSize, sections: [feature], rules: true }];
  }
  const count = t.mode === 'cards' ? 1 : Math.min(t.mode === 'index' ? 3 : 2, Math.max(1, menu.sections.length));
  const regionWidth = (available - t.gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, index) => ({ x: m + index * (regionWidth + t.gap), width: regionWidth, nameSize: t.nameSize }));
}
export function layoutMenu(menu, settings = {}) {
  const key = templates[settings.template] ? settings.template : 'atelier', t = templates[key];
  const allText = [menu.name, menu.subtitle, menu.footer, ...menu.sections.flatMap(section => [section.name, ...section.items.flatMap(item => [item.name, item.description, ...item.tags])])].join('\n');
  const missing = missingCharacters(allText);
  if (missing.length) throw new Error(`These characters need a font outside the current Latin collection: ${missing.slice(0, 8).join(' ')}. Your current draft is unchanged.`);
  const format = physicalFormat(t, settings.pageSize), w = format.width, h = format.height, m = t.margin;
  const spacing = settings.density === 'compact' ? .8 : settings.density === 'spacious' ? 1.18 : 1;
  const descSize = 10.8, titleWidth = (w - 2 * m) * t.identityWidth;
  const ovenScale = Math.min(.85, (w - m * 2 - titleWidth - 15) / 168);
  const artBounds = t.art === 'oven'
    ? { left: w - 112 - 81 * ovenScale, top: 78 - 65 * ovenScale, bottom: 78 + 66 * ovenScale }
    : t.art === 'tomato-vine-fork' ? { left: w - m - 196, top: 24, bottom: 122 } : null;
  let titleSize = t.titleSize, titleRuns;
  do {
    titleRuns = stackLines(measuredLines(menu.name, titleWidth, titleSize, t.titleFont, 'masthead'), 1);
    if (titleRuns.length <= 2 || titleSize <= (t.mode === 'cards' ? 20 : 27)) break;
    titleSize--;
  } while (true);
  if (t.mode === 'featured' && titleRuns.length === 2) titleRuns = stackLines(titleRuns.map((run, index) => ({ ...run, size: index ? titleSize : 20 })), 5);
  const titleTop = t.mode === 'cards' ? 29 : 31;
  const titleBottom = titleTop + runBottom(titleRuns);
  const subtitleTop = titleBottom + 15;
  const subtitleWidth = artBounds && subtitleTop < artBounds.bottom ? artBounds.left - m - 18 : w - m * 2;
  const subtitleRuns = stackLines(measuredLines(menu.subtitle, subtitleWidth, 10.8, BODY, 'subtitle'), 3, subtitleTop);
  const headerBottom = Math.max(titleBottom, runBottom(subtitleRuns), t.art ? 142 : 0) + (t.mode === 'cards' ? 24 : 30);
  const bodyTop = headerBottom;
  const footers = stackLines(measuredLines(menu.footer, w - m * 2 - 20, 7.8, BODY, 'footer'), 2);
  const footerHeight = runBottom(footers), bodyBottom = h - Math.max(62, footerHeight + 61);
  if (bodyBottom - bodyTop < 95) throw new Error('The restaurant name, subtitle or footer leaves too little room for dishes. Shorten those fields or remove extra line breaks.');
  const shaped = new Map();
  const shape = (item, width, size) => {
    const cacheKey = `${item.id}:${width}:${size}`;
    if (!shaped.has(cacheKey)) shaped.set(cacheKey, dishBlock({ ...item, currency: menu.currency }, width, size, descSize, t));
    return shaped.get(cacheKey);
  };
  const measureSection = (section, width, size) => headingBlock(section, width, t).height + t.headingGap + section.items.reduce((sum, item) => sum + shape(item, width, size).height + t.itemGap * spacing, 0);
  const regions = chooseRegions(menu, t, w, measureSection), pages = [];
  const continuationWidth = (w - m * 2 - t.gap) / 2;
  const continuationRegions = t.mode === 'featured' && regions.length === 2
    ? [0, 1].map(index => ({ x: m + index * (continuationWidth + t.gap), width: continuationWidth, nameSize: t.nameSize, rules: true }))
    : regions;
  const pageRegions = index => index === 0 ? regions : continuationRegions;
  let finalSheetTarget;
  function newPage() {
    const regions = pageRegions(pages.length);
    const p = { width: w, height: h, template: key, compositionName: t.name, format: { ...format }, elements: [], hits: [], blocks: [], columns: regions.map(() => bodyTop), bodyTop, bodyBottom };
    rect(p, 0, 0, w, h, t.paper);
    if (t.mode === 'cards') rect(p, 0, 0, w, bodyTop - 13, t.color);
    for (const run of titleRuns) text(p, run.value, m - 1, titleTop + run.y, run.size, run.font, t.mode === 'cards' ? t.paper : t.color, { role: run.role });
    for (const run of subtitleRuns) text(p, run.value, m, run.y, run.size, run.font, t.mode === 'cards' ? t.paper : t.ink, { role: run.role });
    if (t.art === 'oven') drawOven(p, w - 112, 78, ovenScale, line, t.color);
    if (t.art === 'tomato-vine-fork') p.elements.push({ type: 'image', asset: t.art, x: w - m - 196, y: 24, width: 196, height: 98, opacity: 1 });
    for (const region of regions) {
      if (region.shaded) rect(p, 0, bodyTop - 14, region.x + region.width + 17, bodyBottom - bodyTop + 25, t.tint);
    }
    if (t.mode === 'balanced') line(p, m, bodyTop - 14, w - m, bodyTop - 14, t.color, .7);
    pages.push(p); return p;
  }
  function ensurePage(index) { while (!pages[index]) newPage(); return pages[index]; }
  function paintHeading(p, section, region, continued) {
    const block = headingBlock(section, region.width, t, continued, menu.sections.indexOf(section));
    const column = pageRegions(pages.indexOf(p)).indexOf(region), top = p.columns[column];
    if (block.panel) rect(p, region.x, top, region.width, block.height, t.color);
    for (const run of block.runs) text(p, run.value, region.x + (run.x || 0), top + run.y, run.size, run.font, block.panel ? t.paper : t.color, { role: run.role, sectionId: section.id });
    p.columns[column] = top + block.height + t.headingGap * spacing;
  }
  function paintDish(p, section, region, block, runs = block.runs) {
    const column = pageRegions(pages.indexOf(p)).indexOf(region), top = p.columns[column], start = p.elements.length;
    for (const run of runs) text(p, run.value, region.x + (run.align === 'right' ? region.width : 0), top + run.y, run.size, run.font, run.role === 'price' ? t.color : run.role === 'tags' ? t.muted : t.ink, { itemId: block.item.id, sectionId: section.id, role: run.role, align: run.align });
    const bounds = p.elements.slice(start).map(e => e.inkBounds), bottom = Math.max(...bounds.map(b => b.bottom));
    p.hits.push({ id: block.item.id, sectionId: section.id, label: block.item.name, x: region.x - 4, y: top - 2, width: region.width + 8, height: bottom - top + 4 });
    p.blocks.push({ id: block.item.id, sectionId: section.id, x: region.x, top, width: region.width, bottom, priceGutter: block.gutter });
    if (region.rules) line(p, region.x, bottom + t.itemGap * spacing / 2, region.x + region.width, bottom + t.itemGap * spacing / 2, t.rule, .5);
    p.columns[column] = bottom + t.itemGap * spacing;
  }
  function flowSections(sections, firstColumn = 0) {
    let pageIndex = 0, column = firstColumn, p = ensurePage(0), region = regions[column];
    const nextRegion = () => {
      if (++column === pageRegions(pageIndex).length) { pageIndex++; column = 0; }
      p = ensurePage(pageIndex); region = pageRegions(pageIndex)[column];
    };
    const geometry = section => {
      const limit = finalSheetTarget?.pageIndex === pageIndex ? finalSheetTarget.bottom : bodyBottom;
      const headingHeight = Math.max(headingBlock(section, region.width, t).height, headingBlock(section, region.width, t, true).height) + t.headingGap * spacing;
      const clearance = region.rules ? t.itemGap * spacing / 2 : 2;
      const capacity = limit - bodyTop - headingHeight - clearance;
      if (capacity < region.nameSize + 28) throw new Error(`The category “${section.name}” leaves too little room for dishes. Shorten its name or remove extra line breaks.`);
      return { headingHeight, clearance, capacity, limit };
    };
    const startHeading = (section, continued, item) => {
      while (true) {
        const { headingHeight, clearance, capacity, limit } = geometry(section);
        const firstHeight = item ? Math.min(shape(item, region.width, region.nameSize).height, capacity) : 0;
        if (p.columns[column] + headingHeight + firstHeight + clearance <= limit + .001) break;
        nextRegion();
      }
      paintHeading(p, section, region, continued);
    };
    const advance = (section, item) => { nextRegion(); startHeading(section, true, item); };
    for (const section of sections) {
      startHeading(section, false, section.items[0]);
      for (const item of section.items) {
        let block = shape(item, region.width, region.nameSize);
        while (block.height <= geometry(section).capacity && p.columns[column] + block.height + geometry(section).clearance > geometry(section).limit) {
          advance(section, item); block = shape(item, region.width, region.nameSize);
        }
        if (block.height <= geometry(section).capacity) paintDish(p, section, region, block);
        else {
          const fragmentWidth = Math.min(region.width, ...continuationRegions.map(region => region.width));
          block = shape(item, fragmentWidth, region.nameSize);
          const tokens = block.runs.filter(run => run.role !== 'price');
          let offset = 0;
          while (offset < tokens.length) {
            const fragment = [];
            let next = offset, cursor = 0;
            while (next < tokens.length) {
              const token = tokens[next], b = inkBounds(token.value, token.size, token.font);
              const y = cursor - b.top, bottom = y + b.bottom;
              if (p.columns[column] + bottom + geometry(section).clearance > geometry(section).limit) break;
              fragment.push({ ...token, y }); cursor = bottom + 4; next++;
            }
            if (!fragment.length) { advance(section, item); continue; }
            if (!offset) fragment.push({ ...block.runs.find(run => run.role === 'price'), y: fragment[0].y });
            paintDish(p, section, region, block, fragment);
            offset = next;
            if (offset < tokens.length) advance(section, item);
          }
        }
      }
      p.columns[column] += Math.max(0, t.sectionGap - t.itemGap) * spacing;
    }
  }
  if (t.mode === 'featured' && regions.length === 2) {
    flowSections(regions[1].sections, 1);
    flowSections(regions[0].sections);
  } else if (t.mode === 'index' && menu.sections.length <= regions.length && menu.sections.every((section, index) => {
    const region = regions[index];
    const height = headingBlock(section, region.width, t).height + t.headingGap * spacing + section.items.reduce((sum, item) => sum + shape(item, region.width, region.nameSize).height + t.itemGap * spacing, 0);
    return height - (section.items.length ? t.itemGap * spacing : 0) + 2 <= bodyBottom - bodyTop;
  })) menu.sections.forEach((section, index) => flowSections([section], index));
  else flowSections(menu.sections);
  if (t.mode === 'balanced' && regions.length > 1 && pages.length) {
    const lastPage = pages.at(-1), width = regions[0].width;
    const headingReserve = Math.max(...menu.sections.map(section => headingBlock(section, width, t, true).height)) + (t.headingGap + t.sectionGap) * spacing;
    const averageHeight = lastPage.columns.reduce((sum, bottom) => sum + bottom - bodyTop, 0) / regions.length;
    const target = Math.max(bodyTop + headingReserve + t.nameSize + 30, bodyTop + averageHeight + headingReserve);
    if (target < bodyBottom) {
      const originalPages = pages.splice(0);
      finalSheetTarget = { pageIndex: originalPages.length - 1, bottom: target };
      flowSections(menu.sections);
      if (pages.length > originalPages.length) pages.splice(0, pages.length, ...originalPages);
    }
  }
  if (!pages.length) newPage();
  for (const [index, p] of pages.entries()) {
    const footerTop = h - 42 - footerHeight;
    for (const run of footers) text(p, run.value, m, footerTop + run.y, run.size, run.font, t.muted, { role: 'footer' });
    text(p, `${String(index + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')}`, w - m, h - 29, 7.8, PRICE, t.color, { align: 'right', role: 'counter' });
    text(p, menu.currency, m, h - 29, 7.8, PRICE, t.color, { role: 'currency' });
    for (const e of p.elements.filter(e => e.type === 'text')) {
      if (e.inkBounds.left < 17 || e.inkBounds.right > w - 17 || e.inkBounds.top < 16 || e.inkBounds.bottom > h - 20) throw new Error('The restaurant name, subtitle or footer leaves too little room for dishes. Shorten those fields or remove extra line breaks.');
    }
  }
  return freeze(pages);
}
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
export function renderSVG(page, { interactive = false, selected = '' } = {}) {
  const content = page.elements.map(e => {
    if (e.type === 'rect') return `<rect x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" rx="${e.radius || 0}" fill="${e.fill || 'none'}" stroke="${e.stroke || 'none'}" stroke-width=".7"/>`;
    if (e.type === 'line') return `<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="${e.color}" stroke-width="${e.width}"/>`;
    if (e.type === 'ellipse') return `<ellipse cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}" fill="${e.fill || 'none'}" stroke="${e.stroke || 'none'}" stroke-width=".6"/>`;
    if (e.type === 'image') return `<image href="${escape(getArt(e.asset).url)}" x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" opacity="${e.opacity}"/>`;
    const face = getFont(e.font);
    return `<text x="${e.x}" y="${e.y}" font-size="${e.size}" font-family="${escape(face.family)}" font-weight="${face.weight}" font-style="${face.style}" text-anchor="${e.align === 'center' ? 'middle' : e.align === 'right' ? 'end' : 'start'}" fill="${e.color}" textLength="${e.advance}" lengthAdjust="spacingAndGlyphs" style="font-kerning:none;font-variant-ligatures:none;font-feature-settings:'kern' 0,'liga' 0,'clig' 0,'calt' 0">${escape(e.value)}</text>`;
  }).join('');
  const hits = interactive ? page.hits.map(hit => `<g class="preview-hit ${selected === hit.id ? 'is-selected' : ''}" data-item="${escape(hit.id)}" data-section="${escape(hit.sectionId)}" tabindex="0" role="button" aria-label="Edit ${escape(hit.label)}"><rect x="${hit.x}" y="${hit.y}" width="${hit.width}" height="${hit.height}" rx="3"/><title>Edit ${escape(hit.label)}</title></g>`).join('') : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${page.width} ${page.height}" role="${interactive ? 'group' : 'img'}" aria-label="Designed menu page">${content}${hits}</svg>`;
}
