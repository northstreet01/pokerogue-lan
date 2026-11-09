// An attribute invocation's ability identity, never persistent Pokemon state.
const contexts=new WeakMap();
export const currentAbility=pokemon=>contexts.get(pokemon);
export function bindAbility(pokemon,ability){const old=contexts.get(pokemon);contexts.set(pokemon,ability);return ()=>{if(old)contexts.set(pokemon,old);else contexts.delete(pokemon);};}
