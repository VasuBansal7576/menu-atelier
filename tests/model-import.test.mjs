import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { demoMenu, clone, validateMenu, parsePrice, formatPrice, createHistory } from '../dist/model.js';
import { candidateFromCSV, candidateFromJSON, candidateFromText, parseCSV } from '../dist/import.js';

test('decimal prices become exact integer minor units and reject ambiguous values',()=>{
  assert.equal(parsePrice('£7.90','GBP'),790);
  assert.equal(parsePrice('1,234.56'),123456);
  assert.equal(parsePrice('0'),0);
  assert.equal(parsePrice('1800','JPY'),1800);
  assert.equal(formatPrice(790,'GBP'),'£7.90');
  for(const invalid of ['-1','12abc','12.345','1,23','NaN','Infinity',''])assert.throws(()=>parsePrice(invalid));
  assert.throws(()=>parsePrice('18.00','JPY'));
});
test('menu boundary rejects missing names, duplicate ids, and invalid amounts',()=>{
  const menu=demoMenu();const validated=validateMenu(menu);assert.deepEqual(validated,menu);validated.sections[0].items[0].price=0;assert.equal(menu.sections[0].items[0].price,1200);
  for(const mutate of [m=>m.name='',m=>m.sections[0].name=' ',m=>m.sections[0].items[0].name='',m=>m.sections[0].items[0].price=null,m=>m.sections[0].items[0].price=1.3,m=>m.sections[0].items[0].price=-1,m=>m.sections[0].items[0].id=m.sections[0].id,m=>m.schemaVersion=2]){
    const changed=clone(menu);mutate(changed);assert.throws(()=>validateMenu(changed));
  }
});
test('history restores both menu prices and selected presentation and drops stale redo',()=>{
  const initial={menu:demoMenu(),settings:{template:'atelier'}};const h=createHistory(initial);const changed=clone(initial);changed.menu.sections[0].items[0].price=1999;changed.settings.template='midnight';h.commit(changed);
  assert.equal(h.value.menu.sections[0].items[0].price,1999);h.undo();assert.equal(h.value.menu.sections[0].items[0].price,1200);assert.equal(h.value.settings.template,'atelier');h.redo();assert.equal(h.value.settings.template,'midnight');h.undo();const branch=clone(initial);branch.menu.name='New';h.commit(branch);assert.equal(h.canRedo,false);
});
test('CSV preserves quoted commas, multiline descriptions and explicit labels',()=>{
  const result=candidateFromCSV('category,name,description,price,tags\r\nStarters,"Burrata, basil","Tomatoes, olive oil\nand herbs",14.50,vegetarian|seasonal');
  const dish=result.menu.sections[0].items[0];assert.equal(dish.name,'Burrata, basil');assert.equal(dish.description,'Tomatoes, olive oil\nand herbs');assert.equal(dish.price,1450);assert.deepEqual(dish.tags,['vegetarian','seasonal']);
  assert.deepEqual(parseCSV('name,price\n"A ""good"" dish",10'),[['name','price'],['A "good" dish','10']]);
  assert.throws(()=>parseCSV('name,price\n"unclosed,10'));
});
test('missing CSV prices remain reviewable and cannot enter the valid model',()=>{
  const result=candidateFromCSV('name,price\nAubergine,\nPasta,-12');assert.equal(result.menu.sections[0].items[0].price,null);assert.equal(result.warnings.length,2);assert.throws(()=>validateMenu(result.menu));
});
test('JSON roundtrip restores current prices and malformed input cannot mutate a draft',()=>{
  const menu=demoMenu();menu.sections[0].items[0].price=1688;const original=clone(menu);assert.deepEqual(candidateFromJSON(JSON.stringify({menu})).menu,menu);for(const input of ['{broken','{"schemaVersion":1}','null','[]'])assert.throws(()=>candidateFromJSON(input));assert.deepEqual(menu,original);
  const settings={template:'midnight',pageSize:'letter',density:'compact'};assert.deepEqual(candidateFromJSON(JSON.stringify({menu,settings})).settings,settings);assert.throws(()=>candidateFromJSON(JSON.stringify({menu,settings:{...settings,template:'unknown'}})));
});
test('text parser preserves decimal prices and avoids inferring dietary labels',()=>{
  const result=candidateFromText('The Table\n## Small plates\nRicotta — Honey, sourdough 12.50\n## Mains\nRoast chicken 24.00','GBP');assert.equal(result.menu.name,'The Table');assert.equal(result.menu.currency,'GBP');assert.equal(result.menu.sections[0].items[0].name,'Ricotta');assert.equal(result.menu.sections[0].items[0].price,1250);assert.deepEqual(result.menu.sections[0].items[0].tags,[]);
});
test('real official Bianco PDF text retains all20 dishes, wrapped text and split extras',async()=>{
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const file=await readFile('tests/fixtures/pizzeria-bianco-original.pdf');const task=getDocument({data:new Uint8Array(file),useSystemFonts:true});const pdf=await task.promise;
  try{const {items}=await(await pdf.getPage(1)).getTextContent();const text=items.map(i=>i.str+(i.hasEOL?'\n':' ')).join('');const result=candidateFromText(text);const dishes=result.menu.sections.flatMap(s=>s.items);assert.equal(dishes.length,20);assert.equal(dishes.find(i=>i.name==='MARINARA').price,1800);assert.equal(dishes.find(i=>i.name==='WISEGUY').price,2600);assert.equal(dishes.find(i=>i.name==='Sopressata Salami').price,600);assert.equal(dishes.find(i=>i.name.startsWith('HANDMADE MOZZARELLA')).price,1300);assert.match(dishes.find(i=>i.name.startsWith('HANDMADE MOZZARELLA')).name,/OLIVE OIL/);assert.ok(result.warnings.some(w=>w.includes('multiple prices')));assert.ok(result.warnings.some(w=>w.includes('wrapped line')));validateMenu(result.menu);}finally{await task.destroy();}
});
test('all sourced example JSON files are valid and TXT prices match each source',async()=>{
  const menus=JSON.parse(await readFile('dist/examples/index.json','utf8'));
  for(const menu of menus){validateMenu(menu);const parsed=candidateFromText(await readFile(`dist/examples/${menu.id}.txt`,'utf8'),menu.currency).menu;assert.deepEqual(parsed.sections.flatMap(s=>s.items.map(i=>i.price)),menu.sections.flatMap(s=>s.items.map(i=>i.price)));assert.equal(menu.sections.flatMap(s=>s.items).length,10);}
});
