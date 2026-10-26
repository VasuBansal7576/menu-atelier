import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jsPDF } from 'jspdf';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { demoMenu, uid, formatPrice, validateMenu } from '../dist/model.js';
import { layoutMenu, templates, wrapText, textWidth } from '../dist/layout.js';
import { renderPDF, unsupportedCharacters } from '../dist/export.js';

test('one-page two-column examples keep ordered sections balanced and every dish present',()=>{
  for(const [id,leftCount] of [['pizzeria-bianco',4],['dishoom',4],['balthazar',5]]) {
    const menu=JSON.parse(readFileSync(new URL(`../dist/examples/${id}.json`,import.meta.url),'utf8'));
    const expected=menu.sections.flatMap(section=>section.items.map(item=>item.id));
    for(const template of Object.keys(templates).filter(key=>templates[key].columns===2)) {
      const pages=layoutMenu(menu,{template});assert.equal(pages.length,1);
      const page=pages[0],left=page.hits.filter(hit=>hit.x<page.width/2),right=page.hits.filter(hit=>hit.x>page.width/2);
      assert.equal(left.length,leftCount,`${id} ${template} left column`);assert.equal(right.length,10-leftCount,`${id} ${template} right column`);
      assert.deepEqual([...left,...right].map(hit=>hit.id),expected);
      assert.equal(new Set(page.hits.map(hit=>hit.id)).size,10);
    }
  }
});
test('Casa Rosso checkerboard clears complete footer text, page counter and border',()=>{
  const menu=JSON.parse(readFileSync(new URL('../dist/examples/pizzeria-bianco.json',import.meta.url),'utf8'));
  for(const pageSize of ['a4','letter'])for(const footer of [menu.footer,Array(25).fill('A footer line').join('\n')]) {
    const pages=layoutMenu({...menu,footer},{template:'trattoria',pageSize});
    for(const page of pages) {
      const checks=page.elements.filter(e=>e.type==='rect'&&e.fill===templates.trattoria.color);
      const footerText=page.elements.filter(e=>e.type==='text'&&e.y>page.height-350&&e.style==='italic'&&e.color===templates.trattoria.muted);
      const counter=page.elements.find(e=>e.type==='text'&&/^[0-9]+ \/ [0-9]+$/.test(e.value));
      assert.ok(checks.length);assert.equal(footerText.map(e=>e.value).join('\n'),footer);
      const textBounds=e=>{const width=textWidth(e.value,e.size,e.font,e.style);return {x:e.align==='center'?e.x-width/2:e.align==='right'?e.x-width:e.x,y:e.y-e.size,width,height:e.size*1.25};};
      for(const check of checks) {
        assert.ok(check.y>=page.height-38&&check.y+check.height<=page.height-29);
        assert.ok(check.y+check.height<page.height-25);
        for(const e of [...footerText,counter]) {
          const bounds=textBounds(e);
          assert.ok(check.x+check.width<=bounds.x||check.x>=bounds.x+bounds.width||check.y+check.height<=bounds.y||check.y>=bounds.y+bounds.height,`checkerboard overlaps ${e.value}`);
        }
      }
    }
  }
});
test('all four compositions retain every dish and latest numeric price',()=>{
  const menu=demoMenu();menu.sections[0].items[0].price=1875;
  for(const template of Object.keys(templates)){
    const pages=layoutMenu(menu,{template});const ids=new Set(pages.flatMap(p=>p.hits.map(h=>h.id)));
    assert.equal(ids.size,9);assert.ok(pages.flatMap(p=>p.elements).some(e=>e.value==='$18.75'));assert.ok(pages.every(p=>p.elements.some(e=>e.type==='rect')));
  }
});
test('long menus paginate all dishes rather than clipping or dropping rows',()=>{
  const menu=demoMenu();menu.sections=[{id:uid(),name:'The complete collection',items:Array.from({length:84},(_,i)=>({id:uid(),name:`Seasonal plate ${i+1}`,description:'Fresh herbs, garden vegetables, a generous spoonful of slow-cooked beans.',price:1500+i,tags:[]}))}];
  for(const template of Object.keys(templates))for(const pageSize of ['a4','letter']){
    const pages=layoutMenu(menu,{template,pageSize});assert.ok(pages.length>1);const ids=new Set(pages.flatMap(p=>p.hits.map(h=>h.id)));assert.equal(ids.size,84);
    for(const page of pages)for(const hit of page.hits)assert.ok(hit.y+hit.height<page.height-70,`${template} clipped a dish at ${hit.y+hit.height}`);
  }
});
test('long titles, subtitles and footers retain their full words',()=>{
  const menu=demoMenu();menu.name='The extraordinary neighbourhood gathering place for all our friends and the people we have yet to meet';menu.subtitle='A seasonal table and a beautiful meeting place with a warm welcome for everyone. '.repeat(3).slice(0,240);menu.footer='A carefully considered note from our kitchen, with opening hours and a friendly invitation to tell us about your allergies. '.repeat(4).slice(0,500);
  for(const template of Object.keys(templates)){
    const elements=layoutMenu(menu,{template})[0].elements.filter(e=>e.type==='text');const combined=elements.map(e=>e.value).join(' ').replace(/\s+/g,' ');
    assert.ok(combined.toLowerCase().includes(menu.name.toLowerCase()));assert.ok(combined.includes(menu.subtitle.trim()));assert.ok(combined.includes(menu.footer.trim()));assert.ok(elements.every(e=>e.y<842));
  }
});
test('a very long dish description flows across pages without dropping words',()=>{
  const menu=demoMenu();const item=menu.sections[0].items[0];item.tags=[];item.description=('garden vegetables woodland mushrooms fresh herbs and lemon zest ').repeat(19).slice(0,1200);menu.sections=[{...menu.sections[0],items:[item]}];
  for(const template of Object.keys(templates)){
    const pages=layoutMenu(menu,{template,density:'spacious',pageSize:'letter'});const descriptions=pages.flatMap(p=>p.elements.filter(e=>e.itemId===item.id&&e.color===templates[template].muted&&e.size>8).map(e=>e.value)).join(' ');assert.equal(descriptions,item.description.trim());
  }
});
test('PDF font metrics keep wrapped text within the allocated width',()=>{
  const value='WILD WOODLAND MUSHROOMS with a delicious lemon crème fraîche';
  for(const font of ['serif','sans'])for(const style of ['normal','bold','italic'])for(const line of wrapText(value,160,13,font,style))assert.ok(textWidth(line,13,font,style)<=160);
});
test('multiline repeated text fits readably or rejects impossible body geometry',()=>{
  for(const template of Object.keys(templates))for(const pageSize of ['a4','letter']) {
    const menu=demoMenu();menu.name='A table\nfor friends';menu.subtitle='Seasonal cooking\nwith a warm welcome';menu.footer=Array(25).fill('A').join('\n');
    const pages=layoutMenu(validateMenu(menu),{template,pageSize,density:'spacious'});
    for(const page of pages) {
      const footer=page.elements.filter(e=>e.type==='text'&&e.value==='A');assert.equal(footer.length,25);assert.ok(footer.every(e=>e.size>=7&&e.y<page.height-29));
      for(const hit of page.hits)assert.ok(hit.y+hit.height<footer[0].y-19);
    }
    menu.footer=Array(80).fill('A').join('\n');assert.throws(()=>layoutMenu(validateMenu(menu),{template,pageSize}),/Shorten those fields/);
    menu.footer='';menu.name=Array(60).fill('A').join('\n');assert.throws(()=>layoutMenu(validateMenu(menu),{template,pageSize}),/Shorten those fields/);
    menu.name='A table';menu.subtitle=Array(120).fill('A').join('\n');assert.throws(()=>layoutMenu(validateMenu(menu),{template,pageSize}),/Shorten those fields/);
    menu.subtitle='';menu.sections[0].name=Array(60).fill('A').join('\n');assert.throws(()=>layoutMenu(validateMenu(menu),{template,pageSize}),/Shorten its name/);
  }
});
test('dietary label bounds use the actual uppercase text emitted on every template',()=>{
  const menu=demoMenu(),item=menu.sections[0].items[0];item.tags=['w'.repeat(40)];menu.sections=[{...menu.sections[0],items:[item]}];
  for(const template of Object.keys(templates))for(const pageSize of ['a4','letter'])for(const density of ['compact','balanced','spacious']) {
    const pages=layoutMenu(menu,{template,pageSize,density}),t=templates[template];
    const width=(pages[0].width-t.margin-(template==='botanical'?52:t.margin)-t.gap*(t.columns-1))/t.columns-4;
    const labels=pages.flatMap(p=>p.elements.filter(e=>e.itemId===item.id&&/^W+$/.test(e.value)));
    assert.equal(labels.map(e=>e.value).join(''),'W'.repeat(40));assert.ok(labels.every(e=>textWidth(e.value,e.size,e.font,e.style)<=width),`${template} ${pageSize} ${density} overflows its label column`);
  }
});
test('maximum-width names and labels stay on paper when a dish spans pages',()=>{
  const menu=demoMenu();menu.name='W'.repeat(120);menu.subtitle='W'.repeat(240);menu.footer='W'.repeat(500);const item=menu.sections[0].items[0];item.name='W'.repeat(160);item.description='W'.repeat(1200);item.tags=Array.from({length:10},(_,i)=>String(i)+'W'.repeat(39));menu.sections=[{...menu.sections[0],name:'W'.repeat(120),items:[item]}];
  for(const template of Object.keys(templates))for(const pageSize of ['a4','letter']){
    const pages=layoutMenu(menu,{template,pageSize,density:'spacious'});assert.ok(pages.length>1);
    for(const page of pages)for(const hit of page.hits)assert.ok(hit.y+hit.height<page.height-100,`${template} overflowed a dish fragment`);
    const pieces=pages.flatMap(p=>p.elements.filter(e=>e.itemId===item.id&&e.type==='text'&&e.value!=='(continued)'&&!e.value.startsWith('$')).map(e=>e.value)).join('').replace(/\s/g,'');assert.ok(pieces.includes(item.name));assert.ok(pieces.includes(item.description));
  }
});
test('actual vector PDF contains edited prices, accents and every paginated dish',async()=>{
  const menu=demoMenu();menu.sections[0].name='Hors D’œuvres';menu.sections[0].items[0].name='Duck À L’Orange';menu.sections[0].items[0].price=1875;
  for(const template of Object.keys(templates)){
    const pages=layoutMenu(menu,{template});const doc=renderPDF(jsPDF,pages,menu.name);const task=getDocument({data:new Uint8Array(doc.output('arraybuffer')),useSystemFonts:true});const pdf=await task.promise;
    try{let content='';for(let i=1;i<=pdf.numPages;i++)content+=(await(await pdf.getPage(i)).getTextContent()).items.map(i=>i.str).join(' ')+' ';assert.match(content,/\$18\.75/);assert.match(content,/Duck À L'Orange/);assert.match(content,/D'œuvres/i);for(const item of menu.sections.flatMap(s=>s.items))assert.ok(content.includes(formatPrice(item.price,menu.currency)));}finally{await task.destroy();}
  }
});
test('unsupported PDF glyphs are detected before export and Latin accents are supported',()=>{const menu=demoMenu();assert.deepEqual(unsupportedCharacters(menu),[]);menu.name='Crème fraîche œ à €';assert.deepEqual(unsupportedCharacters(menu),[]);menu.name='食堂 🍃';assert.deepEqual(unsupportedCharacters(menu),['食','堂','🍃']);});
