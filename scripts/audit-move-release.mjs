import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {forcedCommandFixture} from '../tests/helpers/native-forced-command.mjs';
const api=createRequire(import.meta.url)('../build/coop-runtime/original-runtime.cjs');
api.describeOriginalCatalogs();
let failures=0;
for(const [name,id] of Object.entries({'Fly':19,'Dig':91,'Bounce':340,'Solar Beam':76,'Sky Attack':143,'Outrage':200,'Thrash':37,'Hyper Beam':63,'Sandstorm':201,'Rain Dance':240,'Sunny Day':241,'Grassy Terrain':580,'Misty Terrain':581,'Thief':168,'Covet':343,'Pay Day':6,'Steel Wing':211})){
 const move=api.allMoves[id];
 const {h,c}=await forcedCommandFixture(api,{}, {0:move.id,1:150});
 try{
  if(['Thief','Covet'].includes(name)){
   c.enemyModifiers=c.roster.entries.filter(e=>e.owner===null).map(e=>{
    const pokemon=api.restorePokemonState(e.pokemon);pokemon.hp=pokemon.stats[0]=999;
    e.pokemon=api.capturePokemonState(pokemon);
    const type=api.modifierTypes.LEFTOVERS();type.id='LEFTOVERS';
    const item=type.newModifier(pokemon);item.stackCount=3;
    c.components.push({kind:'modifier',state:api.captureModifierState(item)});
    return c.components.length-1;
   });
  }
  let checkpoint=c;
  for(let turn=0;turn<(['Thief','Covet'].includes(name)?10:3);turn++){
   let r=await h.request('native-run-to-boundary',checkpoint);checkpoint=r.checkpoint;
   console.log(JSON.stringify({name,turn,stage:'input',decision:checkpoint.decision.kind,seats:checkpoint.decision.requiredSeats}));
   if(checkpoint.decision.kind!=='wait-actions')break;
   const inputs=Object.fromEntries(checkpoint.decision.requiredSeats.map(seat=>[seat,checkpoint.decision.options[seat].find(a=>a.kind==='fight'&&a.cursor===0)]));
   r=await h.request('native-submit',{checkpoint,inputs});checkpoint=r.checkpoint;
   assert.equal(checkpoint.decision.kind,'continuing',`${name} reopened input after command collection`);
  }
  console.log(JSON.stringify({name,items:checkpoint.players.map(p=>p.modifiers.length)}));
 }catch(error){failures++;console.log(JSON.stringify({name,error:String(error),stack:error.stack}));}
 finally{await h.close();}
}
process.exitCode=failures?1:0;
