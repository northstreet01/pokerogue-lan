import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {filterOriginalCatalogue as filter,browserScroll} from '../src/ui/original-browser-model.mjs';
const entries=[{speciesId:1,generation:1,name:'妙蛙种子'}, {speciesId:4,generation:1,name:'小火龙'}, {speciesId:7,generation:1,name:'杰尼龟'}];
const data={dexData:{1:{caughtAttr:65n,seenAttr:1n,ivs:[31,0],caughtCount:3,hatchedCount:0},4:{caughtAttr:0n,ivs:[0,0]},7:{caughtAttr:2n,ivs:[10,10],caughtCount:1,hatchedCount:4}},getSpeciesStarterValue:id=>id===7?2:3};
const info=id=>({candies:id===1?40:0,passive:0,eligible:id!==4,passiveAvailable:true,passivePrice:40,tier:id===7?1:0,price:20,eggPrice:20,eggFull:false});
const personal={candyInfo:info,hasClassicRibbon:id=>id===1};
const facts=new Map([[1,{types:[11,3],moves:['撞击','光合作用'],abilities:['茂盛'],passives:['茂盛'],pokerus:true}], [4,{types:[9],moves:['火花'],abilities:['猛火'],passives:[]}],[7,{types:[10],moves:['撞击'],abilities:['激流'],passives:['结实']}]]);
const base={gens:[1,2,3,4,5,6,7,8,9],types:[3,9,10,11],caught:['NORMAL','SHINY','UNCAUGHT'],misc:[],unlocks:[],sort:[{val:0,dir:-1}]};
const run=(filters={},text=[])=>filter(entries,data,personal,{...base,...filters},Array.from({length:5},(_,i)=>text[i]??'---'),facts).map(s=>s.speciesId);

test('display facts stay synchronized with every early evolution predicate and form trigger',()=>{
 assert.match(execFileSync(process.execPath,['scripts/import-pokedex-conditions.mjs','--check'],{encoding:'utf8'}),/Reviewed 115 evolution conditions/);
});
test('original catalogue combines generations, types, caught and two move fields',()=>{
 assert.deepEqual(run({types:[3]}),[1]); assert.deepEqual(run({gens:[2]}),[]);
 assert.deepEqual(run({caught:['SHINY']}),[7]);assert.deepEqual(run({caught:['UNCAUGHT']}),[4]);
 assert.deepEqual(run({},['','撞击','光合作用']),[1]);assert.deepEqual(run({},['','撞击','火花']),[]);
 assert.deepEqual(run({},['小火']),[4]);assert.deepEqual(run({},['7']),[7]);
});
test('upstream two abilities require ordinary + passive, including identical names',()=>{
 assert.deepEqual(run({},['','','','茂盛','茂盛']),[1]);
 assert.deepEqual(run({},['','','','结实','激流']),[7]);
 assert.deepEqual(run({},['','','','激流','结实']),[7]);
 assert.deepEqual(run({},['','','','结实','猛火']),[]);
});
test('personal radial filters and affordability never borrow a peer unlock',()=>{
 assert.deepEqual(run({misc:[{val:'RIBBON',state:0}]}),[1]);
 assert.deepEqual(run({misc:[{val:'HIDDEN_ABILITY',state:0}]}),[1]);
 assert.deepEqual(run({misc:[{val:'RIBBON',state:2}]}),[4,7]);
 assert.deepEqual(run({unlocks:[{val:'PASSIVE',state:3}]}),[1]);
 assert.deepEqual(run({unlocks:[{val:'COST_REDUCTION',state:4}]}),[7]);
 const shared={...data,dexData:{...data.dexData,4:{caughtAttr:1n}}};
 assert.deepEqual(filter(entries,shared,personal,{...base,caught:['NORMAL']},['','','','',''],facts).map(s=>s.speciesId),[1,4]);
 assert.equal(data.dexData[4].caughtAttr,0n);assert.equal(personal.candyInfo(4).eligible,false);
});
test('all seven original sort criteria support both directions and deterministic ties',()=>{
 assert.deepEqual(run({sort:[{val:1,dir:-1}]}),[7,1,4]);
 assert.deepEqual(run({sort:[{val:1,dir:1}]}),[1,4,7]);
 assert.deepEqual(run({sort:[{val:2,dir:1}]}),[1,4,7]);
 assert.deepEqual(run({sort:[{val:3,dir:1}]}),[1,7,4]);
 assert.deepEqual(run({sort:[{val:5,dir:1}]}),[1,7,4]);
 assert.deepEqual(run({sort:[{val:6,dir:1}]}),[7,1,4]);
 assert.deepEqual(entries.map(s=>s.speciesId),[1,4,7]);
});
test('scroll clamps empty, shortened and final partial rows without phantom selections',()=>{
 assert.deepEqual(browserScroll(99,0,20),{cursor:0,firstRow:0});
 assert.deepEqual(browserScroll(89,90,0),{cursor:89,firstRow:3});
 assert.deepEqual(browserScroll(0,90,3),{cursor:0,firstRow:0});
 assert.deepEqual(browserScroll(88,70,3),{cursor:69,firstRow:1});
});
