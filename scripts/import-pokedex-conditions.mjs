// Extract display-only facts from the early engine. Unknown expressions fail closed.
// No predicates, enforcement functions, random generators or game code execute.
import fs from 'node:fs';
import crypto from 'node:crypto';
import ts from 'typescript';
const source=fs.readFileSync('src/data/pokemon-evolutions.ts','utf8').replace(/\r\n/g,'\n');
const ast=ts.createSourceFile('evolutions.ts',source,ts.ScriptTarget.Latest,true);
const printer=ts.createPrinter({removeComments:true});
const compact=node=>printer.printNode(ts.EmitHint.Unspecified,node,ast).replace(/\s/g,'');
function parse(node){
 while(ts.isParenthesizedExpression(node))node=node.expression;
 if(ts.isBinaryExpression(node)&&[ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.BarBarToken].includes(node.operatorToken.kind))
  return {kind:node.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken?'and':'or',values:[parse(node.left),parse(node.right)]};
 const text=compact(node);let m;
 if(text==='true')return {kind:'always'};
 if((m=text.match(/^p\.getAbility\(\)\.id===Abilities\.(\w+)$/)))return {kind:'ability',value:m[1]};
 if((m=text.match(/^p\.gender===Gender\.(\w+)$/)))return {kind:'gender',value:m[1]};
 if((m=text.match(/^p\.stats\[Stat\.ATK\](>|<|===)p\.stats\[Stat\.DEF\]$/)))return {kind:'stats',value:m[1]};
 if((m=text.match(/^p\.scene\.arena\.biomeType(===|!==)Biome\.(\w+)$/)))return {kind:'biome',not:m[1]==='!==',value:m[2]};
 if((m=text.match(/^p\.scene\.arena\.getTimeOfDay\(\)===TimeOfDay\.(\w+)$/)))return {kind:'time',value:m[1]};
 if((m=text.match(/^p\.moveset\.filter\(m=>m\.moveId===Moves\.(\w+)\)\.length>0$/)))return {kind:'move',value:m[1]};
 if((m=text.match(/^p\.moveset\.filter\(m=>m\.getMove\(\)\.type===Type\.(\w+)\)\.length>0$/)))return {kind:'moveType',value:m[1]};
 if((m=text.match(/^!!p\.getMoveset\(\)\.find\(m=>m\.getMove\(\)\.type===Type\.(\w+)\)$/)))return {kind:'moveType',value:m[1]};
 if((m=text.match(/^!!p\.scene\.getParty\(\)\.find\(p=>p\.getTypes\(false,false,true\)\.indexOf\(Type\.(\w+)\)>-1\)$/)))return {kind:'partyType',value:m[1]};
 if((m=text.match(/^!!p\.scene\.getParty\(\)\.find\(p=>p\.species\.speciesId===Species\.(\w+)\)$/)))return {kind:'partySpecies',value:m[1]};
 if(text==='p.scene.getParty().length<6')return {kind:'partySpace'};
 if(text==='p.scene.pokeballCounts[PokeballType.POKEBALL]>0')return {kind:'pokeball'};
 if((m=text.match(/^\[((?:Nature\.\w+,?)+)\]\.indexOf\(p\.nature\)>-1$/)))return {kind:'nature',values:m[1].split(',').map(v=>v.split('.')[1])};
 if((m=text.match(/^\[((?:WeatherType\.\w+,?)+)\]\.indexOf\(p\.scene\.arena\.weather\?\.weatherType\|\|WeatherType\.NONE\)>-1$/)))return {kind:'weather',values:m[1].split(',').map(v=>v.split('.')[1])};
 if(text==='!!p.scene.findModifier(m=>(minstanceofFlinchChanceModifier)&&(masFlinchChanceModifier).pokemonId===p.id,true)')return {kind:'kingsRock'};
 if(text==='p.scene.getSpeciesFormIndex(p.species)===1')return {kind:'defaultForm',value:1};
 if(text==='{letret=false;if(p.moveset.filter(m=>m.moveId===Moves.HYPER_DRILL).length>0)p.scene.executeWithSeedOffset(()=>ret=!Utils.randSeedInt(4),p.id);returnret;}')
  return {kind:'and',values:[{kind:'move',value:'HYPER_DRILL'},{kind:'seededChance',value:4}]};
 throw Error(`Unreviewed evolution predicate: ${text}`);
}
const records={},forms={};let conditions=0;
function visit(node){
 if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='pokemonEvolutions'){
  for(const prop of node.initializer.properties){
   const name=prop.name.expression.name.text;
   prop.initializer.elements.forEach((evo,index)=>{
    const form=evo.expression.getText(ast)==='SpeciesFormEvolution';
    const condition=evo.arguments[form?5:3];
    if(!ts.isNewExpression(condition))return;
    const friendship=condition.expression.getText(ast)==='SpeciesFriendshipEvolutionCondition';
    const predicate=condition.arguments[friendship?1:0];
    const facts=[];
    if(friendship)facts.push({kind:'friendship',value:Number(condition.arguments[0].getText(ast))});
    if(predicate)facts.push(parse(predicate.body));
    records[`${name}:${index}`]={kind:'and',values:facts};conditions++;
   });
  }
 }
 ts.forEachChild(node,visit);
}
visit(ast);
const formSource=fs.readFileSync('src/data/pokemon-forms.ts','utf8').replace(/\r\n/g,'\n');
const formAst=ts.createSourceFile('forms.ts',formSource,ts.ScriptTarget.Latest,true);
function triggerRecipe(node){
 const kind=node.expression.getText(formAst).replace('SpeciesFormChange','');
 const args=node.arguments??[];
 if(kind==='CompoundTrigger')return {kind:'and',values:args.map(triggerRecipe)};
 const allowed=['ItemTrigger','ManualTrigger','TimeOfDayTrigger','ActiveTrigger','StatusEffectTrigger','MoveLearnedTrigger','PreMoveTrigger','PostMoveTrigger'];
 if(kind==='SpeciesDefaultFormMatchTrigger')return {kind:'defaultMatch',value:args[0].text};
 if(!allowed.includes(kind))throw Error(`Unknown form trigger ${kind}`);
 const values=args.map(arg=>{
  if(ts.isArrowFunction(arg)){
   const text=printer.printNode(ts.EmitHint.Unspecified,arg,formAst).replace(/\s/g,'');
   if(text==='m=>allMoves[m].category!==MoveCategory.STATUS')return 'ATTACK_MOVE';
   throw Error(`Unknown move predicate ${text}`);
  }
  if(ts.isPropertyAccessExpression(arg))return arg.getText(formAst);
  if(arg.kind===ts.SyntaxKind.FalseKeyword)return false;
  if(arg.kind===ts.SyntaxKind.TrueKeyword)return true;
  if(ts.isStringLiteral(arg))return arg.text;
  throw Error(`Unknown trigger argument ${arg.getText(formAst)}`);
 });
 return {kind,values};
}
function visitForms(node){
 if(ts.isVariableDeclaration(node)&&node.name.getText(formAst)==='pokemonFormChanges'){
  for(const prop of node.initializer.properties){
   const name=prop.name.expression.name.text;
   prop.initializer.elements.forEach((change,index)=>{
    const extras=change.arguments.slice(5).map(cond=>parse(cond.arguments[0].body));
    forms[`${name}:${index}`]={trigger:triggerRecipe(change.arguments[3]),conditions:extras};
   });
  }
 }
 ts.forEachChild(node,visitForms);
}
visitForms(formAst);
const output=JSON.stringify({source:'src/data/pokemon-evolutions.ts',sha256:crypto.createHash('sha256').update(source).digest('hex'),formSha256:crypto.createHash('sha256').update(formSource).digest('hex'),conditions,records,forms},null,2)+'\n';
const target='src/data/balance/pokedex-conditions.json';
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n')!==output)throw Error('Evolution display facts are stale; run node scripts/import-pokedex-conditions.mjs');}
else fs.writeFileSync(target,output);
console.log(`Reviewed ${conditions} evolution conditions`);
