import test from 'node:test';
import assert from 'node:assert/strict';
import {recordCoopDiagnostic,flushCoopDiagnostics} from '../src/coop/diagnostics.mjs';

test('diagnostics batch storage writes and preserve the newest 180 records on flush',()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let writes=0,reads=0,saved;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
  getItem(){reads++;return null;},setItem(_key,value){writes++;saved=JSON.parse(value);}}});
 try{
  for(let i=0;i<250;i++)recordCoopDiagnostic('snapshot',{revision:i});
  assert.equal(reads,1);assert.equal(writes,0);
  flushCoopDiagnostics();assert.equal(writes,1);assert.equal(saved.length,180);
  assert.equal(saved[0].details.revision,70);assert.equal(saved.at(-1).details.revision,249);
 }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;}
});
