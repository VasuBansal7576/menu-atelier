import { demoMenu, validateMenu, createHistory, clone, uid, parsePrice, priceInput, formatPrice, currencies } from './model.js';
import { templates, layoutMenu, renderSVG, prepareTypography } from './layout.js';
import { parseImport, extractPDF, recognizeImage } from './import.js';
import { generateDirections, validateRecipe } from './design-generator.js';
import { createPDF, downloadBlob, unsupportedCharacters } from './export.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const startupControls=document.querySelectorAll('button,input,select,textarea');
startupControls.forEach(control=>control.disabled=true);
document.body?.setAttribute('aria-busy','true');
try { await prepareTypography(); }
catch(error) {
  $('#pages').innerHTML=`<div class="startup-error" role="alert"><h2>The document fonts could not load.</h2><p>${escape(error.message)}</p><button id="retry-fonts" class="button secondary">Reload studio</button></div>`;
  $('#save-status').textContent='Font loading failed';
  document.body?.removeAttribute('aria-busy');
  $('#retry-fonts').onclick=()=>location.reload();
  throw error;
}
startupControls.forEach(control=>control.disabled=false);
document.body?.removeAttribute('aria-busy');

const defaultSettings = { template: 'trattoria', pageSize: 'a4', density: 'balanced' };
let initial = { menu: demoMenu(), settings: defaultSettings }, storageError = '', restoredDraft = false;
try {
  const saved = localStorage.getItem('menu-atelier-v1');
  if(saved) { const data = JSON.parse(saved); const loaded = { menu: validateMenu(data.menu), settings: {template: templates[data.settings?.template] ? data.settings.template : defaultSettings.template,pageSize: data.settings?.pageSize === 'letter' ? 'letter' : 'a4',density: ['compact','balanced','spacious'].includes(data.settings?.density) ? data.settings.density : 'balanced', ...(data.settings?.recipe ? {recipe:validateRecipe(data.settings.recipe)} : {})} };layoutMenu(loaded.menu,loaded.settings);initial=loaded;restoredDraft=true; }
} catch(error) { storageError = `The saved draft could not be opened. Your browser backup is retained. ${error.message}`; }
const history = createHistory(initial);
let directions = [], directionSeed = 0;
let selected = '', editSession = null, view = 'paper', candidate = null, categoryId = '', pages = [], examples = [], toastTimer, lastCommitError = '', importGeneration = 0;
const collapsed = new Set();
const state = () => editSession?.draft || history.value;
const dishCount = menu => menu.sections.reduce((sum, section) => sum + section.items.length, 0);
const selectedRecord = () => state().menu.sections.flatMap(section => section.items.map(item => ({ section, item }))).find(record => record.item.id === selected);
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4000); }
function announce(message) { $('#workspace-status').textContent = message; }
function persist() {
  try { localStorage.setItem('menu-atelier-v1', JSON.stringify(history.value)); $('#save-status').textContent = 'Saved in this browser'; $('#save-status').classList.remove('save-error'); }
  catch { $('#save-status').textContent = 'Could not save · download a backup'; $('#save-status').classList.add('save-error'); }
}
function showView(nextView) {
  view = nextView;
  document.querySelectorAll('[data-view]').forEach(button => { const active = button.dataset.view === view; button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1; });
  $('#canvas-area').hidden = view !== 'paper'; $('#inventory').hidden = view !== 'inventory'; $('#zoom-fit').disabled = view !== 'paper';
}
function commit(mutator, options = {}) {
  if (editSession && !finishEdit({ restoreFocus: false })) return false;
  const next = clone(history.value); mutator(next);
  try { next.menu = validateMenu(next.menu); const nextPages = layoutMenu(next.menu, next.settings); lastCommitError = ''; $('#edit-error').hidden = true; if (history.commit(next)) { persist(); render({ ...options, pages: nextPages }); } return true; }
  catch (error) { lastCommitError = error.message; $('#edit-error').textContent = error.message; $('#edit-error').hidden = false; toast(error.message); return false; }
}
function pageDescription(page) {
  const mm = value => Math.round(value * 25.4 / 72);
  return `${page.format?.name || (state().settings.pageSize === 'letter' ? 'US Letter' : 'A4')} · ${mm(page.width)} × ${mm(page.height)} mm`;
}
function render(options = {}) {
  const { menu, settings } = state();
  $('#project-name').textContent = menu.name; $('#current-design').textContent = settings.recipe?.name || templates[settings.template].name;
  renderDirectionSummary();
  $('#content-tab').textContent = `All ${dishCount(menu)} dishes`;
  $('#undo').disabled = !history.canUndo && !editSession; $('#redo').disabled = !history.canRedo || Boolean(editSession);
  for (const [id, value] of [['menu-name', menu.name], ['menu-subtitle', menu.subtitle], ['menu-currency', menu.currency], ['page-size', settings.pageSize]]) if (document.activeElement !== $(`#${id}`)) $(`#${id}`).value = value;
  document.querySelectorAll('[data-density]').forEach(button => { button.classList.toggle('active', button.dataset.density === settings.density); button.setAttribute('aria-pressed', String(button.dataset.density === settings.density)); });
  pages = options.pages || layoutMenu(menu, settings);
  $('#pages').innerHTML = pages.map((page, index) => `<div class="paper-wrap">${renderSVG(page, { interactive: true, selected })}<span class="page-number">${pages.length > 1 ? `Page ${index + 1} of ${pages.length}` : ''}</span></div>`).join('');
  document.querySelectorAll('#pages [data-item]').forEach(hit => { const item = menu.sections.flatMap(section => section.items).find(item => item.id === hit.dataset.item); if (item) hit.setAttribute('aria-label', `Edit price for ${item.name}, ${formatPrice(item.price, menu.currency)}`); });
  $('#actual-format').textContent = `Printed format · ${pageDescription(pages[0])}. The composition determines orientation.`;
  $('#page-status').textContent = `${pageDescription(pages[0])} · ${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`;
  if (editSession && $('#selection-title')) { const record = selectedRecord(); if (record) { $('#selection-title').textContent = record.item.name; $('#dish-price').setAttribute('aria-label', `Price for ${record.item.name} in ${menu.currency}`); $('.editor-kicker').textContent = `${record.section.name} · ${menu.currency}`; } }
  if (!options.skipList) renderSections();
  if (options.editor) renderEditor();
  renderSource(); fitPaper(); positionEditor();
}
function renderTemplates() {
  const { menu, settings } = state();
  $('#template-grid').innerHTML = Object.entries(templates).map(([key, template]) => {
    try { const scene = layoutMenu(menu, { ...settings, template: key, recipe: undefined })[0]; return `<button class="template-card ${settings.template === key ? 'selected' : ''}" data-template="${key}" aria-label="Choose ${escape(template.name)} design" aria-pressed="${settings.template === key}"><span class="template-preview">${renderSVG(scene)}</span><span class="template-name">${escape(template.name)} ${settings.template === key ? '✓' : ''}</span><span class="template-mood">${escape(pageDescription(scene))}</span></button>`; }
    catch (error) { return `<button class="template-card" disabled><span class="template-preview unavailable">${escape(error.message)}</span><span class="template-name">${escape(template.name)}</span></button>`; }
  }).join('');
}

