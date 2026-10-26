import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { validateMenu } from '../dist/model.js';

const sources=JSON.parse(await readFile('research/sources.json','utf8'));
await mkdir('dist/examples',{recursive:true});
const examples=sources.map(source=>validateMenu({schemaVersion:1,id:source.id,name:source.name,subtitle:source.tagline,currency:source.currency,footer:'Unofficial demonstration excerpt. Source snapshot prices.\nNot affiliated with or endorsed by the restaurant.',source:source.source,sections:source.sections.map(s=>({...s,id:`${source.id}-${s.id}`,items:s.items.map(i=>({...i,id:`${source.id}-${i.id}`,price:Math.round(i.price*100)}))}))}));
for(const menu of examples){await writeFile(`dist/examples/${menu.id}.json`,JSON.stringify(menu,null,2));await writeFile(`dist/examples/${menu.id}.txt`,`${menu.name}\n\n${menu.sections.map(s=>`## ${s.name}\n${s.items.map(i=>`${i.name} — ${i.description} ${(i.price/100).toFixed(2)}`).join('\n')}`).join('\n\n')}\n`);}
await writeFile('dist/examples/index.json',JSON.stringify(examples));
console.log(`Prepared ${examples.length} sourced examples.`);
