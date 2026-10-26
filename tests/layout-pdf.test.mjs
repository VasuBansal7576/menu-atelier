import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { demoMenu, uid, formatPrice } from '../dist/model.js';
import { prepareTypography, layoutMenu, templates, wrapText, textWidth, renderSVG } from '../dist/layout.js';
import { createPDF, unsupportedCharacters } from '../dist/export.js';
import { getFont } from '../dist/document-fonts.js';
import { candidateFromText } from '../dist/import.js';
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
await prepareTypography();
const examples = readonly(JSON.parse(readFileSync(new URL('../dist/examples/index.json', import.meta.url), 'utf8')));
const compact = value => value.replace(/\s/g, '');
function readonly(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(readonly); Object.freeze(value); }
  return value;
}
function assertGeometryError(error) {
  assert.ok(error instanceof Error);
  assert.ok(error.message.length > 15, 'rejection explains why the menu cannot print');
  assert.match(error.message, /room|long|short|fit|paper|sheet|format|readable|identity|footer|heading|label/i);
  return true;
}
function printableOrReject(menu, settings) {
  const before = JSON.stringify(menu);
  try { return layoutMenu(menu, settings); }
  catch (error) { assertGeometryError(error); return null; }
  finally { assert.equal(JSON.stringify(menu), before, 'layout keeps source records unchanged'); }
}
async function pdfText(pages, title) {
  const document = await createPDF(pages, title);
  const task = getDocument({ data: new Uint8Array(document.output('arraybuffer')), useSystemFonts: true });
  const pdf = await task.promise;
  try {
    const result = [];
    for (let index = 1; index <= pdf.numPages; index++) result.push((await (await pdf.getPage(index)).getTextContent()).items.filter(item => item.str).map(item => item.str).join(' '));
    return result;
  } finally { await task.destroy(); }
}
function assertBounds(pages) {
  assert.ok(pages.length, 'a printable menu has a page');
  for (const page of pages) {
    assert.ok(page.bodyTop < page.bodyBottom);
    for (const hit of page.hits) {
      assert.ok(hit.x >= 18 && hit.x + hit.width <= page.width - 18);
      assert.ok(hit.height > 0 && hit.y >= page.bodyTop - .01 && hit.y + hit.height <= page.bodyBottom + .01);
    }
    for (const item of page.elements.filter(e => e.type === 'text')) {
      const bounds = item.inkBounds;
      assert.ok(Object.values(bounds).every(Number.isFinite));
      assert.ok(bounds.left >= 12 && bounds.right <= page.width - 12, `${page.template} ${item.value} crosses horizontal bounds`);
      assert.ok(bounds.top >= 12 && bounds.bottom <= page.height - 10, `${page.template} ${item.value} crosses vertical bounds`);
      if (item.itemId) assert.ok(bounds.top >= page.bodyTop - .01 && bounds.bottom <= page.bodyBottom + .01, `${page.template} ${item.role} crosses the dish area`);
    }
  }
}
function assertCompleteRecords(pages, menu) {
  const elements = pages.flatMap(page => page.elements), hits = pages.flatMap(page => page.hits);
  assert.deepEqual(new Set(hits.map(hit => hit.id)), new Set(menu.sections.flatMap(section => section.items.map(item => item.id))));
  for (const section of menu.sections) for (const item of section.items) {
    const record = elements.filter(element => element.itemId === item.id);
    for (const [role, expected] of [['name', item.name], ['description', item.description], ['tags', item.tags.join(' · ')]]) {
      assert.equal(compact(record.filter(element => element.role === role).map(element => element.value).join('')), compact(expected), `${item.name} retains complete ${role}`);
    }
    assert.deepEqual(record.filter(element => element.role === 'price').map(element => element.value), [formatPrice(item.price, menu.currency)]);
    for (const hit of hits.filter(hit => hit.id === item.id)) { assert.equal(hit.label, item.name); assert.equal(hit.sectionId, section.id); }
  }
}
function assertIdentity(pages, menu) {
  for (const page of pages) for (const [role, expected] of [['masthead', menu.name], ['subtitle', menu.subtitle], ['footer', menu.footer]]) {
    assert.equal(compact(page.elements.filter(element => element.role === role).map(element => element.value).join('')), compact(expected), `${page.template} retains its complete ${role}`);
  }
}
test('three source menus retain complete records through every design, stock and density', async () => {
  assert.equal(examples.length, 3);
  for (const menu of examples) for (const template of Object.keys(templates)) for (const pageSize of ['a4', 'letter']) for (const density of ['compact', 'balanced', 'spacious']) {
    const before = JSON.stringify(menu), pages = layoutMenu(menu, { template, pageSize, density });
    assertBounds(pages); assertCompleteRecords(pages, menu); assertIdentity(pages, menu);
    assert.equal(JSON.stringify(menu), before);
    assert.ok(Object.isFrozen(pages) && pages.every(page => Object.isFrozen(page) && Object.isFrozen(page.elements) && page.elements.every(Object.isFrozen) && page.hits.every(Object.isFrozen)));
    const content = compact((await pdfText(pages, menu.name)).join(' '));
    for (const section of menu.sections) {
      assert.ok(content.includes(compact(section.name)), `${template} PDF lost category ${section.name}`);
      for (const item of section.items) for (const value of [item.name, item.description, ...item.tags, formatPrice(item.price, menu.currency)]) assert.ok(content.includes(compact(value)), `${template} ${pageSize} ${density} PDF lost ${value}`);
    }
  }
});
test('four code-only compositions expose independent silhouettes and normalized paper formats', () => {
  const menu = examples.find(menu => menu.id === 'pizzeria-bianco');
  for (const pageSize of ['a4', 'letter']) {
    const sheets = Object.fromEntries(Object.keys(templates).map(template => [template, layoutMenu(menu, { template, pageSize })]));
    const [short, long] = pageSize === 'letter' ? [612, 792] : [595.28, 841.89];
    for (const [template, pages] of Object.entries(sheets)) for (const page of pages) {
      const landscape = ['botanical', 'midnight'].includes(template);
      assert.deepEqual([page.width, page.height], landscape ? [long, short] : [short, long]);
      assert.deepEqual(page.format, { name: `${pageSize === 'letter' ? 'Letter' : 'A4'}${landscape ? ' landscape' : ''}`, family: pageSize, width: page.width, height: page.height, unit: 'pt' });
      assert.equal(page.template, template); assert.equal(page.compositionName, templates[template].name);
      assert.ok(page.elements.every(element => ['text', 'rect', 'line', 'ellipse'].includes(element.type)));
      assert.ok(page.elements.filter(element => element.role === 'description').every(element => element.size >= 10.5));
      assert.ok(!/<image|data:image/i.test(renderSVG(page)));
    }
    const carta=sheets.trattoria.flatMap(p=>p.blocks),maison=sheets.atelier[0],gazette=sheets.botanical[0],service=sheets.midnight[0];
    assert.equal(new Set(carta.map(block=>block.x)).size,1,'Carta uses full-width rows');
    assert.ok(new Set(maison.blocks.map(block=>block.x)).size>=2,'Maison balances category columns');
    assert.ok(new Set(gazette.blocks.map(block=>block.x)).size>=2,'Gazette distributes categories across landscape columns');
    assert.ok(service.width>service.height,'Service uses landscape paper');

  }
});
test('exported compositions contain vector artwork and selectable text without raster images', async () => {
  for (const template of Object.keys(templates)) {
    const menu = demoMenu(), pages = layoutMenu(menu, { template });
    const document = await createPDF(pages, menu.name), pdf = await PDFDocument.load(document.output('arraybuffer'));
    const images = pdf.context.enumerateIndirectObjects().map(([, object]) => object).filter(object => object instanceof PDFRawStream && object.dict.get(PDFName.of('Subtype'))?.toString() === '/Image');
    assert.equal(images.length, 0, `${template} embeds no raster image`);
    assert.ok((await pdfText(pages, menu.name)).join(' ').includes(menu.name));
  }
});
test('the original twenty-dish PDF remains complete in all four designs', async () => {
  const task = getDocument({ data: new Uint8Array(readFileSync(new URL('./fixtures/pizzeria-bianco-original.pdf', import.meta.url))), useSystemFonts: true });
  let menu;
  try { const pdf = await task.promise, { items } = await (await pdf.getPage(1)).getTextContent(); menu = candidateFromText(items.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('')).menu; }
  finally { await task.destroy(); }
  assert.equal(menu.sections.flatMap(section => section.items).length, 20);
  for (const template of Object.keys(templates)) {
    const pages = layoutMenu(menu, { template }); assertBounds(pages); assertCompleteRecords(pages, menu);
    const content = compact((await pdfText(pages, menu.name)).join(' '));
    for (const item of menu.sections.flatMap(section => section.items)) for (const value of [item.name, item.description, formatPrice(item.price, menu.currency)]) assert.ok(content.includes(compact(value)));
  }
});
test('edited prices and original Unicode survive a selectable PDF without transliteration', async () => {
  const menu = demoMenu();
  menu.currency = 'INR';
  menu.sections[0].name = 'Hors D’œuvres';
  menu.sections[0].items[0].name = 'Duck À L’Orange';
  menu.sections[0].items[0].description = 'Crème fraîche, café, œuf and citrus. ₹' ;
  menu.sections[0].items[0].price = 1875;
  for (const template of Object.keys(templates)) {
    const content = (await pdfText(layoutMenu(menu, { template }), menu.name)).join(' ');
    for (const value of [formatPrice(1875, 'INR'), 'Duck À L’Orange', 'Hors D’œuvres', 'Crème fraîche, café, œuf and citrus. ₹' ]) assert.ok(content.includes(value), `${template} lost ${value}`);
  }
});
test('actual PDF baselines and horizontal advances match all four measured scenes', async () => {
  const menu = examples.find(menu => menu.id === 'balthazar');
  for (const template of Object.keys(templates)) {
    const pages = layoutMenu(menu, { template });
    const document = await createPDF(pages, menu.name);
    const task = getDocument({ data: new Uint8Array(document.output('arraybuffer')), useSystemFonts: true });
    const pdf = await task.promise;
    try {
      for (const [index, page] of pages.entries()) {
        const content = await (await pdf.getPage(index + 1)).getTextContent();
        for (const element of page.elements.filter(element => element.type === 'text')) {
          const item = content.items.find(item => compact(item.str) === compact(element.value) && Math.abs(item.transform[5] - (page.height - element.y)) < .01);
          assert.ok(item, `PDF lost line ${element.value}`);
          const x = element.x - (element.align === 'right' ? element.advance : element.align === 'center' ? element.advance / 2 : 0);
          assert.ok(Math.abs(item.transform[4] - x) < .01);
          assert.ok(Math.abs(item.width - element.advance) < .1, `${element.value} width ${item.width} differs from ${element.advance}`);
        }
      }
    } finally { await task.destroy(); }
  }
});
test('long and dense menus paginate without dropping dishes or crossing paper bounds', () => {
  const menu = demoMenu();
  menu.sections = Array.from({ length: 7 }, (_, sectionIndex) => ({ id: uid(), name: `Category ${sectionIndex + 1}`, items: Array.from({ length: 10 }, (_, index) => ({ id: uid(), name: `Dish ${sectionIndex + 1}.${index + 1} with seasonal ingredients`, description: 'A thoughtfully prepared dish with roasted vegetables, lemon and herbs.', price: 1750 + index, tags: ['vegetarian'] })) }));
  for (const template of Object.keys(templates)) for (const pageSize of ['a4', 'letter']) {
    const pages = layoutMenu(menu, { template, pageSize });
    assert.ok(pages.length > 1);
    assert.equal(new Set(pages.flatMap(page => page.hits.map(hit => hit.id))).size, 70);
    assertBounds(pages);
    assert.ok(pages.every(page => page.hits.length));
    assertCompleteRecords(pages, menu);
  }
});
test('a single long name, description and labels flow without dropped characters', () => {
  const menu = demoMenu(), item = menu.sections[0].items[0];
  item.name = 'W'.repeat(160); item.description = 'W'.repeat(1200); item.tags = Array.from({ length: 10 }, (_, index) => String(index) + 'W'.repeat(39));
  menu.sections = [{ ...menu.sections[0], items: [item] }];
  for (const template of Object.keys(templates)) for (const pageSize of ['a4', 'letter']) {
    const pages = printableOrReject(menu, { template, pageSize, density: 'spacious' });
    if (!pages) continue;
    assertBounds(pages);
    assertCompleteRecords(pages, menu);
  }
});
test('repeated headings and footers fit readably or reject impossible geometry', () => {
  for (const template of Object.keys(templates)) for (const pageSize of ['a4', 'letter']) {
    const menu = demoMenu(); menu.name = 'A table\nfor friends'; menu.subtitle = 'Seasonal cooking\nwith a warm welcome'; menu.footer = Array(25).fill('A').join('\n');
    const pages = printableOrReject(menu, { template, pageSize, density: 'spacious' });
    if (pages) {
      assertBounds(pages);
      assertIdentity(pages, menu);
      for (const page of pages) assert.equal(page.elements.filter(element => element.role === 'footer').length, 25);
    }
    menu.footer = Array(80).fill('A').join('\n'); assert.throws(() => layoutMenu(menu, { template, pageSize }), assertGeometryError);
    menu.footer = ''; menu.name = Array(60).fill('A').join('\n'); assert.throws(() => layoutMenu(menu, { template, pageSize }), assertGeometryError);
    menu.name = 'A table'; menu.subtitle = Array(120).fill('A').join('\n'); assert.throws(() => layoutMenu(menu, { template, pageSize }), assertGeometryError);
    menu.subtitle = ''; menu.sections[0].name = Array(60).fill('A').join('\n'); assert.throws(() => layoutMenu(menu, { template, pageSize }), assertGeometryError);
  }
});
test('maximum-width repeated fields remain within the physical page', () => {
  const menu = demoMenu(); menu.name = 'W'.repeat(120); menu.subtitle = 'W'.repeat(240); menu.footer = 'W'.repeat(500);
  const item = menu.sections[0].items[0]; item.name = 'W'.repeat(160); item.description = 'W'.repeat(1200); item.tags = ['W'.repeat(40)];
  menu.sections = [{ ...menu.sections[0], name: 'A long course', items: [item] }];
  for (const template of Object.keys(templates)) for (const pageSize of ['a4', 'letter']) { const pages = printableOrReject(menu, { template, pageSize }); if (pages) { assertBounds(pages); assertCompleteRecords(pages, menu); assertIdentity(pages, menu); } }
});
test('wrapping measures the actual embedded fonts and retains unbroken words', () => {
  const value = 'WILD WOODLAND MUSHROOMS with a delicious lemon crème fraîche';
  for (const font of ['serif', 'sans', 'fraunces-display', 'archivo-black', 'bebas-neue']) for (const style of ['normal', 'bold', 'italic']) {
    const lines = wrapText(value, 160, 13, font, style);
    assert.equal(lines.join(' '), value);
    assert.ok(lines.every(line => textWidth(line, 13, font, style) <= 160));
  }
});
test('unsupported scripts fail before a printable artifact and supported currency stays original', () => {
  const menu = demoMenu(); assert.deepEqual(unsupportedCharacters(menu), []);
  menu.name = 'Crème fraîche œ à £ € ₹'; assert.deepEqual(unsupportedCharacters(menu), []);
  for (const template of Object.keys(templates)) assertBounds(layoutMenu(menu, { template }));
  menu.name = '食堂 🍃'; assert.deepEqual(unsupportedCharacters(menu), ['食', '堂', '🍃']);
  assert.throws(() => layoutMenu(menu), /outside the current Latin collection/);
});
test('interactive SVG exposes dish buttons and uses the measured font family and advance', () => {
  const page = layoutMenu(demoMenu())[0];
  const svg = renderSVG(page, { interactive: true });
  assert.match(svg, /role="group" aria-label="Designed menu page"/);
  assert.match(svg, /role="button"/);
  assert.match(svg, /textLength="/);
  assert.ok(svg.includes(getFont(page.elements.find(element => element.type === 'text').font).family));
  assert.match(renderSVG(page), /role="img" aria-label="Designed menu page"/);
});

test('long categories reserve their measured headings before drawing dishes', () => {
  for (const pageSize of ['a4', 'letter']) for (const density of ['compact', 'balanced', 'spacious']) {
    const menu = demoMenu(); menu.name = 'Category pagination'; menu.subtitle = ''; menu.footer = '';
    const short = index => ({ id: `short-${index}`, name: `Dish ${index}`, description: '', price: 1200, tags: [] });
    menu.sections = [{ id: 'first', name: 'First', items: Array.from({ length: 9 }, (_, i) => short(i)) }, { id: 'long-category', name: 'W'.repeat(110), items: [short(99)] }];
    for (const template of Object.keys(templates)) {
      const pages = printableOrReject(menu, { template, pageSize, density }); if (!pages) continue; assertBounds(pages);
      const headings = pages.flatMap(page => page.elements.filter(e => e.role === 'category' && e.sectionId === 'long-category').map(e => ({ page, e })));
      assert.ok(headings.length);
      for (const { page, e } of headings) assert.ok(e.inkBounds.bottom < page.bodyBottom);
    }
  }
});

test('printed glyphs, prices, rules and dish targets stay separate', async () => {
  const menu = examples.find(menu => menu.id === 'dishoom');
  const overlaps = (a, b) => Math.min(a.right, b.right) > Math.max(a.left, b.left) + .1 && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + .1;
  for (const template of Object.keys(templates)) for (const density of ['compact', 'balanced', 'spacious']) {
    const pages = layoutMenu(menu, { template, density });
    assertBounds(pages);
    for (const page of pages) {
      const texts = page.elements.filter(e => e.type === 'text');
      for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) assert.ok(!overlaps(texts[i].inkBounds, texts[j].inkBounds), `${template} overlaps ${texts[i].value} and ${texts[j].value}`);
      for (const hit of page.hits) {
        const price = texts.find(e => e.itemId === hit.id && e.role === 'price' && e.y >= hit.y && e.y < hit.y + hit.height);
        const names = texts.filter(e => e.itemId === hit.id && e.role === 'name' && e.y >= hit.y && e.y < hit.y + hit.height);
        assert.equal(price.y, names[0].y);
        assert.ok(price.inkBounds.left - Math.max(...names.map(e => e.inkBounds.right)) >= 10);
      }
      for (const rule of page.elements.filter(e => e.type === 'line' && Math.abs(e.y1 - e.y2) < .01 && e.y1 >= page.bodyTop && e.y1 <= page.bodyBottom)) {
        assert.ok(rule.y1 <= page.bodyBottom);
        assert.ok(texts.filter(e => e.itemId).every(e => !overlaps(e.inkBounds, { left: rule.x1, right: rule.x2, top: rule.y1 - .3, bottom: rule.y1 + .3 })));
      }
    }
  }
});

