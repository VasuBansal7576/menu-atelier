import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { validateMenu } from '../dist/model.js';
import { prepareTypography, layoutMenu, templates, renderSVG } from '../dist/layout.js';
import { createPDF } from '../dist/export.js';

const directory = new URL('../outputs/grade/', import.meta.url);
const curated = [
 { menuId: 'pizzeria-bianco', templateId: 'trattoria' },
 { menuId: 'balthazar', templateId: 'atelier' },
 { menuId: 'dishoom', templateId: 'midnight' }
];
await fs.mkdir(directory, { recursive: true });
await fs.rm(new URL('pages/', directory), { recursive: true, force: true });
await prepareTypography();
const menus = JSON.parse(await fs.readFile(new URL('../dist/examples/index.json', import.meta.url), 'utf8'));
const manifest = [];
for (const raw of menus) {
 const menu = validateMenu(raw);
 for (const template of Object.keys(templates)) {
  const settings = { template, pageSize: 'a4', density: 'balanced' };
  const scenes = layoutMenu(menu, settings);
  const filename = `${menu.id}-${template}`;
  const doc = await createPDF(scenes, menu.name);
  const pdfPath = fileURLToPath(new URL(filename + '.pdf', directory));
  await fs.writeFile(pdfPath, Buffer.from(doc.output('arraybuffer')));
  await fs.writeFile(new URL(filename + '.json', directory), JSON.stringify({ menu, settings }, null, 2));
  await fs.writeFile(new URL(filename + '.svg', directory), renderSVG(scenes[0]));
  const pageDirectory = new URL(`pages/${filename}/`, directory);
  await fs.mkdir(pageDirectory, { recursive: true });
  const pageImages = [];
  for (const [index, scene] of scenes.entries()) {
   const number = index + 1;
   const png = `pages/${filename}/page-${number}.png`;
   execFileSync('pdftoppm', ['-f', String(number), '-l', String(number), '-singlefile', '-scale-to', '1100', '-png', pdfPath, fileURLToPath(new URL(`page-${number}`, pageDirectory))], { env: { ...process.env, XDG_CACHE_HOME: fileURLToPath(new URL('../.pstack/cache/', import.meta.url)) }, stdio: 'pipe' });
   const bytes = await fs.readFile(new URL(png, directory));
   pageImages.push({ number, png, pixelWidth: bytes.readUInt32BE(16), pixelHeight: bytes.readUInt32BE(20), width: scene.width, height: scene.height });
  }
  await fs.copyFile(new URL(pageImages[0].png, directory), new URL(filename + '.png', directory));
  const selection = curated.findIndex(item => item.menuId === menu.id && item.templateId === template);
  manifest.push({ restaurant: menu.name, menuId: menu.id, template: templates[template].name, templateId: template, filename, pages: scenes.length, pageImages, format: scenes[0].format.name, curatedOrder: selection < 0 ? null : selection + 1, dishes: menu.sections.reduce((n, s) => n + s.items.length, 0), source: menu.source.url, sourceLabel: menu.source.label, sourceNote: menu.source.note, sourceAccessedAt: menu.source.accessedAt });
 }
}
await fs.writeFile(new URL('manifest.json', directory), JSON.stringify(manifest, null, 2));
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ordered = [...manifest].sort((a, b) => (a.curatedOrder ?? 99) - (b.curatedOrder ?? 99));
const mm = value => (value * 25.4 / 72).toFixed(1);
const cards = ordered.map(entry => {
 const first = entry.pageImages[0];
 const pages = entry.pageImages.map(page => `<figure${page.width > page.height ? ' class="landscape"' : ''}><a href="${entry.filename}.pdf#page=${page.number}" aria-label="Open ${esc(entry.restaurant)} ${esc(entry.template)} PDF page ${page.number}"><img src="${page.png}" alt="${esc(entry.restaurant + ' ' + entry.template)}, actual PDF page ${page.number} of ${entry.pages}" width="${page.pixelWidth}" height="${page.pixelHeight}" loading="lazy"></a><figcaption>Page ${page.number} of ${entry.pages}</figcaption></figure>`).join('');
 return `<article data-design="${esc(entry.templateId)}" data-curated="${entry.curatedOrder !== null}"${entry.curatedOrder === null ? ' hidden' : ''}><div class="study-heading"><div><p class="composition">${esc(entry.template)}</p><h2>${esc(entry.restaurant)}</h2></div><a class="pdf-link" href="${entry.filename}.pdf">Open PDF ↗</a></div><p class="study-details">${esc(entry.format)} · ${mm(first.width)} × ${mm(first.height)} mm · ${entry.pages} page${entry.pages === 1 ? '' : 's'} · ${entry.dishes} dishes</p>${entry.pages > 1 ? `<p class="page-help">Scroll to see all ${entry.pages} pages. Open any page to inspect the PDF.</p>` : ''}<div class="page-strip" tabindex="0" role="group" aria-label="All ${entry.pages} PDF pages">${pages}</div><div class="card-links"><a href="${entry.filename}.json" download>Editable backup ↓</a><a href="${esc(entry.source)}" target="_blank" rel="noopener">${esc(entry.sourceLabel)} ↗</a></div><details class="source-note"><summary>Source and snapshot details</summary><p>Accessed ${esc(entry.sourceAccessedAt)}. ${esc(entry.sourceNote)}</p></details></article>`;
}).join('');
const filters = Object.entries(templates).map(([id, t]) => `<button data-filter="${esc(id)}" aria-pressed="false">${esc(t.name)}</button>`).join('');
await fs.writeFile(new URL('index.html', directory), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Menu Atelier · Restaurant studies</title><link rel="stylesheet" href="../fonts/fonts.css"><style>
:root{font-family:'MenuAtelier Source Sans 3',system-ui,sans-serif;font-synthesis:none;color:#382e26;background:#f5f2eb;--muted:#827568;--line:#ddd3c5;--red:#a93529}*{box-sizing:border-box}body{margin:0}a{color:inherit;text-underline-offset:4px}header,main,footer{max-width:1200px;margin:auto;padding-left:clamp(20px,5vw,64px);padding-right:clamp(20px,5vw,64px)}nav{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:23px 0;border-bottom:1px solid var(--line)}nav a{text-decoration:none;font-size:14px}.brand{display:flex;align-items:center;gap:12px;font-size:17px}.brand-mark{font-family:'MenuAtelier Cormorant Garamond',Georgia,serif;font-size:34px;letter-spacing:-4px;color:var(--red);padding-right:4px}.intro{padding:32px 0 24px;max-width:700px}h1{font:500 clamp(29px,4vw,39px)/1.12 'MenuAtelier Fraunces',Georgia,serif;letter-spacing:-.7px;margin:0 0 12px}.intro p{line-height:1.55;color:var(--muted);margin:0;font-size:16px}.filters{display:flex;gap:7px;flex-wrap:wrap;padding-bottom:18px;border-bottom:1px solid var(--line)}button{cursor:pointer;min-height:42px;border:1px solid var(--line);border-radius:4px;padding:8px 13px;font:inherit;font-size:14px;background:transparent;color:inherit}.filters button[aria-pressed=true]{background:#f4e8dc;color:var(--red);border-color:#b76e55}.result-count{font-size:14px;color:var(--muted);margin:15px 0 0}main{padding-top:10px;padding-bottom:40px}article{padding:30px 0 32px;border-bottom:1px solid var(--line)}.study-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.composition{font-size:13px;letter-spacing:.07em;text-transform:uppercase;color:var(--red);margin:0 0 5px}h2{font:500 29px/1.15 'MenuAtelier Fraunces',Georgia,serif;letter-spacing:-.5px;margin:0}.study-details{font-size:14px;color:var(--muted);margin:10px 0 18px}.pdf-link{font-size:14px;text-decoration:none;border:1px solid var(--line);padding:10px 13px;border-radius:4px;white-space:nowrap}.page-strip{display:flex;align-items:flex-start;gap:20px;overflow-x:auto;padding:22px 22px 17px;background:#eae3d8;scroll-snap-type:x proximity;overscroll-behavior-x:contain}.page-strip figure{margin:0;flex:0 0 min(100%,540px);width:min(100%,540px);scroll-snap-align:start}.page-strip:has(figure:only-child){justify-content:center}.page-strip figure.landscape{flex-basis:min(100%,800px);width:min(100%,800px)}.page-help{font-size:13px;color:var(--muted);margin:-6px 0 12px}.page-strip:focus-visible{outline:2px solid #34745e;outline-offset:3px}.page-strip img{width:100%;height:auto;display:block;box-shadow:0 5px 15px #43311c20;background:#fffcf5}.page-strip a{display:block}.page-strip figcaption{font-size:13px;color:#766757;margin-top:12px}.card-links{display:flex;gap:20px;flex-wrap:wrap;font-size:14px;margin-top:17px}.source-note{font-size:13px;color:var(--muted);line-height:1.5;margin-top:13px}.source-note summary{cursor:pointer;min-height:32px;padding:5px 0}.source-note p{max-width:780px;margin:5px 0 0}footer{font-size:14px;color:var(--muted);line-height:1.6;padding-bottom:35px}button:focus-visible,a:focus-visible,summary:focus-visible{outline:2px solid #34745e;outline-offset:4px}[hidden]{display:none!important}@media(max-width:620px){nav{align-items:flex-start}.brand{font-size:15px}.intro{padding-top:26px}.page-strip{padding:14px;gap:14px}.study-heading{gap:10px}h2{font-size:25px}.pdf-link{padding:9px;font-size:13px}.card-links{gap:10px 18px}}
</style></head><body><header><nav><a class="brand" href="../"><span class="brand-mark" aria-hidden="true">Ma</span>Menu Atelier</a><a href="../">Open the studio ↗</a></nav><div class="intro"><h1>Restaurant studies</h1><p>Three selected restaurant excerpts, each paired with a composition. Every preview below is a page of the exported PDF. Open any page at full size or restore its editable backup in the studio.</p></div><div class="filters" role="group" aria-label="Filter menu designs"><button data-filter="curated" aria-pressed="true">Selected studies</button><button data-filter="all" aria-pressed="false">All 12 exports</button>${filters}</div><p class="result-count" aria-live="polite">3 selected studies</p></header><main>${cards}</main><footer>Unofficial demonstrations with attributed source snapshots. Pizzeria Bianco uses an April 2023 menu snapshot. These examples are not affiliated with or endorsed by the restaurants. Names and prices come from the linked originals.<br>PDFs contain selectable text and embedded licensed fonts. Page dimensions match each composition in the editor.</footer><script>document.querySelector('.filters').addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(!button)return;document.querySelectorAll('[data-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));let count=0;document.querySelectorAll('[data-design]').forEach(card=>{const visible=button.dataset.filter==='all'||(button.dataset.filter==='curated'?card.dataset.curated==='true':card.dataset.design===button.dataset.filter);card.hidden=!visible;if(visible)count++});document.querySelector('.result-count').textContent=count+(button.dataset.filter==='curated'?' selected studies':' exports');});</script></body></html>`);
if (process.argv.includes('--publish-assets')) {
 const target = new URL('../dist/grading/', import.meta.url);
 await fs.mkdir(target, { recursive: true });
 for (const name of await fs.readdir(target)) if (/^(?:(?:dishoom|balthazar|pizzeria-bianco)-(?:trattoria|atelier|botanical|midnight)\.(?:svg|pdf|json|png)|manifest\.json|index\.html)$/.test(name)) await fs.unlink(new URL(name, target));
 await fs.rm(new URL('pages/', target), { recursive: true, force: true });
 for (const name of await fs.readdir(directory)) if (/\.(pdf|json|png|html)$/.test(name) && name !== 'verification.json' && !/-\d+\.png$/.test(name)) await fs.copyFile(new URL(name, directory), new URL(name, target));
 await fs.cp(new URL('pages/', directory), new URL('pages/', target), { recursive: true });
}
console.log(JSON.stringify(manifest.map(({ restaurant, template, format, pages, dishes }) => ({ restaurant, template, format, pages, dishes })), null, 2));
