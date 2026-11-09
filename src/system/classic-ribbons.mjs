// Only classic clears award this collection mark. A set makes repeat clears
// idempotent; it never changes species/form/move selection permissions.
export function validateClassicRibbons(value, validSpecies) {
  if (!Array.isArray(value) || value.length > validSpecies.size
    || new Set(value).size !== value.length
    || !value.every(id => Number.isSafeInteger(id) && validSpecies.has(id)))
    throw new Error('INVALID_CLASSIC_RIBBONS');
  return value;
}

export function awardClassicRibbons(existing, speciesIds, prevolutions, validSpecies) {
  validateClassicRibbons(existing ?? [], validSpecies);
  validateClassicRibbons([...new Set(speciesIds)], validSpecies);
  const result = new Set(existing ?? []);
  for (const id of speciesIds) {
    const visited = new Set();
    for (let current = id; current !== undefined; current = prevolutions[current]) {
      if (visited.has(current) || !validSpecies.has(current)) throw new Error('INVALID_RIBBON_EVOLUTION_LINE');
      visited.add(current);result.add(current);
    }
  }
  return [...result].sort((a,b) => a-b);
}
