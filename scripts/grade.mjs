import fs from 'node:fs/promises';
import { jsPDF } from 'jspdf';
import { validateMenu } from '../dist/model.js';
import { layoutMenu, templates, renderSVG } from '../dist/layout.js';
import { renderPDF } from '../dist/export.js';
const directory=new URL('../outputs/grade/',import.meta.url);
await fs.mkdir(directory,{recursive:true});
const menus=JSON.parse(await fs.readFile(new URL('../dist/examples/index.json',import.meta.url),'utf8'));
const manifest=[];
for(const raw of menus){
 const menu=validateMenu(raw);
 for(const template of Object.keys(templates)){
  const settings={template,pageSize:'a4',density:template==='botanical'?'compact':'balanced'};
  const pages=layoutMenu(menu,settings);
  const filename=`${menu.id}-${template}`;
  const doc=renderPDF(jsPDF,pages,menu.name);
  await fs.writeFile(new URL(filename+'.pdf',directory),Buffer.from(doc.output('arraybuffer')));
  await fs.writeFile(new URL(filename+'.json',directory),JSON.stringify({menu,settings},null,2));
  await fs.writeFile(new URL(filename+'.svg',directory),renderSVG(pages[0]));
  manifest.push({restaurant:menu.name,template:templates[template].name,filename,pages:pages.length,dishes:menu.sections.reduce((n,s)=>n+s.items.length,0),source:menu.source.url});
 }
}
await fs.writeFile(new URL('manifest.json',directory),JSON.stringify(manifest,null,2));
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cards=manifest.map(entry=>`<article><a href="${entry.filename}.pdf"><img src="${entry.filename}.svg" alt="${esc(entry.restaurant+' in '+entry.template)}"></a><h2>${esc(entry.restaurant)}</h2><p>${esc(entry.template)} · ${entry.pages} page${entry.pages===1?'':'s'} · ${entry.dishes} dishes</p><a href="${entry.filename}.pdf">Open PDF</a> <a href="${entry.filename}.json">Editable backup</a> <a href="${esc(entry.source)}">Source</a></article>`).join('');
await fs.writeFile(new URL('index.html',directory),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Menu Atelier grading gallery</title><style>body{margin:0;background:#eeeee5;color:#2b382b;font:15px system-ui}header{max-width:1240px;margin:48px auto 32px;padding:0 28px}h1{font:52px Georgia;margin:12px 0}header p{max-width:760px;line-height:1.7}main{max-width:1240px;padding:0 28px 60px;margin:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:26px}article{background:#fffdf8;padding:18px;border:1px solid #d7dbce;border-radius:8px}img{width:100%;height:360px;object-fit:contain;background:#e7e9df}h2{font:27px Georgia;margin-bottom:8px}p{font-size:13px;color:#626f5e}a{color:#375534;margin-right:10px;font-size:12px}a:focus{outline:2px solid #6b7956}</style><header><p>MENU ATELIER · ACTUAL APPLICATION OUTPUTS</p><h1>A dozen menus to grade.</h1><p>Three official restaurant excerpts, each rendered through all four designs in the application's shared layout and PDF engine. Every PDF has selectable text. Each adjacent JSON backup reopens the same menu and design in the studio. Bianco is an April2023 source snapshot. These unofficial examples are not endorsed by the restaurants.</p></header><main>${cards}</main></html>`);
console.log(JSON.stringify(manifest,null,2));
