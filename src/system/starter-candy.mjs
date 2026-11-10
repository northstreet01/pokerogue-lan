import {getValueReductionCandyCounts, getStarterValueFriendshipCap, getPassiveCandyCount,
 getSameSpeciesEggCandyCounts, CLASSIC_CANDY_FRIENDSHIP_MULTIPLIER} from '../data/balance/starter-candy.mjs';
// Compatibility views for early callers; all prices and thresholds come from
// the imported upstream functions. Old discounts and reliable saving stay here.
export const reductionPrices=Array.from({length:10},(_,n)=>getValueReductionCandyCounts(n+1));
export const friendshipCaps=Array.from({length:10},(_,n)=>getStarterValueFriendshipCap(n+1));
export const passivePrices=Array.from({length:10},(_,n)=>getPassiveCandyCount(n+1));
export const sameSpeciesEggPrice=getSameSpeciesEggCandyCounts;
export const emptyCandy=()=>({candies:0,friendship:0,reduction:0});
export function validateCandy(data, costs){
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('INVALID_STARTER_CANDY');
 for(const [id,e]of Object.entries(data)){
  if(!/^[1-9][0-9]*$/.test(id)||!Object.hasOwn(costs,id)||!e||!['candies,friendship,reduction','candies,friendship,passive,reduction'].includes(Object.keys(e).sort().join())
   ||e.passive!==undefined&&![1,2].includes(e.passive)
   ||!Number.isSafeInteger(e.candies)||e.candies<0||e.candies>9999||!Number.isSafeInteger(e.friendship)||e.friendship<0
   ||e.friendship>=friendshipCaps[costs[id]-1]||!Number.isInteger(e.reduction)||e.reduction<0||e.reduction>2)throw Error('INVALID_STARTER_CANDY');
 }return data;
}
export function legacyReduction(cost,count){const thresholds=[[25,100],[20,70],[15,50],[10,30],[8,25],[5,15],[4,12],[3,10],[2,5],[2,5]][cost-1];return Number(count>=thresholds[0])+Number(count>=thresholds[1]);}
export function reducedCost(cost,tier){for(let i=0;i<tier;i++)cost=cost>1?cost-1:cost/2;return cost;}
export function addCandy(entry,amount){return {...entry,candies:Math.min(9999,entry.candies+amount)};}
export function addCandyFriendship(entry,points,cost){
 if(!Number.isSafeInteger(points)||points<0||points>1000000)throw Error('INVALID_CANDY_FRIENDSHIP');
 const cap=friendshipCaps[cost-1],total=entry.friendship+points;
 const next=addCandy(entry,Math.floor(total/cap));next.friendship=next.candies===9999?Math.min(total,cap-1):total%cap;return next;
}
export function buyReduction(entry,cost,count){
 const tier=Math.max(entry.reduction,legacyReduction(cost,count));
 if(tier>=2)throw Error('CANDY_REDUCTION_MAX');
 const price=reductionPrices[cost-1][tier];if(entry.candies<price)throw Error('CANDY_INSUFFICIENT');
 return {...entry,candies:entry.candies-price,reduction:tier+1};
}
export function candyFriendshipParts(pokemon,amount,classic,daily){
 if(daily||amount<=0)return [];
 const ids=[pokemon.species.getRootSpeciesId()];if(pokemon.fusionSpecies)ids.push(pokemon.fusionSpecies.getRootSpeciesId());
 return ids.map(speciesId=>({speciesId,points:Math.floor(amount*(classic?CLASSIC_CANDY_FRIENDSHIP_MULTIPLIER:1)/ids.length)}));
}
