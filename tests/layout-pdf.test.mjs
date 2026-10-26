import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { demoMenu, uid, formatPrice } from '../dist/model.js';
import { prepareTypography, layoutMenu, templates, wrapText, textWidth, renderSVG } from '../dist/layout.js';
import { createPDF, unsupportedCharacters } from '../dist/export.js';
import { getFont } from '../dist/document-fonts.js';
import { candidateFromText } from '../dist/import.js';
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
await prepareTypography();
const examples = JSON.parse(readFileSync(new URL('../dist/examples/index.json', import.meta.url), 'utf8'));
test('Counter gives compact source categories their own readable indexed columns', () => {
  const menu = examples.find(menu => menu.id === 'pizzeria-bianco');
  const pages = layoutMenu(menu, { template: 'botanical', pageSize: 'a4', density: 'balanced' });
  assert.equal(pages.length, 1);
  const columns = menu.sections.map(section => new Set(pages[0].blocks.filter(block => block.sectionId === section.id).map(block => block.x)));
  assert.ok(columns.every(column => column.size === 1));
  assert.equal(new Set(columns.map(column => [...column][0])).size, menu.sections.length);
  assertBounds(pages);
});
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
  for (const page of pages) {
    for (const hit of page.hits) {
      assert.ok(hit.x >= 20 && hit.x + hit.width <= page.width - 20);
      assert.ok(hit.y >= page.bodyTop - 3 && hit.y + hit.height <= page.bodyBottom + .01);
    }
    for (const item of page.elements.filter(e => e.type === 'text')) {
      const x = item.x - (item.align === 'right' ? item.advance : item.align === 'center' ? item.advance / 2 : 0);
      assert.ok(x >= 18 && x + item.advance <= page.width - 18, `${page.template} ${item.value} crosses horizontal bounds`);
      assert.ok(item.y > 20 && item.y < page.height - 25);
    }
  }
}
test('Herbarium fills the available columns before adding a sheet', async () => {
  const menu = examples.find(menu => menu.id === 'pizzeria-bianco');
  const pages = layoutMenu(menu, { template: 'atelier' });
  assert.equal(pages.length, 1, 'the ten complete Bianco dishes fit on one Herbarium sheet');
  assertBounds(pages);
  assert.equal(pages[0].hits.length, 10);
  const columns = [...new Set(pages[0].blocks.map(block => block.x))];
  assert.equal(columns.length, 2);
  for (const x of columns) assert.ok(pages[0].blocks.filter(block => block.x === x).length >= 4, 'the final sheet shares measured content across both columns');
  const pizza = menu.sections.find(section => section.items.length === 6);
  assert.ok(pages[0].elements.some(element => element.sectionId === pizza.id && element.role === 'category' && element.value.includes('(continued)')));
  const content = (await pdfText(pages, menu.name)).join(' ').replace(/\s/g, '');
  for (const item of menu.sections.flatMap(section => section.items)) {
    assert.ok(content.includes(item.name.replace(/\s/g, '')));
    assert.ok(content.includes(item.description.replace(/\s/g, '')));
    assert.ok(content.includes(formatPrice(item.price, menu.currency)));
  }
});
test('Osteria shares remaining space and gives the original twenty-dish PDF readable continuation columns', async () => {
  const task = getDocument({ data: new Uint8Array(readFileSync(new URL('./fixtures/pizzeria-bianco-original.pdf', import.meta.url))), useSystemFonts: true });
  let menu;
  try {
    const pdf = await task.promise, { items } = await (await pdf.getPage(1)).getTextContent();
    menu = candidateFromText(items.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('')).menu;
  } finally { await task.destroy(); }
  assert.equal(menu.sections.flatMap(section => section.items).length, 20);
  const pages = layoutMenu(menu, { template: 'trattoria' });
  assert.equal(pages.length, 2, 'support dishes use the space below the first-page feature and wider continuation columns');
  assertBounds(pages);
  const feature = menu.sections.find(section => section.items.length === 6);
  const featureBlocks = pages[0].blocks.filter(block => block.sectionId === feature.id);
  assert.equal(featureBlocks.length, 6);
  assert.ok(featureBlocks.every(block => block.x > pages[0].width / 3));
  const featureBottom = Math.max(...featureBlocks.map(block => block.bottom));
  assert.ok(pages[0].blocks.some(block => block.sectionId !== feature.id && block.x > pages[0].width / 3 && block.top > featureBottom));
  assert.ok(pages.slice(1).flatMap(page => page.blocks).every(block => block.width > 240));
  assert.deepEqual(new Set(pages.flatMap(page => page.hits.map(hit => hit.id))), new Set(menu.sections.flatMap(section => section.items.map(item => item.id))));
  const content = (await pdfText(pages, menu.name)).join(' ').replace(/\s/g, '');
  for (const item of menu.sections.flatMap(section => section.items)) {
    assert.ok(content.includes(item.name.replace(/\s/g, '')));
    assert.ok(content.includes(item.description.replace(/\s/g, '')));
    assert.ok(content.includes(formatPrice(item.price, menu.currency)));
  }
});
test('header text reserves the artwork area on both paper families', () => {
  for (const template of ['atelier', 'trattoria']) for (const pageSize of ['a4', 'letter']) for (const name of ['Bistro', 'Balthazar']) {
    const menu = demoMenu(); menu.name = name;
    menu.subtitle = 'A seasonal restaurant serving thoughtfully prepared food with wine, cocktails and warm hospitality every day.';
    const pages = layoutMenu(menu, { template, pageSize });
    assertBounds(pages);
    for (const page of pages) {
      const image = page.elements.find(element => element.type === 'image');
      const artwork = image ? { left: image.x, right: image.x + image.width, top: image.y, bottom: image.y + image.height }
        : { left: Math.min(...page.elements.filter(element => element.type === 'line' && element.y1 < page.bodyTop).map(element => Math.min(element.x1, element.x2))), right: page.width - 25, top: 20, bottom: 140 };
      for (const element of page.elements.filter(element => ['masthead', 'subtitle'].includes(element.role))) {
        const bounds = element.inkBounds;
        assert.ok(bounds.right <= artwork.left || bounds.left >= artwork.right || bounds.bottom <= artwork.top || bounds.top >= artwork.bottom, `${template} ${pageSize} header overlaps the artwork`);
      }
    }
  }
});
test('a featured dish can continue into narrower shared regions without losing fields', async () => {
  const menu = demoMenu(), item = menu.sections[0].items[0];
  item.name = 'W'.repeat(160); item.description = 'W'.repeat(1200); item.tags = Array.from({ length: 10 }, (_, index) => `${index}${'V'.repeat(39)}`);
  menu.sections[0].items = [item];
  for (const pageSize of ['a4', 'letter']) {
    const pages = layoutMenu(menu, { template: 'trattoria', pageSize });
    assertBounds(pages);
    assert.ok(pages.length > 1);
    const fragments = pages.flatMap(page => page.blocks.filter(block => block.id === item.id));
    assert.ok(fragments.some(block => block.x < pages[0].width / 3));
    assert.ok(fragments.some(block => block.x > pages[0].width / 3));
    assert.ok(fragments.every(block => block.width > 240));
    for (const page of pages) for (const hit of page.hits.filter(hit => hit.id === item.id)) assert.equal(hit.label, item.name);
    const content = await pdfText(pages, menu.name);
    for (const [index, page] of pages.entries()) for (const element of page.elements.filter(element => element.itemId === item.id)) assert.ok(content[index].includes(element.value), `PDF lost ${element.role} on page ${index + 1}`);
    for (const [role, value] of [['name', item.name], ['description', item.description], ['tags', item.tags.join(' · ')]]) assert.equal(pages.flatMap(page => page.elements).filter(element => element.itemId === item.id && element.role === role).map(element => element.value).join('').replace(/\s/g, ''), value.replace(/\s/g, ''));
    assert.equal(pages.flatMap(page => page.elements).filter(element => element.itemId === item.id && element.role === 'price').length, 1);
  }
});
test('all source examples preserve every dish and price through four distinct compositions', async () => {
  for (const menu of examples) for (const template of Object.keys(templates)) {
    const pages = layoutMenu(menu, { template });
    assert.ok(pages.length >= 1 && pages.length <= 3, `${menu.name} ${template} uses readable measured pages`);
    assertBounds(pages);
    const expected = menu.sections.flatMap(section => section.items.map(item => item.id));
    assert.deepEqual(new Set(pages.flatMap(page => page.hits.map(hit => hit.id))), new Set(expected));
    const content = (await pdfText(pages, menu.name)).join(' ');
    for (const section of menu.sections) for (const item of section.items) {
      assert.ok(content.includes(item.name), `${template} lost ${item.name}`);
      assert.ok(content.includes(formatPrice(item.price, menu.currency)), `${template} lost price for ${item.name}`);
      assert.ok(content.replace(/\s/g, '').includes(item.description.replace(/\s/g, '')), `${template} lost the complete description for ${item.name}`);
      for (const tag of item.tags) assert.ok(content.includes(tag), `${template} lost ${tag}`);
    }
    assert.ok(Object.isFrozen(pages) && Object.isFrozen(pages[0]) && Object.isFrozen(pages[0].elements[0]));
  }
});
test('the collection has distinct compositions and explicit physical dimensions', () => {
  const menu = examples.find(menu => menu.id === 'pizzeria-bianco');
  const sheets = Object.fromEntries(Object.keys(templates).map(template => [template, layoutMenu(menu, { template })]));
  const osteria = sheets.trattoria[0];
  const feature = menu.sections.find(section => section.items.length === 6);
  assert.ok(osteria.hits.filter(hit => hit.sectionId === feature.id).every(hit => hit.x > osteria.width / 3));
  assert.ok(osteria.elements.some(element => element.type === 'rect' && element.fill === templates.trattoria.tint));
  assert.ok(sheets.atelier[0].elements.some(element => element.type === 'image' && element.asset === 'tomato-vine-fork'));
  assert.ok(sheets.botanical[0].width > sheets.botanical[0].height);
  for (const page of sheets.midnight) assert.deepEqual([page.width, page.height, page.format.name], [419.53, 595.28, 'A5']);
  const halfLetter = layoutMenu(menu, { template: 'midnight', pageSize: 'letter' });
  for (const page of halfLetter) assert.deepEqual([page.width, page.height, page.format.name], [396, 612, 'Half Letter']);
  for (const pages of Object.values(sheets)) for (const page of pages) {
    assert.equal(page.compositionName, templates[page.template].name);
    assert.equal(page.format.width, page.width); assert.equal(page.format.height, page.height);
    for (const element of page.elements.filter(element => element.role === 'description')) assert.ok(element.size >= 10.5);
    for (const hit of page.hits) assert.equal(hit.label, menu.sections.flatMap(section => section.items).find(item => item.id === hit.id).name);
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
      const content = await (await pdf.getPage(1)).getTextContent();
      for (const element of pages[0].elements.filter(element => element.type === 'text')) {
        const item = content.items.find(item => item.str === element.value && Math.abs(item.transform[5] - (pages[0].height - element.y)) < .01);
        assert.ok(item, `PDF lost line ${element.value}`);
        const x = element.x - (element.align === 'right' ? element.advance : element.align === 'center' ? element.advance / 2 : 0);
        assert.ok(Math.abs(item.transform[4] - x) < .01);
        assert.ok(Math.abs(item.width - element.advance) < .1, `${element.value} width ${item.width} differs from ${element.advance}`);
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
    for (const page of pages.slice(0, -1)) assert.equal(new Set(page.blocks.map(block => block.x)).size, page.columns.length, `${template} fills each available region before another sheet`);
  }
});
test('a single long name, description and labels flow without dropped characters', () => {
  const menu = demoMenu(), item = menu.sections[0].items[0];
  item.name = 'W'.repeat(160); item.description = 'W'.repeat(1200); item.tags = Array.from({ length: 10 }, (_, index) => String(index) + 'W'.repeat(39));
  menu.sections = [{ ...menu.sections[0], items: [item] }];
  for (const template of Object.keys(templates)) for (const pageSize of ['a4', 'letter']) {
    const pages = layoutMenu(menu, { template, pageSize, density: 'spacious' });
    assertBounds(pages);
    const content = pages.flatMap(page => page.elements.filter(element => element.itemId === item.id && element.type === 'text' && element.value !== '(continued)' && !element.value.startsWith('$')).map(element => element.value)).join('').replace(/\s/g, '');
    assert.ok(content.includes(item.name + item.description + item.tags.join('·')));
  }
});
test('repeated headings and footers fit readably or reject impossible geometry', () => {
  for (const template of Object.keys(templates)) for (const pageSize of ['a4', 'letter']) {
    const menu = demoMenu(); menu.name = 'A table\nfor friends'; menu.subtitle = 'Seasonal cooking\nwith a warm welcome'; menu.footer = Array(25).fill('A').join('\n');
    try {
      const pages = layoutMenu(menu, { template, pageSize, density: 'spacious' });
      assertBounds(pages);
      for (const page of pages) assert.equal(page.elements.filter(element => element.role === 'footer').length, 25);
    } catch (error) {
      assert.equal(template, 'botanical', 'portrait formats retain the readable 25-line footer');
      assert.match(error.message, /Shorten (those fields|its name)/);
    }
    menu.footer = Array(80).fill('A').join('\n'); assert.throws(() => layoutMenu(menu, { template, pageSize }), /Shorten those fields/);
    menu.footer = ''; menu.name = Array(60).fill('A').join('\n'); assert.throws(() => layoutMenu(menu, { template, pageSize }), /Shorten those fields/);
    menu.name = 'A table'; menu.subtitle = Array(120).fill('A').join('\n'); assert.throws(() => layoutMenu(menu, { template, pageSize }), /Shorten those fields/);
    menu.subtitle = ''; menu.sections[0].name = Array(60).fill('A').join('\n'); assert.throws(() => layoutMenu(menu, { template, pageSize }), /Shorten its name/);
  }
});
test('maximum-width repeated fields remain within the physical page', () => {
  const menu = demoMenu(); menu.name = 'W'.repeat(120); menu.subtitle = 'W'.repeat(240); menu.footer = 'W'.repeat(500);
  const item = menu.sections[0].items[0]; item.name = 'W'.repeat(160); item.description = 'W'.repeat(1200); item.tags = ['W'.repeat(40)];
  menu.sections = [{ ...menu.sections[0], name: 'A long course', items: [item] }];
  for (const template of Object.keys(templates)) for (const pageSize of ['a4', 'letter']) assertBounds(layoutMenu(menu, { template, pageSize }));
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
      const pages = layoutMenu(menu, { template, pageSize, density }); assertBounds(pages);
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
      for (const rule of page.elements.filter(e => e.type === 'line' && e.color === templates[template].rule)) {
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

test('the feature category comes from measured content rather than array position or semantic names', () => {
  const menu = structuredClone(examples.find(menu => menu.id === 'pizzeria-bianco'));
  const large = menu.sections.find(section => section.items.length === 6);
  const single = menu.sections[0]; single.items = [{ ...single.items[0], description: 'W'.repeat(1200) }];
  for (const section of menu.sections) { section.id = uid(); section.name = `Arbitrary category ${section.items.length}`; }
  assert.notEqual(single.id, large.id);
  for (const sections of [menu.sections, [...menu.sections].reverse()]) {
    const pages = layoutMenu({ ...menu, sections }, { template: 'trattoria' });
    assert.ok(pages.flatMap(page => page.hits).filter(hit => hit.sectionId === single.id).every(hit => hit.x > pages[0].width / 3));
  }
});

test('the original illustration embeds once with its alpha mask and shares SVG placement', async () => {
  const menu = demoMenu(); menu.sections[0].items = Array.from({ length: 20 }, (_, index) => ({ ...menu.sections[0].items[0], id: `image-page-${index}` }));
  const pages = layoutMenu(menu, { template: 'atelier' }); assert.ok(pages.length > 1);
  assert.ok(JSON.stringify(pages).length < 150000, 'scene records do not carry repeated image bytes');
  const document = await createPDF(pages, menu.name), pdf = await PDFDocument.load(document.output('arraybuffer'));
  const images = pdf.context.enumerateIndirectObjects().map(([, object]) => object).filter(object => object instanceof PDFRawStream && object.dict.get(PDFName.of('Subtype'))?.toString() === '/Image');
  const source = images.filter(image => image.dict.get(PDFName.of('Width'))?.asNumber() === 1774 && image.dict.has(PDFName.of('SMask')));
  assert.equal(source.length, 1); assert.equal(images.length, 2);
  for (const page of pages) {
    const image = page.elements.find(e => e.type === 'image');
    assert.deepEqual([image.x, image.y, image.width, image.height, image.opacity], [page.width - 38 - 196, 24, 196, 98, 1]);
    assert.ok(renderSVG(page).includes(`x="${image.x}" y="${image.y}" width="196" height="98" opacity="1"`));
  }
  const task = getDocument({ data: new Uint8Array(document.output('arraybuffer')), useSystemFonts: true }), rendered = await task.promise;
  const multiply = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  try {
    for (const [index, page] of pages.entries()) {
      const operations = await (await rendered.getPage(index + 1)).getOperatorList(), stack = [], placements = [];
      let matrix = [1, 0, 0, 1, 0, 0];
      operations.fnArray.forEach((operation, offset) => {
        if (operation === OPS.save) stack.push([...matrix]);
        if (operation === OPS.restore) matrix = stack.pop();
        if (operation === OPS.transform) matrix = multiply(matrix, operations.argsArray[offset]);
        if (operation === OPS.paintImageXObject) placements.push([...matrix]);
      });
      const image = page.elements.find(e => e.type === 'image');
      assert.equal(placements.length, 1);
      const expected = [image.width, 0, 0, image.height, image.x, page.height - image.y - image.height];
      placements[0].forEach((value, component) => assert.ok(Math.abs(value - expected[component]) < .01));
    }
  } finally { await task.destroy(); }
});

test('fragmented long fields remain selectable in actual PDFs and retain their full labels', async () => {
  const menu = demoMenu(), item = menu.sections[0].items[0];
  item.name = 'W'.repeat(160); item.description = 'W'.repeat(1200); item.tags = ['V'.repeat(40), 'Long supplied label'];
  menu.sections = [{ ...menu.sections[0], items: [item] }];
  for (const template of Object.keys(templates)) {
    const pages = layoutMenu(menu, { template });
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
    assert.throws(() => layoutMenu(menu, { template }), /Shorten those fields/); assert.equal(JSON.stringify(menu), before);
    menu.footer = ''; menu.sections[0].items[0].name = '食堂'; const unsupported = JSON.stringify(menu);
    assert.throws(() => layoutMenu(menu, { template }), /outside the current Latin collection/); assert.equal(JSON.stringify(menu), unsupported);
  }
});
