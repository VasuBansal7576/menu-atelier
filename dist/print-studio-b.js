import { formatPrice } from './model.js';
import { BODY, PRICE, text, line, rect, textWidth, inkBounds, dishBlock, measuredLines, stackLines, runBottom, freeze } from './print-kit.js';

export const designs = freeze([
  { id: 'sunroom', name: 'Sunroom', mood: 'A sun-drenched landscape poster, oversized fruit and warm letterpress type.' },
  { id: 'folio', name: 'Folio', mood: 'A bold typographic masthead and precise editorial rows on warm paper.' }
]);

const ellipse = (p, cx, cy, rx, ry, fill, stroke) => p.elements.push({ type: 'ellipse', cx, cy, rx, ry, fill, stroke });
const densityGap = settings => settings.density === 'compact' ? 12 : settings.density === 'spacious' ? 22 : 17;
const runsFor = (value, width, size, font, start = 0) => stackLines(measuredLines(value, width, size, font), 3, start);
function paintRuns(p, runs, x, top, color, extra = {}) {
  for (const run of runs) text(p, run.value, x, top + run.y, run.size, run.font, color, extra);
}
function fitTitle(value, width, maxSize, maxLines, font) {
  let size = maxSize, runs;
  do { runs = runsFor(value, width, size, font); if ((runs.length <= maxLines && String(value).split(/\s+/).every(word => textWidth(word, size, font) <= width)) || size <= 22) break; size -= 1; } while (true);
  return runs;
}
function pageRecord(width, height, id, name, bodyTop, bodyBottom, orientation, stock) {
  return { width, height, template: id, compositionName: name, format: { width, height, orientation, stock, label: `${stock === 'letter' ? 'US Letter' : 'A4'} ${orientation}` }, bodyTop, bodyBottom, elements: [], hits: [], blocks: [] };
}
function dish(p, section, block, x, top, ink, accent, runs = block.runs) {
  const start = p.elements.length;
  for (const run of runs) text(p, run.value, x + (run.align === 'right' ? block.width : 0), top + run.y, run.size, run.font, run.role === 'price' ? accent : ink, { align: run.align, itemId: block.item.id, sectionId: section.id, role: run.role });
  const bounds = p.elements.slice(start).map(e => e.inkBounds), bottom = Math.max(top, ...bounds.map(b => b.bottom));
  p.hits.push({ id: block.item.id, sectionId: section.id, label: block.item.name, x: x - 3, y: top - 3, width: block.width + 6, height: bottom - top + 7 });
  p.blocks.push({ id: block.item.id, sectionId: section.id, x, top, bottom, width: block.width, priceGutter: block.gutter });
  return bottom;
}
function footers(menu, width) { return runsFor(menu.footer, width, 8.3, BODY); }
function complete(pages, menu, footerRuns, x, bottom, ink, accent) {
  pages.forEach((p, i) => {
    paintRuns(p, footerRuns, x, bottom, ink, { role: 'footer' });
    text(p, menu.currency, x, p.height - 20, 8.3, PRICE, accent, { role: 'currency' });
    text(p, `${String(i + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')}`, p.width - 28, p.height - 20, 8.3, PRICE, accent, { role: 'counter', align: 'right' });
    for (const e of p.elements.filter(e => e.type === 'text')) {
      if (e.inkBounds.left < 14 || e.inkBounds.right > p.width - 14 || e.inkBounds.top < 14 || e.inkBounds.bottom > p.height - 12) throw new Error('This menu needs a shorter restaurant name, subtitle or footer to keep every word inside the paper.');
    }
  });
  return freeze(pages);
}
function sun(p, cx, cy, radius, ink, paper) {
  for (let i = 0; i < 30; i++) {
    const a = i / 30 * Math.PI * 2, inner = radius + 9, outer = radius + 22 + (i % 3) * 3;
    line(p, cx + Math.cos(a) * inner, cy + Math.sin(a) * inner, cx + Math.cos(a + .015) * outer, cy + Math.sin(a + .015) * outer, ink, i % 2 ? 2.5 : 4);
  }
  ellipse(p, cx, cy, radius, radius * .97, ink);
  ellipse(p, cx - radius * .21, cy - radius * .1, radius * .06, radius * .09, paper);
  ellipse(p, cx + radius * .21, cy - radius * .1, radius * .06, radius * .09, paper);
  for (let i = 0; i < 18; i++) {
    const a = Math.PI * .1 + i / 18 * Math.PI * .8, b = Math.PI * .1 + (i + 1) / 18 * Math.PI * .8;
    line(p, cx + Math.cos(a) * radius * .32, cy + Math.sin(a) * radius * .34, cx + Math.cos(b) * radius * .32, cy + Math.sin(b) * radius * .34, paper, 2);
  }
}
function sunroom(menu, settings) {
  const stock = settings.pageSize === 'letter' ? 'letter' : 'a4';
  const [w, h] = stock === 'letter' ? [792, 612] : [841.89, 595.28];
  const orange = '#ED522A', yellow = '#F8CB46', cream = '#FFF7E5', ink = '#382B20';
  const island = 245, m = 29, contentX = island + 28, contentW = w - contentX - m, gap = 25, colW = (contentW - gap) / 2;
  const title = fitTitle(menu.name, island - 46, 49, 3, 'fraunces-display');
  const subtitle = runsFor(menu.subtitle, island - 48, 11.5, BODY);
  const titleBottom = 61 + runBottom(title), subTop = titleBottom + 18, subBottom = subTop + runBottom(subtitle);
  const footerRuns = footers(menu, contentW), footerTop = h - 45 - runBottom(footerRuns), bodyTop = 46, bodyBottom = footerTop - 24;
  const sunRadius = Math.min(72, (h - 52 - subBottom - 58) / 2);
  if (sunRadius < 24 || bodyBottom - bodyTop < 120) throw new Error('The restaurant identity or footer is too long for the Sunroom poster.');
  const t = { nameFont: 'fraunces-display' }, pages = [], itemGap = densityGap(settings);
  let p, column = 0, y = bodyTop;
  function newPage() {
    p = pageRecord(w, h, 'sunroom', 'Sunroom', bodyTop, bodyBottom, 'landscape', stock);
    rect(p, 0, 0, w, h, cream); rect(p, 0, 0, island, h, yellow);
    text(p, 'MENU', 25, 35, 13, 'bebas-neue', ink, { role: 'edition' });
    line(p, 25, 44, island - 25, 44, ink, 1);
    paintRuns(p, title, 24, 61, ink, { role: 'masthead' });
    paintRuns(p, subtitle, 25, subTop, ink, { role: 'subtitle' });
    sun(p, island / 2, subBottom + 39 + sunRadius, sunRadius, orange, yellow);
    line(p, contentX, 28, w - m, 28, orange, 3);
    line(p, contentX + colW + gap / 2, bodyTop - 1, contentX + colW + gap / 2, bodyBottom, '#D9CBB0', .6);
    pages.push(p); column = 0; y = bodyTop;
  }
  const x = () => contentX + column * (colW + gap);
  function advance() { if (column === 0) { column = 1; y = bodyTop; } else newPage(); }
  function heading(section, continued, reserve = 0) {
    const label = section.name + (continued ? ' (continued)' : ''), runs = runsFor(label, colW - 3, 24, 'cormorant-medium-italic');
    const height = runBottom(runs) + 16;
    if (height + 35 > bodyBottom - bodyTop) throw new Error('This category heading is too long for the poster.');
    if (y + height + Math.min(reserve, bodyBottom - bodyTop - height) > bodyBottom) advance();
    paintRuns(p, runs, x(), y, orange, { sectionId: section.id, role: 'category' });
    y += height;
  }
  newPage();
  for (const section of menu.sections) {
    const blocks = section.items.map(item => dishBlock({ ...item, currency: menu.currency }, colW, 16.5, 10.8, t));
    heading(section, false, blocks[0]?.height || 0);
    for (const block of blocks) {
      if (block.height + 50 < bodyBottom - bodyTop) {
        if (y + block.height > bodyBottom) { advance(); heading(section, true, block.height); }
        y = dish(p, section, block, x(), y, ink, orange) + itemGap;
      } else {
        const tokens = block.runs.filter(run => run.role !== 'price'); let offset = 0;
        while (offset < tokens.length) {
          const fragment = []; let cursor = 0, next = offset;
          while (next < tokens.length) {
            const token = tokens[next], b = inkBounds(token.value, token.size, token.font), baseline = cursor - b.top;
            if (y + baseline + b.bottom > bodyBottom) break;
            fragment.push({ ...token, y: baseline }); cursor = baseline + b.bottom + 4; next++;
          }
          if (!fragment.length) {
            const available = bodyBottom - y;
            advance(); heading(section, true);
            if (bodyBottom - y <= available + .01) throw new Error('This dish cannot fit at a readable size on the Sunroom poster.');
            continue;
          }
          if (!offset) fragment.push({ ...block.runs.find(run => run.role === 'price'), y: fragment[0].y });
          y = dish(p, section, block, x(), y, ink, orange, fragment) + itemGap; offset = next;
          if (offset < tokens.length) { advance(); heading(section, true); }
        }
      }
    }
    y += 12;
  }
  return complete(pages, menu, footerRuns, contentX, footerTop, ink, orange);
}
function folio(menu, settings) {
  const stock = settings.pageSize === 'letter' ? 'letter' : 'a4';
  const [w, h] = stock === 'letter' ? [612, 792] : [595.28, 841.89];
  const paper = '#F2EEDC', ink = '#25463C', rust = '#AA442C', m = 30, full = w - m * 2;
  const title = fitTitle(menu.name, full * .82, 88, 2, 'bebas-neue');
  const titleTop = 43, subtitleTop = titleTop + runBottom(title) + 19;
  const subtitle = runsFor(menu.subtitle, full * .72, 10.8, BODY);
  const mastheadBottom = Math.max(190, subtitleTop + runBottom(subtitle) + 25), bodyTop = mastheadBottom + 27;
  const footerRuns = footers(menu, full - 35), footerTop = h - 46 - runBottom(footerRuns), bodyBottom = footerTop - 22;
  if (bodyBottom - bodyTop < 145) throw new Error('The restaurant identity or footer is too long for this editorial page.');
  const priceWidth = Math.max(54, ...menu.sections.flatMap(section => section.items).map(item => textWidth(formatPrice(item.price, menu.currency), 11.8, PRICE) + 8));
  const nameWidth = full * .31, descriptionX = nameWidth + 17, descriptionWidth = full - descriptionX - priceWidth - 16;
  if (descriptionWidth < 80) throw new Error('The formatted prices leave too little room for readable descriptions.');
  const pages = [], itemGap = settings.density === 'compact' ? 11 : settings.density === 'spacious' ? 20 : 15;
  let p, y;
  function newPage() {
    p = pageRecord(w, h, 'folio', 'Folio', bodyTop, bodyBottom, 'portrait', stock);
    rect(p, 0, 0, w, h, paper);
    rect(p, 0, 0, w, mastheadBottom, ink);
    text(p, 'MENU', m, 26, 9, PRICE, paper, { role: 'edition' });
    line(p, m + 39, 23, w - m, 23, '#839788', .6);
    paintRuns(p, title, m - 1, titleTop, paper, { role: 'masthead' });
    paintRuns(p, subtitle, m, subtitleTop, paper, { role: 'subtitle' });
    text(p, menu.currency, w - m, mastheadBottom - 25, 9, PRICE, paper, { role: 'edition', align: 'right' });
    line(p, m, footerTop - 11, w - m, footerTop - 11, ink, .6);
    pages.push(p); y = bodyTop;
  }
  function blockFor(item) {
    const names = runsFor(item.name, nameWidth, 17, 'cormorant-semibold').map(run => ({ ...run, x: 0, role: 'name' }));
    const descriptions = runsFor(item.description, descriptionWidth, 10.8, BODY).map(run => ({ ...run, x: descriptionX, role: 'description' }));
    const tags = runsFor(item.tags.join(' · '), nameWidth, 8.3, PRICE, runBottom(names) + 5).map(run => ({ ...run, x: 0, role: 'tags' }));
    const price = { value: formatPrice(item.price, menu.currency), size: 11.8, font: PRICE, y: names[0]?.y || 13, x: full, align: 'right', role: 'price' };
    const runs = [...names, ...descriptions, ...tags, price];
    return { item, width: full, runs, height: runBottom(runs), gutter: priceWidth };
  }
  function paintBlock(section, block, top, runs = block.runs) {
    const start = p.elements.length;
    for (const run of runs) text(p, run.value, m + run.x, top + run.y, run.size, run.font, run.role === 'price' ? rust : ink, { role: run.role, align: run.align, itemId: block.item.id, sectionId: section.id });
    const bottom = Math.max(top, ...p.elements.slice(start).map(element => element.inkBounds.bottom));
    p.hits.push({ id: block.item.id, sectionId: section.id, label: block.item.name, x: m - 3, y: top - 3, width: full + 6, height: bottom - top + 6 });
    p.blocks.push({ id: block.item.id, sectionId: section.id, x: m, top, bottom, width: full, priceGutter: priceWidth });
    line(p, m, bottom + itemGap / 2, w - m, bottom + itemGap / 2, '#CFD0BC', .4);
    return bottom;
  }
  function heading(section, continued, reserve = 0) {
    const runs = runsFor(section.name + (continued ? ' (continued)' : ''), full, 23, 'cormorant-medium-italic');
    const height = runBottom(runs) + 19;
    if (height + 35 > bodyBottom - bodyTop) throw new Error('This category heading is too long for the editorial page.');
    if (y + height + Math.min(reserve, bodyBottom - bodyTop - height) > bodyBottom) newPage();
    paintRuns(p, runs, m, y, rust, { role: 'category', sectionId: section.id });
    y += height;
    return height;
  }
  newPage();
  for (const section of menu.sections) {
    const blocks = section.items.map(blockFor);
    heading(section, false, blocks[0]?.height || 0);
    const capacity = bodyBottom - bodyTop - runBottom(runsFor(section.name + ' (continued)', full, 23, 'cormorant-medium-italic')) - 19;
    for (const block of blocks) {
      if (block.height <= capacity) {
        if (y + block.height > bodyBottom) { newPage(); heading(section, true, block.height); }
        y = paintBlock(section, block, y) + itemGap;
      } else {
        let remaining = block.runs.map(run => ({ ...run }));
        while (remaining.length) {
          const available = bodyBottom - y;
          const fitting = remaining.filter(run => run.y + inkBounds(run.value, run.size, run.font).bottom <= available);
          if (!fitting.length) {
            newPage(); heading(section, true);
            if (bodyBottom - y <= available + .01) throw new Error('This dish cannot fit at a readable size on the editorial page.');
            continue;
          }
          y = paintBlock(section, block, y, fitting) + itemGap;
          remaining = remaining.filter(run => !fitting.includes(run));
          if (remaining.length) {
            const offset = Math.min(...remaining.map(run => run.y + inkBounds(run.value, run.size, run.font).top));
            remaining = remaining.map(run => ({ ...run, y: run.y - offset }));
            newPage(); heading(section, true);
          }
        }
      }
    }
    y += 13;
  }
  return complete(pages, menu, footerRuns, m, footerTop, ink, rust);
}
export function layoutStudioB(menu, settings = {}, variant = 'sunroom') {
  return variant === 'folio' ? folio(menu, settings) : sunroom(menu, settings);
}
