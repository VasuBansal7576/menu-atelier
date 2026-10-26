import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { demoMenu } from '../dist/model.js';
import { prepareTypography, layoutMenu } from '../dist/layout.js';
import { pdfBytes } from '../dist/export.js';
import { generateDirections, applyRecipe, validateRecipe, contrast } from '../dist/design-generator.js';

await prepareTypography();
const menu = demoMenu();
const briefs = ['Quiet typographic green on cream. Airy portrait.', 'Dark blue supper club with a moon and compact landscape.', 'Black and white minimal menu without illustration.', 'Pink sunlit produce restaurant on white paper.', 'A contemporary wine bar. Cream paper, burgundy ink, editorial, no illustration.', 'A lively coastal cafe. Blue and cream, sunny, playful, landscape.', 'An after-dark tasting room. Dark black and lime, bold, modern, landscape.'];
const geometry = page => ({ ...page, compositionName: undefined, recipeId: undefined, elements: page.elements.filter(e => e.type === 'text').map(e => ({ ...e, color: undefined })) });

test('brief generation returns distinct measured architectures and honors orientation deterministically', () => {
  for (const brief of briefs) {
    const original = JSON.stringify(menu), directions = generateDirections(menu, brief, { seed: 42 });
    const expected = /portrait|landscape/.test(brief) ? 2 : 3;
    assert.equal(directions.length, expected);
    assert.equal(new Set(directions.map(d => d.template)).size, expected);
    assert.ok(directions.every(d => d.rationale.length <= 3));
    assert.deepEqual(directions, generateDirections(menu, brief, { seed: 42 }));
    assert.equal(JSON.stringify(menu), original);
    for (const recipe of directions) {
      assert.equal(validateRecipe(recipe).template, recipe.template);
      const pages = layoutMenu(menu, { template: recipe.template, density: recipe.density });
      const source = JSON.stringify(pages), transformed = applyRecipe(pages, recipe);
      assert.equal(JSON.stringify(pages), source);
      assert.deepEqual(transformed.map(geometry), pages.map(geometry));
      assert.ok(Object.isFrozen(transformed) && Object.isFrozen(transformed[0].elements));
      for (const page of transformed) {
        for (let index = 0; index < page.elements.length; index++) {
          const e = page.elements[index]; if (e.type !== 'text') continue;
          const b = e.inkBounds, x = (b.left + b.right) / 2, y = (b.top + b.bottom) / 2;
          const bg = page.elements.slice(0, index).filter(shape => shape.type === 'rect' && shape.fill && x >= shape.x && x <= shape.x + shape.width && y >= shape.y && y <= shape.y + shape.height).at(-1)?.fill || recipe.palette.paper;
          assert.ok(contrast(e.color, bg) >= 4.5, `${recipe.template} ${e.role} text has readable contrast`);
        }
        const decorations = page.elements.filter(e => e.recipeDecoration);
        if (/quiet|minimal/i.test(brief)) assert.equal(decorations.length, 0);
      }
    }
  }
});

test('brief color, density, darkness and quiet constraints change actual recipes', () => {
  const quiet = generateDirections(menu, briefs[0]);
  assert.ok(quiet.every(d => d.motif === 'none' && d.density === 'spacious'));
  assert.equal(quiet.filter(d => ['trattoria', 'atelier'].includes(d.template)).length, 2);
  assert.ok(quiet.every(d => d.palette.paper === '#FFF8E8' && d.palette.accent === '#224B36'));
  const dark = generateDirections(menu, briefs[1]);
  assert.ok(dark.every(d => d.motif === 'none' && d.density === 'compact' && d.palette.paper === '#161C22'));
  assert.equal(dark.filter(d => ['botanical', 'midnight'].includes(d.template)).length, 2);
  assert.ok(dark.every(d => ['botanical', 'midnight'].includes(d.template)));
  const wine = generateDirections(menu, briefs[4]);
  assert.ok(wine.every(d => d.palette.ink === '#702438' && d.palette.paper === '#FFF8E8' && d.motif === 'none' && d.name.startsWith('Burgundy')));
  const lime = generateDirections(menu, briefs[6]);
  assert.ok(lime.every(d => d.palette.accent === '#D8F348' && d.palette.paper === '#161C22'));
  for (const color of ['navy', 'terracotta', 'saffron', 'olive']) assert.ok(generateDirections(menu, `${color} on cream`).every(d => d.name.toLowerCase().startsWith(color)));
  assert.notDeepEqual(quiet, generateDirections(menu, briefs[0], { seed: 7 }));
});

