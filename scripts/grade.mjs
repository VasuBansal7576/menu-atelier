import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { validateMenu } from '../dist/model.js';
import { prepareTypography, layoutMenu, templates, renderSVG } from '../dist/layout.js';
import { createPDF } from '../dist/export.js';

const directory=new URL('../outputs/grade/',import.meta.url);
await fs.mkdir(directory,{recursive:true});
await prepareTypography();
const menus=JSON.parse(await fs.readFile(new URL('../dist/examples/index.json',import.meta.url),'utf8'));
const manifest=[];
for(const raw of menus){
 const menu=validateMenu(raw);
 for(const template of Object.keys(templates)){
  const settings={template,pageSize:'a4',density:'balanced'};
  const pages=layoutMenu(menu,settings);
  const filename=`${menu.id}-${template}`;
  const doc=await createPDF(pages,menu.name);
  const pdfPath=fileURLToPath(new URL(filename+'.pdf',directory));
  await fs.writeFile(pdfPath,Buffer.from(doc.output('arraybuffer')));
  await fs.writeFile(new URL(filename+'.json',directory),JSON.stringify({menu,settings},null,2));
  await fs.writeFile(new URL(filename+'.svg',directory),renderSVG(pages[0]));
  execFileSync('pdftoppm',['-f','1','-singlefile','-scale-to','1100','-png',pdfPath,fileURLToPath(new URL(filename,directory))],{env:{...process.env,XDG_CACHE_HOME:fileURLToPath(new URL('../.pstack/cache/',import.meta.url))},stdio:'pipe'});
  manifest.push({restaurant:menu.name,template:templates[template].name,templateId:template,filename,pages:pages.length,dishes:menu.sections.reduce((n,s)=>n+s.items.length,0),source:menu.source.url});
 }
}
await fs.writeFile(new URL('manifest.json',directory),JSON.stringify(manifest,null,2));
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cards=manifest.map(entry=>`<article data-design="${esc(entry.templateId)}"><a class="menu-preview" href="${entry.filename}.pdf" aria-label="Open ${esc(entry.restaurant)} ${esc(entry.template)} PDF"><img src="${entry.filename}.png" alt="Actual exported ${esc(entry.restaurant+' '+entry.template)} menu" loading="lazy" width="778" height="1100"></a><div class="card-meta"><div><h2>${esc(entry.restaurant)}</h2><p>${esc(entry.template)} · ${entry.pages} page${entry.pages===1?'':'s'} · ${entry.dishes} dishes</p></div><a class="pdf-link" href="${entry.filename}.pdf">PDF ↗</a></div><div class="card-links"><a href="${entry.filename}.json" download>Editable backup ↓</a><a href="${esc(entry.source)}" target="_blank" rel="noopener">Original source ↗</a></div></article>`).join('');
const filters=Object.entries(templates).map(([id,t])=>`<button data-filter="${esc(id)}" aria-pressed="false">${esc(t.name)}</button>`).join('');
await fs.writeFile(new URL('index.html',directory),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Menu Atelier · The collection</title><link rel="stylesheet" href="../fonts/fonts.css"><style>*{box-sizing:border-box}body{margin:0;background:#f4f4f1;color:#202322;font:16px 'MenuAtelier Source Sans 3',system-ui,sans-serif}a{color:inherit;text-underline-offset:4px}header,main,footer{max-width:1440px;margin:auto;padding-left:clamp(20px,5vw,80px);padding-right:clamp(20px,5vw,80px)}nav{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:24px 0;border-bottom:1px solid #d8dcd8}nav a{text-decoration:none;font-size:14px}nav strong{letter-spacing:.04em}.intro{padding:54px 0 32px;max-width:900px}.eyebrow{font:600 12px system-ui;letter-spacing:.14em;text-transform:uppercase;color:#59615e}h1{font:400 clamp(42px,6vw,76px)/1.04 Georgia,serif;letter-spacing:-.04em;margin:18px 0 22px}.intro p{line-height:1.65;color:#515a56;max-width:700px;font-size:16px}.filters{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 30px}.filters button{cursor:pointer;border:1px solid #cfd4d0;border-radius:30px;padding:10px 19px;font:inherit;background:transparent;color:inherit}.filters button[aria-pressed=true]{background:#222b28;color:white;border-color:#222b28}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:36px 28px;padding-bottom:60px}article{min-width:0}.menu-preview{display:block;padding:20px;background:#e9ebe7;border:1px solid #dde0da}.menu-preview img{width:100%;height:auto;display:block;box-shadow:0 5px 16px #2028201a;background:white}.card-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:17px 0 12px}h2{font-size:19px;font-weight:600;margin:0 0 5px}.card-meta p{font-size:14px;color:#59615e;margin:0}.pdf-link{font-size:14px;text-decoration:none;border:1px solid #bfc7c2;padding:8px 11px;border-radius:5px;white-space:nowrap}.card-links{display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:#59615e}footer{font-size:14px;color:#59615e;line-height:1.7;padding-bottom:40px}button:focus-visible,a:focus-visible{outline:3px solid #315dba;outline-offset:4px}[hidden]{display:none!important}@media(max-width:1000px){main{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){main{grid-template-columns:1fr}.intro{padding-top:35px}.menu-preview{padding:16px}.filters button{padding:9px 14px}}</style></head><body><header><nav><strong>MENU ATELIER</strong><a href="../">Open the studio ↗</a></nav><div class="intro"><span class="eyebrow">The collection · actual application exports</span><h1>One menu.<br>Four different voices.</h1><p>Three restaurant excerpts, twelve editable compositions. These previews are rendered from the real selectable PDFs. Open a PDF to inspect the type, spacing and prices. Download its backup to continue editing in the studio.</p></div><div class="filters" role="group" aria-label="Filter menu designs"><button data-filter="all" aria-pressed="true">All designs</button>${filters}</div></header><main>${cards}</main><footer>Unofficial demonstrations with attributed source snapshots. Restaurant names and prices come from the linked originals. Pizzeria Bianco uses an April 2023 menu. These examples are not affiliated with or endorsed by the restaurants.<br>PDFs generated by Menu Atelier with embedded licensed fonts and the same measured layout used in its editor.</footer><script>document.querySelector('.filters').addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(!button)return;document.querySelectorAll('[data-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));document.querySelectorAll('[data-design]').forEach(card=>card.hidden=button.dataset.filter!=='all'&&card.dataset.design!==button.dataset.filter);});</script></body></html>`);
if(process.argv.includes('--publish-assets')){
 const target=new URL('../dist/grading/',import.meta.url);
 await fs.mkdir(target,{recursive:true});
 for(const name of await fs.readdir(target))if(name.endsWith('.svg')||/-\d+\.png$/.test(name))await fs.unlink(new URL(name,target));
 for(const name of await fs.readdir(directory))if(/\.(pdf|json|png|html)$/.test(name)&&!/-\d+\.png$/.test(name))await fs.copyFile(new URL(name,directory),new URL(name,target));
}
console.log(JSON.stringify(manifest.map(({restaurant,template,pages,dishes})=>({restaurant,template,pages,dishes})),null,2));
