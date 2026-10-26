import { jsPDF } from 'jspdf';
import { writeFile } from 'node:fs/promises';

const doc=new jsPDF({unit:'pt'}), metrics={};
const characters=[...new Set(Array.from({length:224},(_,i)=>String.fromCharCode(i+32)).concat([..."ŒœŠšŸŽž€–—‘’“”•…"]))];
for(const [family,font] of [['serif','times'],['sans','helvetica']]){
  metrics[family]={};
  for(const style of ['normal','bold','italic']){
    doc.setFont(font,style);
    metrics[family][style]=Object.fromEntries(characters.map(c=>[c,Math.round(doc.getStringUnitWidth(c)*1000)/1000]));
  }
}
await writeFile('dist/font-metrics.js',`export const fontMetrics=${JSON.stringify(metrics)};\n`);
console.log('Generated PDF font metrics shared by both renderers.');
