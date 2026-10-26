import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { demoMenu, uid, formatPrice } from '../dist/model.js';
import { prepareTypography, layoutMenu, templates, wrapText, textWidth, renderSVG } from '../dist/layout.js';
import { createPDF, unsupportedCharacters } from '../dist/export.js';
import { getFont } from '../dist/document-fonts.js';
await prepareTypography();
const examples = JSON.parse(readFileSync(new URL('../dist/examples/index.json', import.meta.url), 'utf8'));
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
test('all source examples preserve every dish and price through four distinct compositions', async () => {
  for (const menu of examples) for (const template of Object.keys(templates)) {
    const pages = layoutMenu(menu, { template });
    assert.equal(pages.length, 1, `${menu.name} ${template} should fit its ten-dish excerpt on one page`);
    assertBounds(pages);
    const expected = menu.sections.flatMap(section => section.items.map(item => item.id));
    assert.deepEqual(new Set(pages.flatMap(page => page.hits.map(hit => hit.id))), new Set(expected));
    const content = (await pdfText(pages, menu.name)).join(' ');
    for (const section of menu.sections) for (const item of section.items) {
      assert.ok(content.includes(item.name), `${template} lost ${item.name}`);
      assert.ok(content.includes(formatPrice(item.price, menu.currency)), `${template} lost price for ${item.name}`);
    }
    assert.ok(Object.isFrozen(pages) && Object.isFrozen(pages[0]) && Object.isFrozen(pages[0].elements[0]));
  }
});
test('Mercato groups paired rows under full-width categories while Edition uses a rail', () => {
  const menu = examples.find(menu => menu.id === 'pizzeria-bianco');
  const mercato = layoutMenu(menu, { template: 'trattoria' });
  const section = menu.sections[0];
  const hits = section.items.map(item => mercato[0].hits.find(hit => hit.id === item.id));
  assert.equal(hits[0].y, hits[1].y);
  assert.ok(hits[0].x < mercato[0].width / 2 && hits[1].x > mercato[0].width / 2);
  const edition = layoutMenu(menu, { template: 'midnight' });
  assert.ok(edition.every(page => page.hits.every(hit => hit.x > 150)));
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
    const pages = layoutMenu(menu, { template, pageSize, density: 'spacious' });
    assertBounds(pages);
    for (const page of pages) assert.equal(page.elements.filter(element => element.role === 'footer').length, 25);
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

test('Edition reserves the full category rail before drawing near a page boundary',()=>{
  for(const pageSize of ['a4','letter'])for(const density of ['compact','balanced','spacious'])for(const count of [7,8,9,10]){
    const menu=demoMenu();menu.name='Rail pagination';menu.subtitle='';menu.footer='';
    const short=index=>({id:`short-${index}`,name:`Dish ${index}`,description:'',price:1200,tags:[]});
    menu.sections=[{id:'first',name:'First',items:Array.from({length:count},(_,i)=>short(i))},{id:'long-category',name:'W'.repeat(110),items:[short(99)]}];
    const pages=layoutMenu(menu,{template:'midnight',pageSize,density});
    assertBounds(pages);
    const headings=pages.flatMap(page=>page.elements.filter(e=>e.type==='text'&&e.font==='source-sans-semibold'&&e.x===42&&e.value.includes('W')).map(e=>({page,e})));
    assert.ok(headings.length);
    for(const {page,e} of headings)assert.ok(e.y<page.height-70,'category rail clears the footer region');
  }
});

test('Edition separators clear printed glyphs and stay before the next dish', async () => {
  const wrapped = demoMenu();
  wrapped.sections[0].items[0].description = 'Peppery greens, gently grilled yellow peppers and yoghurt. '.repeat(5);
  wrapped.sections[0].items[0].tags = ['vegetarian', 'a verified label long enough to wrap onto another line'];
  wrapped.sections[0].items[1].tags = [];
  for (const menu of [examples.find(menu => menu.id === 'dishoom'), wrapped]) {
    for (const pageSize of ['a4', 'letter']) for (const density of ['compact', 'balanced', 'spacious']) {
      const scale = density === 'compact' ? .88 : density === 'spacious' ? 1.12 : 1;
      const pages = layoutMenu(menu, { template: 'midnight', pageSize, density });
      const document = await createPDF(pages, menu.name);
      const task = getDocument({ data: new Uint8Array(document.output('arraybuffer')), useSystemFonts: true });
      const pdf = await task.promise;
      try {
        for (const [pageIndex, page] of pages.entries()) {
          const content = await (await pdf.getPage(pageIndex + 1)).getTextContent();
          const rules = page.elements.filter(element => element.type === 'line' && element.color === '#d8deee');
          assert.equal(rules.length, page.hits.length);
          for (const [index, hit] of page.hits.entries()) {
            const rule = rules[index];
            const elements = page.elements.filter(element => element.type === 'text' && element.itemId === hit.id && element.y >= hit.y && element.y < hit.y + hit.height + 2);
            for (const element of elements) {
              const printed = content.items.find(item => item.str === element.value && Math.abs(item.transform[5] - (page.height - element.y)) < .01);
              assert.ok(printed, `PDF lost ${element.value}`);
              const { font } = getFont(element.font);
              const lowest = Math.min(0, ...[...element.value].map(character => font.glyphForCodePoint(character.codePointAt(0)).bbox.minY));
              const bottom = page.height - printed.transform[5] - lowest / font.unitsPerEm * element.size;
              assert.ok(rule.y1 - bottom >= 4 * scale - .01, `${density} rule crosses ${element.value}`);
            }
            const next = page.hits[index + 1];
            if (next) assert.ok(rule.y1 + 6 * scale <= next.y + 2.01, 'separator preserves the following dish gap');
            assert.ok(rule.y1 + 6 * scale <= page.bodyBottom + .01, 'separator remains inside its final row');
          }
        }
      } finally { await task.destroy(); }
    }
  }
});
