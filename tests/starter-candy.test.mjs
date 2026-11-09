import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyCandy,validateCandy,addCandy,addCandyFriendship,buyReduction,reducedCost,candyFriendshipParts} from '../src/system/starter-candy.mjs';
import {sameSpeciesEggPrice,passivePrices} from '../src/system/starter-candy.mjs';
import {passiveName} from '../src/data/passive-catalog.mjs';
test('passive state survives earning and reductions; egg prices drop only at hatch thresholds',()=>{
 const entry={...emptyCandy(),candies:100,passive:2};validateCandy({1:entry},{1:3});
 assert.equal(addCandy(entry,1).passive,2);assert.equal(buyReduction(entry,3,0).passive,2);
 assert.equal(passivePrices[2],35);
 assert.equal(sameSpeciesEggPrice(1,19),30);assert.equal(sameSpeciesEggPrice(1,20),27);assert.equal(sameSpeciesEggPrice(1,80),15);
 assert.equal(sameSpeciesEggPrice(10,7),10);assert.equal(sameSpeciesEggPrice(10,8),9);
 assert.throws(()=>validateCandy({1:{...entry,passive:3}},{1:3}),/INVALID/);
 assert.equal(passiveName(1),'GRASSY_SURGE');
});
test('cost purchases debit exactly once per tier, preserve legacy discounts and fraction rules',()=>{
 const first=buyReduction({...emptyCandy(),candies:100},1,0);
 assert.deepEqual(first,{candies:75,friendship:0,reduction:1});
 assert.equal(buyReduction(first,1,0).candies,15);assert.equal(reducedCost(1,2),0.25);
 assert.equal(buyReduction({...emptyCandy(),candies:100},3,15).reduction,2);
 assert.throws(()=>buyReduction({...emptyCandy(),candies:9999},3,50),/MAX/);
 assert.throws(()=>buyReduction(emptyCandy(),3,0),/INSUFFICIENT/);
});
test('friendship keeps remainder and gains beyond capped friendship; fusion splits and daily is excluded',()=>{
 assert.deepEqual(addCandyFriendship(emptyCandy(),80,3),{candies:1,friendship:5,reduction:0});
 assert.equal(addCandy({...emptyCandy(),candies:9998},10).candies,9999);
 const p={species:{getRootSpeciesId:()=>1},fusionSpecies:{getRootSpeciesId:()=>4}};
 assert.deepEqual(candyFriendshipParts(p,5,true,false),[{speciesId:1,points:7},{speciesId:4,points:7}]);
 assert.deepEqual(candyFriendshipParts(p,5,true,true),[]);
 for(const bad of [{1:{candies:-1,friendship:0,reduction:0}},{1:{candies:1,friendship:75,reduction:0}},{999:emptyCandy()}])assert.throws(()=>validateCandy(bad,{1:3}),/INVALID/);
});