function renderDirectionSummary() {
  const { settings } = state(), recipe = settings.recipe;
  $('#direction-name').textContent = recipe?.name || templates[settings.template].name;
  $('#direction-description').textContent = recipe ? `${templates[settings.template].mood}. ${dishCount(state().menu)} editable dishes · ${settings.density} spacing.` : templates[settings.template].mood;
  const palette = recipe?.palette;
  $('#direction-colors').innerHTML = palette ? ['paper','ink','accent'].map(key => `<span style="background:${palette[key]}" title="${key}: ${palette[key]}"></span>`).join('') : '';
}
function previewDirections(recipes, brief) {
  directions = recipes.map(recipe => {
    const settings = { ...state().settings, template: recipe.template, density: recipe.density, recipe };
    return { recipe, pages: layoutMenu(state().menu, settings) };
  });
  $('#directions-brief').textContent = brief;
  $('#design-brief').value = brief;
  $('#direction-grid').setAttribute('data-count',String(directions.length));
  $('#direction-result').textContent = `${directions.length} ${directions.length===1?'direction':'directions'} using all ${dishCount(state().menu)} dishes. Compare the actual print layouts.`;
  $('#direction-grid').innerHTML = directions.map(({recipe,pages:generatedPages}, index) => `<article class="generated-card ${state().settings.recipe?.id === recipe.id ? 'selected' : ''}"><div class="generated-preview">${renderSVG(generatedPages[0])}</div><div class="generated-info"><span class="generated-number">DIRECTION ${String(index+1).padStart(2,'0')}</span><h3>${escape(recipe.name)}</h3><p>${recipe.rationale.filter((_,index)=>index!==1).map(escape).join(' ')}</p><div class="generated-meta">${['paper','ink','accent'].map(key=>`<span style="background:${recipe.palette[key]}" title="${key}"></span>`).join('')}<small>${generatedPages.length} ${generatedPages.length===1?'page':'pages'} · ${escape(generatedPages[0].format.name)}</small></div><button class="primary" data-use-direction="${index}">Use this direction ↗</button></div></article>`).join('');
  $('#directions-dialog').showModal();
}
function generateFromBrief() {
  if (!validPendingFields()) return;
  const brief = $('#design-brief').value.trim();
  if (!brief) { $('#design-brief').focus(); toast('Describe the atmosphere, colours or kind of restaurant first.'); return; }
  try {
    const recipes = generateDirections(state().menu, brief, {seed:directionSeed++,pageSize:state().settings.pageSize});
    const signature = values => JSON.stringify(values.map(recipe => JSON.stringify([recipe.template,recipe.palette,recipe.motif,recipe.density])).sort());
    const unchanged = directions.length && signature(recipes) === signature(directions.map(direction => direction.recipe));
    previewDirections(recipes, brief);
    if (unchanged) $('#direction-result').textContent = 'The design choices are unchanged. Change the brief’s colours, spacing or orientation to explore another result.';
  }
  catch (error) { toast(`Could not generate these directions. ${error.message}`); }
}
$('#design-brief').addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key==='Enter'){event.preventDefault();generateFromBrief();}});
$('#design-form').onsubmit = event => { event.preventDefault(); generateFromBrief(); };
document.querySelectorAll('[data-brief]').forEach(button => button.onclick = () => { $('#design-brief').value = button.dataset.brief; directionSeed = 0; generateFromBrief(); });
document.querySelectorAll('[data-refine]').forEach(button => button.onclick = () => { $('#design-brief').value = `${$('#design-brief').value.trim() || state().settings.recipe?.brief || templates[state().settings.template].mood} ${button.dataset.refine}`.slice(-1200); generateFromBrief(); });
$('#regenerate-directions').onclick = () => { $('#directions-dialog').close(); generateFromBrief(); };
$('#direction-grid').onclick = event => {
  const button = event.target.closest('[data-use-direction]');
  const direction = button && directions[Number(button.dataset.useDirection)];
  if (!direction || !validPendingFields()) return;
  const recipe = validateRecipe(direction.recipe);
  if (commit(next => { next.settings = { ...next.settings, template:recipe.template, density:recipe.density, recipe }; })) {
    $('#design-brief').value = recipe.brief; $('#directions-dialog').close(); showView('paper'); if(matchMedia('(max-width:600px)').matches)$('#canvas-area').scrollIntoView?.({block:'start',behavior:'instant'}); announce(`${recipe.name} applied. Every dish and price is preserved.`); toast(`${recipe.name} applied. You can undo this.`);
  }
};
$('#open-ai-direction').onclick = () => { if (!validPendingFields()) return; $('#art-recipe-error').hidden = true; $('#ai-direction-dialog').showModal(); };
$('#download-art-prompt').onclick = () => {
  const brief = $('#design-brief').value.trim() || 'An original restaurant menu with strong typography and a restrained palette.';
  const prompt = `Act as a restaurant menu art director. Return only a single valid JSON design recipe. Do not generate menu content or images. The app will preserve every dish and price.
Owner brief: ${brief}
Menu structure: ${state().menu.sections.length} categories, ${dishCount(state().menu)} dishes.
Use this exact schema. version is 1. template must be trattoria (portrait category lanes with a produce masthead), atelier (portrait editorial rows), botanical (landscape identity island with two columns), or midnight (landscape indexed dish grid). motif must be produce, sun, moon, or none. type is descriptive metadata for the composition: editorial for trattoria and botanical, condensed for atelier, modern for midnight. It does not replace fonts. density must be compact, balanced, or spacious. All seven palette values must be six-digit hex colours with strong readable contrast. Keep name under80 characters and rationale a list of1to3 short strings. Do not include unknown keys or markup.
Example shape:
${JSON.stringify({version:1,id:'owner-art-direction',name:'Quiet wine journal',brief,seed:0,template:'atelier',palette:{paper:'#FFF8E9',ink:'#3D1625',accent:'#7D263E',muted:'#624C51',tint:'#E8D5BB',header:'#3D1625',headingInk:'#3D1625'},motif:'none',type:'editorial',density:'balanced',rationale:['A restrained editorial layout for a wine bar.','Cream paper and burgundy type.']},null,2)}
The app validates the recipe before applying it. This is a bounded design grammar, not arbitrary HTML or code.`;
  downloadBlob(new Blob([prompt],{type:'text/plain'}),'menu-atelier-art-direction-prompt.txt'); toast('Art direction prompt downloaded. No dishes or prices were included.');
};
$('#apply-art-recipe').onclick = () => {
  try { const recipe = validateRecipe(JSON.parse($('#art-recipe').value)); previewDirections([recipe],recipe.brief); $('#ai-direction-dialog').close(); $('#art-recipe-error').hidden = true; }
  catch(error) { $('#art-recipe-error').textContent = `This recipe could not be used. ${error.message}`; $('#art-recipe-error').hidden = false; }
};

