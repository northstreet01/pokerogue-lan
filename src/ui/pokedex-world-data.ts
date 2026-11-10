// Read adapters for upstream PokedexPage's BIOMES / EVOLUTIONS menus.
// Use the early engine's live tables; never execute evolution predicates or RNG.
import PokemonSpecies, {getPokemonSpecies} from '../data/pokemon-species';
import {pokemonEvolutions, EvolutionItem} from '../data/pokemon-evolutions';
import {biomePokemonPools, BiomePoolTier} from '../data/biomes';
import {Biome} from '../data/enums/biome';
import {TimeOfDay} from '../data/enums/time-of-day';
import {Species} from '../data/enums/species';
import i18next from '../i18n';
import {evolutionConditionDescription,formChangeDescription} from './pokedex-conditions';
import {pokemonFormChanges} from '../data/pokemon-forms';

const camel = (key: string) => key.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
export const biomeName = (id: number) => i18next.t(`biome:${camel(Biome[id])}`);
export const biomeIds = () => Object.values(Biome).filter((id): id is number => typeof id === 'number');

// Upstream aggregates the prevolution/evolution chain for habitat lookup.
// Traverse only permanent evolution links, including branches, with a cycle guard.
export function evolutionFamily(id: number): number[] {
  const family = new Set<number>([id]);
  for (const current of family) {
    for (const [from, evolutions] of Object.entries(pokemonEvolutions)) {
      for (const evo of evolutions) {
        if (Number(from) === current) family.add(evo.speciesId);
        if (evo.speciesId === current) family.add(Number(from));
      }
    }
  }
  return [...family];
}

export function buildHabitatIndex(pools = biomePokemonPools) {
  const index = new Map<number, {biome: number; tier: number; timesOfDay: number[]; min: number; max: number}[]>();
  for (const [biome, tiers] of Object.entries(pools)) for (const [tier, times] of Object.entries(tiers)) {
    for (const [time, entries] of Object.entries(times)) for (const entry of entries) {
      const ranges = typeof entry === 'number' ? [[1, [entry], Infinity] as const]
        : Object.keys(entry).map(Number).sort((a,b) => a-b).map((level, i, levels) => [level, entry[level], (levels[i+1] ?? Infinity)-1] as const);
      for (const [min, ids, max] of ranges) for (const id of ids) {
        const rows = index.get(id) ?? []; index.set(id, rows);
        const existing = rows.find(row => row.biome === Number(biome) && row.tier === Number(tier) && row.min === min && row.max === max);
        if (existing) { if (!existing.timesOfDay.includes(Number(time))) existing.timesOfDay.push(Number(time)); }
        else rows.push({biome:Number(biome),tier:Number(tier),timesOfDay:[Number(time)],min,max});
      }
    }
  }
  return index;
}

export function habitatEntries(id: number, index = buildHabitatIndex()) {
  const groups = new Map<string, {biome:number; tier:number; timesOfDay:number[]; records:string[]}>();
  for (const source of evolutionFamily(id)) for (const row of index.get(source) ?? []) {
    const key = `${row.biome}:${row.tier}`;
    const group = groups.get(key) ?? {biome:row.biome,tier:row.tier,timesOfDay:[],records:[]}; groups.set(key,group);
    const times = row.timesOfDay.includes(TimeOfDay.ALL) ? i18next.t('biome:all')
      : row.timesOfDay.map(time => i18next.t(`biome:${camel(TimeOfDay[time])}`)).join(', ');
    const level = row.max === Infinity ? `${row.min}+` : `${row.min}–${row.max}`;
    group.timesOfDay = [...new Set([...group.timesOfDay,...row.timesOfDay])];
    group.records.push(`${getPokemonSpecies(source).name} · Lv.${level} (${times})`);
  }
  return [...groups.values()].sort((a,b)=>a.biome-b.biome || a.tier-b.tier).map(group => {
    const label = `${biomeName(group.biome)} - ${i18next.t(`biome:${camel(BiomePoolTier[group.tier])}`)}`;
    return {...group,label,unlocked:true,description:`${label}\n${group.records.join('\n')}\n${i18next.t('pokedexLegacy:poolNote')}`};
  });
}