test('reordered categories, missing categories and an eleventh dish retain complete source records', async () => {
  const original = examples.find(menu => menu.id === 'pizzeria-bianco');
  for (const variant of ['reordered', 'missing', 'added']) {
    const menu = structuredClone(original);
    if (variant === 'reordered') menu.sections.reverse();
    if (variant === 'missing') menu.sections.splice(1, 1);
    if (variant === 'added') menu.sections[0].items.push({ id: 'eleventh-dish', name: 'Seasonal extra dish', description: 'A complete added description with café, crème and herbs.', price: 1875, tags: ['vegetarian'] });
    for (const template of Object.keys(templates)) {
      const pages = layoutMenu(menu, { template }); assertBounds(pages);
      const content = (await pdfText(pages, menu.name)).join(' ').replace(/\s/g, '');
      for (const section of menu.sections) {
        const hits = pages.flatMap(page => page.hits).filter(hit => hit.sectionId === section.id).map(hit => hit.id);
        assert.deepEqual([...new Set(hits)], section.items.map(item => item.id));
        for (const item of section.items) {
          assert.ok(content.includes(item.name.replace(/\s/g, '')));
          assert.ok(content.includes(item.description.replace(/\s/g, '')));
          assert.ok(content.includes(formatPrice(item.price, menu.currency)));
        }
      }
    }
  }
});

