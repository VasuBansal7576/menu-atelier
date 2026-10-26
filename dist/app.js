import { demoMenu, validateMenu, createHistory, clone, uid, parsePrice, priceInput, formatPrice, currencies } from './model.js';
import { templates, layoutMenu, renderSVG } from './layout.js';
import { parseImport, extractPDF, recognizeImage } from './import.js';
import { createPDF, downloadBlob, unsupportedCharacters } from './export.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaultSettings = { template: 'atelier', pageSize: 'a4', density: 'balanced' };
let initial = { menu: demoMenu(), settings: defaultSettings }, storageError = '';
try {
  const saved = localStorage.getItem('menu-atelier-v1');
  if(saved) { const data = JSON.parse(saved); const loaded = { menu: validateMenu(data.menu), settings: {template: templates[data.settings?.template] ? data.settings.template : 'atelier',pageSize: data.settings?.pageSize === 'letter' ? 'letter' : 'a4',density: ['compact','balanced','spacious'].includes(data.settings?.density) ? data.settings.density : 'balanced'} };layoutMenu(loaded.menu,loaded.settings);initial=loaded; }
} catch(error) { storageError = `The saved draft could not be opened. Your browser backup is retained. ${error.message}`; }
const history = createHistory(initial);
let selected = '', selectedSection = '', candidate = null, categoryId = '', pages = [], examples = [], zoom = 1, toastTimer;
const collapsed = new Set();
const state = () => history.value;
const dishCount = menu => menu.sections.reduce((sum,s)=>sum+s.items.length,0);
function toast(message) { $('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4000); }
function persist() {
  try { localStorage.setItem('menu-atelier-v1',JSON.stringify(state()));$('#save-status').textContent='Saved in this browser';$('#save-status').classList.remove('save-error'); }
  catch { $('#save-status').textContent='Could not save · download a backup';$('#save-status').classList.add('save-error'); }
}
function commit(mutator, options={}) {
  const next=clone(state());mutator(next);
  let nextPages;
  try { next.menu=validateMenu(next.menu);nextPages=layoutMenu(next.menu,next.settings); } catch(error) { toast(error.message);return false; }
  if(history.commit(next)){persist();render({...options,pages:nextPages});}return true;
}
function render(options={}) {
  const {menu,settings}=state();
  $('#project-name').textContent=menu.name;$('#dish-count').textContent=`${dishCount(menu)} dishes`;
  $('#undo').disabled=!history.canUndo;$('#redo').disabled=!history.canRedo;
  if(document.activeElement!==$('#menu-name')&&$('#menu-name').validity.valid)$('#menu-name').value=menu.name;
  if(document.activeElement!==$('#menu-subtitle'))$('#menu-subtitle').value=menu.subtitle;
  $('#menu-currency').value=menu.currency;$('#page-size').value=settings.pageSize;
  document.querySelectorAll('[data-density]').forEach(button=>button.classList.toggle('active',button.dataset.density===settings.density));
  pages=options.pages||layoutMenu(menu,settings);
  $('#pages').innerHTML=pages.map((page,i)=>`<div class="paper-wrap">${renderSVG(page,{interactive:true,selected})}<span class="page-number">PAGE ${String(i+1).padStart(2,'0')}</span></div>`).join('');
  $('#page-status').textContent=`${settings.pageSize==='letter'?'US Letter':'A4'} · ${pages.length} ${pages.length===1?'page':'pages'}`;
  if(!options.skipList)renderSections();
  if(options.editor)renderEditor();
  if(!options.skipTemplates)renderTemplates();
  renderSource();
}
function renderTemplates() {
  const {menu,settings}=state();
  $('#template-grid').innerHTML=Object.entries(templates).map(([key,t])=>{
    let preview;
    try{preview=renderSVG(layoutMenu(menu,{...settings,template:key})[0]);}
    catch{return `<button class="template-card" disabled aria-label="${t.name} needs a shorter heading or footer"><span class="template-preview">Shorten the heading or footer to use this design.</span><span class="template-name">${t.name}</span></button>`;}
    return `<button class="template-card ${settings.template===key?'selected':''}" data-template="${key}" aria-label="Choose ${t.name} design" aria-pressed="${settings.template===key}"><span class="template-preview">${preview}</span><span class="template-name">${t.name}</span><span class="template-mood">${t.mood}</span>${settings.template===key?'<span class="template-check">✓</span>':''}</button>`;
  }).join('');
}
function renderSections() {
  const {menu}=state();
  $('#section-list').innerHTML=menu.sections.map(section=>`<section class="category"><div class="category-heading"><button class="section-toggle" data-toggle-section="${escape(section.id)}" aria-expanded="${!collapsed.has(section.id)}"><span>${collapsed.has(section.id)?'▸':'▾'}</span>${escape(section.name)}<span class="category-count">${section.items.length}</span></button><button class="category-edit" data-edit-section="${escape(section.id)}" aria-label="Edit ${escape(section.name)} category" title="Edit category">···</button></div>${collapsed.has(section.id)?'':section.items.map(item=>`<button class="dish-row ${selected===item.id?'active':''}" data-select="${escape(item.id)}" data-section="${escape(section.id)}"><span class="dish-name">${escape(item.name)}</span><span class="dish-price">${escape(formatPrice(item.price,menu.currency))}</span></button>`).join('')}${!section.items.length?`<button class="dish-row" data-new-in="${escape(section.id)}">+ Add your first dish</button>`:''}</section>`).join('') || '<div class="empty-menu">Something lovely starts here.<span>Add a category, then your first dish.</span></div>';
}
function renderSource() {
  const source=state().menu.source;
  $('#source-info').innerHTML=source?`<div class="source-info"><strong>From a real restaurant menu</strong>${escape(source.label)}${source.accessedAt?` · Retrieved ${escape(source.accessedAt)}`:''}<br>${source.url?`<a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">View original source ↗</a>`:''}<details><summary>About this excerpt</summary>${escape(source.note)}</details></div>`:'';
}
function selectItem(id, sectionId, focus=false) {
  if(!validPendingFields())return;
  selected=id;selectedSection=sectionId;render({editor:true,skipTemplates:true});
  $('#item-editor').scrollIntoView({block:'nearest',behavior:'smooth'});
  if(focus)$('#dish-name')?.focus();
}
function renderEditor() {
  const {menu}=state();const section=menu.sections.find(s=>s.id===selectedSection);const item=section?.items.find(x=>x.id===selected);
  if(!item){selected='';$('#item-editor').innerHTML='';return;}
  $('#item-editor').innerHTML=`<div class="item-editor"><div class="item-editor-head"><span>A LITTLE REFINEMENT</span><button id="close-editor" aria-label="Close dish editor">×</button></div><label>Dish name<input id="dish-name" maxlength="160" value="${escape(item.name)}"></label><label>Description<textarea id="dish-description" maxlength="1200" rows="3">${escape(item.description)}</textarea></label><div class="field-row"><label>Price (${menu.currency})<input id="dish-price" inputmode="decimal" value="${priceInput(item.price,menu.currency)}" aria-describedby="price-error"></label><label>Category<select id="dish-section">${menu.sections.map(s=>`<option value="${escape(s.id)}" ${s.id===section.id?'selected':''}>${escape(s.name)}</option>`).join('')}</select></label></div><div id="price-error" class="field-error" role="status"></div><label>Dietary labels · only if verified<input id="dish-tags" maxlength="300" value="${escape(item.tags.join(', '))}" placeholder="vegetarian, vegan"></label><div class="item-editor-foot"><span>Changes appear as you type.</span><button id="delete-dish" class="delete-dish">Remove dish</button></div></div>`;
}
function updateItem(field,value) { return commit(next=>{const item=next.menu.sections.find(s=>s.id===selectedSection)?.items.find(i=>i.id===selected);if(item)item[field]=value;},{skipTemplates:true}); }
function addDish(sectionId) {
  if(!validPendingFields())return;
  let id=uid(), newSection=sectionId || selectedSection || state().menu.sections[0]?.id;
  commit(next=>{if(!newSection){newSection=uid();next.menu.sections.push({id:newSection,name:'The menu',items:[]});}next.menu.sections.find(s=>s.id===newSection).items.push({id,name:'New dish',description:'',price:0,tags:[]});});
  collapsed.delete(newSection);selectItem(id,newSection,true);$('#dish-name')?.select();
}
$('#menu-name').addEventListener('input',event=>{event.target.setCustomValidity(event.target.value.trim()?'':'Restaurant name is required.');if(event.target.value.trim())commit(next=>next.menu.name=event.target.value,{skipTemplates:true,skipList:true});});
$('#menu-subtitle').addEventListener('input',event=>commit(next=>next.menu.subtitle=event.target.value,{skipTemplates:true,skipList:true}));
$('#menu-currency').addEventListener('change',event=>{if(!validPendingFields()){event.target.value=state().menu.currency;return;}const value=event.target.value;commit(next=>{const old=next.menu.currency;if((old==='JPY')!==(value==='JPY'))next.menu.sections.forEach(s=>s.items.forEach(i=>i.price=old==='JPY'?i.price*100:Math.round(i.price/100)));next.menu.currency=value;},{editor:true});toast('Currency changed. Numeric amounts are preserved; no exchange rate is applied.');});
$('#item-editor').addEventListener('input',event=>{
  const {id,value}=event.target;
  if(id==='dish-name') {event.target.setCustomValidity(value.trim()?'':'Dish name is required.');if(value.trim())updateItem('name',value);}
  if(id==='dish-description')updateItem('description',value);
  if(id==='dish-tags') {const tags=value.split(',').map(x=>x.trim()).filter(Boolean);const valid=tags.length<=10&&tags.every(t=>t.length<=40);event.target.setCustomValidity(valid?'':'Use up to 10 labels, with at most 40 characters each.');if(valid)updateItem('tags',tags);}
  if(id==='dish-price') {try{const price=parsePrice(value,state().menu.currency);updateItem('price',price);$('#price-error').textContent='';event.target.removeAttribute('aria-invalid');event.target.setCustomValidity('');}catch(error){$('#price-error').textContent=error.message;event.target.setAttribute('aria-invalid','true');event.target.setCustomValidity(error.message);}}
});
$('#item-editor').addEventListener('change',event=>{if(event.target.id==='dish-section'){const targetId=event.target.value;commit(next=>{const source=next.menu.sections.find(s=>s.id===selectedSection);const i=source.items.findIndex(x=>x.id===selected);const [item]=source.items.splice(i,1);next.menu.sections.find(s=>s.id===targetId).items.push(item);selectedSection=targetId;},{editor:true});}});
$('#item-editor').addEventListener('click',event=>{
  if(event.target.closest('#close-editor')){if(!validPendingFields())return;selected='';selectedSection='';render({editor:true,skipTemplates:true});}
  if(event.target.closest('#delete-dish')){const id=selected;commit(next=>{const section=next.menu.sections.find(s=>s.id===selectedSection);section.items=section.items.filter(i=>i.id!==id);},{editor:true});toast('Dish removed. You can undo this.');}
});
$('#section-list').addEventListener('click',event=>{
  const row=event.target.closest('[data-select]');if(row)selectItem(row.dataset.select,row.dataset.section,true);
  const toggle=event.target.closest('[data-toggle-section]');if(toggle){const id=toggle.dataset.toggleSection;collapsed.has(id)?collapsed.delete(id):collapsed.add(id);renderSections();}
  const edit=event.target.closest('[data-edit-section]');if(edit)openCategory(edit.dataset.editSection);
  const add=event.target.closest('[data-new-in]');if(add)addDish(add.dataset.newIn);
});
$('#pages').addEventListener('click',event=>{const item=event.target.closest('[data-item]');if(item)selectItem(item.dataset.item,item.dataset.section,true);});
$('#pages').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){const item=event.target.closest('[data-item]');if(item){event.preventDefault();selectItem(item.dataset.item,item.dataset.section,true);}}});
$('#add-dish').onclick=()=>addDish();
function openCategory(id='') {categoryId=id;$('#category-name').value=state().menu.sections.find(s=>s.id===id)?.name||'';$('#delete-category').hidden=!id;$('#category-dialog-title').textContent=id?'A name for this chapter.':'A new chapter.';$('#category-error').hidden=true;$('#category-dialog').showModal();$('#category-name').focus();}
$('#add-section').onclick=()=>openCategory();
$('#save-category').onclick=()=>{const name=$('#category-name').value.trim();if(!name){$('#category-error').textContent='Give this category a name.';$('#category-error').hidden=false;return;}if(commit(next=>{if(categoryId)next.menu.sections.find(s=>s.id===categoryId).name=name;else next.menu.sections.push({id:uid(),name,items:[]});},{editor:true}))$('#category-dialog').close();else{$('#category-error').textContent=$('#toast').textContent;$('#category-error').hidden=false;}};
$('#category-name').addEventListener('keydown',e=>{if(e.key==='Enter')$('#save-category').click();});
$('#delete-category').onclick=()=>{commit(next=>next.menu.sections=next.menu.sections.filter(s=>s.id!==categoryId),{editor:true});$('#category-dialog').close();toast('Category and its dishes removed. You can undo this.');};
$('#edit-footer').onclick=()=>{$('#menu-footer').value=state().menu.footer;$('#menu-footer').setCustomValidity('');$('#footer-dialog').showModal();};
$('#menu-footer').addEventListener('input',event=>event.target.setCustomValidity(''));
$('#save-footer').onclick=()=>{if(commit(next=>next.menu.footer=$('#menu-footer').value))$('#footer-dialog').close();else{$('#menu-footer').setCustomValidity($('#toast').textContent);$('#menu-footer').reportValidity();}};
$('#template-grid').onclick=event=>{const button=event.target.closest('[data-template]');if(button)commit(next=>next.settings.template=button.dataset.template);};
$('#page-size').onchange=event=>{if(!commit(next=>next.settings.pageSize=event.target.value))event.target.value=state().settings.pageSize;};
document.querySelectorAll('[data-density]').forEach(button=>button.onclick=()=>commit(next=>next.settings.density=button.dataset.density));
function travel(direction){if(history[direction]()){$('#menu-name').setCustomValidity('');persist();render({editor:true});}}
$('#undo').onclick=()=>travel('undo');$('#redo').onclick=()=>travel('redo');
document.addEventListener('keydown',event=>{if(!(event.ctrlKey||event.metaKey)||event.key.toLowerCase()!=='z'||event.target.closest('input,textarea,select'))return;event.preventDefault();travel(event.shiftKey?'redo':'undo');});
function setZoom(value){zoom=Math.max(.6,Math.min(1.8,value));$('#pages').style.setProperty('--scale',zoom);$('#zoom-label').textContent=zoom===1?'Fit':`${Math.round(zoom*100)}%`;}
$('#zoom-in').onclick=()=>setZoom(zoom+.15);$('#zoom-out').onclick=()=>setZoom(zoom-.15);$('#zoom-fit').onclick=()=>setZoom(1);
function validPendingFields(){const invalid=$('.content-panel input:invalid');if(invalid){invalid.focus();invalid.reportValidity();toast('Finish the highlighted edit to keep your menu accurate.');return false;}return true;}
function validPendingEdits(){if(!validPendingFields())return false;const unsupported=unsupportedCharacters(state().menu);if(unsupported.length){toast(`These PDF fonts support Western Latin text. Replace unsupported characters before exporting: ${unsupported.slice(0,8).join(' ')}`);return false;}return true;}
$('#export-pdf').onclick=async()=>{if(!validPendingEdits())return;const button=$('#export-pdf');button.disabled=true;button.textContent='Preparing…';try{const doc=await createPDF(pages,state().menu.name);doc.save(`${state().menu.name.replace(/[^\p{L}\p{N} -]/gu,'').trim()||'Menu'} - ${templates[state().settings.template].name}.pdf`);toast(`${pages.length}-page PDF ready. Every dish, every latest price.`);}catch(error){toast(`Export failed. ${error.message}`);}finally{button.disabled=false;button.innerHTML='Export PDF <span>↓</span>';}};
$('#export-json').onclick=()=>{if(!validPendingFields())return;downloadBlob(new Blob([JSON.stringify(state(),null,2)],{type:'application/json'}),`${state().menu.name.replace(/[^a-z0-9-]/gi,'-')}-menu.json`);toast('Menu backup downloaded. Import it anytime.');};
document.querySelectorAll('.close-dialog').forEach(button=>button.onclick=()=>button.closest('dialog').close());
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}));
function setImportStage(stage){$('#import-entry').hidden=stage!=='entry';$('#import-progress').hidden=stage!=='progress';$('#import-review').hidden=stage!=='review';$('#import-error').hidden=true;}
function openImport(){candidate=null;setImportStage('entry');$('#import-currency').value=state().menu.currency;$('#import-file').value='';$('#import-dialog').showModal();}
$('#open-import').onclick=openImport;
$('#import-examples').onclick=()=>{$('#import-dialog').close();$('#examples-dialog').showModal();};
document.querySelectorAll('[data-import-tab]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-import-tab]').forEach(b=>b.classList.toggle('active',b===button));$('#file-pane').hidden=button.dataset.importTab!=='file';$('#text-pane').hidden=button.dataset.importTab!=='text';$('#parse-text').hidden=button.dataset.importTab!=='text';$('#import-error').hidden=true;});
function importError(error){setImportStage('entry');$('#import-error').textContent=error.message;$('#import-error').hidden=false;}
function reviewCandidate(result){candidate=result;setImportStage('review');renderReview();}
$('#parse-text').onclick=()=>{try{reviewCandidate(parseImport($('#import-text').value,'text',$('#import-currency').value));}catch(error){importError(error);}};
async function readFile(file){
  if(!file)return;
  if(file.size>20*1024*1024){importError(new Error('Choose a file smaller than 20 MB.'));return;}
  setImportStage('progress');$('#progress-text').textContent='Reading your file…';
  const progress=text=>$('#progress-text').textContent=text;
  const extension=file.name.split('.').pop().toLowerCase();
  try{
    let result;
    if(['png','jpg','jpeg','webp'].includes(extension)){const text=await recognizeImage(file,progress);result=parseImport(text,'text',$('#import-currency').value);result.method='Image OCR';result.warnings.unshift('This is OCR output. Check every price against the original image. OCR does not establish allergens.');}
    else if(extension==='pdf'){const text=await extractPDF(file,progress);result=parseImport(text,'text',$('#import-currency').value);result.method='PDF text';result.warnings.unshift('PDF column order can be imperfect. Compare every dish and price with the original file.');}
    else if(['txt','csv','json'].includes(extension))result=parseImport(await file.text(),extension==='txt'?'text':extension,$('#import-currency').value,file.name.replace(/\.[^.]+$/,''));
    else throw new Error('Choose a TXT, CSV, JSON, PDF, PNG, JPEG or WebP file.');
    reviewCandidate(result);
  }catch(error){importError(error);}
}
$('#import-file').onchange=event=>readFile(event.target.files[0]);
$('#dropzone').addEventListener('dragover',event=>{event.preventDefault();$('#dropzone').classList.add('dragging');});
$('#dropzone').addEventListener('dragleave',()=>$('#dropzone').classList.remove('dragging'));
$('#dropzone').addEventListener('drop',event=>{event.preventDefault();$('#dropzone').classList.remove('dragging');readFile(event.dataTransfer.files[0]);});
function renderReview(){
  const {menu,warnings,method}=candidate;
  $('#import-review').innerHTML=`<div class="review-heading"><h3>A quick look before we begin.</h3><span>${escape(method)} · ${dishCount(menu)} dishes</span></div>${warnings.length?`<div class="review-notice">${warnings.map(escape).join('<br>')}</div>`:''}<div class="review-settings"><label>Restaurant name<input id="review-name" value="${escape(menu.name)}" maxlength="120"></label><label>Source currency<select id="review-currency">${Object.keys(currencies).map(c=>`<option ${c===menu.currency?'selected':''}>${c}</option>`).join('')}</select></label></div><div class="review-table-wrap"><table class="review-table"><thead><tr><th>Dish & category</th><th>Description</th><th>Price (${escape(menu.currency)})</th><th></th></tr></thead><tbody>${menu.sections.map(s=>`<tr class="review-section"><td colspan="4"><input data-review-section="${escape(s.id)}" value="${escape(s.name)}" maxlength="120" aria-label="Category name"></td></tr>${s.items.map(i=>`<tr><td><input data-review-name="${escape(i.id)}" value="${escape(i.name)}" maxlength="160" aria-label="Dish name"></td><td><input data-review-description="${escape(i.id)}" value="${escape(i.description)}" maxlength="1200" aria-label="Dish description"></td><td><input class="review-price ${i.price==null?'bad':''}" data-review-price="${escape(i.id)}" value="${i.price==null?'':priceInput(i.price,menu.currency)}" inputmode="decimal" aria-label="Price for ${escape(i.name)}" placeholder="Check"></td><td><button data-review-remove="${escape(i.id)}" class="review-remove" aria-label="Remove ${escape(i.name)} from import">×</button></td></tr>`).join('')}`).join('')}</tbody></table></div>${menu.source?`<p class="review-source">${escape(menu.source.note)}<br><a href="${escape(menu.source.url)}" target="_blank" rel="noopener">${escape(menu.source.label)} ↗</a></p>`:''}<p id="review-error" class="error-message" hidden></p><div class="dialog-footer"><button id="import-back" class="button secondary">← Back</button><button id="apply-import" class="button primary">Use this menu <span>→</span></button></div>`;
  $('#import-back').onclick=()=>setImportStage('entry');
  $('#apply-import').onclick=()=>{
    try{if(!dishCount(menu))throw new Error('Keep at least one dish in your import.');const validated=validateMenu(menu);$('#menu-name').setCustomValidity('');if(!commit(next=>{next.menu=validated;if(candidate.settings)next.settings=candidate.settings;},{editor:true})){const error=$('#review-error');error.textContent=$('#toast').textContent;error.hidden=false;return;}selected='';selectedSection='';$('#import-dialog').close();toast('Your menu is on the table. Choose a design to make it yours.');}
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
$('#open-examples').onclick=()=>$('#examples-dialog').showModal();
$('#content-examples').onclick=()=>$('#examples-dialog').showModal();
$('#jump-designs').onclick=()=>$('.design-panel').scrollIntoView({behavior:'smooth',block:'start'});
$('#example-cards').addEventListener('click',event=>{const button=event.target.closest('[data-example]');if(button){const menu=examples.find(e=>e.id===button.dataset.example);$('#examples-dialog').close();$('#import-dialog').showModal();reviewCandidate({menu:clone(menu),warnings:['This is an unofficial excerpt. Review the source note and prices before using it.'],method:'Official source excerpt'});}});
async function loadExamples(){try{examples=await fetch('./examples/index.json').then(r=>{if(!r.ok)throw new Error();return r.json();});$('#example-cards').innerHTML=examples.map((menu,i)=>`<article class="example-card"><span class="example-number">0${i+1}</span><h3>${escape(menu.name)}</h3><p>${escape(menu.subtitle)}<br>${dishCount(menu)} dishes · ${escape(menu.currency)}</p>${menu.id==='pizzeria-bianco'?'<small>April 2023 source snapshot</small>':''}<button class="button secondary" data-example="${escape(menu.id)}">Explore this menu →</button><div class="example-links"><a href="./examples/${escape(menu.id)}.txt" download>TXT ↓</a><a href="./examples/${escape(menu.id)}.json" download>JSON ↓</a><a href="${escape(menu.source.url)}" target="_blank" rel="noopener">Source ↗</a></div></article>`).join('');}catch{$('#example-cards').innerHTML='<p class="field-help">Examples could not load. You can still import your own menu.</p>';}}
render();loadExamples();
if(storageError)toast(storageError);
globalThis.menuAtelier={getMenu:()=>clone(state().menu),getSettings:()=>clone(state().settings),getPages:()=>clone(pages),createPDF:()=>createPDF(pages,state().menu.name)};
