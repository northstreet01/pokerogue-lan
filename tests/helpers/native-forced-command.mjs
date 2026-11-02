import{createOriginalRuleHost}from'../../server/original-rule-host.mjs';
import{captureTurnCommands,restoreTurnCommands}from'../../src/battle-core/command-state.mjs';
import{canonical}from'../../src/battle-core/coop-contract.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
export async function forcedCommandFixture(api,queues, moves={}){const h=await createOriginalRuleHost({seed:'vs02b09-capture',identity:{trainerId:1,secretId:2}});try{
 const c=(await h.request('native-open-to-input',{parties:[[1,4,7],[906,909,912]],eggState:{players:[[],[]]}})).checkpoint;
 c.decision={id:'queued-fixture',kind:'continuing',requiredSeats:[],reason:'effects'};
 c.continuation.phaseQueue=[{kind:'original-phase',phaseId:10000,remaining:'start',phase:{version:1,type:'TurnInitPhase',scope:null,fields:{},presentation:{}}}];
 c.continuation.phaseQueuePrepend=[];c.continuation.nextCommandPhaseQueue=[];c.battle.turnCommands={'0':null,'1':null,'2':null,'3':null,'-1':null};
 for(const e of c.roster.entries.filter(e=>e.owner===null)){const m=clone(e.pokemon.fields.moveset[0]);m.fields.moveId=150;m.fields.ppUsed=0;e.pokemon.fields.moveset=[m];}
 for(const seat of[0,1]){const entry=c.roster.entries.find(e=>e.owner===seat&&e.index===0),pokemon=api.restorePokemonState(entry.pokemon);if(moves[seat]){pokemon.getMoveset()[0].moveId=moves[seat];pokemon.getMoveset()[0].ppUsed=1;pokemon.moveset=[pokemon.getMoveset()[0]];}pokemon.getMoveQueue().splice(0,Infinity,...clone(queues[seat]??[]));entry.pokemon=api.capturePokemonState(pokemon);}
 await h.request('native-validate-checkpoint',c);return{h,c};}catch(e){await h.close();throw e;}}

// Explicit old-version saved target stop. New charged commands retain their
// target and never create this boundary, but old rooms must still recover it.
export function legacyForcedTargetStop(checkpoint,seat,partner){
 const c=clone(checkpoint),other=1-seat,commands=restoreTurnCommands(c.battle.turnCommands);
 const command=commands[seat],id=c.roster.field[seat],targets=[2,3,other];
 delete command.targets;command.move.targets=[];
 const value=value=>({presence:'value',value});
 let phaseId=20000;
 c.continuation.currentPhase={kind:'original-phase',phaseId:phaseId++,remaining:'wait-target',
  phase:{version:1,type:'SelectTargetPhase',scope:seat,fields:{battlerIndex:value(seat),player:value(true),fieldIndex:value(seat)},presentation:{}}};
 if(seat===0){
  commands[other]=null;
  c.continuation.phaseQueue.unshift({kind:'original-phase',phaseId:phaseId++,remaining:'start',
   phase:{version:1,type:'CommandPhase',scope:other,fields:{fieldIndex:value(other),nativeIntent:value(canonical(partner))},presentation:{}}});
 }
 c.battle.turnCommands=captureTurnCommands(commands);c.commandTargetGroups=[];
 c.decision={id:'legacy-forced-target',kind:'wait-target',requiredSeats:[seat],
  options:{[seat]:[...targets,-1].map(target=>({kind:'target',pokemonId:id,target}))},
  target:{fieldIndex:seat,pokemonId:id,moveId:command.move.move,targets}};
 return c;
}
