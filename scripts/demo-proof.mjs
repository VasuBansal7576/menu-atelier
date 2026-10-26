import fs from 'node:fs/promises';
import { parseImport } from '../dist/import.js';
import { validateMenu, clone } from '../dist/model.js';
import { prepareTypography, layoutMenu } from '../dist/layout.js';
import { createPDF } from '../dist/export.js';

const text = await fs.readFile(new URL('../dist/examples/olive-and-ember-demo.txt', import.meta.url), 'utf8');
const before = validateMenu(parseImport(text, 'text', 'USD').menu);
const after = clone(before);
const dish = after.sections.flatMap(section => section.items).find(item => item.name === 'Whipped ricotta');
if (!dish || dish.price !== 1200) throw new Error('The original demo price changed. Review the demonstration.');
dish.price = 1450;
const settings = { template: 'trattoria', pageSize: 'a4', density: 'balanced' };
await prepareTypography();
for (const [suffix, menu] of [['before', before], ['price-change', after]]) {
  const base = new URL(`../dist/grading/olive-and-ember-${suffix}`, import.meta.url);
  const document = await createPDF(layoutMenu(menu, settings), menu.name);
  await fs.writeFile(new URL(base.href + '.pdf'), Buffer.from(document.output('arraybuffer')));
  await fs.writeFile(new URL(base.href + '.json'), JSON.stringify({ menu, settings }, null, 2) + '\n');
}
console.log('Original demo PDFs prepared. Whipped ricotta changes from $12.00 to $14.50.');
