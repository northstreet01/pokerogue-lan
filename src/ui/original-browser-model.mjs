// The Pokédex predicates/sort order from upstream, adapted to the early save model.
// State numbers match the imported DropDownState enum. No save writes occur here.
export function filterOriginalCatalogue(entries, data, personal, filters, text, facts) {
  const [name, move1, move2, ability1, ability2] = text.map(value => value === '---' ? '' : value.trim());
  const matches = (values, value) => !value || values.includes(value);
  const radial = (key, test) => (filters.misc ?? []).every(option => option.val !== key
    || option.state === 1 || (option.state === 0 ? test : !test));
  const unlocked = (key, info) => (filters.unlocks ?? []).every(option => {
    if (option.val !== key || option.state === 1) return true;
    if (key === 'PASSIVE') return option.state === 0 ? !!info.passive
      : option.state === 3 ? info.eligible && info.passiveAvailable && !info.passive && info.candies >= info.passivePrice : info.eligible && !info.passive;
    return option.state === 0 ? info.tier > 0 : option.state === 4 ? info.tier === 1
      : option.state === 5 ? info.tier === 2 : option.state === 3
        ? info.eligible && info.price !== null && info.candies >= info.price : info.eligible && info.tier === 0;
  });
  const rows = entries.filter(species => {
    const id = species.speciesId, dex = data.dexData[id] ?? {}, attr = dex.caughtAttr ?? 0n;
    const info = personal.candyInfo(id), fact = facts.get(id);
    // Two ability fields mean normal + passive, including the same ability twice.
    const fitsAbilities = (matches(fact.abilities, ability1) && matches(fact.passives, ability2))
      || (matches(fact.abilities, ability2) && matches(fact.passives, ability1));
    const caught = !attr ? 'UNCAUGHT' : attr & 2n ? 'SHINY' : 'NORMAL';
    return (!name || species.name.toLocaleLowerCase().includes(name.toLocaleLowerCase()) || String(id) === name)
      && matches(fact.moves, move1) && matches(fact.moves, move2) && fitsAbilities
      && filters.gens.includes(species.generation)
      && filters.types.some(type => fact.types.includes(type))
      && (!filters.biomes || filters.biomes.some(biome => (fact.biomes?.length ? fact.biomes : [-1]).includes(biome)))
      && filters.caught.includes(caught)
      && unlocked('PASSIVE', info) && unlocked('COST_REDUCTION', info)
      && radial('RIBBON', personal.hasClassicRibbon(id))
      && radial('HIDDEN_ABILITY', !!(attr & 64n))
      && radial('SEEN_SPECIES', !!(dex.seenAttr || attr))
      && radial('EGG', !!(info.eligible && !info.eggFull && info.candies >= info.eggPrice))
      && radial('POKERUS', !!fact.pokerus);
  });
  const sort = filters.sort[0] ?? {val: 0, dir: -1};
  const value = species => {
    const id = species.speciesId, dex = data.dexData[id] ?? {};
    switch (sort.val) {
      case 1: return data.getSpeciesStarterValue(id);
      case 2: return personal.candyInfo(id).candies;
      case 3: return (dex.ivs ?? []).reduce((a, b) => a + b, 0);
      case 4: return species.name;
      case 5: return dex.caughtCount ?? 0;
      case 6: return dex.hatchedCount ?? 0;
      default: return id;
    }
  };
  return rows.sort((a, b) => {
    const av = value(a), bv = value(b);
    return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * -sort.dir || a.speciesId - b.speciesId;
  });
}

export function browserScroll(cursor, count, firstRow = 0, columns = 9, rows = 7) {
  cursor = Math.max(0, Math.min(cursor, count - 1));
  const row = Math.floor(cursor / columns);
  firstRow = Math.max(0, Math.min(firstRow, Math.max(0, Math.ceil(count / columns) - rows)));
  if (row < firstRow) firstRow = row;
  if (row >= firstRow + rows) firstRow = row - rows + 1;
  return {cursor, firstRow};
}
