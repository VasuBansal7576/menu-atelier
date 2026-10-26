import { BODY, PRICE, textWidth, wrapText, text, line, rect, freeze, dishBlock, measuredLines, stackLines, runBottom, inkBounds } from './print-kit.js';

export const designs = Object.freeze([
  Object.freeze({ id: 'market-bloom', name: 'Market Bloom', mood: 'Tomato red, butter yellow, enormous botanical forms. A lively produce poster.' }),
  Object.freeze({ id: 'night-press', name: 'Night Press', mood: 'Cobalt fields, electric lime and condensed index type. A landscape culinary broadsheet.' })
]);
const SIZES = { a4: [595.28, 841.89], letter: [612, 792] };
const PALETTE = { 'market-bloom': { paper: '#FFF0BD', ink: '#143F2E', accent: '#E73825', muted: '#506348', tint: '#F8DA90' }, 'night-press': { paper: '#102B65', ink: '#F0F1E7', accent: '#D8F348', muted: '#B8C7DF', tint: '#D8F348', header: '#1845D5', headingInk: '#111711' } };
function ellipse(p, cx, cy, rx, ry, fill, stroke) { p.elements.push({ type: 'ellipse', cx, cy, rx, ry, fill, stroke }); }
function tomato(p, cx, cy, scale, c) {
  ellipse(p, cx + 7 * scale, cy + 10 * scale, 89 * scale, 82 * scale, c.ink);
  ellipse(p, cx - 20 * scale, cy + 10 * scale, 72 * scale, 82 * scale, c.accent);
  ellipse(p, cx + 26 * scale, cy + 8 * scale, 70 * scale, 81 * scale, c.accent);
  ellipse(p, cx - 18 * scale, cy - 8 * scale, 48 * scale, 62 * scale, '#F95332');
  for (const [dx, dy, width] of [[-51,-41,13],[-25,-66,17],[7,-72,14],[40,-54,18],[54,-23,13],[-12,-20,12]]) line(p, cx, cy - 31 * scale, cx + dx * scale, cy + dy * scale, c.ink, width * scale);
  line(p, cx + 1 * scale, cy - 35 * scale, cx + 16 * scale, cy - 88 * scale, c.ink, 8 * scale);
  for (let i = 0; i < 5; i++) line(p, cx - 8 * scale + i * 7 * scale, cy + 49 * scale, cx - 7 * scale + i * 7 * scale, cy + 58 * scale, '#F8BD57', 2 * scale);
}
function titleRuns(menu, width, size, font, maxLines = 2) {
  let runs;
  do { runs = stackLines(measuredLines(menu.name, width, size, font, 'masthead'), 0); if (runs.length <= maxLines || size <= 27) return runs; size--; } while (true);
}
function footerData(menu, width) { return stackLines(measuredLines(menu.footer, width, 8.2, BODY, 'footer'), 2); }
function paintRuns(p, runs, x, y, color, extra = {}) { for (const run of runs) text(p, run.value, x + (run.x || 0), y + run.y, run.size, run.font, color, { role: run.role, ...extra }); }
function paintDish(p, section, block, x, top, c, fragment = block.runs) {
  const start = p.elements.length;
  for (const run of fragment) text(p, run.value, x + (run.align === 'right' ? block.width : 0), top + run.y, run.size, run.font, run.role === 'price' ? c.accent : run.role === 'tags' ? c.muted : c.ink, { itemId: block.item.id, sectionId: section.id, role: run.role, align: run.align });
  const bounds = p.elements.slice(start).map(e => e.inkBounds), bottom = Math.max(top, ...bounds.map(b => b.bottom));
  p.hits.push({ id: block.item.id, sectionId: section.id, label: block.item.name, x: x - 3, y: top - 3, width: block.width + 6, height: bottom - top + 7 });
  p.blocks.push({ id: block.item.id, sectionId: section.id, x, top, bottom, width: block.width, priceGutter: block.gutter });
  return bottom;
}
function pageRecord(id, width, height, format, bodyTop, bodyBottom) { return { width, height, template: id, compositionName: designs.find(d => d.id === id).name, format, bodyTop, bodyBottom, elements: [], hits: [], blocks: [] }; }
function finish(pages, menu, footers, c, margin) {
  pages.forEach((p, i) => {
    const top = p.height - 25 - runBottom(footers);
    paintRuns(p, footers, margin, top, c.muted);
    text(p, `${menu.currency}  ·  ${i + 1} / ${pages.length}`, p.width - margin, p.height - 16, 8, PRICE, c.accent, { align: 'right', role: 'counter' });
    for (const e of p.elements.filter(e => e.type === 'text')) if (e.inkBounds.left < 12 || e.inkBounds.right > p.width - 12 || e.inkBounds.top < 12 || e.inkBounds.bottom > p.height - 10) throw new Error('The menu contains more identity or footer text than this print format can hold.');
  });
  return freeze(pages);
}
function market(menu, settings) {
  const id = 'market-bloom', c = PALETTE[id], [w,h] = SIZES[settings.pageSize] || SIZES.a4, margin = 29;
  const footers = footerData(menu, w - margin * 2 - 8), bodyBottom = h - 43 - runBottom(footers);
  const title = titleRuns(menu, w - 226, 69, 'fraunces-display', 3);
  const titleTop = 39, titleBottom = titleTop + runBottom(title), subtitle = stackLines(measuredLines(menu.subtitle, w - 226, 11, PRICE, 'subtitle'), 2);
  const bodyTop = Math.max(234, titleBottom + runBottom(subtitle) + 38);
  if (bodyTop > bodyBottom - 100) throw new Error('The restaurant identity leaves too little room for dishes.');
  const pages = [], gap = settings.density === 'compact' ? 10 : settings.density === 'spacious' ? 20 : 13;
  const x = 165, width = w - margin - x;
  let p, y;
  const newPage = () => {
    p = pageRecord(id,w,h,{ label: settings.pageSize === 'letter' ? 'US Letter' : 'A4', width:w,height:h,orientation:'portrait' },bodyTop,bodyBottom);
    rect(p,0,0,w,h,c.paper);
    tomato(p,w-116,120,.96,c);
    paintRuns(p,title,margin-2,titleTop,c.ink);
    paintRuns(p,subtitle,margin,titleBottom+16,c.ink);
    line(p,margin,bodyTop-18,w-margin,bodyTop-18,c.accent,3);
    ellipse(p,margin+3,bodyTop-18,5,5,c.accent);
    pages.push(p); y=bodyTop;
  };
  const categoryRuns=section=>{
    let size=24;
    while(size>18 && section.name.split(/\s+/).some(word=>textWidth(word,size,'fraunces-display')>112))size--;
    return stackLines(measuredLines(section.name,112,size,'fraunces-display','category'),2);
  };
  const sectionHeading = (section, continued) => {
    const runs = categoryRuns(section);
    const height = runBottom(runs);
    paintRuns(p,runs,margin,y,c.accent,{sectionId:section.id});
    if (continued) text(p,'CONTINUED',margin,y+height+15,7.7,PRICE,c.muted,{sectionId:section.id,role:'continuation'});
    return Math.max(height+8,continued ? height+22:0);
  };
  newPage();
  for (const section of menu.sections) {
    let headed=false, sectionFloor=0;
    const headingHeight=runBottom(categoryRuns(section))+22;
    if(headingHeight>bodyBottom-bodyTop)throw new Error('The category label is too long for this sheet.');
    if (y + Math.max(65,headingHeight) > bodyBottom) newPage();
    for (const [itemIndex,item] of section.items.entries()) {
      const measured = dishBlock({...item,currency:menu.currency},width,19,10.8,{nameFont:'fraunces-display'});
      const runs=measured.runs.map(run=>({...run,y:run.y-(run.role==='tags'?8:run.role==='description'?3:0)}));
      const block={...measured,runs,height:runBottom(runs)};
      if (block.height + y > bodyBottom && block.height <= bodyBottom-bodyTop-5) { newPage(); headed=false; }
      if (!headed) { sectionFloor = y+sectionHeading(section,itemIndex>0); headed=true; }
      if (block.height <= bodyBottom-y) { y=paintDish(p,section,block,x,y,c)+gap; }
      else {
        const tokens=block.runs.filter(r=>r.role!=='price'); let offset=0;
        while(offset<tokens.length) {
          const origin=tokens[offset].y+inkBounds(tokens[offset].value,tokens[offset].size,tokens[offset].font).top;
          const fragment=[]; let next=offset;
          while(next<tokens.length) { const run={...tokens[next],y:tokens[next].y-origin}; if(y+inkBounds(run.value,run.size,run.font,0,run.y).bottom>bodyBottom-2) break; fragment.push(run); next++; }
          if(!fragment.length) { newPage(); sectionFloor=y+sectionHeading(section,true); continue; }
          if(!offset) fragment.push({...block.runs.find(r=>r.role==='price'),y:fragment[0].y});
          y=paintDish(p,section,block,x,y,c,fragment)+gap; offset=next;
          if(offset<tokens.length) {newPage();sectionFloor=y+sectionHeading(section,true);}
        }
      }
    }
    if(!headed) sectionFloor=y+sectionHeading(section,false);
    y=Math.max(y,sectionFloor)+11;
    if(y<bodyBottom) line(p,margin,y-7,w-margin,y-7,c.ink,.7);
    y+=9;
  }
  return finish(pages,menu,footers,c,margin);
}
function night(menu, settings) {
  const id='night-press',c=PALETTE[id],stock=SIZES[settings.pageSize]||SIZES.a4,w=stock[1],h=stock[0],margin=29;
  const footers=footerData(menu,w-margin*2-8),bodyBottom=h-42-runBottom(footers);
  const title=titleRuns(menu,w-173,56,'archivo-black',2),titleTop=38,titleBottom=titleTop+runBottom(title);
  const subtitle=stackLines(measuredLines(menu.subtitle,w-173,11,PRICE,'subtitle'),2);
  const bodyTop=Math.max(126,titleBottom+runBottom(subtitle)+32);
  if(bodyTop>bodyBottom-100) throw new Error('The restaurant identity leaves too little room for dishes.');
  const pages=[],gridX=165,gridWidth=w-margin-gridX,gutter=21,gap=settings.density==='compact'?10:settings.density==='spacious'?22:13;
  let p,y,rail;
  const newPage=()=> {
    p=pageRecord(id,w,h,{label:settings.pageSize==='letter'?'US Letter landscape':'A4 landscape',width:w,height:h,orientation:'landscape'},bodyTop,bodyBottom);
    rect(p,0,0,w,h,c.paper);rect(p,0,0,w,bodyTop-12,c.header);
    paintRuns(p,title,margin,titleTop,c.tint);paintRuns(p,subtitle,margin,titleBottom+14,c.ink);
    ellipse(p,w-77,53,37,37,c.tint);ellipse(p,w-64,47,30,30,c.header);
    for(let i=0;i<4;i++)line(p,w-112,89+i*4,w-45,89+i*4,c.tint,1);
    pages.push(p);y=bodyTop;rail=null;
  };
  const heading=(section,index,continued,rowHeight)=> {
    if(rail?.sectionId===section.id){rail.element.height=y+rowHeight-rail.top;return;}
    rect(p,margin,y,115,rowHeight,c.tint);
    rail={sectionId:section.id,element:p.elements.at(-1),top:y};
    text(p,String(index+1).padStart(2,'0'),margin+8,y+39,36,'bebas-neue',c.header,{sectionId:section.id,role:'index'});
    const runs=stackLines(measuredLines(section.name,98,20,'bebas-neue','category'),1);
    paintRuns(p,runs,margin+8,y+46,c.headingInk,{sectionId:section.id});
    if(continued)text(p,'CONTINUED',margin+8,y+55+runBottom(runs),7.2,PRICE,c.headingInk,{sectionId:section.id,role:'continuation'});
  };
  newPage();
  menu.sections.forEach((section,index)=> {
    const columns=section.items.length<=2?Math.max(1,section.items.length):section.items.length===4?2:3;
    const width=(gridWidth-gutter*(columns-1))/columns;
    const queue=section.items.map(item=>dishBlock({...item,currency:menu.currency},width,17,10.8,{nameFont:'source-sans-semibold'}));
    let offset=0,continued=false;
    do {
      const row=queue.slice(offset,offset+columns),headHeight=54+runBottom(stackLines(measuredLines(section.name,98,20,'bebas-neue','category'),1))+(continued?10:0);
      if(headHeight>bodyBottom-bodyTop)throw new Error('The category label is too long for this sheet.');
      let rowHeight=Math.max(headHeight,...row.map(b=>b.height+14));
      if(y+rowHeight>bodyBottom && y>bodyTop) {newPage();continued=offset>0;}
      const capacity=bodyBottom-y;
      if(rowHeight<=capacity) {
        heading(section,index,continued,rowHeight);
        row.forEach((block,col)=>paintDish(p,section,block,gridX+col*(width+gutter),y+4,c));
        y+=rowHeight+gap;offset+=columns;continued=true;
        if(offset<queue.length && y+70>bodyBottom)newPage();
      } else {
        const block=queue[offset];
        if(!block)throw new Error('The category label is too long for this sheet.');
        const tokens=block.runs.filter(r=>r.role!=='price');let tokenIndex=0;
        while(tokenIndex<tokens.length) {
          heading(section,index,continued,Math.min(capacity,Math.max(headHeight,100)));
          const fragment=[],origin=tokens[tokenIndex].y+inkBounds(tokens[tokenIndex].value,tokens[tokenIndex].size,tokens[tokenIndex].font).top;
          while(tokenIndex<tokens.length) {const run={...tokens[tokenIndex],y:tokens[tokenIndex].y-origin+4};if(y+inkBounds(run.value,run.size,run.font,0,run.y).bottom>bodyBottom-4)break;fragment.push(run);tokenIndex++;}
          if(!fragment.length)throw new Error('The category label leaves too little room for dishes.');
          if(tokenIndex===fragment.length)fragment.push({...block.runs.find(r=>r.role==='price'),y:fragment[0].y});
          y=paintDish(p,section,block,gridX,y,c,fragment)+gap;
          continued=true;if(tokenIndex<tokens.length)newPage();
        }
        offset++;
      }
      if(y<bodyBottom)line(p,margin,y-gap/2,w-margin,y-gap/2,c.accent,.7);
    } while(offset<queue.length);
    y+=4;
  });
  return finish(pages,menu,footers,c,margin);
}
export function layoutStudioA(menu, settings = {}, variant = 'market-bloom') {
  const id=typeof variant==='string'?variant:variant?.id;
  return id==='night-press'?night(menu,settings):market(menu,settings);
}