test('invalid recipes fail without silently dropping saved design state', () => {
  const recipe = generateDirections(menu, briefs[0])[0];
  for (const invalid of [
    { ...recipe, version: 2 }, { ...recipe, surprise: true }, { ...recipe, template: 'made-up' },
    { ...recipe, brief: 'x'.repeat(4001) }, { ...recipe, seed: -1 }, { ...recipe, motif: 'html' },
    { ...recipe, palette: { ...recipe.palette, paper: 'url(javascript:evil)' } },
    { ...recipe, palette: { ...recipe.palette, ink: recipe.palette.paper } }
  ]) assert.throws(() => validateRecipe(invalid));
  const pages = layoutMenu(menu, { template: recipe.template });
  assert.equal(applyRecipe(pages), pages);
  assert.throws(() => applyRecipe(pages, { ...recipe, template: recipe.template === 'atelier' ? 'trattoria' : 'atelier' }), /does not match/);
  assert.throws(() => validateRecipe(recipe, { template: recipe.template === 'atelier' ? 'trattoria' : 'atelier' }), /does not match/);
  assert.throws(() => generateDirections(menu, 'x'.repeat(4001)), /at most 4000/);
});

test('real menu excerpts retain every scene record and exact native PDF text through recipes', async () => {
  const examples = JSON.parse(readFileSync(new URL('../dist/examples/index.json', import.meta.url), 'utf8'));
  for (const example of examples) for (const brief of briefs) {
    const directions = generateDirections(example, brief, { seed: 8 });
    for (const recipe of directions) {
      const pages = layoutMenu(example, { template: recipe.template, density: recipe.density });
      assert.deepEqual(applyRecipe(pages, recipe).map(geometry), pages.map(geometry));
    }
  }
  const example = examples[0], recipe = generateDirections(example, briefs[1])[0];
  const pages = applyRecipe(layoutMenu(example, { template: recipe.template, density: recipe.density }), recipe);
  const bytes = await pdfBytes(pages, example.name);
  const task = getDocument({ data: bytes, useSystemFonts: true });
  const document = await task.promise, runs = [];
  try {
    for (let index = 1; index <= document.numPages; index++) runs.push(...(await (await document.getPage(index)).getTextContent()).items.filter(item => item.str));
    const normalize = value => value.replace(/\s/g, '');
    assert.equal(normalize(runs.map(run => run.str).join('')), normalize(pages.flatMap(page => page.elements.filter(e => e.type === 'text').map(e => e.value)).join('')));
    assert.equal(document.numPages, pages.length);

  } finally { await task.destroy(); }
});


test('directions are fitted to the selected stock and the latest spacing instruction wins',()=>{
  const menu=demoMenu();menu.footer=Array(40).fill('A').join('\n');
  const settings={template:'trattoria',pageSize:'letter',density:'balanced'};
  assert.ok(layoutMenu(menu,settings).length);
  const directions=generateDirections(menu,'A quiet contemporary cafe',{pageSize:'letter'});
  assert.ok(directions.length);
  for(const recipe of directions){
    assert.ok(layoutMenu(menu,{pageSize:'letter',template:recipe.template,density:recipe.density,recipe}).length);
    assert.match(recipe.rationale[1],/Letter/);
  }
  assert.ok(generateDirections(demoMenu(),'Compact wine bar. Make the spacing airy and spacious.').every(recipe=>recipe.density==='spacious'));
  assert.throws(()=>generateDirections(menu,'quiet',{pageSize:'a5'}),/A4 or Letter/);
});
