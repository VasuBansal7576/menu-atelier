import test from 'node:test';
import assert from 'node:assert/strict';
import { demoMenu } from '../dist/model.js';

function studioEnvironment(saved) {
  const nodes=new Map(),stored=new Map(saved?[['menu-atelier-v1',JSON.stringify(saved)]]:[]);let writes=0;
  const node=selector=>{
    if(!nodes.has(selector))nodes.set(selector,{value:'',textContent:'',innerHTML:'',validity:{valid:true},listeners:{},classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},addEventListener(name,callback){this.listeners[name]=callback;},setCustomValidity(message){this.validity.valid=!message;this.validationMessage=message;},reportValidity(){this.validityReported=true;},showModal(){this.open=true;},close(){this.open=false;}});
    return nodes.get(selector);
  };
  const previous=Object.fromEntries(['document','localStorage','fetch','setTimeout','clearTimeout','menuAtelier'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  globalThis.document={querySelector:node,querySelectorAll:()=>[],addEventListener(){}};
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