test('fragmented long fields remain selectable in actual PDFs and retain their full labels', async () => {
  const menu = demoMenu(), item = menu.sections[0].items[0];
  item.name = 'W'.repeat(160); item.description = 'W'.repeat(1200); item.tags = ['V'.repeat(40), 'Long supplied label'];
  menu.sections = [{ ...menu.sections[0], items: [item] }];
  for (const template of Object.keys(templates)) {
    const pages = printableOrReject(menu, { template });
    if (!pages) continue;
    assertBounds(pages);
    const document = await createPDF(pages, menu.name), task = getDocument({ data: new Uint8Array(document.output('arraybuffer')), useSystemFonts: true }), pdf = await task.promise;
    try {
      for (const [index, page] of pages.entries()) {
        const content = await (await pdf.getPage(index + 1)).getTextContent();
        for (const element of page.elements.filter(e => e.itemId === item.id)) assert.ok(content.items.some(e => e.str.includes(element.value) && Math.abs(e.transform[5] - (page.height - element.y)) < .01), `PDF lost ${element.role} on ${template} page ${index + 1}`);
        for (const hit of page.hits) assert.equal(hit.label, item.name);
        assert.ok(renderSVG(page, { interactive: true }).includes(`aria-label="Edit ${item.name}"`));
      }
      for (const [role, expected] of [['name', item.name], ['description', item.description], ['tags', item.tags.join(' · ')]]) assert.equal(pages.flatMap(p => p.elements).filter(e => e.itemId === item.id && e.role === role).map(e => e.value).join('').replace(/\s/g, ''), expected.replace(/\s/g, ''));
    } finally { await task.destroy(); }
  }
});

test('failed geometry and unsupported glyphs do not mutate menu inputs', () => {
  for (const template of Object.keys(templates)) {
    const menu = demoMenu(); menu.footer = Array(80).fill('A').join('\n'); const before = JSON.stringify(menu);
    assert.throws(() => layoutMenu(menu, { template }), assertGeometryError); assert.equal(JSON.stringify(menu), before);
    menu.footer = ''; menu.sections[0].items[0].name = '食堂'; const unsupported = JSON.stringify(menu);
    assert.throws(() => layoutMenu(menu, { template }), /outside the current Latin collection/); assert.equal(JSON.stringify(menu), unsupported);
  }
});
