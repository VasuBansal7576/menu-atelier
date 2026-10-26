import test from 'node:test';
import assert from 'node:assert/strict';
import { demoMenu } from '../dist/model.js';

function studioEnvironment(saved) {
  const nodes=new Map(),stored=new Map(saved?[['menu-atelier-v1',JSON.stringify(saved)]]:[]);let writes=0;
  const node=selector=>{
    if(!nodes.has(selector))nodes.set(selector,{value:'',textContent:'',innerHTML:'',required:selector==='#menu-name',validationMessage:'',get validity(){return {valid:!this.validationMessage&&(!this.required||this.value.trim().length>0)};},listeners:{},classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},addEventListener(name,callback){this.listeners[name]=callback;},setCustomValidity(message){this.validationMessage=message;},reportValidity(){this.validityReported=true;},removeAttribute(){},showModal(){this.open=true;},close(){this.open=false;}});
    return nodes.get(selector);
  };
  const previous=Object.fromEntries(['document','localStorage','fetch','setTimeout','clearTimeout','menuAtelier'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  globalThis.document={querySelector:node,querySelectorAll:selector=>selector==='.content-panel input,.content-panel textarea'?[...nodes.values()]:[],addEventListener(){}};
  globalThis.localStorage={getItem:key=>stored.get(key)||null,setItem(key,value){writes++;stored.set(key,value);}};
  globalThis.fetch=async()=>({ok:true,json:async()=>[]});globalThis.setTimeout=()=>0;globalThis.clearTimeout=()=>{};
  return {node,stored,get writes(){return writes;},restore(){for(const [key,descriptor] of Object.entries(previous)){if(descriptor===undefined)delete globalThis[key];else Object.defineProperty(globalThis,key,descriptor);}}};
}
test('an impossible footer edit leaves the valid draft, preview, history and persisted bytes intact',async()=>{
  const env=studioEnvironment();
  try {
    await import(`../dist/app.js?footer-regression=${Date.now()}`);
    env.node('#edit-footer').onclick();env.node('#menu-footer').value='A valid new footer';env.node('#save-footer').onclick();
    const before=globalThis.menuAtelier.getMenu(),pages=globalThis.menuAtelier.getPages(),bytes=env.stored.get('menu-atelier-v1'),writes=env.writes;
    env.node('#edit-footer').onclick();env.node('#menu-footer').value=Array(80).fill('A').join('\n');env.node('#save-footer').onclick();
    assert.deepEqual(globalThis.menuAtelier.getMenu(),before);assert.deepEqual(globalThis.menuAtelier.getPages(),pages);assert.equal(env.stored.get('menu-atelier-v1'),bytes);assert.equal(env.writes,writes);assert.equal(env.node('#footer-dialog').open,true);assert.match(env.node('#menu-footer').validationMessage,/Shorten those fields/);assert.equal(env.node('#menu-footer').validityReported,true);
    env.node('#undo').onclick();assert.notEqual(globalThis.menuAtelier.getMenu().footer,before.footer);
    env.node('#redo').onclick();assert.equal(globalThis.menuAtelier.getMenu().footer,before.footer);
  } finally {env.restore();}
});
test('an older impossible saved draft is retained as backup while a usable menu opens',async()=>{
  const menu=demoMenu();menu.footer=Array(80).fill('A').join('\n');const saved={menu,settings:{template:'atelier',pageSize:'a4',density:'balanced'}},env=studioEnvironment(saved);
  try {
    await import(`../dist/app.js?storage-regression=${Date.now()}`);
    assert.notEqual(globalThis.menuAtelier.getMenu().footer,menu.footer);assert.ok(globalThis.menuAtelier.getPages().length);assert.equal(env.stored.get('menu-atelier-v1'),JSON.stringify(saved));assert.equal(env.writes,0);assert.match(env.node('#toast').textContent,/backup is retained/);
  } finally {env.restore();}
});
test('an imported multiline heading cannot replace the active menu or close review on failure',async()=>{
  const menu=demoMenu();menu.name=Array(60).fill('A').join('\n');const env=studioEnvironment();
  try {
    await import(`../dist/app.js?import-regression=${Date.now()}`);
    const before=globalThis.menuAtelier.getMenu(),pages=globalThis.menuAtelier.getPages();env.node('#open-import').onclick();
    await env.node('#import-file').onchange({target:{files:[{name:'menu.json',size:2000,text:async()=>JSON.stringify(menu)}]}});
    env.node('#apply-import').onclick();
    assert.deepEqual(globalThis.menuAtelier.getMenu(),before);assert.deepEqual(globalThis.menuAtelier.getPages(),pages);assert.equal(env.writes,0);assert.equal(env.node('#import-dialog').open,true);assert.equal(env.node('#review-error').hidden,false);assert.match(env.node('#review-error').textContent,/Shorten those fields/);
  } finally {env.restore();}
});

test('a required restaurant name is hydrated and undo restores an unfinished edit',async()=>{
  const env=studioEnvironment();
  try {
    await import(`../dist/app.js?hydration-regression=${Date.now()}`);
    const name=env.node('#menu-name'),initial=globalThis.menuAtelier.getMenu().name;
    assert.equal(name.value,initial);assert.equal(name.validity.valid,true);
    env.node('#edit-footer').onclick();env.node('#menu-footer').value='A new footer';env.node('#save-footer').onclick();
    name.value='';name.listeners.input({target:name});
    assert.equal(name.validity.valid,false);assert.equal(globalThis.menuAtelier.getMenu().name,initial);
    env.node('#undo').onclick();
    assert.equal(name.value,initial);assert.equal(name.validity.valid,true);
  } finally {env.restore();}
});

test('an older file read cannot replace a newer import review',async()=>{
  const env=studioEnvironment();
  try {
    await import(`../dist/app.js?import-generation=${Date.now()}`);
    env.node('#open-import').onclick();env.node('#import-currency').value='USD';
    let resolveOld;const oldText=new Promise(resolve=>resolveOld=resolve);
    const oldRead=env.node('#import-file').onchange({target:{files:[{name:'old.txt',size:100,text:()=>oldText}]}});
    env.node('#open-import').onclick();env.node('#import-currency').value='GBP';
    await env.node('#import-file').onchange({target:{files:[{name:'new.txt',size:100,text:async()=> 'New menu\n## Mains\nNew dish 12.50'}]}});
    const review=env.node('#import-review').innerHTML;assert.match(review,/New menu/);assert.match(review,/GBP/);
    resolveOld('Old menu\n## Mains\nOld dish 8.00');await oldRead;
    assert.equal(env.node('#import-review').innerHTML,review);
  } finally {env.restore();}
});
test('a file read captures source currency and cancellation invalidates its completion',async()=>{
  const env=studioEnvironment();
  try {
    await import(`../dist/app.js?import-currency=${Date.now()}`);
    env.node('#open-import').onclick();env.node('#import-currency').value='USD';
    let resolveText;const text=new Promise(resolve=>resolveText=resolve);
    const read=env.node('#import-file').onchange({target:{files:[{name:'menu.txt',size:100,text:()=>text}]}});
    env.node('#import-currency').value='GBP';resolveText('A table\n## Mains\nDish 12.50');await read;
    assert.match(env.node('#import-review').innerHTML,/Price \(USD\)/);
    env.node('#open-import').onclick();let resolveCancelled;const cancelled=new Promise(resolve=>resolveCancelled=resolve);
    const old=env.node('#import-file').onchange({target:{files:[{name:'cancelled.txt',size:100,text:()=>cancelled}]}});
    env.node('#import-dialog').listeners.cancel();const before=env.node('#import-review').innerHTML;
    resolveCancelled('Cancelled menu\n## Mains\nDish 5.00');await old;
    assert.equal(env.node('#import-review').innerHTML,before);
  } finally {env.restore();}
});
