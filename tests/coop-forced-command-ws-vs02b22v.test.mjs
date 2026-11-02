import test,{before}from'node:test';import assert from'node:assert/strict';import{createRequire}from'node:module';import fs from'node:fs/promises';import{resolve}from'node:path';
import{buildCoopRuntime}from'../scripts/build-coop-runtime.mjs';import{forcedCommandFixture,legacyForcedTargetStop}from'./helpers/native-forced-command.mjs';
import{openPreparationRoom,request,until}from'./helpers/native-preparation-ws.mjs';import{FormalRoomStore}from'../server/formal-coop-service.mjs';
let api;before(async()=>{await fs.mkdir('build/vs02b22v',{recursive:true});await buildCoopRuntime();api=createRequire(import.meta.url)('../build/coop-runtime/original-runtime.cjs');api.describeOriginalCatalogs();});
const field=(c,seat)=>c.roster.entries.find(e=>e.owner===seat&&e.index===0).pokemon.fields;
for(const failWrite of[false,true])test('legacy target restores disk/dual ACK and executes saved partner once; write failure '+failWrite,async()=>{
 const fixture=await forcedCommandFixture(api,{0:[{move:130,targets:[2],ignorePP:true}]},{0:130});let c,partner;
 try{
  c=(await fixture.h.request('native-step',fixture.c)).checkpoint;
  partner=c.decision.options[1].find(o=>o.kind==='fight'&&(o.target===null||o.target>=2));
  c=(await fixture.h.request('native-submit',{checkpoint:c,inputs:{1:partner}})).checkpoint;
  c=legacyForcedTargetStop(c,0,partner);await fixture.h.request('native-validate-checkpoint',c);
 }finally{await fixture.h.close();}
 const directory=await fs.mkdtemp(resolve('build/vs02b22v/forced-ws-')),base=new FormalRoomStore(directory);let fail=false;
 const store={load:()=>base.load(),save:room=>{if(fail&&room.revision===1)throw Error('injected disk failure');return base.save(room);}};
 const settings={api,checkpoint:c,stage:'target',provisioning:{seed:'vs02b09-capture',identities:[{trainerId:1,secretId:2},{trainerId:3,secretId:4}],sharedPreparation:true}};
 let env=await openPreparationRoom({...settings,store});try{
  let pair=env.pair;const roomId=pair[0].identity.roomId,tokens=pair.map(p=>p.identity);
  assert.equal(pair[0].latest.personal.decision.kind,'wait-target');
  const forbidden=request(pair[1],partner);pair[1].send(forbidden);
  assert.equal((await pair[1].wait(m=>m.type==='actionReceipt'&&m.actionId===forbidden.actionId)).accepted,false);
  const before=structuredClone(env.server.rooms.get(roomId).checkpoint),pp=field(c,1).moveset[partner.cursor].fields.ppUsed;
  await env.close();env=await openPreparationRoom({...settings,store,old:tokens});pair=env.pair;
  assert.deepEqual(env.server.rooms.get(roomId).checkpoint,before);
  const choice=pair[0].latest.personal.decision.options.find(o=>o.target>=2),target=request(pair[0],choice);
  fail=failWrite;pair[0].send(target);
  assert.equal((await pair[0].wait(m=>m.type==='actionReceipt'&&m.actionId===target.actionId)).accepted,true);
  if(failWrite){
   await pair[0].wait(m=>m.type==='syncStatus'&&m.reason==='STORAGE_FAILED');
   assert.deepEqual(env.server.rooms.get(roomId).checkpoint,before);
   await env.close();fail=false;env=await openPreparationRoom({...settings,store,old:tokens});pair=env.pair;
  }
  await until(()=>pair.every(p=>p.ready&&p.latest.revision===1),'legacy target and saved partner execute after recovery');
  const committed=structuredClone(env.server.rooms.get(roomId).checkpoint);
  assert.equal(field(committed.nativeCheckpoint,1).moveset[partner.cursor].fields.ppUsed,pp+1);
  assert.equal(field(committed.nativeCheckpoint,0).moveset[0].fields.ppUsed,1);
  pair[0].send(target);assert.equal((await pair[0].wait(m=>m.type==='actionReceipt'&&m.actionId===target.actionId)).accepted,true);
  assert.deepEqual(env.server.rooms.get(roomId).checkpoint,committed);
 }finally{await env.close();}
});
