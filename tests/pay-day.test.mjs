import test from 'node:test';
import assert from 'node:assert/strict';
import {scatterPayDay,takePayDay} from '../src/battle-core/pay-day.mjs';
import {codec,initialDecision} from './helpers/decision-model.mjs';
test('Pay Day pending coins survive a checkpoint and are consumed exactly once per owner',()=>{
  const c=initialDecision(),legacy=codec.capture(c);
  assert.deepEqual(codec.capture(codec.restore(legacy)),legacy);
  scatterPayDay(c.battle,0,30);scatterPayDay(c.battle,0,40);scatterPayDay(c.battle,1,20);
  const saved=codec.capture(c),restored=codec.restore(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(takePayDay(restored.battle),[70,20]);
  assert.deepEqual(takePayDay(restored.battle),[0,0]);
  assert.deepEqual(c.battle.payDayMoney,[70,20]);
  const committed=codec.capture(restored);
  assert.deepEqual(takePayDay(codec.restore(committed).battle),[0,0]);
});
test('forged Pay Day balances and owners reject without changing the pending coins',()=>{
  const c=initialDecision();scatterPayDay(c.battle,0,30);
  for(const value of [[-1,0],[0.5,0],[0,Infinity],[0,1,2],null]){
    const bad=codec.capture(c);bad.battle.payDayMoney=value;assert.throws(()=>codec.restore(bad));
  }
  for(const [seat,amount]of [[2,30],[0,-1],[0,Infinity],[1,1.5]])assert.throws(()=>scatterPayDay(c.battle,seat,amount));
  assert.deepEqual(c.battle.payDayMoney,[30,0]);
});
