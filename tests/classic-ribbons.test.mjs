import test from 'node:test';
import assert from 'node:assert/strict';
import {awardClassicRibbons,validateClassicRibbons} from '../src/system/classic-ribbons.mjs';

test('classic ribbons include the pre-evolution line, repeat clears are idempotent and inputs stay unchanged',()=>{
  const saved=[4],party=[3,3],ids=new Set([1,2,3,4]);
  const result=awardClassicRibbons(saved,party,{3:2,2:1},ids);
  assert.deepEqual(result,[1,2,3,4]);
  assert.deepEqual(awardClassicRibbons(result,party,{3:2,2:1},ids),result);
  assert.deepEqual(saved,[4]);assert.deepEqual(party,[3,3]);
});

test('invalid imported ribbons and evolution cycles are rejected',()=>{
  const ids=new Set([1,2]);
  for(const value of [null,{},[1,1],[999],['1'],[1.5]])assert.throws(()=>validateClassicRibbons(value,ids),/INVALID_CLASSIC_RIBBONS/);
  assert.throws(()=>awardClassicRibbons([], [2],{2:1,1:2},ids),/INVALID_RIBBON_EVOLUTION_LINE/);
  assert.deepEqual(awardClassicRibbons(undefined,[],{},ids),[]);
});
