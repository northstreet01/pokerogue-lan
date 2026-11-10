// Read adapter for upstream PokedexPage's categories. The room selection view
// supplies selectable abilities/IVs/moves; permanent candy and ribbons stay personal.
import type PokemonSpecies from '../data/pokemon-species';
import {PlayerPokemon} from '../field/pokemon';
import {allAbilities, getSpeciesPassive} from '../data/ability';
import {allMoves} from '../data/move';
import {speciesEggMoves} from '../data/egg-moves';
import {getNatureName} from '../data/nature';
import i18next from '../i18n';
import {evolutionEntries, habitatEntries,formEntries} from './pokedex-world-data';

export interface PokedexDetailEntry {
  label: string;
  unlocked: boolean;
  description?: string;
  move?: any;
  species?: PokemonSpecies;
  formIndex?: number;
}

export function buildPokedexDetails(species: PokemonSpecies, data: any, personal: any, formIndex?: number) {
  const id = species.speciesId, rootId = species.getRootSpeciesId();
  const dex = data.dexData[id], props = data.getSpeciesDexAttrProps(species, data.getSpeciesDefaultDexAttr(species));
  if (formIndex !== undefined && (formIndex === 0 || species.forms[formIndex])) props.formIndex = formIndex;
  const form = species.forms[props.formIndex] ?? species;
  const attr = dex?.caughtAttr ?? 0n, candy = personal.candyInfo(id);
  const abilities: PokedexDetailEntry[] = [form.ability1, form.ability2, form.abilityHidden].flatMap((abilityId, index) => {
    if (!abilityId || !allAbilities[abilityId]) return [];
    const ability = allAbilities[abilityId];
    return [{label: (index === 2 ? i18next.t('pokedexUiHandler:hidden') : '') + ability.name,
      unlocked: !!(attr & [16n, 32n, 64n][index]), description: ability.description}];
  });
  const passive = getSpeciesPassive(id, props.formIndex);
  abilities.push({label: i18next.t('starterSelectUiHandler:passive') + (passive?.name ?? candy.passiveName),
    unlocked: !!candy.passive && !!passive, description: passive?.description ?? '当前引擎暂不支持该被动'});
  const moveEntry = (moveId: number, unlocked: boolean, prefix = ''): PokedexDetailEntry =>
    ({label: prefix + allMoves[moveId].name, unlocked, move: allMoves[moveId]});
  const levelMoves = form.getLevelMoves().map(([level, move]) => moveEntry(move, true,
    (level > 0 ? String(level) : '').padStart(3, '\u2007') + ' '));
  const mask = data.starterEggMoveData?.[rootId] ?? 0;
  const eggMoves = (speciesEggMoves[rootId] ?? []).map((move, index) => moveEntry(move, !!(mask & 1 << index)));
  // Reuse the early engine's TM compatibility calculation on a display-only
  // context. It allocates no Pokemon and never touches a battle or save.
  const tmContext = {species, formIndex: props.formIndex, compatibleTms: [] as number[]};
  PlayerPokemon.prototype.generateCompatibleTms.call(tmContext);
  const tmMoves = tmContext.compatibleTms.map(move => moveEntry(move, true));
  const natures = data.getNaturesForAttr(dex?.natureAttr ?? 0).map(nature => ({label: getNatureName(nature), unlocked: true}));
  const ribbon = personal.hasClassicRibbon(id);
  return {species, rootId, props, candy, seen: !!(dex?.seenAttr || attr), caught: !!attr,
    baseStats: form.baseStats, baseTotal: form.baseTotal, types: [form.type1, form.type2], ivs: [...(dex?.ivs ?? [0,0,0,0,0,0])],
    abilities, levelMoves, eggMoves, tmMoves, natures,
    biomes: habitatEntries(id), evolutions: evolutionEntries(species, props.formIndex ?? 0, data), forms:formEntries(species,data),
    ribbons: [{label: '经典通关缎带', unlocked: ribbon, description: ribbon ? '本人已获得经典通关缎带' : i18next.t('pokedexUiHandler:noRibbons')}]
  };
}
