import { formatPrice } from './model.js';
import { fontId, getFont, fontFeatures, resolveFont, measure } from './document-fonts.js';
function textWidth(value, size, font = 'serif', style = 'normal') { return measure(String(value), size, resolveFont(value, fontId(font, style))); }
function wrapText(value, width, size, font = 'serif', style = 'normal') {
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

export { BODY, PRICE, textWidth, wrapText, inkBounds, text, line, rect, freeze, dishBlock, headingBlock, measuredLines, stackLines, runBottom };
