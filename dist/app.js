import { demoMenu, validateMenu, createHistory, clone, uid, parsePrice, priceInput, formatPrice, currencies } from './model.js';
import { templates, layoutMenu, renderSVG, prepareTypography } from './layout.js';
import { parseImport, extractPDF, recognizeImage } from './import.js';
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

const defaultSettings = { template: 'midnight', pageSize: 'a4', density: 'balanced' };
let initial = { menu: demoMenu(), settings: defaultSettings }, storageError = '', restoredDraft = false;
try {
  const saved = localStorage.getItem('menu-atelier-v1');
  if(saved) { const data = JSON.parse(saved); const loaded = { menu: validateMenu(data.menu), settings: {template: templates[data.settings?.template] ? data.settings.template : defaultSettings.template,pageSize: data.settings?.pageSize === 'letter' ? 'letter' : 'a4',density: ['compact','balanced','spacious'].includes(data.settings?.density) ? data.settings.density : 'balanced'} };layoutMenu(loaded.menu,loaded.settings);initial=loaded;restoredDraft=true; }
} catch(error) { storageError = `The saved draft could not be opened. Your browser backup is retained. ${error.message}`; }
const history = createHistory(initial);
let selected = '', selectedSection = '', candidate = null, categoryId = '', pages = [], examples = [], zoom = 1, toastTimer, activeTask = 'design', showGuides = true, lastCommitError = '', detailsHydrated = false;
let importGeneration = 0;
const collapsed = new Set();
const state = () => history.value;
const dishCount = menu => menu.sections.reduce((sum,s)=>sum+s.items.length,0);
function toast(message) { $('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4000); }
function persist() {
  try { localStorage.setItem('menu-atelier-v1',JSON.stringify(state()));$('#save-status').textContent='Saved in this browser';$('#save-status').classList.remove('save-error'); }
  catch { $('#save-status').textContent='Could not save · download a backup';$('#save-status').classList.add('save-error'); }
}
function showTask(task) {
  activeTask=task;
  document.querySelectorAll('[data-task]').forEach(button=>{const active=button.dataset.task===task;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  for(const name of ['design','content','settings'])$(`#task-${name}`).hidden=name!==task;
}
document.querySelectorAll('[data-task]').forEach(button=>button.onclick=()=>{showTask(button.dataset.task);if(button.dataset.task==='design')renderTemplates();});
$('#jump-content').onclick=()=>showTask('content');
function commit(mutator, options={}) {
  const next=clone(state());mutator(next);
  let nextPages;
  try { next.menu=validateMenu(next.menu);nextPages=layoutMenu(next.menu,next.settings); } catch(error) { lastCommitError=error.message;$('#edit-error').textContent=error.message;$('#edit-error').hidden=false;toast(error.message);return false; }
  lastCommitError='';$('#edit-error').hidden=true;if(history.commit(next)){persist();render({...options,pages:nextPages});}return true;
}
function render(options={}) {
  const {menu,settings}=state();
  $('#project-name').textContent=menu.name;$('#current-design').textContent=templates[settings.template].name;$('#document-label').textContent=templates[settings.template].name;$('#canvas-count').textContent=`${dishCount(menu)} dishes · ${menu.currency}`;$('#dish-count').textContent=`${dishCount(menu)} dishes`;
  $('#undo').disabled=!history.canUndo;$('#redo').disabled=!history.canRedo;$('#mobile-undo').disabled=!history.canUndo;$('#mobile-redo').disabled=!history.canRedo;
  if(!detailsHydrated||(document.activeElement!==$('#menu-name')&&$('#menu-name').validity.valid))$('#menu-name').value=menu.name;
  if(!detailsHydrated||(document.activeElement!==$('#menu-subtitle')&&$('#menu-subtitle').validity.valid))$('#menu-subtitle').value=menu.subtitle;
  detailsHydrated=true;
  $('#menu-currency').value=menu.currency;$('#page-size').value=settings.pageSize;
  document.querySelectorAll('[data-density]').forEach(button=>button.classList.toggle('active',button.dataset.density===settings.density));
  pages=options.pages||layoutMenu(menu,settings);
  $('#pages').innerHTML=pages.map((page,i)=>`<div class="paper-wrap">${renderSVG(page,{interactive:true,selected:showGuides?selected:''})}<span class="page-number">PAGE ${String(i+1).padStart(2,'0')}</span></div>`).join('');
  $('#page-status').textContent=`${settings.pageSize==='letter'?'US Letter':'A4'} · ${pages.length} ${pages.length===1?'page':'pages'}`;
  if(!options.skipList)renderSections();
  if(options.editor)renderEditor();
  if(!options.skipTemplates&&activeTask==='design')renderTemplates();
  renderSource();
}
function renderTemplates() {
  const {menu,settings}=state();
  $('#template-grid').innerHTML=Object.entries(templates).map(([key,t])=>{
    let preview;
    try{preview=renderSVG(layoutMenu(menu,{...settings,template:key})[0]);}
    catch{return `<button class="template-card" disabled aria-label="${t.name} needs a shorter heading or footer"><span class="template-preview">Shorten the heading or footer to use this design.</span><span class="template-name">${t.name}</span></button>`;}
    return `<button class="template-card ${settings.template===key?'selected':''}" data-template="${key}" aria-label="Choose ${t.name} design" aria-pressed="${settings.template===key}"><span class="template-preview">${preview}</span><span class="template-name">${t.name}</span><span class="template-mood">${escape(t.mood)}</span>${settings.template===key?'<span class="template-check">✓</span>':''}</button>`;
  }).join('');
}
function renderSections() {
  const {menu}=state();
  $('#section-list').innerHTML=menu.sections.map(section=>`<section class="category"><div class="category-heading"><button class="section-toggle" data-toggle-section="${escape(section.id)}" aria-expanded="${!collapsed.has(section.id)}"><span>${collapsed.has(section.id)?'▸':'▾'}</span>${escape(section.name)}<span class="category-count">${section.items.length}</span></button><button class="category-edit" data-edit-section="${escape(section.id)}" aria-label="Edit ${escape(section.name)} category" title="Edit category">···</button></div>${collapsed.has(section.id)?'':section.items.map(item=>`<button class="dish-row ${selected===item.id?'active':''}" data-select="${escape(item.id)}" data-section="${escape(section.id)}"><span class="dish-name">${escape(item.name)}</span><span class="dish-price">${escape(formatPrice(item.price,menu.currency))}</span></button>`).join('')}${!section.items.length?`<button class="dish-row" data-new-in="${escape(section.id)}">+ Add your first dish</button>`:''}</section>`).join('') || '<div class="empty-menu">Your menu is empty.<span>Add a category, then your first dish.</span></div>';
}
function renderSource() {
  const source=state().menu.source;
  $('#source-info').innerHTML=source?`<div class="source-info"><strong>From a real restaurant menu</strong>${escape(source.label)}${source.accessedAt?` · Retrieved ${escape(source.accessedAt)}`:''}<br>${source.url?`<a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">View original source ↗</a>`:''}<details><summary>About this excerpt</summary>${escape(source.note)}</details></div>`:'';
}
function selectItem(id, sectionId, focus=false) {
  if(!validPendingFields())return;
  selected=id;selectedSection=sectionId;showTask('content');render({editor:true,skipTemplates:true});
  $('#item-editor').scrollIntoView({block:'nearest'});
  if(focus)$('#dish-name')?.focus();
}
function renderEditor() {
  const {menu}=state();const section=menu.sections.find(s=>s.id===selectedSection);const item=section?.items.find(x=>x.id===selected);
  if(!item){selected='';$('#item-editor').innerHTML='';return;}
  $('#item-editor').innerHTML=`<div class="item-editor"><div class="item-editor-head"><span>EDIT DISH</span><button id="close-editor" aria-label="Close dish editor">×</button></div><label>Dish name<input id="dish-name" maxlength="160" required value="${escape(item.name)}"></label><label>Description<textarea id="dish-description" maxlength="1200" rows="3">${escape(item.description)}</textarea></label><div class="field-row"><label>Price (${menu.currency})<input id="dish-price" inputmode="decimal" value="${priceInput(item.price,menu.currency)}" aria-describedby="price-error"></label><label>Category<select id="dish-section">${menu.sections.map(s=>`<option value="${escape(s.id)}" ${s.id===section.id?'selected':''}>${escape(s.name)}</option>`).join('')}</select></label></div><div id="price-error" class="field-error" role="status"></div><label>Dietary labels · only if verified<input id="dish-tags" maxlength="300" value="${escape(item.tags.join(', '))}" placeholder="vegetarian, vegan"></label><div class="item-editor-foot"><span>Changes appear as you type.</span><button id="delete-dish" class="delete-dish">Remove dish</button></div></div>`;
}
function updateItem(field,value) { return commit(next=>{const item=next.menu.sections.find(s=>s.id===selectedSection)?.items.find(i=>i.id===selected);if(item)item[field]=value;},{skipTemplates:true}); }
function editField(input, operation) {
  input.setCustomValidity('');input.removeAttribute('aria-invalid');
  if(operation()===false){input.setCustomValidity(lastCommitError);input.setAttribute('aria-invalid','true');return false;}
  return true;
}
function addDish(sectionId) {
  if(!validPendingFields())return;
  let id=uid(), newSection=sectionId || selectedSection || state().menu.sections[0]?.id;
  const added=commit(next=>{if(!newSection){newSection=uid();next.menu.sections.push({id:newSection,name:'The menu',items:[]});}next.menu.sections.find(s=>s.id===newSection).items.push({id,name:'New dish',description:'',price:0,tags:[]});});
  if(!added)return;collapsed.delete(newSection);selectItem(id,newSection,true);$('#dish-name')?.select();
}
$('#menu-name').addEventListener('input',event=>{const input=event.target;input.setCustomValidity(input.value.trim()?'':'Restaurant name is required.');if(input.value.trim())editField(input,()=>commit(next=>next.menu.name=input.value,{skipTemplates:true,skipList:true}));});
$('#menu-subtitle').addEventListener('input',event=>editField(event.target,()=>commit(next=>next.menu.subtitle=event.target.value,{skipTemplates:true,skipList:true})));
$('#menu-currency').addEventListener('change',event=>{if(!validPendingFields()){event.target.value=state().menu.currency;return;}const value=event.target.value;if(commit(next=>{const old=next.menu.currency;if((old==='JPY')!==(value==='JPY'))next.menu.sections.forEach(s=>s.items.forEach(i=>i.price=old==='JPY'?i.price*100:Math.round(i.price/100)));next.menu.currency=value;},{editor:true}))toast('Currency changed. Numeric amounts are preserved; no exchange rate is applied.');else event.target.value=state().menu.currency;});
$('#item-editor').addEventListener('input',event=>{
  const input=event.target,{id,value}=input;
  if(id==='dish-name'){input.setCustomValidity(value.trim()?'':'Dish name is required.');if(value.trim())editField(input,()=>updateItem('name',value));}
  if(id==='dish-description')editField(input,()=>updateItem('description',value));
  if(id==='dish-tags'){const tags=value.split(',').map(x=>x.trim()).filter(Boolean);const valid=tags.length<=10&&tags.every(t=>t.length<=40);input.setCustomValidity(valid?'':'Use up to 10 labels, with at most 40 characters each.');if(valid)editField(input,()=>updateItem('tags',tags));}
  if(id==='dish-price'){
    try{const price=parsePrice(value,state().menu.currency);if(editField(input,()=>updateItem('price',price)))$('#price-error').textContent='';else $('#price-error').textContent=lastCommitError;}
    catch(error){$('#price-error').textContent=error.message;input.setAttribute('aria-invalid','true');input.setCustomValidity(error.message);}
  }
});
$('#item-editor').addEventListener('change',event=>{if(event.target.id==='dish-section'){if(!validPendingFields()){event.target.value=selectedSection;return;}const targetId=event.target.value;const moved=commit(next=>{const source=next.menu.sections.find(s=>s.id===selectedSection);const i=source.items.findIndex(x=>x.id===selected);const [item]=source.items.splice(i,1);next.menu.sections.find(s=>s.id===targetId).items.push(item);},{skipTemplates:true});if(moved){selectedSection=targetId;render({editor:true,skipTemplates:true});}else event.target.value=selectedSection;}});
$('#item-editor').addEventListener('click',event=>{
  if(event.target.closest('#close-editor')){if(!validPendingFields())return;selected='';selectedSection='';render({editor:true,skipTemplates:true});}
  if(event.target.closest('#delete-dish')){if(!validPendingFields())return;const id=selected;if(commit(next=>{const section=next.menu.sections.find(s=>s.id===selectedSection);section.items=section.items.filter(i=>i.id!==id);},{editor:true}))toast('Dish removed. You can undo this.');}
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
function openCategory(id='') {if(!validPendingFields())return;categoryId=id;$('#category-name').value=state().menu.sections.find(s=>s.id===id)?.name||'';$('#delete-category').hidden=!id;$('#category-dialog-title').textContent=id?'Edit category':'New category';$('#category-error').hidden=true;$('#category-dialog').showModal();$('#category-name').focus();}
$('#add-section').onclick=()=>openCategory();
$('#save-category').onclick=()=>{const name=$('#category-name').value.trim();if(!name){$('#category-error').textContent='Give this category a name.';$('#category-error').hidden=false;return;}if(commit(next=>{if(categoryId)next.menu.sections.find(s=>s.id===categoryId).name=name;else next.menu.sections.push({id:uid(),name,items:[]});},{editor:true}))$('#category-dialog').close();else{$('#category-error').textContent=$('#toast').textContent;$('#category-error').hidden=false;}};
$('#category-name').addEventListener('keydown',e=>{if(e.key==='Enter')$('#save-category').click();});
$('#delete-category').onclick=()=>{if(commit(next=>next.menu.sections=next.menu.sections.filter(s=>s.id!==categoryId),{editor:true})){$('#category-dialog').close();toast('Category and its dishes removed. You can undo this.');}};
$('#edit-footer').onclick=()=>{if(!validPendingFields())return;$('#menu-footer').value=state().menu.footer;$('#menu-footer').setCustomValidity('');$('#footer-dialog').showModal();};
$('#menu-footer').addEventListener('input',event=>event.target.setCustomValidity(''));
$('#save-footer').onclick=()=>{if(commit(next=>next.menu.footer=$('#menu-footer').value))$('#footer-dialog').close();else{$('#menu-footer').setCustomValidity($('#toast').textContent);$('#menu-footer').reportValidity();}};
$('#template-grid').onclick=event=>{const button=event.target.closest('[data-template]');if(button&&validPendingFields())commit(next=>next.settings.template=button.dataset.template);};
$('#page-size').onchange=event=>{if(!validPendingFields()||!commit(next=>next.settings.pageSize=event.target.value))event.target.value=state().settings.pageSize;};
document.querySelectorAll('[data-density]').forEach(button=>button.onclick=()=>{if(validPendingFields())commit(next=>next.settings.density=button.dataset.density);});
function travel(direction){if(history[direction]()){document.querySelectorAll('.content-panel input,.content-panel textarea').forEach(input=>{input.setCustomValidity('');input.removeAttribute('aria-invalid');});$('#edit-error').hidden=true;detailsHydrated=false;persist();render({editor:true});}}
$('#undo').onclick=()=>travel('undo');$('#redo').onclick=()=>travel('redo');$('#mobile-undo').onclick=()=>travel('undo');$('#mobile-redo').onclick=()=>travel('redo');
document.addEventListener('keydown',event=>{if(!(event.ctrlKey||event.metaKey)||event.key.toLowerCase()!=='z'||event.target.closest('input,textarea,select'))return;event.preventDefault();travel(event.shiftKey?'redo':'undo');});
function setZoom(value){zoom=Math.max(.6,Math.min(1.8,value));$('#pages').style.setProperty('--scale',zoom);$('#zoom-label').textContent=zoom===1?'Fit':`${Math.round(zoom*100)}%`;}
$('#zoom-in').onclick=()=>setZoom(zoom+.15);$('#zoom-out').onclick=()=>setZoom(zoom-.15);$('#zoom-fit').onclick=()=>setZoom(1);
function validPendingFields(){
  const invalid=$('.content-panel input:invalid,.content-panel textarea:invalid');
  if(invalid&&!invalid.validity.valid){showTask(invalid.closest('#task-settings')?'settings':'content');invalid.focus();invalid.reportValidity();toast('Finish the highlighted edit before continuing.');return false;}
  return true;
}
function validPendingEdits(){if(!validPendingFields())return false;const unsupported=unsupportedCharacters(state().menu);if(unsupported.length){toast(`The selected fonts cannot print these characters. Edit the highlighted content before exporting: ${unsupported.slice(0,8).join(' ')}`);return false;}return true;}
$('#export-pdf').onclick=async()=>{if(!validPendingEdits())return;const button=$('#export-pdf'),exportPages=pages,exportTitle=state().menu.name,exportDesign=templates[state().settings.template].name;button.disabled=true;button.textContent='Preparing…';try{const doc=await createPDF(exportPages,exportTitle);doc.save(`${exportTitle.replace(/[^\p{L}\p{N} -]/gu,'').trim()||'Menu'} - ${exportDesign}.pdf`);toast(`${exportPages.length}-page PDF exported for ${exportTitle}.`);}catch(error){toast(`Export failed. ${error.message}`);}finally{button.disabled=false;button.innerHTML='Export PDF <span>↓</span>';}};
$('#export-json').onclick=()=>{if(!validPendingFields())return;downloadBlob(new Blob([JSON.stringify(state(),null,2)],{type:'application/json'}),`${state().menu.name.replace(/[^a-z0-9-]/gi,'-')}-menu.json`);toast('Menu backup downloaded. Import it anytime.');};
function closeDialog(dialog){if(dialog.id==='import-dialog')importGeneration++;dialog.close();}
document.querySelectorAll('.close-dialog').forEach(button=>button.onclick=()=>closeDialog(button.closest('dialog')));
$('#import-dialog').addEventListener('cancel',()=>importGeneration++);
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
    try{if(!dishCount(menu))throw new Error('Keep at least one dish in your import.');const validated=validateMenu(menu);if(!validPendingFields())return;$('#menu-name').setCustomValidity('');if(!commit(next=>{next.menu=validated;if(candidate.settings)next.settings=candidate.settings;},{editor:true})){const error=$('#review-error');error.textContent=$('#toast').textContent;error.hidden=false;return;}selected='';selectedSection='';renderEditor();showTask('design');renderTemplates();closeDialog($('#import-dialog'));toast('Menu imported. Choose a design or click a dish to edit.');}
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
$('#open-examples').onclick=()=>{if(validPendingFields())$('#examples-dialog').showModal();};
$('#design-examples').onclick=()=>{if(validPendingFields())$('#examples-dialog').showModal();};
$('#content-examples').onclick=()=>{if(validPendingFields())$('#examples-dialog').showModal();};
$('#jump-designs').onclick=()=>{showTask('design');renderTemplates();$('.content-panel').scrollIntoView({block:'start'});};
$('#example-cards').addEventListener('click',event=>{const button=event.target.closest('[data-example]');if(button){const menu=examples.find(e=>e.id===button.dataset.example);$('#examples-dialog').close();$('#import-dialog').showModal();reviewCandidate({menu:clone(menu),warnings:['This is an unofficial excerpt. Review the source note and prices before using it.'],method:'Official source excerpt'});}});
async function loadExamples(){try{examples=await fetch('./examples/index.json').then(r=>{if(!r.ok)throw new Error();return r.json();});$('#example-cards').innerHTML=examples.map((menu,i)=>`<article class="example-card"><span class="example-number">0${i+1}</span><h3>${escape(menu.name)}</h3><p>${escape(menu.subtitle)}<br>${dishCount(menu)} dishes · ${escape(menu.currency)}</p>${menu.id==='pizzeria-bianco'?'<small>April 2023 source snapshot</small>':''}<button class="button secondary" data-example="${escape(menu.id)}">Explore this menu →</button><div class="example-links"><a href="./examples/${escape(menu.id)}.txt" download>TXT ↓</a><a href="./examples/${escape(menu.id)}.json" download>JSON ↓</a><a href="${escape(menu.source.url)}" target="_blank" rel="noopener">Source ↗</a></div></article>`).join('');}catch{$('#example-cards').innerHTML='<p class="field-help">Examples could not load. You can still import your own menu.</p>';}}
$('#new-demo').onclick=()=>{
  if(!validPendingFields())return;
  if(commit(next=>{next.menu=demoMenu();next.settings={...defaultSettings};},{editor:true})){
    selected='';selectedSection='';renderEditor();showTask('design');renderTemplates();$('#examples-dialog').close();toast('Original demo restored. You can undo this.');
  }
};
$('#toggle-guides').onclick=()=>{showGuides=!showGuides;$('#pages').classList.toggle('guides-hidden',!showGuides);$('#toggle-guides').setAttribute('aria-pressed',String(showGuides));$('#toggle-guides').textContent=showGuides?'Hide guides':'Show guides';};
function fitPaper(){const area=$('#canvas-area');if(!area.clientWidth)return;const padding=area.clientWidth<640?44:80;$('#pages').style.setProperty('--paper-fit',`${Math.min(650,Math.max(230,area.clientWidth-padding))}px`);}
if(typeof ResizeObserver!=='undefined')new ResizeObserver(fitPaper).observe($('#canvas-area'));
render();fitPaper();loadExamples();
$('#save-status').textContent=restoredDraft?'Saved in this browser':'Demo · changes autosave';
if(storageError)toast(storageError);
globalThis.menuAtelier={getMenu:()=>clone(state().menu),getSettings:()=>clone(state().settings),getPages:()=>clone(pages),createPDF:()=>createPDF(pages,state().menu.name)};
