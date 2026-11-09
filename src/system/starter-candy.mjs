// Balance values from upstream src/data/balance/starters.ts. Offline play
// uses the regular classic multiplier, without timed-event overrides.
export const reductionPrices=[[25,60],[25,60],[20,50],[15,40],[12,35],[10,30],[8,20],[5,15],[5,15],[5,15]];
export const friendshipCaps=[25,50,75,100,150,200,300,450,450,600];
export const passivePrices=[40,40,35,30,25,20,15,10,10,10];
const eggPrices=[[30,27,22,15],[30,27,22,15],[25,22,18,12],[20,18,15,10],[18,16,13,9],[15,13,11,7],[12,10,9,6],[10,9,7,5],[10,9,7,5],[10,9,7,5]];
export function sameSpeciesEggPrice(cost,hatched){const thresholds=cost<=3?[20,40,80]:cost<=6?[15,30,60]:cost<=9?[10,20,40]:[8,16,32];return eggPrices[cost-1][thresholds.filter(n=>hatched>=n).length];}
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
 return ids.map(speciesId=>({speciesId,points:Math.floor(amount*(classic?3:1)/ids.length)}));
}
