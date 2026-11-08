import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {findStarters,mountStarterBrowser} from '../src/ui/starter-browser.mjs';
const entries=[{speciesId:1,name:'妙蛙种子',type1:11,type2:3,baseTotal:318},
  {speciesId:4,name:'小火龙',type1:9,type2:null,baseTotal:309},
  {speciesId:7,name:'杰尼龟',type1:10,type2:null,baseTotal:314}];
const base={query:'',type:'',cost:'',sort:'number',unlocked:false};
const own={dexData:{1:{caughtAttr:1n},4:{caughtAttr:0n},7:{caughtAttr:1n}},getSpeciesStarterValue:id=>id===7?2:3};
test('solo filters combine names, secondary types and authoritative costs without mutating order',()=>{
  assert.deepEqual(findStarters(entries,own,{...base,unlocked:true,sort:'cost'}).map(r=>r.species.speciesId),[7,1]);
  assert.equal(findStarters(entries,own,{...base,type:'3'})[0].species.speciesId,1);
  assert.deepEqual(findStarters(entries,own,{...base,type:'0'}),[],'null secondary type is not normal type');
  assert.equal(findStarters(entries,own,{...base,query:'小火'})[0].species.speciesId,4);
  assert.equal(findStarters(entries,own,{...base,query:'7',cost:'2'})[0].species.speciesId,7);
  assert.deepEqual(findStarters(entries,own,{...base,sort:'stats'}).map(r=>r.species.speciesId),[1,7,4]);
  assert.deepEqual(entries.map(s=>s.speciesId),[1,4,7]);
});
test('cooperative shared catalogue and live peer ownership never modify personal unlocks',()=>{
  const shared={...own,dexData:{...own.dexData,4:{caughtAttr:1n}}};let peer=4;
  const rows=()=>findStarters(entries,shared,{...base,unlocked:true},id=>id===peer);
  assert.equal(rows().find(r=>r.species.speciesId===4).blocked,true);
  peer=7;assert.equal(rows().find(r=>r.species.speciesId===4).blocked,false);
  assert.equal(own.dexData[4].caughtAttr,0n);
  assert.equal(findStarters(entries,own,{...base,unlocked:true}).length,2);
});
test('browser locates only, isolates typing, resets filters and preserves unrelated preferences',()=>{
  const dom=new JSDOM('<body></body>',{url:'http://localhost'});globalThis.document=dom.window.document;
  const storage=dom.window.localStorage;storage.setItem('settings',JSON.stringify({MASTER_VOLUME:5,starterBrowser:{unlocked:true,type:'99',cost:'2',sort:'cost'}}));
  const located=[],release=mountStarterBrowser({entries,data:own,types:[[9,'火']],storage,blocked:()=>false,onLocate:s=>located.push(s.speciesId)});
  const root=document.getElementById('starter-browser');assert.equal(root.querySelector('.starter-browser-results button').textContent.includes('杰尼龟'),true);
  let bubbled=false;document.body.addEventListener('keydown',()=>bubbled=true);
  root.querySelector('input').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(bubbled,false);
  root.querySelector('.starter-browser-results button').click();assert.deepEqual(located,[7]);
  [...root.querySelectorAll('button')].find(b=>b.textContent==='重置筛选').click();
  assert.equal(root.querySelectorAll('.starter-browser-results button').length,3);
  assert.equal(JSON.parse(storage.getItem('settings')).MASTER_VOLUME,5);
  release();assert.equal(document.getElementById('starter-browser'),null);dom.window.close();
});
test('collection details use text content and do not locate or select a team member',()=>{
  const dom=new JSDOM('<body></body>');globalThis.document=dom.window.document;let located=0;
  const release=mountStarterBrowser({entries,data:own,types:[],blocked:()=>false,
    onLocate:()=>located++,describe:species=>`${species.name}\n<img src=x>\n只读资料`});
  [...document.querySelectorAll('#starter-browser button')].find(b=>b.textContent==='查看 妙蛙种子 详情').click();
  const detail=document.querySelector('.starter-browser-detail');
  assert.equal(detail.hidden,false);assert.ok(detail.textContent.includes('<img src=x>'));
  assert.equal(detail.querySelector('img'),null);assert.equal(located,0);
  release();dom.window.close();
});
