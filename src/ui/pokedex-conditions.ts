// Display adapter for upstream evolution/form descriptions. Facts are extracted
// from this engine's predicates without executing them; see the import script.
import facts from '../data/balance/pokedex-conditions.json';
import {Species} from '../data/enums/species';
import {Moves} from '../data/enums/moves';
import {Nature,getNatureName} from '../data/nature';
import {allMoves} from '../data/move';
import {Abilities,allAbilities} from '../data/ability';
import {getPokemonSpecies} from '../data/pokemon-species';
import {FormChangeItem,SpeciesFormChangeItemTrigger} from '../data/pokemon-forms';
import {getStatusEffectDescriptor,StatusEffect} from '../data/status-effect';
import i18next from '../i18n';

const camel=(value:string)=>value.toLowerCase().replace(/_([a-z])/g,(_,c)=>c.toUpperCase());
const t=(key:string,args?:any):string=>String(i18next.t('pokedexLegacy:'+key,args));
const typeName=(name:string)=>i18next.t(`pokemonInfo:type.${name.toLowerCase()}`);
const moveName=(name:string)=>allMoves[Moves[name]]?.name ?? name;
export function conditionDescription(fact:any):string {
  switch(fact.kind){
    case 'always': return '';
    case 'and': return fact.values.map(conditionDescription).filter(Boolean).join('\n');
    case 'or': return fact.values.map(value=>`(${conditionDescription(value)})`).join(t('or'));
    case 'friendship': return i18next.t('pokemonEvolutions:friendship')+' '+t('threshold',{value:fact.value});
    case 'gender': return i18next.t('pokemonEvolutions:gender',{gender:fact.value==='FEMALE'?'♀':'♂'});
    case 'move': return i18next.t('pokemonEvolutions:move',{move:moveName(fact.value)});
    case 'moveType': return i18next.t('pokemonEvolutions:moveType',{type:typeName(fact.value)});
    case 'partyType': return i18next.t('pokemonEvolutions:partyType',{type:typeName(fact.value)});
    case 'partySpecies': return t('partySpecies',{species:getPokemonSpecies(Species[fact.value as keyof typeof Species]).name});
    case 'partySpace': return i18next.t('pokemonEvolutions:shedinja');
    case 'pokeball': return t('pokeball');
    case 'stats': return t('attackDefense',{operator:fact.value==='==='?'=':fact.value});
    // Upstream day/night wording groups times differently; use exact old enums.
    case 'time': return t('time',{time:i18next.t(`biome:${camel(fact.value)}`)});
    case 'biome': return t(fact.not?'outsideBiome':'inBiome',{biome:i18next.t(`biome:${camel(fact.value)}`)});
    case 'nature': return t('natures',{natures:fact.values.map(name=>getNatureName(Nature[name as keyof typeof Nature])).join(', ')});
    case 'weather': return t('weathers',{weather:fact.values.map(name=>t('weather'+name)).join(', ')});
    case 'kingsRock': return t('heldItem',{item:i18next.t('modifierType:ModifierType.KINGS_ROCK.name')});
    case 'seededChance': return t('seededChance',{denominator:fact.value});
    case 'defaultForm': return t('unreachableRockruff');
    case 'ability': return i18next.t('pokemonEvolutions:forms.ability')+': '+allAbilities[Abilities[fact.value]].name;
    default: return i18next.t('pokedexLegacy:extraCondition');
  }
}
export function evolutionConditionDescription(from:number,index:number){
  const fact=facts.records[`${Species[from]}:${index}`];
  return fact ? conditionDescription(fact) : i18next.t('pokedexLegacy:extraCondition');
}

function triggerDescription(trigger:any):string {
  const values=trigger.values??[],name=(value:any)=>String(value).split('.').at(-1);
  switch(trigger.kind){
    case 'and': return trigger.values.map(triggerDescription).join('\n');
    case 'ItemTrigger': return i18next.t(values[1]===false?'pokemonEvolutions:forms.deactivateItem':'pokemonEvolutions:forms.item',{
      item:i18next.t(`modifierType:FormChangeItem.${name(values[0])}`)});
    case 'MoveLearnedTrigger': return i18next.t(values[1]===false?'pokemonEvolutions:forms.moveForgotten':'pokemonEvolutions:forms.moveLearned',{move:moveName(name(values[0]))});
    case 'PreMoveTrigger': return i18next.t('pokemonEvolutions:forms.preMove')+': '+(values[0]==='ATTACK_MOVE'?t('attackMove'):moveName(name(values[0])));
    case 'PostMoveTrigger': return i18next.t('pokemonEvolutions:forms.postMove')+': '+moveName(name(values[0]));
    case 'TimeOfDayTrigger': return values.map(value=>conditionDescription({kind:'time',value:name(value)})).join(t('or'));
    case 'ActiveTrigger': return i18next.t(values[0]===true?'pokemonEvolutions:forms.enter':'pokemonEvolutions:forms.leave');
    case 'StatusEffectTrigger': return t(values[1]===true?'withoutStatus':'withStatus',{status:getStatusEffectDescriptor(StatusEffect[name(values[0])])});
    case 'defaultMatch': return t('defaultMatch',{form:values[0]??trigger.value});
    case 'ManualTrigger': return t('battleTrigger');
    default: return t('battleTrigger');
  }
}
export function formChangeDescription(species:number,index:number,change:any):string {
  const recipe=facts.forms[`${Species[species]}:${index}`];
  if(recipe)return [triggerDescription(recipe.trigger),...recipe.conditions.map(conditionDescription)].filter(Boolean).join('\n');
  // The early engine automatically appends reverse item changes at startup.
  const item=change.findTrigger(SpeciesFormChangeItemTrigger) as SpeciesFormChangeItemTrigger;
  return item ? triggerDescription({kind:'ItemTrigger',values:[`FormChangeItem.${FormChangeItem[item.item]}`,item.active]}) : t('battleTrigger');
}