function renderSections() {
  const { menu } = state();
  $('#section-list').innerHTML = menu.sections.map(section => `<section class="category"><div class="category-heading"><button class="section-toggle" data-toggle-section="${escape(section.id)}" aria-expanded="${!collapsed.has(section.id)}"><span>${collapsed.has(section.id) ? '▸' : '▾'}</span>${escape(section.name)}<span class="category-count">${section.items.length}</span></button><button class="category-edit" data-edit-section="${escape(section.id)}" aria-label="Edit ${escape(section.name)} category">···</button></div>${collapsed.has(section.id) ? '' : section.items.map(item => `<button class="dish-row ${selected === item.id ? 'active' : ''}" data-select="${escape(item.id)}"><span><strong>${escape(item.name)}</strong><small>${escape(item.description)}</small>${item.tags.length ? `<small>${item.tags.map(escape).join(' · ')}</small>` : ''}</span><span class="dish-price">${escape(formatPrice(item.price, menu.currency))}</span></button>`).join('')}${!section.items.length ? `<button class="dish-row" data-new-in="${escape(section.id)}">+ Add your first dish</button>` : ''}</section>`).join('') || '<p class="empty-menu">Add a category, then your first dish.</p>';
}
function renderSource() {
  const source = state().menu.source;
  const html = source ? `<div class="source-info"><strong>${escape(source.label)}</strong>${source.accessedAt ? ` · Retrieved ${escape(source.accessedAt)}` : ''}${source.url ? `<p><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">View original source ↗</a></p>` : ''}<p>${escape(source.note)}</p></div>` : '';
  $('#source-info').innerHTML = html; $('#settings-source').innerHTML = html;
  $('#source-link').hidden = !source?.url;
  if (source?.url) { $('#source-link').href = source.url; $('#source-link').textContent = /\.pdf(?:$|[?#])/i.test(source.url) ? 'Source PDF ↗' : 'Source ↗'; $('#source-link').title = source.note || source.label; }
}
function priceAnchor() {
  for (let index = 0; index < pages.length; index++) {
    const price = pages[index].elements.find(element => element.itemId === selected && element.role === 'price');
    const svg = $('#pages').children[index]?.querySelector('svg');
    if (!price || !svg) continue;
    const matrix = svg.getScreenCTM(); if (!matrix) return null;
    const left = price.x - (price.align === 'right' ? price.advance : price.align === 'center' ? price.advance / 2 : 0);
    const bounds = price.inkBounds || { left, right: left + price.advance, top: price.y - price.size, bottom: price.y + price.size * .25 };
    const start = new DOMPoint(bounds.left, bounds.top).matrixTransform(matrix), end = new DOMPoint(bounds.right, bounds.bottom).matrixTransform(matrix);
    return { left: start.x, right: end.x, top: start.y, bottom: end.y };
  }
  return null;
}
function positionEditor() {
  const editor = $('#item-editor');
  if (!editSession || editor.hidden) return;
  if (matchMedia('(max-width:600px)').matches) { editor.removeAttribute('data-side'); return; }
  const anchor = priceAnchor(); if (!anchor) return;
  const margin = 12, gap = 16, { width, height } = editor.getBoundingClientRect();
  const rightFits = anchor.right + gap + width <= innerWidth - margin;
  const leftFits = anchor.left - gap - width >= margin;
  const side = rightFits || !leftFits ? 'right' : 'left';
  const left = side === 'right' ? anchor.right + gap : anchor.left - gap - width;
  const toolbarBottom = $('.canvas-toolbar').getBoundingClientRect().bottom;
  const top = Math.max(toolbarBottom + margin, Math.min(anchor.top - 34, innerHeight - height - margin));
  editor.style.left = `${Math.max(margin, Math.min(left, innerWidth - width - margin))}px`; editor.style.top = `${top}px`; editor.dataset.side = side;
  editor.style.setProperty('--anchor-offset', `${Math.max(16, Math.min(anchor.top + 7 - top, height - 24))}px`);
}
function selectItem(id, _sectionId, reveal = false) {
  if (editSession && selected === id) { $('#dish-price').focus(); $('#dish-price').select(); return; }
  if (!validPendingFields()) return;
  selected = id; if (!selectedRecord()) { selected = ''; return; }
  editSession = { itemId: id, draft: clone(history.value), saveStatus: $('#save-status').textContent };
  showView('paper'); render({ editor: true }); document.body.classList.add('editor-open');
  if (reveal || matchMedia('(max-width:600px)').matches) Array.from(document.querySelectorAll('#pages [data-item]')).find(hit => hit.dataset.item === id)?.scrollIntoView({ block: 'center', behavior: 'instant' });
  positionEditor(); $('#dish-price').focus({ preventScroll: true }); $('#dish-price').select(); announce(`Editing ${selectedRecord().item.name}. Enter finishes. Escape cancels.`);
}
function renderEditor() {
  const record = selectedRecord(), editor = $('#item-editor');
  if (!record || !editSession) { editor.hidden = true; editor.replaceChildren(); document.body.classList.remove('editor-open'); return; }
  const { section, item } = record, { menu } = state(); editor.hidden = false;
  editor.innerHTML = `<div class="editor-heading"><div><span class="editor-kicker">${escape(section.name)} · ${menu.currency}</span><h2 id="selection-title">${escape(item.name)}</h2></div><button id="close-editor" class="close-editor" aria-label="Finish price editing">×</button></div><form id="price-form" novalidate><label class="price-label" for="dish-price">Price <span>${menu.currency}</span></label><div class="price-entry" style="--currency-space:${currencies[menu.currency].length > 1 ? 48 : 34}px"><span aria-hidden="true">${currencies[menu.currency]}</span><input id="dish-price" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value="${priceInput(item.price, menu.currency)}" aria-label="Price for ${escape(item.name)} in ${menu.currency}" aria-describedby="price-help price-error"><button type="submit" class="primary">Done ↵</button></div><p id="price-help">Changes appear on the paper as you type.</p><p id="price-error" class="field-error" role="alert"></p></form><button id="edit-details" class="details-toggle" aria-expanded="false" aria-controls="dish-details">Edit details</button><form id="dish-details" hidden novalidate><label>Dish name<input id="dish-name" maxlength="160" required value="${escape(item.name)}"></label><label>Description<textarea id="dish-description" maxlength="1200" rows="3">${escape(item.description)}</textarea></label><label>Category<select id="dish-section">${menu.sections.map(s => `<option value="${escape(s.id)}" ${s.id === section.id ? 'selected' : ''}>${escape(s.name)}</option>`).join('')}</select></label><label>Dietary labels · only if verified<input id="dish-tags" maxlength="410" value="${escape(item.tags.join(', '))}" placeholder="vegetarian, vegan"></label><p id="details-error" class="field-error" role="alert"></p><div class="details-actions"><button class="primary" type="submit">Done editing</button><button id="delete-dish" type="button" class="danger">Remove dish</button></div></form>`;
}
function updateDraft(mutator) {
  if (!editSession) return false;
  const next = clone(editSession.draft); mutator(next);
  try { next.menu = validateMenu(next.menu); const nextPages = layoutMenu(next.menu, next.settings); editSession.draft = next; lastCommitError = ''; $('#save-status').textContent = 'Editing · Enter to save'; render({ pages: nextPages, skipList: true }); return true; }
  catch (error) { lastCommitError = error.message; return false; }
}
function updateItem(field, value) { return updateDraft(next => { next.menu.sections.flatMap(section => section.items).find(item => item.id === selected)[field] = value; }); }
function editField(input, operation) {
  input.setCustomValidity(''); input.removeAttribute('aria-invalid');
  if (operation() === false) { input.setCustomValidity(lastCommitError); input.setAttribute('aria-invalid', 'true'); return false; } return true;
}
function pendingInvalid() { return Array.from(document.querySelectorAll('#item-editor input, #item-editor textarea, #settings-dialog input, #settings-dialog textarea')).find(input => !input.validity.valid); }
function finishEdit({ cancel = false, restoreFocus = true } = {}) {
  if (!editSession) return true;
  const invalid = pendingInvalid();
  if (!cancel && invalid) { invalid.focus(); invalid.reportValidity(); toast('Finish the highlighted edit before continuing.'); return false; }
  const id = selected;
  if (!cancel && history.commit(editSession.draft)) persist();
  else $('#save-status').textContent = editSession.saveStatus;
  editSession = null; selected = ''; render({ editor: true });
  if (restoreFocus) Array.from(document.querySelectorAll('#pages [data-item]')).find(hit => hit.dataset.item === id)?.focus({ preventScroll: true });
  announce(cancel ? 'Edit cancelled. Previous dish restored.' : 'Menu updated. Select a printed price to edit.'); return true;
}
function validPendingFields() {
  const invalid = pendingInvalid();
  if (invalid) { if (invalid.closest('#settings-dialog') && !$('#settings-dialog').open) $('#settings-dialog').showModal(); invalid.focus(); invalid.reportValidity(); toast('Finish the highlighted edit before continuing.'); return false; }
  return finishEdit({ restoreFocus: false });
}
function addDish(sectionId) {
  if (!validPendingFields()) return;
  const id = uid(); let target = sectionId || state().menu.sections[0]?.id;
  if (!commit(next => { if (!target) { target = uid(); next.menu.sections.push({ id: target, name: 'The menu', items: [] }); } next.menu.sections.find(section => section.id === target).items.push({ id, name: 'New dish', description: '', price: 0, tags: [] }); })) return;
  collapsed.delete(target); selectItem(id, target, true); $('#edit-details').click(); $('#dish-name').focus(); $('#dish-name').select();
}
$('#item-editor').addEventListener('input', event => {
  const input = event.target, { id, value } = input;
  let error = '';
  if (id === 'dish-price') { try { const price = parsePrice(value, state().menu.currency); if (!editField(input, () => updateItem('price', price))) error = lastCommitError; } catch (caught) { error = caught.message; input.setCustomValidity(error); input.setAttribute('aria-invalid', 'true'); } $('#price-error').textContent = error; }
  if (id === 'dish-name') { input.setCustomValidity(value.trim() ? '' : 'Dish name is required.'); if (value.trim()) editField(input, () => updateItem('name', value)); }
  if (id === 'dish-description') editField(input, () => updateItem('description', value));
  if (id === 'dish-tags') { const tags = value.split(',').map(tag => tag.trim()).filter(Boolean); input.setCustomValidity(tags.length <= 10 && tags.every(tag => tag.length <= 40) ? '' : 'Use up to 10 labels, with at most 40 characters each.'); if (input.validity.valid) editField(input, () => updateItem('tags', tags)); }
  if (id !== 'dish-price') $('#details-error').textContent = input.validationMessage || lastCommitError;
  positionEditor();
});
$('#item-editor').addEventListener('change', event => {
  if (event.target.id !== 'dish-section') return;
  const input = event.target, sourceId = selectedRecord().section.id;
  if (pendingInvalid()) { input.value = sourceId; toast('Finish the highlighted edit before changing category.'); return; }
  if (!updateDraft(next => { const source = next.menu.sections.find(section => section.id === sourceId); const index = source.items.findIndex(item => item.id === selected); next.menu.sections.find(section => section.id === input.value).items.push(source.items.splice(index, 1)[0]); })) { input.value = sourceId; $('#details-error').textContent = lastCommitError; }
});
$('#item-editor').addEventListener('submit', event => { event.preventDefault(); finishEdit(); });
$('#item-editor').addEventListener('click', event => {
  if (event.target.closest('#close-editor')) finishEdit();
  if (event.target.closest('#edit-details')) { const details = $('#dish-details'); details.hidden = !details.hidden; $('#edit-details').setAttribute('aria-expanded', String(!details.hidden)); $('#edit-details').textContent = details.hidden ? 'Edit details' : 'Hide details'; positionEditor(); if (!details.hidden) $('#dish-name').focus(); }
  if (event.target.closest('#delete-dish')) { const id = selected; if (!validPendingFields()) return; if (commit(next => { next.menu.sections.forEach(section => section.items = section.items.filter(item => item.id !== id)); })) toast('Dish removed. You can undo this.'); }
});
$('#menu-name').addEventListener('input', event => { const input = event.target; input.setCustomValidity(input.value.trim() ? '' : 'Restaurant name is required.'); if (input.value.trim()) editField(input, () => commit(next => next.menu.name = input.value)); });
$('#menu-subtitle').addEventListener('input', event => editField(event.target, () => commit(next => next.menu.subtitle = event.target.value)));
$('#menu-currency').addEventListener('change', event => { if (!validPendingFields()) { event.target.value = state().menu.currency; return; } const value = event.target.value; if (commit(next => { const old = next.menu.currency; if ((old === 'JPY') !== (value === 'JPY')) next.menu.sections.forEach(section => section.items.forEach(item => item.price = old === 'JPY' ? item.price * 100 : Math.round(item.price / 100))); next.menu.currency = value; })) toast('Currency changed. Numeric amounts are preserved; no exchange rate is applied.'); else event.target.value = state().menu.currency; });
$('#section-list').addEventListener('click', event => {
  const row = event.target.closest('[data-select]'); if (row) selectItem(row.dataset.select, '', true);
  const toggle = event.target.closest('[data-toggle-section]'); if (toggle) { const id = toggle.dataset.toggleSection; collapsed.has(id) ? collapsed.delete(id) : collapsed.add(id); renderSections(); }
  const edit = event.target.closest('[data-edit-section]'); if (edit) openCategory(edit.dataset.editSection);
  const add = event.target.closest('[data-new-in]'); if (add) addDish(add.dataset.newIn);
});
$('#pages').addEventListener('click', event => { const hit = event.target.closest('[data-item]'); if (hit) selectItem(hit.dataset.item, hit.dataset.section); });
$('#pages').addEventListener('keydown', event => { const hit = event.target.closest('[data-item]'); if (hit && ['Enter', ' '].includes(event.key)) { event.preventDefault(); selectItem(hit.dataset.item, hit.dataset.section); } });
$('#add-dish').onclick = () => addDish();
function openCategory(id = '') { if (!validPendingFields()) return; categoryId = id; $('#category-name').value = state().menu.sections.find(section => section.id === id)?.name || ''; $('#delete-category').hidden = !id; $('#category-dialog-title').textContent = id ? 'Edit category' : 'New category'; $('#category-error').hidden = true; $('#category-dialog').showModal(); $('#category-name').focus(); }
$('#add-section').onclick = () => openCategory();
$('#save-category').onclick = () => { const name = $('#category-name').value.trim(); if (!name) { $('#category-error').textContent = 'Give this category a name.'; $('#category-error').hidden = false; return; } if (commit(next => { if (categoryId) next.menu.sections.find(section => section.id === categoryId).name = name; else next.menu.sections.push({ id: uid(), name, items: [] }); })) $('#category-dialog').close(); else { $('#category-error').textContent = lastCommitError; $('#category-error').hidden = false; } };
$('#category-name').addEventListener('keydown', event => { if (event.key === 'Enter') $('#save-category').click(); });
$('#delete-category').onclick = () => { if (commit(next => next.menu.sections = next.menu.sections.filter(section => section.id !== categoryId))) { $('#category-dialog').close(); toast('Category and its dishes removed. You can undo this.'); } };
$('#edit-footer').onclick = () => { if (!validPendingFields()) return; $('#menu-footer').value = state().menu.footer; $('#menu-footer').setCustomValidity(''); $('#footer-dialog').showModal(); };
$('#menu-footer').addEventListener('input', event => event.target.setCustomValidity(''));
$('#save-footer').onclick = () => { if (commit(next => next.menu.footer = $('#menu-footer').value)) $('#footer-dialog').close(); else { $('#menu-footer').setCustomValidity(lastCommitError); $('#menu-footer').reportValidity(); } };
$('#template-grid').onclick = event => { const button = event.target.closest('[data-template]'); if (button && validPendingFields() && commit(next => { next.settings.template = button.dataset.template; delete next.settings.recipe; })) { $('#composition-dialog').close(); announce(`${templates[state().settings.template].name} selected.`); } };
$('#page-size').onchange = event => { if (!validPendingFields() || !commit(next => next.settings.pageSize = event.target.value)) event.target.value = state().settings.pageSize; };
document.querySelectorAll('[data-density]').forEach(button => button.onclick = () => { if (validPendingFields()) commit(next => { next.settings.density = button.dataset.density; if (next.settings.recipe) next.settings.recipe.density = button.dataset.density; }); });
function travel(direction) {
  if (editSession && direction === 'undo') { finishEdit({ cancel: true }); return; }
  if (editSession && !validPendingFields()) return;
  if (history[direction]()) { document.querySelectorAll('#settings-dialog input, #settings-dialog textarea').forEach(input => { input.setCustomValidity(''); input.removeAttribute('aria-invalid'); }); $('#edit-error').hidden = true; persist(); render({ editor: true }); announce(direction === 'undo' ? 'Previous menu restored.' : 'Change restored.'); }
}
$('#undo').onclick = () => travel('undo'); $('#redo').onclick = () => travel('redo');
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && editSession) { event.preventDefault(); finishEdit({ cancel: true }); return; }
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' || event.target.closest('input,textarea,select')) return;
  event.preventDefault(); travel(event.shiftKey ? 'redo' : 'undo');
});
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => { if (validPendingFields()) { showView(button.dataset.view); renderSections(); } });
$('.tabs').addEventListener('keydown', event => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const buttons = [...document.querySelectorAll('[data-view]')], current = buttons.indexOf(document.activeElement); const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length; buttons[index].click(); buttons[index].focus(); });
$('#open-compositions').onclick = () => { if (validPendingFields()) { renderTemplates(); $('#composition-dialog').showModal(); } };
$('#open-settings').onclick = () => { if (validPendingFields()) $('#settings-dialog').showModal(); };
$('#zoom-fit').onclick = () => { const fitted = $('#pages').classList.toggle('fitted'); $('#zoom-fit').textContent = fitted ? 'Reading size' : 'Fit page'; $('#zoom-fit').setAttribute('aria-pressed', String(fitted)); fitPaper(); positionEditor(); };
function fitPaper() {
  const area = $('#canvas-area'); if (!area.clientWidth || !pages.length) return;
  const available = Math.max(220, area.clientWidth - (innerWidth < 600 ? 8 : 70));
  const ratio = pages[0].width / pages[0].height;
  const readingWidth = Math.min(ratio > 1 ? 1000 : 720, available);
  const fittedWidth = Math.min(readingWidth, Math.max(160, area.clientHeight - 60) * ratio);
  $('#pages').style.setProperty('--paper-width', `${$('#pages').classList.contains('fitted') ? fittedWidth : readingWidth}px`);
}
window.addEventListener('resize', () => { fitPaper(); positionEditor(); });
window.addEventListener('scroll', positionEditor, true);
window.visualViewport?.addEventListener('resize', positionEditor); window.visualViewport?.addEventListener('scroll', positionEditor);
function validPendingEdits() { if (!validPendingFields()) return false; const unsupported = unsupportedCharacters(state().menu); if (unsupported.length) { toast(`The selected fonts cannot print these characters. Edit the content before exporting: ${unsupported.slice(0, 8).join(' ')}`); return false; } return true; }
$('#export-pdf').onclick = async () => { if (!validPendingEdits()) return; const button = $('#export-pdf'), exportPages = pages, exportTitle = state().menu.name, exportDesign = state().settings.recipe?.name || templates[state().settings.template].name; button.disabled = true; button.textContent = 'Preparing…'; try { const doc = await createPDF(exportPages, exportTitle); doc.save(`${exportTitle.replace(/[^\p{L}\p{N} -]/gu, '').trim() || 'Menu'} - ${exportDesign}.pdf`); toast(`${exportPages.length}-page PDF exported for ${exportTitle}.`); } catch (error) { toast(`Export failed. ${error.message}`); } finally { button.disabled = false; button.innerHTML = 'Export PDF <span>↗</span>'; } };
$('#export-json').onclick = () => { if (!validPendingFields()) return; downloadBlob(new Blob([JSON.stringify(state(), null, 2)], { type: 'application/json' }), `${state().menu.name.replace(/[^a-z0-9-]/gi, '-')}-menu.json`); toast('Menu backup downloaded. Import it anytime.'); };
function closeDialog(dialog){if(dialog.id==='settings-dialog'&&!validPendingFields())return;if(dialog.id==='import-dialog')importGeneration++;dialog.close();}
document.querySelectorAll('.close-dialog').forEach(button=>button.onclick=()=>closeDialog(button.closest('dialog')));
$('#import-dialog').addEventListener('cancel',()=>importGeneration++);
$('#settings-dialog').addEventListener('cancel',event=>{if(!validPendingFields())event.preventDefault();});
$('.brand').addEventListener('click',event=>{if(!validPendingFields())event.preventDefault();});
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog(dialog);}));
function setImportStage(stage){$('#import-entry').hidden=stage!=='entry';$('#import-progress').hidden=stage!=='progress';$('#import-review').hidden=stage!=='review';$('#import-error').hidden=true;}
function openImport(){if(!validPendingFields())return;importGeneration++;candidate=null;setImportStage('entry');$('#import-currency').value=state().menu.currency;$('#import-file').value='';$('#import-dialog').showModal();}
$('#open-import').onclick=openImport;
$('#import-examples').onclick=()=>{closeDialog($('#import-dialog'));$('#examples-dialog').showModal();};
document.querySelectorAll('[data-import-tab]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-import-tab]').forEach(b=>b.classList.toggle('active',b===button));$('#file-pane').hidden=button.dataset.importTab!=='file';$('#text-pane').hidden=button.dataset.importTab!=='text';$('#parse-text').hidden=button.dataset.importTab!=='text';$('#import-error').hidden=true;});
function importError(error){setImportStage('entry');$('#import-error').textContent=error.message;$('#import-error').hidden=false;}
function reviewCandidate(result){importGeneration++;candidate=result;setImportStage('review');renderReview();}
$('#parse-text').onclick=()=>{try{reviewCandidate(parseImport($('#import-text').value,'text',$('#import-currency').value));}catch(error){importError(error);}};
async function readFile(file){
  if(!file)return;
  const generation=++importGeneration,sourceCurrency=$('#import-currency').value;
  const current=()=>generation===importGeneration;
  if(file.size>20*1024*1024){importError(new Error('Choose a file smaller than 20 MB.'));return;}
  setImportStage('progress');$('#progress-text').textContent='Reading your file…';
  const progress=text=>{if(current())$('#progress-text').textContent=text;};
  const extension=file.name.split('.').pop().toLowerCase();
  try{
    let result;
    if(['png','jpg','jpeg','webp'].includes(extension)){const text=await recognizeImage(file,progress);result=parseImport(text,'text',sourceCurrency);result.method='Image OCR';result.warnings.unshift('This is OCR output. Check every price against the original image. OCR does not establish allergens.');}
    else if(extension==='pdf'){const text=await extractPDF(file,progress);result=parseImport(text,'text',sourceCurrency);result.method='PDF text';result.warnings.unshift('PDF column order can be imperfect. Compare every dish and price with the original file.');}
    else if(['txt','csv','json'].includes(extension))result=parseImport(await file.text(),extension==='txt'?'text':extension,sourceCurrency,file.name.replace(/\.[^.]+$/,''));
    else throw new Error('Choose a TXT, CSV, JSON, PDF, PNG, JPEG or WebP file.');
    if(current())reviewCandidate(result);
  }catch(error){if(current())importError(error);}
}
$('#import-file').onchange=event=>readFile(event.target.files[0]);
$('#dropzone').addEventListener('dragover',event=>{event.preventDefault();$('#dropzone').classList.add('dragging');});
$('#dropzone').addEventListener('dragleave',()=>$('#dropzone').classList.remove('dragging'));
$('#dropzone').addEventListener('drop',event=>{event.preventDefault();$('#dropzone').classList.remove('dragging');readFile(event.dataTransfer.files[0]);});
function renderReview(){
  const {menu,warnings,method}=candidate;
  $('#import-review').innerHTML=`<div class="review-heading"><h3>Review the import</h3><span>${escape(method)} · ${dishCount(menu)} dishes</span></div>${warnings.length?`<div class="review-notice">${warnings.map(escape).join('<br>')}</div>`:''}<div class="review-settings"><label>Restaurant name<input id="review-name" value="${escape(menu.name)}" maxlength="120"></label><label>Source currency<select id="review-currency">${Object.keys(currencies).map(c=>`<option ${c===menu.currency?'selected':''}>${c}</option>`).join('')}</select></label></div><div class="review-table-wrap"><table class="review-table"><thead><tr><th>Dish & category</th><th>Description</th><th>Price (${escape(menu.currency)})</th><th></th></tr></thead><tbody>${menu.sections.map(s=>`<tr class="review-section"><td colspan="4"><input data-review-section="${escape(s.id)}" value="${escape(s.name)}" maxlength="120" aria-label="Category name"></td></tr>${s.items.map(i=>`<tr><td><input data-review-name="${escape(i.id)}" value="${escape(i.name)}" maxlength="160" aria-label="Dish name"></td><td><input data-review-description="${escape(i.id)}" value="${escape(i.description)}" maxlength="1200" aria-label="Dish description"></td><td><input class="review-price ${i.price==null?'bad':''}" data-review-price="${escape(i.id)}" value="${i.price==null?'':priceInput(i.price,menu.currency)}" inputmode="decimal" aria-label="Price for ${escape(i.name)}" placeholder="Check"></td><td><button data-review-remove="${escape(i.id)}" class="review-remove" aria-label="Remove ${escape(i.name)} from import">×</button></td></tr>`).join('')}`).join('')}</tbody></table></div>${menu.source?`<p class="review-source">${escape(menu.source.note)}<br><a href="${escape(menu.source.url)}" target="_blank" rel="noopener">${escape(menu.source.label)} ↗</a></p>`:''}<p id="review-error" class="error-message" hidden></p><div class="dialog-footer"><button id="import-back" class="button secondary">← Back</button><button id="apply-import" class="button primary">Use this menu <span>→</span></button></div>`;
  $('#import-back').onclick=()=>setImportStage('entry');
  $('#apply-import').onclick=()=>{
    try{if(!dishCount(menu))throw new Error('Keep at least one dish in your import.');const validated=validateMenu(menu);if(!validPendingFields())return;$('#menu-name').setCustomValidity('');if(!commit(next=>{next.menu=validated;if(candidate.settings)next.settings=candidate.settings;},{editor:true})){const error=$('#review-error');error.textContent=$('#toast').textContent;error.hidden=false;return;}selected='';renderEditor();showView('paper');closeDialog($('#import-dialog'));toast('Menu imported. Choose a design or click a dish to edit.');}
    catch(error){$('#review-error').textContent=error.message;$('#review-error').hidden=false;}
  };
}
$('#import-review').addEventListener('input',event=>{
  if(!candidate)return;const menu=candidate.menu;const input=event.target;
  if(input.id==='review-name')menu.name=input.value;
  const sectionId=input.dataset.reviewSection;if(sectionId)menu.sections.find(s=>s.id===sectionId).name=input.value;
  const items=menu.sections.flatMap(s=>s.items);
  if(input.dataset.reviewName)items.find(i=>i.id===input.dataset.reviewName).name=input.value;
  if(input.dataset.reviewDescription)items.find(i=>i.id===input.dataset.reviewDescription).description=input.value;
  if(input.dataset.reviewPrice){const item=items.find(i=>i.id===input.dataset.reviewPrice);try{item.price=parsePrice(input.value,menu.currency);input.classList.remove('bad');}catch{item.price=null;input.classList.add('bad');}}
});
$('#import-review').addEventListener('change',event=>{if(event.target.id==='review-currency'){const old=candidate.menu.currency,newCurrency=event.target.value;candidate.menu.sections.forEach(s=>s.items.forEach(i=>{if(i.price!==null&&(old==='JPY')!==(newCurrency==='JPY'))i.price=old==='JPY'?i.price*100:Math.round(i.price/100);}));candidate.menu.currency=newCurrency;renderReview();}});
$('#import-review').addEventListener('click',event=>{const button=event.target.closest('[data-review-remove]');if(button){candidate.menu.sections.forEach(s=>s.items=s.items.filter(i=>i.id!==button.dataset.reviewRemove));renderReview();}});
$('#example-cards').addEventListener('click',event=>{const button=event.target.closest('[data-example]');if(button){const menu=examples.find(e=>e.id===button.dataset.example);$('#examples-dialog').close();$('#import-dialog').showModal();reviewCandidate({menu:clone(menu),warnings:['This is an unofficial excerpt. Review the source note and prices before using it.'],method:'Official source excerpt'});}});
async function loadExamples(){try{examples=await fetch('./examples/index.json').then(r=>{if(!r.ok)throw new Error();return r.json();});$('#example-cards').innerHTML=examples.map((menu,i)=>`<article class="example-card"><span class="example-number">0${i+1}</span><h3>${escape(menu.name)}</h3><p>${escape(menu.subtitle)}<br>${dishCount(menu)} dishes · ${escape(menu.currency)}</p>${menu.id==='pizzeria-bianco'?'<small>April 2023 source snapshot</small>':''}<button class="button secondary" data-example="${escape(menu.id)}">Explore this menu →</button><div class="example-links"><a href="./examples/${escape(menu.id)}.txt" download>TXT ↓</a><a href="./examples/${escape(menu.id)}.json" download>JSON ↓</a><a href="${escape(menu.source.url)}" target="_blank" rel="noopener">Source ↗</a></div></article>`).join('');}catch{$('#example-cards').innerHTML='<p class="field-help">Examples could not load. You can still import your own menu.</p>';}}
$('#new-demo').onclick=()=>{
  if(!validPendingFields())return;
  if(commit(next=>{next.menu=demoMenu();next.settings={...defaultSettings};},{editor:true})){
    selected='';renderEditor();showView('paper');$('#examples-dialog').close();announce('Original demo restored. Select a printed price to edit.');toast('Original demo restored. You can undo this.');
  }
};

$('#open-examples').onclick=()=>{if(validPendingFields())$('#examples-dialog').showModal();};
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{fitPaper();positionEditor();}).observe($('#canvas-area'));
showView('paper');render();loadExamples();
if (state().settings.recipe) $('#design-brief').value = state().settings.recipe.brief;
$('#save-status').textContent=restoredDraft?'Saved in this browser':'Demo · changes autosave';
if(storageError)toast(storageError);
globalThis.menuAtelier={getMenu:()=>clone(state().menu),getSettings:()=>clone(state().settings),getPages:()=>clone(pages),createPDF:()=>{if(!validPendingEdits())return Promise.reject(new Error('Finish the highlighted edit before exporting.'));return createPDF(pages,state().menu.name);}};
