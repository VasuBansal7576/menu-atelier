export const SCHEMA_VERSION = 1;
export const currencies = { USD: '$', GBP: '£', EUR: '€', INR: '₹', CAD: 'CA$', AUD: 'A$', JPY: '¥' };
export const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const clone = value => JSON.parse(JSON.stringify(value));
export const minorDigits = currency => currency === 'JPY' ? 0 : 2;
export function parsePrice(value, currency = 'USD') {
  const raw = String(value).trim().replace(/(?:USD|GBP|EUR|INR|CAD|AUD|JPY|CA\$|A\$|[$£€₹¥])/gi, '').trim();
  if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/.test(raw)) throw new Error('Enter a non-negative price, such as 18.50.');
  if (currency === 'JPY' && raw.includes('.')) throw new Error('JPY uses whole-number prices.');
  const price = Math.round(Number(raw.replaceAll(',', '')) * 10 ** minorDigits(currency));
  if (!Number.isSafeInteger(price) || price > 999999999) throw new Error('Price is too large.');
  return price;
}
export function formatPrice(price, currency) {
  return (currencies[currency] || `${currency} `) + (price / 10 ** minorDigits(currency)).toFixed(minorDigits(currency));
}
export function priceInput(price, currency) { return (price / 10 ** minorDigits(currency)).toFixed(minorDigits(currency)); }
const string = (value, field, max = 500) => {
  if (typeof value !== 'string' || value.length > max) throw new Error(`${field} must be text of at most ${max} characters.`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new Error(`${field} contains unsupported control characters.`);
  return value;
};
export function validateMenu(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.schemaVersion !== 1) throw new Error('This file needs a Menu Atelier menu with schemaVersion 1.');
  if (!currencies[input.currency]) throw new Error('Choose a supported currency.');
  const menu = { schemaVersion: 1, id: string(input.id, 'Menu id', 100), name: string(input.name, 'Restaurant name', 120), subtitle: string(input.subtitle, 'Subtitle', 240), currency: input.currency, footer: string(input.footer, 'Footer', 500), source: null, sections: [] };
  if (!menu.name.trim()) throw new Error('Restaurant name is required.');
  if (input.source != null) {
    const source = input.source;
    menu.source = { label: string(source.label || '', 'Source label', 300), url: string(source.url || '', 'Source URL', 2000), accessedAt: string(source.accessedAt || '', 'Source date', 100), note: string(source.note || '', 'Source note', 3000) };
    if (menu.source.url && !/^https?:\/\//.test(menu.source.url)) throw new Error('Source URL must begin with https:// or http://.');
  }
  if (!Array.isArray(input.sections) || input.sections.length > 100) throw new Error('A menu can have at most 100 categories.');
  const ids = new Set([menu.id]);
  const uniqueId = value => { const id = string(value, 'Id', 100); if (!id || ids.has(id)) throw new Error('Each category and dish needs a unique id.'); ids.add(id); return id; };
  let count = 0;
  menu.sections = input.sections.map(section => {
    if (!section || !Array.isArray(section.items)) throw new Error('Each category needs an items array.');
    const sectionName = string(section.name, 'Category', 120);
    if (!sectionName.trim()) throw new Error('Every category needs a name.');
    return { id: uniqueId(section.id), name: sectionName, items: section.items.map(item => {
      if (++count > 1000) throw new Error('A menu can have at most 1,000 dishes.');
      if (!item || !Number.isSafeInteger(item.price) || item.price < 0 || item.price > 999999999) throw new Error('Dish prices must be non-negative integer minor units.');
      if (!Array.isArray(item.tags) || item.tags.length > 10 || item.tags.some(tag => typeof tag !== 'string' || tag.length > 40)) throw new Error('Dish tags must be an array of short labels.');
      const itemName = string(item.name, 'Dish name', 160);
      if (!itemName.trim()) throw new Error('Every dish needs a name.');
      return { id: uniqueId(item.id), name: itemName, description: string(item.description, 'Description', 1200), price: item.price, tags: [...item.tags] };
    }) };
  });
  return menu;
}
export function createMenu(name = 'Untitled restaurant') { return { schemaVersion: 1, id: uid(), name, subtitle: '', currency: 'USD', footer: '', source: null, sections: [] }; }
export function createHistory(initial) {
  let past = [], future = [], current = clone(initial);
  return {
    get value() { return current; }, get canUndo() { return past.length > 0; }, get canRedo() { return future.length > 0; },
    commit(value) { if (JSON.stringify(value) === JSON.stringify(current)) return false; past.push(clone(current)); if (past.length > 80) past.shift(); current = clone(value); future = []; return true; },
    undo() { if (!past.length) return false; future.push(clone(current)); current = past.pop(); return true; },
    redo() { if (!future.length) return false; past.push(clone(current)); current = future.pop(); return true; }
  };
}
export function demoMenu() {
  const menu = createMenu('Olive & Ember');
  menu.subtitle = 'A seasonal table, a little closer to nature.';
  menu.footer = 'Made with the season. Meant to be shared.\nPlease tell us about any allergies before ordering.';
  menu.sections = [
    { id: uid(), name: 'To begin', items: [
      { id: uid(), name: 'Whipped ricotta', description: 'Hot honey, lemon zest, toasted sourdough', price: 1200, tags: ['vegetarian'] },
      { id: uid(), name: 'Heirloom tomatoes', description: 'Peach, basil oil, aged sherry vinegar', price: 1450, tags: ['vegan'] },
      { id: uid(), name: 'Crispy artichokes', description: 'Preserved lemon aioli, garden herbs', price: 1300, tags: ['vegetarian'] }
    ] },
    { id: uid(), name: 'From the kitchen', items: [
      { id: uid(), name: 'Wild mushroom pappardelle', description: 'Hand-cut pasta, woodland mushrooms, thyme', price: 2400, tags: ['vegetarian'] },
      { id: uid(), name: 'Wood-fired sea bass', description: 'White beans, fennel, salsa verde', price: 2850, tags: [] },
      { id: uid(), name: 'Slow-roasted aubergine', description: 'Tahini yoghurt, pomegranate, warm flatbread', price: 2150, tags: ['vegetarian'] },
      { id: uid(), name: 'Steak frites', description: 'Bavette, rosemary fries, peppercorn butter', price: 3200, tags: [] }
    ] },
    { id: uid(), name: 'A little sweetness', items: [
      { id: uid(), name: 'Olive oil cake', description: 'Roasted apricot, crème fraîche', price: 950, tags: ['vegetarian'] },
      { id: uid(), name: 'Dark chocolate crémeux', description: 'Sea salt, hazelnut, a spoon of espresso cream', price: 1100, tags: ['vegetarian'] }
    ] }
  ];
  return menu;
}
