import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createWorker } from 'tesseract.js';
import { candidateFromText } from '../dist/import.js';

test('real local OCR recovers10 source dishes and exact prices from a raster specimen',async()=>{
  const worker=await createWorker('eng',1,{langPath:'dist/vendor/tessdata',cachePath:'/tmp/menu-atelier-ocr-test-cache'});
  try{
    const {data}=await worker.recognize('tests/fixtures/dishoom-source.png');
    const result=candidateFromText(data.text,'GBP');
    const source=JSON.parse(await readFile('dist/examples/dishoom.json','utf8'));
    const expected=source.sections.flatMap(s=>s.items.map(i=>({name:i.name,price:i.price})));
    const actual=result.menu.sections.flatMap(s=>s.items.map(i=>({name:i.name,price:i.price})));
    assert.deepEqual(actual,expected);
    assert.ok(result.menu.sections.flatMap(s=>s.items).every(i=>i.tags.length===0));
  }finally{await worker.terminate();}
});