export function evolutionEntries(species: PokemonSpecies, formIndex: number, data: any) {
  const formKey = species.forms[formIndex]?.formKey ?? '';
  const entries: {label:string; description:string; unlocked:boolean; species:PokemonSpecies; formIndex:number}[] = [];
  for (const [from, evolutions] of Object.entries(pokemonEvolutions)) for (const evo of evolutions) {
    const forward = Number(from) === species.speciesId && (!evo.preFormKey || evo.preFormKey === formKey);
    const backward = evo.speciesId === species.speciesId && (evo.evoFormKey === null || evo.evoFormKey === formKey);
    if (!forward && !backward) continue;
    const target = getPokemonSpecies(forward ? evo.speciesId : Number(from));
    const key = (forward ? evo.evoFormKey : evo.preFormKey) ?? formKey;
    const targetForm = Math.max(0, target.forms.findIndex(form => form.formKey === key));
    const parts: string[] = [];
    // Same level/item text assembly as upstream SpeciesFormEvolution.description.
    if (evo.level > 1) parts.push(i18next.t('pokemonEvolutions:atLevel', {lv:evo.level}));
    if (evo.item) parts.push(i18next.t('pokemonEvolutions:using', {
      item:i18next.t(`modifierType:EvolutionItem.${EvolutionItem[evo.item]}`),
      tier:i18next.t(evo.item > 50 ? 'pokemonEvolutions:ultra' : 'pokemonEvolutions:great')}));
    if (evo.condition) {
      if (!parts.length) parts.push(i18next.t('pokemonEvolutions:levelUp'));
      const description=evolutionConditionDescription(Number(from),evolutions.indexOf(evo));
      if(description)parts.push(description);
    }
    if (!parts.length) parts.push(i18next.t('pokemonEvolutions:levelUp'));
    if(!evo.item && evolutions.slice(0,evolutions.indexOf(evo)).some(previous=>!previous.item)) parts.push(i18next.t('pokedexLegacy:branchOrder'));
    if(evo.speciesId===Species.SHEDINJA) parts.push(i18next.t('pokedexLegacy:shedinjaExtra'));
    const attr = data.dexData[target.speciesId]?.caughtAttr ?? 0n;
    entries.push({species:target,formIndex:targetForm,
      label:i18next.t(forward ? 'pokedexUiHandler:evolutions' : 'pokedexUiHandler:prevolutions') + target.name
        + (target.forms[targetForm]?.formName ? ` (${target.forms[targetForm].formName})` : ''),
      unlocked:!!attr && !!(attr & data.getFormAttr(targetForm)), description:parts.join('\n')});
  }
  return entries;
}

export function formEntries(species:PokemonSpecies,data:any){
  const changes=pokemonFormChanges[species.speciesId]??[];
  return species.forms.map((form,formIndex)=>{
    const conditions=changes.flatMap((change,index)=>change.formKey===form.formKey
      ? [`${formDisplayName(species,Math.max(0,species.forms.findIndex(f=>f.formKey===change.preFormKey)))} → ${formDisplayName(species,formIndex)}\n${formChangeDescription(species.speciesId,index,change)}`] : []);
    const attr=data.dexData[species.speciesId]?.caughtAttr??0n;
    return {species,formIndex,label:formDisplayName(species,formIndex),unlocked:!!(attr&data.getFormAttr(formIndex)),
      description:(conditions.length?conditions.join('\n\n'):i18next.t('pokedexLegacy:ordinaryForm'))+'\n'+i18next.t('pokedexLegacy:previewOnly')};
  });
}

export function formDisplayName(species:PokemonSpecies,index:number){
  const name=species.getName(index),form=species.forms[index];
  if(!form || name!==species.name)return name;
  const key=camel(`${Species[species.speciesId]}${form.formKey?'_'+form.formKey.replaceAll('-','_'):''}`);
  const label=i18next.exists(`pokemonForm:${key}`)?i18next.t(`pokemonForm:${key}`):form.formName;
  return label ? `${name} (${label})` : name;
}
