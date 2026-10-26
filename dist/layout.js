import { formatPrice } from './model.js';
import { fontMetrics } from './font-metrics.js';

export const templates = {
  atelier: { name: 'The Atelier', mood: 'Quietly classic', color: '#334132', paper: '#fffdf7', ink: '#2b3229', muted: '#777a6a', font: 'serif', columns: 2, margin: 49, top: 246, gap: 34 },
  trattoria: { name: 'Casa Rosso', mood: 'A little Italian soul', color: '#a43e32', paper: '#fff9ed', ink: '#8a3029', muted: '#9b6253', font: 'serif', columns: 2, margin: 49, top: 225, gap: 32 },
  botanical: { name: 'The Herbarium', mood: 'Rooted in the season', color: '#476147', paper: '#f3f2e5', ink: '#354e3c', muted: '#75816b', font: 'serif', columns: 1, margin: 157, top: 230, gap: 30 },
  midnight: { name: 'After Hours', mood: 'An evening, well spent', color: '#d4b984', paper: '#202a2b', ink: '#f4ead5', muted: '#b4b8aa', font: 'sans', columns: 2, margin: 49, top: 248, gap: 36 }
};
export const pageSizes = { a4: [595.28, 841.89], letter: [612, 792] };
export function textWidth(value, size, font = 'serif', style = 'normal') {
  const metrics=fontMetrics[font][style];
  return [...value].reduce((n,c)=>n+(metrics[c]??.65),0)*size*1.015;
}
export function wrapText(value, width, size, font = 'serif', style = 'normal') {
  const result = [];
  for (const paragraph of String(value || '').split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (textWidth(word, size, font, style) > width) {
        if (line) { result.push(line); line = ''; }
        let part = '';
        for (const char of word) { if (part && textWidth(part + char, size, font, style) > width) { result.push(part); part = ''; } part += char; }
        line = part;
      } else if (line && textWidth(line + ' ' + word, size, font, style) > width) { result.push(line); line = word; }
      else line += (line ? ' ' : '') + word;
    }
    if (line) result.push(line);
  }
  return result;
}
export function layoutMenu(menu, settings = {}) {
  const template = templates[settings.template] || templates.atelier;
  const key = settings.template || 'atelier';
  const [w, h] = pageSizes[settings.pageSize] || pageSizes.a4;
  const density = settings.density === 'compact' ? .86 : settings.density === 'spacious' ? 1.15 : 1;
  const margin = template.margin, right = key === 'botanical' ? 52 : margin;
  const columns = template.columns;
  const cw = (w - margin - right - template.gap * (columns - 1)) / columns;
  const fitted=(value,width,start,font=template.font,style='normal',maxLines=2)=>{let size=start;let lines=wrapText(value,width,size,font,style);while(lines.length>maxLines&&size>14){size-=1;lines=wrapText(value,width,size,font,style);}return {size,lines};};
  const titleSpec=fitted(key==='trattoria'||key==='midnight'?menu.name.toUpperCase():menu.name,key==='botanical'?w-260:key==='midnight'?w-210:w-100,key==='atelier'?51:key==='trattoria'?43:key==='botanical'?38:43,template.font,key==='trattoria'?'bold':'normal');
  const titleY=key==='atelier'?115:key==='trattoria'?106:key==='botanical'?103:104;
  const titleEnd=titleY+(titleSpec.lines.length-1)*titleSpec.size*1.03;
  const subtitleY=key==='atelier'?titleEnd+titleSpec.size*.9+13:key==='trattoria'?Math.max(160,titleEnd+34)+21:key==='botanical'?Math.max(174,titleEnd+30):Math.max(197,titleEnd+32);
  let footerSize=8, subtitleSize=10, footerLines, subtitleLines, footerLeading, subtitleLeading, bottom, headerRule, bodyTop;
  function repeatedGeometry() {
    footerLeading=footerSize*1.375;subtitleLeading=subtitleSize*1.3;
    footerLines=wrapText(menu.footer,w-margin-right,footerSize,template.font,'italic');
    subtitleLines=wrapText(menu.subtitle,key==='botanical'?w-210:w-110,subtitleSize,template.font,key==='midnight'?'normal':'italic');
    bottom=h-Math.max(94,footerLines.length*footerLeading+(key==='trattoria'?72:60));
    const subtitleEnd=subtitleY+Math.max(0,subtitleLines.length-1)*subtitleLeading;
    headerRule=key==='atelier'?Math.max(226,subtitleEnd+35):Math.max(key==='midnight'?225:207,subtitleEnd+22);
    bodyTop=Math.max(template.top,headerRule+22);
  }
  repeatedGeometry();
  while(bottom-bodyTop<160*density&&(footerSize>7||subtitleSize>8)) {
    if(footerSize>7)footerSize-=.5;
    if(subtitleSize>8)subtitleSize-=.5;
    repeatedGeometry();
  }
  if(bottom-bodyTop<160*density)throw new Error('The restaurant name, subtitle or footer leaves too little room for dishes. Shorten those fields or remove extra line breaks.');
  const pages = [];
  const sizes = { name: (key === 'midnight' ? 12 : 13) * density, desc: 9.5 * density, tag: 7 * density, section: (key === 'botanical' ? 19 : 18) * density };
  const text = (p, value, x, y, size, options = {}) => p.elements.push({ type: 'text', value: String(value), x, y, size, font: template.font, style: 'normal', color: template.ink, ...options });
  const line = (p, x1, y1, x2, y2, color = template.color, width = .6) => p.elements.push({ type: 'line', x1, y1, x2, y2, color, width });
  const rect = (p, x, y, width, height, fill, stroke, radius = 0) => p.elements.push({ type: 'rect', x, y, width, height, fill, stroke, radius });
  const ellipse = (p, cx, cy, rx, ry, fill, stroke) => p.elements.push({ type: 'ellipse', cx, cy, rx, ry, fill, stroke });
  function leaf(p, x, y, scale = 1) {
    line(p, x, y, x + 32 * scale, y - 70 * scale, template.color, .8);
    [[6, -13, -14, -7], [15, -32, 15, -9], [22, -48, -13, -7], [29, -64, 10, -6]].forEach(([a,b,c,d]) => ellipse(p, x+(a+c/2)*scale, y+(b+d/2)*scale, Math.abs(c)*scale/1.3, 3.2*scale, template.color));
  }
  function newPage() {
    const index = pages.length;
    const p = { width: w, height: h, elements: [], hits: [], columns: Array(columns).fill(bodyTop), template: key };
    rect(p, 0, 0, w, h, template.paper);
    if (key === 'atelier') {
      text(p, 'S E A S O N A L   &   S I N C E R E', 49, 44, 7.8, { font: 'sans', color: template.color });
      text(p, 'A TABLE FOR EVERY SEASON', w-49, 44, 7, { font: 'sans', align: 'right', color: template.muted });
      line(p, 49, 60, w-49, 60);
      titleSpec.lines.forEach((t,i) => text(p,t,w/2,titleY+i*titleSpec.size*1.03,titleSpec.size,{align:'center'}));
      subtitleLines.forEach((t,i)=>text(p,t,w/2,subtitleY+i*subtitleLeading,subtitleSize,{style:'italic',align:'center',color:template.muted}));
      text(p, 'T H E   M E N U', w/2, headerRule-8, 8, {font:'sans',align:'center',color:template.color});
      line(p,49,headerRule,w-49,headerRule,template.color,.45);
    } else if (key === 'trattoria') {
      rect(p,20,20,w-40,h-40,undefined,template.color,4);
      rect(p,25,25,w-50,h-50,undefined,template.color,2);
      text(p, 'BUON CIBO, BUONA COMPAGNIA', w/2, 55, 8, {font:'sans',align:'center',color:template.color});
      titleSpec.lines.forEach((t,i)=>text(p,t,w/2,titleY+i*titleSpec.size*1.03,titleSpec.size,{style:'bold',align:'center'}));
      text(p, '✦', w/2, subtitleY-21, 15, {fallback:'*',align:'center'});
      subtitleLines.forEach((t,i)=>text(p,t,w/2,subtitleY+i*subtitleLeading,subtitleSize,{style:'italic',align:'center'}));
      line(p,49,headerRule,w-49,headerRule,template.color,1.1);
      for(let x=32;x<w-90;x+=16) for(let r=0;r<2;r++) if((Math.floor((x-32)/16)+r)%2===0) rect(p,x,h-38+r*5,8,4,template.color);
    } else if (key === 'botanical') {
      rect(p,0,0,115,h,'#3c503a');
      text(p,'G A R D E N',57,62,8,{font:'sans',align:'center',color:'#e7e9ce'});
      text(p,'T O   T A B L E',57,78,7,{font:'sans',align:'center',color:'#e7e9ce'});
      line(p,57,125,57,h-110,'#839376',.6);
      for(let y=180;y<h-140;y+=86) { ellipse(p,43,y,13,5,'#839376'); ellipse(p,71,y+28,13,5,'#839376'); }
      text(p,'01',57,h-62,18,{align:'center',color:'#e7e9ce',style:'italic'});
      leaf(p,w-98,116,1);
      text(p,'A SEASONAL GATHERING',157,57,7.5,{font:'sans',color:template.muted});
      titleSpec.lines.forEach((t,i)=>text(p,t,157,titleY+i*titleSpec.size*1.03,titleSpec.size));
      subtitleLines.forEach((t,i)=>text(p,t,157,subtitleY+i*subtitleLeading,subtitleSize,{style:'italic',color:template.muted}));
      line(p,157,headerRule,w-52,headerRule,template.color,.5);
    } else {
      ellipse(p,w-85,93,52,52,undefined,'#867b5c');
      ellipse(p,w-85,93,43,43,undefined,'#867b5c');
      text(p,'A/H',w-85,101,21,{align:'center',color:template.color});
      text(p,'T H E   E V E N I N G   E D I T',49,48,7,{color:template.color});
      titleSpec.lines.forEach((t,i)=>text(p,t,49,titleY+i*titleSpec.size*1.03,titleSpec.size));
      subtitleLines.forEach((t,i)=>text(p,t,49,subtitleY+i*subtitleLeading,subtitleSize,{color:template.muted}));
      line(p,49,headerRule,w-49,headerRule,template.color,.7);
    }
    if(index>0) text(p,'CONTINUED',w-right,bodyTop-8,6.7,{font:'sans',align:'right',color:template.muted});
    pages.push(p); return p;
  }
  function itemShape(item) {
    const price = formatPrice(item.price, menu.currency);
    const priceW = Math.max(43,textWidth(price,sizes.name,template.font)+12);
    const names=wrapText(item.name || 'Untitled dish',cw-priceW-5,sizes.name,template.font,key==='trattoria'?'bold':'normal');
    const descriptions=wrapText(item.description,cw-4,sizes.desc,template.font);
    const tags=wrapText(item.tags.join(' · ').toUpperCase(),cw-4,sizes.tag,'sans');
    const height=names.length*sizes.name*1.16+descriptions.length*sizes.desc*1.35+tags.length*sizes.tag*1.35+17*density;
    return {item,price,names,descriptions,tags,height,priceW};
  }
  const headingLines=(section,continued=false)=>wrapText(key==='midnight'?section.name.toUpperCase()+(continued?' / CONT.':''):section.name+(continued?' (continued)':''),cw,key==='midnight'?9:sizes.section,template.font,key==='midnight'?'normal':'italic');
  const headingHeight=(section,continued=false)=>key==='midnight'?headingLines(section,continued).length*12+27*density:headingLines(section,continued).length*sizes.section*1.1+18*density;
  function heading(p, section, col, continued=false) {
    const x=margin+col*(cw+template.gap), y=p.columns[col];
    const lines=headingLines(section,continued);
    if(key==='midnight') {lines.forEach((t,i)=>text(p,t,x,y+12+i*12,9,{color:template.color}));line(p,x,y+lines.length*12+11,x+cw,y+lines.length*12+11,template.color,.3);}
    else lines.forEach((t,i)=>text(p,t,x,y+sizes.section+i*sizes.section*1.1,sizes.section,{style:'italic',color:template.color}));
    p.columns[col]+=headingHeight(section,continued);
  }
  function drawItem(p, shape, col, sectionId) {
    const {item,price,names,descriptions,tags}=shape;
    const x=margin+col*(cw+template.gap); const top=p.columns[col]; let y=top+sizes.name;
    names.forEach(t=>{text(p,t,x,y,sizes.name,{style:key==='trattoria'?'bold':'normal',itemId:item.id});y+=sizes.name*1.16;});
    text(p,price,x+cw,top+sizes.name,sizes.name,{align:'right',itemId:item.id});
    descriptions.forEach(t=>{text(p,t,x,y+2,sizes.desc,{color:template.muted,itemId:item.id});y+=sizes.desc*1.35;});
    tags.forEach(t=>{text(p,t,x,y+4,sizes.tag,{font:'sans',color:template.muted,itemId:item.id});y+=sizes.tag*1.35;});
    p.hits.push({id:item.id,sectionId,x:x-5,y:top-3,width:cw+10,height:shape.height-5});
    p.columns[col]+=shape.height;
  }
  const sectionLayouts=menu.sections.map(section=>{
    const shapes=section.items.map(itemShape);
    return {section,shapes,height:shapes.reduce((sum,shape)=>sum+shape.height,0)+headingHeight(section)};
  });
  let split=null;
  if(columns===2) {
    const total=sectionLayouts.reduce((sum,section)=>sum+section.height+13*density,0);
    let left=0,best=Infinity;
    for(let i=1;i<sectionLayouts.length;i++) {
      left+=sectionLayouts[i-1].height+13*density;
      const tallest=Math.max(left,total-left)-13*density;
      if(tallest<=bottom-bodyTop&&tallest<best){split=i;best=tallest;}
    }
  }
  let page=newPage();
  for(const [sectionIndex,{section,shapes,height:sectionHeight}] of sectionLayouts.entries()) {
    if(Math.max(headingHeight(section),headingHeight(section,true))+17*density+sizes.name*1.16+Math.max(sizes.name*1.16,sizes.desc*1.35,sizes.tag*1.35)>bottom-bodyTop)throw new Error(`The category “${section.name}” leaves too little room for dishes. Shorten its name or remove extra line breaks.`);
    let col=split===null?page.columns.indexOf(Math.min(...page.columns)):sectionIndex<split?0:1;
    if(sectionHeight<=bottom-bodyTop && page.columns[col]+sectionHeight>bottom) { page=newPage(); col=0; }
    if(page.columns[col]+headingHeight(section)+Math.min(shapes[0]?.height||0,40)>bottom) {page=newPage();col=0;}
    heading(page,section,col);
    for(const shape of shapes) {
      if(page.columns[col]+shape.height>bottom) {
        const other=page.columns.findIndex(y=>y+headingHeight(section,true)+Math.min(shape.height,40)<=bottom);
        if(other>=0) col=other; else {page=newPage();col=0;}
        heading(page,section,col,true);
      }
      if(shape.height>bottom-page.columns[col]) {
        const tokens=[...shape.names.map(value=>({kind:'names',value,height:sizes.name*1.16})),...shape.descriptions.map(value=>({kind:'descriptions',value,height:sizes.desc*1.35})),...shape.tags.map(value=>({kind:'tags',value,height:sizes.tag*1.35}))];
        while(tokens.length) {
          const remaining=tokens.length;
          const fragment={...shape,names:[],descriptions:[],tags:[],height:17*density};
          if(tokens[0].kind!=='names'){fragment.names=['(continued)'];fragment.height+=sizes.name*1.16;}
          while(tokens.length&&page.columns[col]+fragment.height+tokens[0].height<=bottom){const token=tokens.shift();fragment[token.kind].push(token.value);fragment.height+=token.height;}
          if(tokens.length===remaining) {
            if(page.columns[col]>bodyTop+headingHeight(section,true)+.01){page=newPage();col=0;heading(page,section,col,true);continue;}
            throw new Error('A dish cannot fit below this page heading. Shorten the category, restaurant name, subtitle or footer.');
          }
          if(fragment.descriptions.length||fragment.tags.length||(fragment.names.length&&fragment.names[0]!=='(continued)'))drawItem(page,fragment,col,section.id);
          if(tokens.length){page=newPage();col=0;heading(page,section,col,true);}
        }
      } else drawItem(page,shape,col,section.id);
    }
    page.columns[col]+=13*density;
  }
  pages.forEach((p,i)=>{
    const footerX=key==='botanical'?157:w/2;
    const footerAlign=key==='botanical'?'left':'center';
    const footerTop=Math.min(h-75,bottom+19);
    line(p,margin,footerTop,w-right,footerTop,template.color,.4);
    footerLines.forEach((t,j)=>text(p,t,footerX,footerTop+19+j*footerLeading,footerSize,{align:footerAlign,style:'italic',color:template.muted}));
    text(p,`${String(i+1).padStart(2,'0')} / ${String(pages.length).padStart(2,'0')}`,w-right,h-(key==='trattoria'?32:23),6.5,{font:'sans',align:'right',color:template.muted});
  });
  return pages;
}
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderSVG(page, { interactive = false, selected = '' } = {}) {
  const svg = page.elements.map(e=> {
    if(e.type==='rect') return `<rect x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" rx="${e.radius}" fill="${e.fill||'none'}" stroke="${e.stroke||'none'}" stroke-width=".7"/>`;
    if(e.type==='line') return `<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="${e.color}" stroke-width="${e.width}"/>`;
    if(e.type==='ellipse') return `<ellipse cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}" fill="${e.fill||'none'}" stroke="${e.stroke||'none'}" stroke-width=".6"/>`;
    return `<text x="${e.x}" y="${e.y}" font-size="${e.size}" font-family="${e.font==='sans'?'Arial, Helvetica, sans-serif':"'Times New Roman', Times, serif"}" font-weight="${e.style==='bold'?'bold':'normal'}" font-style="${e.style==='italic'?'italic':'normal'}" text-anchor="${e.align==='center'?'middle':e.align==='right'?'end':'start'}" fill="${e.color}">${escape(e.value)}</text>`;
  }).join('');
  const hits=interactive?page.hits.map(hit=>`<g class="preview-hit ${selected===hit.id?'is-selected':''}" data-item="${escape(hit.id)}" data-section="${escape(hit.sectionId)}" tabindex="0" role="button" aria-label="Edit ${escape(page.elements.find(e=>e.itemId===hit.id)?.value||'dish')}"><rect x="${hit.x}" y="${hit.y}" width="${hit.width}" height="${hit.height}" rx="4"/><title>Click to edit this dish</title></g>`).join(''):'';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${page.width} ${page.height}" role="img" aria-label="Designed menu page">${svg}${hits}</svg>`;
}
