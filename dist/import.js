import { createMenu, uid, parsePrice, validateMenu } from './model.js';
import { validateRecipe } from './design-generator.js';

export function parseCSV(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else if (!field || quoted) quoted = !quoted; else throw new Error('CSV contains an unexpected quote.'); }
    else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); if (row.some(x => x.trim())) rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (quoted) throw new Error('CSV has an unclosed quoted field.');
  row.push(field); if (row.some(x => x.trim())) rows.push(row);
  return rows;
}
export function candidateFromCSV(text, currency = 'USD', name = 'Imported menu') {
  const rows = parseCSV(text.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new Error('CSV needs a header and at least one dish. Use category,name,description,price,tags.');
  const headers = rows.shift().map(x => x.trim().toLowerCase());
  if (!headers.includes('name') || !headers.includes('price')) throw new Error('CSV headers must include name and price. Optional columns are category, description and tags.');
  const menu = createMenu(name); menu.currency = currency;
  const warnings = [];
  const get = (row, key) => row[headers.indexOf(key)]?.trim() || '';
  for (const row of rows) {
    if (row.length > headers.length) throw new Error('A CSV row has more values than headers. Put commas inside quoted fields.');
    const category = get(row, 'category') || get(row, 'section') || 'Menu';
    let section = menu.sections.find(x => x.name === category);
    if (!section) menu.sections.push(section = { id: uid(), name: category, items: [] });
    let price = null;
    try { price = parsePrice(get(row, 'price'), currency); } catch { warnings.push(`Check the price for ${get(row, 'name') || 'unnamed dish'}.`); }
    section.items.push({ id: uid(), name: get(row, 'name'), description: get(row, 'description'), price, tags: get(row, 'tags').split(/[;|]/).map(x => x.trim()).filter(Boolean) });
  }
  return { menu, warnings, method: 'CSV' };
}
export function candidateFromText(text, currency = 'USD') {
  const lines = text.replace(/\r/g, '').split('\n').map(x => x.trim()).filter(Boolean);
  if (!lines.length) throw new Error('Add some menu text first.');
  if (lines.length > 4000) throw new Error('This text is too long. Import a smaller menu excerpt.');
  const menu = createMenu('Imported menu'); menu.currency = currency;
  const warnings = [];
  let section = null, lastItem = null, pendingLine = '';
  const sectionFor = name => { menu.sections.push(section = { id: uid(), name, items: [] }); lastItem = null; };
  const trailingPrice = /(?:\s+|\.{2,}|\t)(?:[$£€₹¥]\s*|(?:USD|GBP|EUR|INR|CAD|AUD|JPY)\s*)?(\d[\d,]*(?:\.\d{1,2})?)\s*(?:[$£€₹¥]|USD|GBP|EUR|INR|CAD|AUD|JPY)?\s*$/i;
  const looksHeading = line => {
    const base=line.replace(/\([^)]*\)/g,'').trim();
    return line.startsWith('#') || line.endsWith(':') || (base===base.toUpperCase() && /[A-Z]/.test(base) && base.length<80 && !/[,;.]|\bWITH\b/.test(base));
  };
  const expanded=[];
  for(const line of lines){
    const amounts=[...line.matchAll(/(?:[$£€₹¥]\s*)?\d[\d,]*\.\d{1,2}(?=\s|$)/g)];
    if(amounts.length>1){let start=0;for(const amount of amounts){const end=amount.index+amount[0].length;expanded.push(line.slice(start,end).trim());start=end;}if(line.slice(start).trim())expanded.push(line.slice(start).trim());warnings.push('A line had multiple prices. Its dishes were split for review; compare them with your source.');}
    else expanded.push(line);
  }
  expanded.forEach((rawLine, index) => {
    let line=(pendingLine?pendingLine+' ':'')+rawLine;pendingLine='';
    const match = line.match(trailingPrice);
    const uncertainPrice=!match&&line.match(/\s+(?:[$£€₹¥]\s*)?[\dOolI]+[.,][\dOolI]{1,3}\s*$/);
    if(uncertainPrice){if(!section)sectionFor('Menu');section.items.push(lastItem={id:uid(),name:line.slice(0,uncertainPrice.index).trim(),description:'',price:null,tags:[]});warnings.push(`An unclear price needs review for ${lastItem.name}.`);return;}
    if (match) {
      if (!section) sectionFor('Menu');
      const body = line.slice(0, match.index).replace(/[.\s]+$/, '').trim();
      const [name, ...description] = body.split(/\s*\.{2,}\s*|\s+[—–|]\s+|\s+-\s+|(?<=[A-Z])-\s*(?=[A-Z][a-z])/);
      let price = null;
      try { price = parsePrice(match[1], currency); } catch { warnings.push(`Check the price for ${name}.`); }
      section.items.push(lastItem = { id: uid(), name, description: description.join(' · '), price, tags: [] });
    } else if (index === 0 && !looksHeading(line)) menu.name = line;
    else if (looksHeading(line)) sectionFor(line.replace(/^#+\s*/, '').replace(/:$/, ''));
    else if(expanded[index+1]?.match(trailingPrice) && (!lastItem || (line===line.toUpperCase()&&/[A-Z]/.test(line))) && (line.length>60 || /[,;]/.test(line) || /\b(?:WITH|AND|VIRGIN|OF|THE)$/i.test(line))) {pendingLine=line;warnings.push(`A wrapped line was joined for review: ${line.slice(0,55)}…`);}
    else if (lastItem) lastItem.description += (lastItem.description ? ' ' : '') + line;
    else if (!section && index === 0) menu.name = line;
    else if (!section) menu.subtitle += (menu.subtitle ? ' ' : '') + line;
    else { section.items.push(lastItem = { id: uid(), name: line, description: '', price: null, tags: [] }); warnings.push(`No price found for ${line}.`); }
  });
  if (!menu.sections.some(s => s.items.length)) throw new Error('No priced dishes found. Put each dish and its price on one line, or use CSV for precise results.');
  warnings.unshift('Review every name and price. Plain text cannot reliably recover columns or dietary labels.');
  return { menu, warnings, method: 'Text' };
}
export function candidateFromJSON(text) {
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('This JSON is malformed. Your current menu is unchanged.'); }
  if(!value || typeof value!=='object' || Array.isArray(value))throw new Error('JSON must contain a menu object with schemaVersion 1.');
  const settings=value.settings;
  if(settings && (!['atelier','trattoria','botanical','midnight'].includes(settings.template)||!['a4','letter'].includes(settings.pageSize)||!['compact','balanced','spacious'].includes(settings.density)))throw new Error('This JSON backup contains invalid design settings.');
  if(settings?.recipe){const recipe=validateRecipe(settings.recipe,{template:settings.template});if(recipe.density!==settings.density)throw new Error('The saved design recipe and spacing setting must match.');}
  return { menu: validateMenu(value.menu || value), warnings: settings?['This backup will also restore its saved design and page settings.']:[], method: 'JSON', ...(settings?{settings:{template:settings.template,pageSize:settings.pageSize,density:settings.density,...(settings.recipe?{recipe:validateRecipe(settings.recipe)}:{})}}:{}) };
}
export function parseImport(text, type = 'text', currency = 'USD', name) {
  if (text.length > 3_000_000) throw new Error('Import a text file smaller than 3 MB.');
  if (type === 'json') return candidateFromJSON(text);
  if (type === 'csv') return candidateFromCSV(text, currency, name);
  return candidateFromText(text, currency);
}
const loadScript = src => new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = src; script.onload = resolve; script.onerror = () => reject(new Error('Could not load the local OCR library.')); document.head.append(script); });
let ocrLibrary;
export async function recognizeImage(file, onProgress = () => {}) {
  onProgress('Loading the local OCR worker…');
  if (!ocrLibrary) ocrLibrary = loadScript('./vendor/tesseract.min.js');
  await ocrLibrary;
  const worker = await globalThis.Tesseract.createWorker('eng', 1, {
    workerPath: new URL('./vendor/worker.min.js', import.meta.url).href,
    corePath: new URL('./vendor/tesseract-core', import.meta.url).href,
    langPath: new URL('./vendor/tessdata', import.meta.url).href,
    logger: message => onProgress(`${message.status} ${Math.round((message.progress || 0) * 100)}%`)
  });
  try { const result = await worker.recognize(file); return result.data.text; } finally { await worker.terminate(); }
}
export async function extractPDF(file, onProgress = () => {}) {
  const pdfjs = await import('./vendor/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.mjs', import.meta.url).href;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
  const pdf = await task.promise;
  if (pdf.numPages > 30) { await task.destroy(); throw new Error('Import up to 30 PDF pages at a time.'); }
  const lines = [];
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress(`Reading PDF page ${i} of ${pdf.numPages}…`);
      const page = await pdf.getPage(i);
      const { items } = await page.getTextContent();
      let currentY = null, current = '';
      for (const item of items) {
        if (!('str' in item)) continue;
        const y = Math.round(item.transform[5]);
        if (currentY != null && Math.abs(y - currentY) > 3) { if (current.trim()) lines.push(current); current = ''; }
        current += (current ? ' ' : '') + item.str; currentY = y;
        if (item.hasEOL) { if (current.trim()) lines.push(current); current = ''; currentY = null; }
      }
      if (current.trim()) lines.push(current);
    }
  } finally { await task.destroy(); }
  const text = lines.join('\n');
  if (text.replace(/\s/g, '').length < 15) throw new Error('This PDF has no readable text layer. Upload a PNG or JPEG of the menu for OCR, or paste its text.');
  return text;
}
