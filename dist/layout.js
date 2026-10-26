import { formatPrice } from './model.js';
import { prepareTypography, fontId, getFont, fontFeatures, missingCharacters, resolveFont, measure } from './document-fonts.js';
export { prepareTypography };

export const templates = {
  atelier: { name: 'Maison', mood: 'French brasserie', color: '#6f202b', paper: '#fffdf8', ink: '#3d2227', muted: '#79666a', font: 'cormorant-semibold', columns: 2, margin: 48, gap: 33 },
  midnight: { name: 'Edition', mood: 'Bold editorial', color: '#2546bb', paper: '#ffffff', ink: '#152049', muted: '#687088', font: 'source-sans-semibold', columns: 1, margin: 42, gap: 0 },
  trattoria: { name: 'Mercato', mood: 'Italian poster', color: '#b8432d', paper: '#fff9e8', ink: '#733a29', muted: '#8a7162', font: 'fraunces-display', columns: 2, margin: 45, gap: 35 },
  botanical: { name: 'Broadside', mood: 'Modern supper club', color: '#18584f', paper: '#fff7dc', ink: '#173d37', muted: '#687468', font: 'source-sans-semibold', columns: 2, margin: 40, gap: 29 }
};
export const pageSizes = { a4: [595.28, 841.89], letter: [612, 792] };
export function textWidth(value, size, font = 'serif', style = 'normal') {
  return measure(String(value), size, resolveFont(value, fontId(font, style)));
}
export function wrapText(value, width, size, font = 'serif', style = 'normal') {
  const id = resolveFont(value, fontId(font, style));
  const result = [];
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
export function layoutMenu(menu, settings = {}) {
  const key = templates[settings.template] ? settings.template : 'atelier';
  const t = templates[key];
  const [w, h] = pageSizes[settings.pageSize] || pageSizes.a4;
  const scale = settings.density === 'compact' ? .88 : settings.density === 'spacious' ? 1.12 : 1;
  const allText = [menu.name, menu.subtitle, menu.footer, ...menu.sections.flatMap(s => [s.name, ...s.items.flatMap(i => [i.name, i.description, ...i.tags])])].join('\n');
  const missing = missingCharacters(allText);
  if (missing.length) throw new Error(`These characters need a font outside the current Latin collection: ${missing.slice(0, 8).join(' ')}. Your current draft is unchanged.`);
  const rail = key === 'midnight' ? 123 : 0;
  const cw = (w - t.margin * 2 - t.gap * (t.columns - 1)) / t.columns - rail;
  const sizes = { name: (key === 'atelier' ? 17.2 : key === 'trattoria' ? 13.1 : 13.2) * scale, desc: (key === 'atelier' ? 11.2 : 10.5) * scale, tag: 7.8 * scale, section: (key === 'botanical' ? 22 : key === 'atelier' ? 24 : 19) * scale };
  const bodyFont = key === 'atelier' ? 'cormorant-semibold' : key === 'trattoria' ? 'fraunces-display' : 'source-sans-semibold';
  const sectionFont = key === 'atelier' ? 'cormorant-medium-italic' : key === 'botanical' ? 'bebas-neue' : key === 'midnight' ? 'source-sans-semibold' : 'fraunces-display';
  let titleFont = key === 'atelier' ? 'cormorant-semibold' : key === 'trattoria' ? 'fraunces-display' : key === 'botanical' ? 'bebas-neue' : 'archivo-black';
  titleFont = resolveFont(menu.name, titleFont);
  const titleWidth = w - t.margin * 2 - (key === 'botanical' ? 60 : 0);
  let titleSize = key === 'atelier' ? 64 : key === 'trattoria' ? 47 : key === 'botanical' ? 71 : 45;
  let titleLines = wrapText(menu.name, titleWidth, titleSize, titleFont);
  while (titleLines.length > 2 && titleSize > 27) { titleSize--; titleLines = wrapText(menu.name, titleWidth, titleSize, titleFont); }
  const titleBase = key === 'atelier' ? 109 : key === 'trattoria' ? 91 : key === 'botanical' ? 112 : 91;
  const titleEnd = titleBase + Math.max(0, titleLines.length - 1) * titleSize * 1.05;
  let subtitleSize = key === 'atelier' ? 12.5 : 10.5, footerSize = 8;
  let subtitles, footers, bodyTop, bodyBottom, subtitleY, headerRule;
  function geometry() {
    subtitles = wrapText(menu.subtitle, w - 2 * t.margin - (key === 'midnight' ? 140 : 0), subtitleSize, key === 'atelier' ? 'cormorant-medium-italic' : 'source-sans-regular');
    footers = wrapText(menu.footer, w - t.margin * 2 - 40, footerSize, 'source-sans-regular');
    subtitleY = titleEnd + (key === 'atelier' ? 25 : 21);
    headerRule = subtitleY + Math.max(0, subtitles.length - 1) * subtitleSize * 1.35 + (subtitles.length ? 23 : 9);
    bodyTop = Math.max(key === 'atelier' ? 177 : key === 'midnight' ? 153 : key === 'trattoria' ? 163 : 169, headerRule + (key === 'botanical' ? 12 : 19));
    bodyBottom = h - Math.max(70, footers.length * footerSize * 1.4 + 60);
  }
  geometry();
  while (bodyBottom - bodyTop < 170 * scale && (footerSize > 7 || subtitleSize > 8)) {
    if (footerSize > 7) footerSize -= .5;
    if (subtitleSize > 8) subtitleSize -= .5;
    geometry();
  }
  if (bodyBottom - bodyTop < 170 * scale) throw new Error('The restaurant name, subtitle or footer leaves too little room for dishes. Shorten those fields or remove extra line breaks.');
  const pages = [];
  const text = (p, value, x, y, size, options = {}) => {
    const selectedFont = resolveFont(value, options.font || bodyFont);
    p.elements.push({ type: 'text', value: String(value), x, y, size, font: selectedFont, style: 'normal', color: t.ink, ...options, font: selectedFont, advance: measure(value, size, selectedFont) });
  };
  const line = (p, x1, y1, x2, y2, color = t.color, width = .6) => p.elements.push({ type: 'line', x1, y1, x2, y2, color, width });
  const rect = (p, x, y, width, height, fill, stroke, radius = 0) => p.elements.push({ type: 'rect', x, y, width, height, fill, stroke, radius });
  const ellipse = (p, cx, cy, rx, ry, fill, stroke) => p.elements.push({ type: 'ellipse', cx, cy, rx, ry, fill, stroke });
  function newPage() {
    const p = { width: w, height: h, template: key, elements: [], hits: [], columns: Array(t.columns).fill(bodyTop), bodyTop, bodyBottom };
    rect(p, 0, 0, w, h, t.paper);
    if (key === 'atelier') {
      rect(p, 25, 25, w - 50, h - 50, undefined, t.color);
      rect(p, 29, 29, w - 58, h - 58, undefined, t.color);
      text(p, 'M E N U', w / 2, 55, 8, { font: 'source-sans-semibold', align: 'center', color: t.color });
      titleLines.forEach((value, i) => text(p, value, w / 2, titleBase + i * titleSize * 1.05, titleSize, { font: titleFont, align: 'center', color: t.color }));
      subtitles.forEach((value, i) => text(p, value, w / 2, subtitleY + i * subtitleSize * 1.35, subtitleSize, { font: 'cormorant-medium-italic', align: 'center', color: t.muted }));
      line(p, t.margin, headerRule, w - t.margin, headerRule, t.color, .75);
      ellipse(p, w / 2, headerRule, 3.2, 3.2, t.paper, t.color);
    } else if (key === 'midnight') {
      rect(p, 0, 0, w, 13, t.color);
      text(p, 'MENU', t.margin, 42, 8, { font: 'source-sans-semibold', color: t.color });
      text(p, menu.currency, w - t.margin, 42, 8, { font: 'source-sans-semibold', color: t.color, align: 'right' });
      titleLines.forEach((value, i) => text(p, value, t.margin, titleBase + i * titleSize * 1.05, titleSize, { font: titleFont, color: t.color }));
      subtitles.forEach((value, i) => text(p, value, t.margin, subtitleY + i * subtitleSize * 1.35, subtitleSize, { font: 'source-sans-regular', color: t.muted }));
      line(p, t.margin, headerRule, w - t.margin, headerRule, t.color, 3);
    } else if (key === 'trattoria') {
      rect(p, 19, 19, w - 38, h - 38, undefined, t.color);
      line(p, 26, 26, w - 26, 26, '#587348', 3);
      text(p, 'M E N U', w / 2, 48, 8, { font: 'source-sans-semibold', color: '#587348', align: 'center' });
      titleLines.forEach((value, i) => text(p, value, w / 2, titleBase + i * titleSize * 1.05, titleSize, { font: titleFont, color: t.color, align: 'center' }));
      subtitles.forEach((value, i) => text(p, value, w / 2, subtitleY + i * subtitleSize * 1.35, subtitleSize, { font: 'source-sans-regular', color: t.muted, align: 'center' }));
      line(p, t.margin, headerRule - 2, w - t.margin, headerRule - 2, t.color, 1.6);
      line(p, t.margin, headerRule + 3, w - t.margin, headerRule + 3, t.color, .5);
      ellipse(p, w / 2, headerRule, 10, 6, t.paper, t.color);
      line(p, w / 2 - 4, headerRule, w / 2 + 4, headerRule, '#587348', 1.5);
    } else {
      rect(p, 0, 0, 13, h, t.color);
      rect(p, 13, 0, w - 13, 12, '#d96d3d');
      text(p, 'M E N U', t.margin, 44, 8, { font: 'source-sans-semibold', color: t.color });
      titleLines.forEach((value, i) => text(p, value, t.margin, titleBase + i * titleSize * 1.05, titleSize, { font: titleFont, color: t.color }));
      const sealX = w - 62, sealY = 81;
      ellipse(p, sealX, sealY, 23, 23, undefined, '#d96d3d');
      line(p, sealX - 13, sealY, sealX + 13, sealY, '#d96d3d', 1);
      line(p, sealX, sealY - 13, sealX, sealY + 13, '#d96d3d', 1);
      subtitles.forEach((value, i) => text(p, value, t.margin, subtitleY + i * subtitleSize * 1.35, subtitleSize, { font: 'source-sans-regular', color: t.muted }));
      line(p, t.margin, headerRule, w - t.margin, headerRule, t.color, 2);
    }
    if (pages.length) text(p, 'CONTINUED', w - t.margin, bodyTop - 6, 6.7, { font: 'source-sans-regular', color: t.muted, align: 'right' });
    pages.push(p);
    return p;
  }
  function itemLines(shape) {
    const lines = [];
    let y = sizes.name;
    for (const value of shape.names) {
      lines.push({ value, y, size: sizes.name, font: shape.nameFont, color: t.ink });
      y += sizes.name * 1.14;
    }
    lines.push({ value: shape.price, y: sizes.name, size: shape.priceSize, font: shape.priceFont, color: t.ink, align: 'right' });
    for (const value of shape.descriptions) {
      lines.push({ value, y: y + 2, size: sizes.desc, font: 'source-sans-regular', color: t.muted });
      y += sizes.desc * 1.35;
    }
    for (const value of shape.tags) {
      lines.push({ value, y: y + 4, size: sizes.tag, font: 'source-sans-semibold', color: t.muted });
      y += sizes.tag * 1.35;
    }
    return lines;
  }
  function paintedBottom(lines) {
    return Math.max(...lines.map(run => {
      const { font } = getFont(resolveFont(run.value, run.font));
      const shaped = font.layout(run.value, fontFeatures);
      const descent = Math.max(0, ...shaped.glyphs.map((glyph, index) => -glyph.bbox.minY - (shaped.positions[index]?.yOffset || 0)));
      return run.y + descent / font.unitsPerEm * run.size;
    }));
  }
  function shapeItem(item) {
    const price = formatPrice(item.price, menu.currency);
    const priceSize = key === 'atelier' ? sizes.name - .5 : 11.5 * scale;
    const priceFont = key === 'atelier' ? bodyFont : 'source-sans-semibold';
    const priceWidth = Math.max(42, textWidth(price, priceSize, priceFont) + 14);
    const nameFont = resolveFont(item.name, bodyFont);
    const names = wrapText(item.name, cw - priceWidth, sizes.name, nameFont);
    const descriptions = wrapText(item.description, cw - 2, sizes.desc, 'source-sans-regular');
    const tags = wrapText(item.tags.join(' · ').toUpperCase(), cw - 2, sizes.tag, 'source-sans-semibold');
    const shape = { item, price, priceSize, priceFont, nameFont, names, descriptions, tags, height: names.length * sizes.name * 1.14 + descriptions.length * sizes.desc * 1.35 + tags.length * sizes.tag * 1.35 + (rail ? 12 : 22) * scale };
    if (rail) shape.height = Math.max(shape.height, paintedBottom(itemLines(shape)) + 10 * scale);
    return shape;
  }
  const headingFont = (section, continued = false) => resolveFont(section.name + (continued ? ' (continued)' : ''), sectionFont);
  const headingLines = (section, continued = false) => wrapText(section.name + (continued ? ' (continued)' : ''), rail ? rail - 20 : key === 'trattoria' ? w - t.margin * 2 : cw - (key === 'botanical' ? 16 : 0), rail ? 13 * scale : sizes.section, headingFont(section, continued));
  const headingHeight = (section, continued = false) => rail ? 0 : headingLines(section, continued).length * sizes.section * 1.12 + 21 * scale;
  const headingExtent = (section, continued = false) => rail ? headingLines(section, continued).length * 15 * scale + 32 : headingHeight(section, continued);
  function heading(p, section, col, continued = false) {
    const x = t.margin + col * (cw + t.gap), y = p.columns[col], values = headingLines(section, continued);
    if (rail) {
      const index = menu.sections.findIndex(s => s.id === section.id);
      text(p, String(index + 1).padStart(2, '0'), t.margin, y + 11, 8, { font: 'source-sans-regular', color: t.color });
      values.forEach((value, i) => text(p, value, t.margin, y + 32 + i * 15 * scale, 13 * scale, { font: headingFont(section, continued), color: t.color }));
    } else if (key === 'botanical') {
      const height = values.length * sizes.section * 1.12 + 12 * scale;
      rect(p, x, y, cw, height, t.color);
      values.forEach((value, i) => text(p, value, x + 8, y + sizes.section * .86 + 5 + i * sizes.section * 1.12, sizes.section, { font: headingFont(section, continued), color: t.paper }));
    } else {
      values.forEach((value, i) => text(p, value, key === 'trattoria' ? x + cw / 2 : x, y + sizes.section + i * sizes.section * 1.12, sizes.section, { font: headingFont(section, continued), color: t.color, align: key === 'trattoria' ? 'center' : 'left' }));
      if (key === 'trattoria') line(p, x + 35, y + values.length * sizes.section * 1.12 + 9, x + cw - 35, y + values.length * sizes.section * 1.12 + 9, '#587348', .6);
    }
    p.columns[col] += headingHeight(section, continued);
  }
  function drawItem(p, shape, col, sectionId) {
    const { item } = shape;
    const x = t.margin + col * (cw + t.gap) + rail, top = p.columns[col];
    const lines = itemLines(shape);
    for (const run of lines) text(p, run.value, x + (run.align === 'right' ? cw : 0), top + run.y, run.size, { font: run.font, color: run.color, align: run.align, itemId: item.id });
    if (rail) {
      const ruleY = top + Math.max(paintedBottom(lines) + 4 * scale, shape.height - 6 * scale);
      line(p, x, ruleY, x + cw, ruleY, '#d8deee', .45);
    }
    p.hits.push({ id: item.id, sectionId, x: x - 4, y: top - 2, width: cw + 8, height: shape.height - 6 * scale });
    p.columns[col] += shape.height;
  }
  const sections = menu.sections.map(section => {
    const shapes = section.items.map(shapeItem);
    return { section, shapes, height: Math.max(headingExtent(section), headingHeight(section) + (key === 'trattoria' ? shapes.reduce((total, item, index) => index % 2 ? total : total + Math.max(item.height, shapes[index + 1]?.height || 0), 0) : shapes.reduce((total, item) => total + item.height, 0))) };
  });
  if (settings.density !== 'compact' && sections.length) {
    const count = section => key === 'trattoria' ? Math.ceil(section.shapes.length / 2) : section.shapes.length;
    const capacity = bodyBottom - bodyTop;
    let natural = sections.reduce((sum, section) => sum + section.height + 15 * scale, 0) - 15 * scale;
    let blocks = sections.reduce((sum, section) => sum + count(section), 0);
    if (t.columns === 2 && key !== 'trattoria' && sections.length > 1) {
      let left = 0, leftCount = 0, best = Infinity, bestCount = blocks;
      const total = natural;
      for (let i = 1; i < sections.length; i++) {
        left += sections[i - 1].height + 15 * scale;
        leftCount += count(sections[i - 1]);
        const largest = Math.max(left - 15 * scale, total - left);
        if (largest < best) { best = largest; bestCount = Math.max(leftCount, blocks - leftCount); }
      }
      natural = best; blocks = bestCount;
    }
    if (natural < capacity && blocks) {
      const extra = Math.min((settings.density === 'spacious' ? 30 : 25) * scale, Math.max(0, (capacity * .9 - natural) / blocks));
      for (const section of sections) {
        section.shapes.forEach(shape => shape.height += extra);
        section.height += extra * count(section);
      }
    }
  }
  let split = null;
  if (t.columns === 2 && key !== 'trattoria') {
    const total = sections.reduce((sum, section) => sum + section.height + 15 * scale, 0);
    let left = 0, best = Infinity;
    for (let i = 1; i < sections.length; i++) {
      left += sections[i - 1].height + 15 * scale;
      const tallest = Math.max(left, total - left) - 15 * scale;
      if (tallest <= bodyBottom - bodyTop && tallest < best) { split = i; best = tallest; }
    }
  }
  let page = newPage();
  let col = 0;
  let groupedContinuation;
  function advance(section, needed = 45) {
    if (groupedContinuation) { page = newPage(); col = 0; groupedContinuation(section, true); return; }
    const other = page.columns.findIndex((y, index) => index !== col && y + headingHeight(section, true) + Math.min(needed, 45) <= bodyBottom);
    if (other >= 0) col = other;
    else { page = newPage(); col = 0; }
    heading(page, section, col, true);
  }
  function fragments(shape, section) {
    const tokens = [...shape.names.map(value => ({ kind: 'names', value, height: sizes.name * 1.14 })), ...shape.descriptions.map(value => ({ kind: 'descriptions', value, height: sizes.desc * 1.35 })), ...shape.tags.map(value => ({ kind: 'tags', value, height: sizes.tag * 1.35 }))];
    while (tokens.length) {
      const before = tokens.length;
      const fragment = { ...shape, names: [], descriptions: [], tags: [], height: 22 * scale };
      if (tokens[0].kind !== 'names') { fragment.names.push('(continued)'); fragment.height += sizes.name * 1.14; }
      while (tokens.length && page.columns[col] + fragment.height + tokens[0].height <= bodyBottom) {
        const token = tokens.shift(); fragment[token.kind].push(token.value); fragment.height += token.height;
      }
      if (tokens.length === before) {
        if (page.columns[col] > bodyTop + headingHeight(section, true) + .01) { advance(section); continue; }
        throw new Error('A dish cannot fit below this page heading. Shorten the category, restaurant name, subtitle or footer.');
      }
      drawItem(page, fragment, col, section.id);
      if (tokens.length) advance(section);
    }
  }
  if (key === 'trattoria') {
    function groupedHeading(section, continued = false) {
      const values = headingLines(section, continued);
      const y = Math.max(...page.columns), height = headingHeight(section, continued);
      values.forEach((value, index) => text(page, value, w / 2, y + sizes.section + index * sizes.section * 1.12, sizes.section, { font: resolveFont(section.name, sectionFont), color: t.color, align: 'center' }));
      line(page, t.margin, y + height - 9, w - t.margin, y + height - 9, '#587348', .6);
      page.columns.fill(y + height);
    }
    groupedContinuation = groupedHeading;
    for (const { section, shapes } of sections) {
      if (Math.max(headingHeight(section), headingHeight(section, true)) + 50 > bodyBottom - bodyTop) throw new Error(`The category “${section.name}” leaves too little room for dishes. Shorten its name or remove extra line breaks.`);
      const firstRow = Math.max(shapes[0]?.height || 0, shapes[1]?.height || 0);
      if (Math.max(...page.columns) + headingHeight(section) + Math.min(firstRow, 50) > bodyBottom) page = newPage();
      groupedHeading(section);
      for (let index = 0; index < shapes.length; index += 2) {
        const pair = shapes.slice(index, index + 2), rowHeight = Math.max(...pair.map(shape => shape.height));
        if (Math.max(...page.columns) + rowHeight > bodyBottom && rowHeight <= bodyBottom - bodyTop - headingHeight(section, true)) { page = newPage(); groupedHeading(section, true); }
        if (rowHeight > bodyBottom - bodyTop - headingHeight(section, true)) {
          for (const shape of pair) {
            col = 0;
            page.columns.fill(Math.max(...page.columns));
            fragments(shape, section);
            page.columns.fill(Math.max(...page.columns));
          }
        } else {
          const y = Math.max(...page.columns);
          pair.forEach((shape, index) => { page.columns[index] = y; drawItem(page, shape, index, section.id); });
          page.columns.fill(y + rowHeight);
        }
      }
      page.columns.fill(Math.max(...page.columns) + 13 * scale);
    }
  } else {
    for (const [index, { section, shapes, height }] of sections.entries()) {
      const categorySpace = Math.max(headingExtent(section), headingExtent(section, true));
      if (categorySpace + sizes.name * 1.14 + 35 * scale > bodyBottom - bodyTop) throw new Error(`The category “${section.name}” leaves too little room for dishes. Shorten its name or remove extra line breaks.`);
      col = split === null ? page.columns.indexOf(Math.min(...page.columns)) : index < split ? 0 : 1;
      if (height <= bodyBottom - bodyTop && page.columns[col] + height > bodyBottom) {
        const other = page.columns.findIndex(y => y + height <= bodyBottom);
        if (other >= 0) col = other;
        else { page = newPage(); col = 0; }
      }
      const initialSpace = Math.max(headingExtent(section), headingHeight(section) + Math.min(shapes[0]?.height || categorySpace, 45));
      if (page.columns[col] + initialSpace > bodyBottom) {
        const other = page.columns.findIndex(y => y + initialSpace <= bodyBottom);
        if (other >= 0) col = other;
        else { page = newPage(); col = 0; }
      }
      heading(page, section, col);
      const sectionTop = page.columns[col];
      for (const shape of shapes) {
        if (page.columns[col] + shape.height > bodyBottom && shape.height <= bodyBottom - bodyTop - headingHeight(section, true)) advance(section, shape.height);
        if (shape.height > bodyBottom - page.columns[col]) fragments(shape, section);
        else drawItem(page, shape, col, section.id);
      }
      if (rail) page.columns[col] = Math.max(page.columns[col], sectionTop + categorySpace);
      page.columns[col] += 15 * scale;
    }
  }
  pages.forEach((p, index) => {
    const footerTop = Math.min(h - 62, bodyBottom + 17);
    line(p, t.margin, footerTop, w - t.margin, footerTop, t.color, key === 'midnight' ? 1.5 : .45);
    footers.forEach((value, i) => text(p, value, key === 'midnight' || key === 'botanical' ? t.margin : w / 2, footerTop + 17 + i * footerSize * 1.4, footerSize, { font: 'source-sans-regular', align: key === 'midnight' || key === 'botanical' ? 'left' : 'center', color: t.muted, role: 'footer' }));
    text(p, `${String(index + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')}`, w - t.margin, h - 38, 7, { font: 'source-sans-regular', align: 'right', color: t.muted, role: 'counter' });
    p.elements.forEach(Object.freeze); p.hits.forEach(Object.freeze); Object.freeze(p.elements); Object.freeze(p.hits); Object.freeze(p.columns); Object.freeze(p);
  });
  return Object.freeze(pages);
}
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
export function renderSVG(page, { interactive = false, selected = '' } = {}) {
  const content = page.elements.map(element => {
    const e = element;
    if (e.type === 'rect') return `<rect x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" rx="${e.radius || 0}" fill="${e.fill || 'none'}" stroke="${e.stroke || 'none'}" stroke-width=".7"/>`;
    if (e.type === 'line') return `<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="${e.color}" stroke-width="${e.width}"/>`;
    if (e.type === 'ellipse') return `<ellipse cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}" fill="${e.fill || 'none'}" stroke="${e.stroke || 'none'}" stroke-width=".6"/>`;
    const face = getFont(e.font);
    return `<text x="${e.x}" y="${e.y}" font-size="${e.size}" font-family="${escape(face.family)}" font-weight="${face.weight}" font-style="${face.style}" text-anchor="${e.align === 'center' ? 'middle' : e.align === 'right' ? 'end' : 'start'}" fill="${e.color}" textLength="${e.advance}" lengthAdjust="spacingAndGlyphs" style="font-kerning:none;font-variant-ligatures:none;font-feature-settings:'kern' 0,'liga' 0,'clig' 0,'calt' 0">${escape(e.value)}</text>`;
  }).join('');
  const hits = interactive ? page.hits.map(hit => `<g class="preview-hit ${selected === hit.id ? 'is-selected' : ''}" data-item="${escape(hit.id)}" data-section="${escape(hit.sectionId)}" tabindex="0" role="button" aria-label="Edit ${escape(page.elements.find(e => e.itemId === hit.id)?.value || 'dish')}"><rect x="${hit.x}" y="${hit.y}" width="${hit.width}" height="${hit.height}" rx="3"/><title>Click to edit this dish</title></g>`).join('') : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${page.width} ${page.height}" role="${interactive ? 'group' : 'img'}" aria-label="Designed menu page">${content}${hits}</svg>`;
}
