import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {buildCoopRuntime} from '../scripts/build-coop-runtime.mjs';
import {forcedCommandFixture} from './helpers/native-forced-command.mjs';

test('both clients receive active enemy item descriptions without private player inventories',async()=>{
 await buildCoopRuntime();
 const api=createRequire(import.meta.url)('../build/coop-runtime/original-runtime.cjs');api.describeOriginalCatalogs();
 const {h,c}=await forcedCommandFixture(api,{});
 try{
  const enemy=c.roster.entries.find(e=>e.owner===null),pokemon=api.restorePokemonState(enemy.pokemon);
  const type=api.modifierTypes.LEFTOVERS();type.id='LEFTOVERS';
  const item=type.newModifier(pokemon);item.stackCount=2;
  c.components.push({kind:'modifier',state:api.captureModifierState(item)});c.enemyModifiers.push(c.components.length-1);
  const snapshots=await Promise.all([0,1].map(seat=>h.request('native-project',{checkpoint:c,seat})));
  const items=snapshots[0].shared.enemyItems;
  assert.deepEqual(items,snapshots[1].shared.enemyItems);assert.equal(items.length,1);
  assert.equal(items[0].count,2);assert.equal(items[0].icon,type.iconImage);
  assert.ok(items[0].name);assert.ok(items[0].description);assert.ok(items[0].owner);
  assert.equal('modifiers' in snapshots[0].shared,false);
 }finally{await h.close();}
});
