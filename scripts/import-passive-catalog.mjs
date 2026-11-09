// Explicit offline import. Read assignment data with the TypeScript AST;
// never execute code from the reference checkout.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const reference=process.argv[2];
if(!reference)throw Error('Usage: node scripts/import-passive-catalog.mjs <upstream-checkout>');
const enumFile=ts.createSourceFile('species.ts',fs.readFileSync('src/data/enums/species.ts','utf8'),ts.ScriptTarget.Latest,true);
const ids={};let last=-1;
for(const statement of enumFile.statements)if(ts.isEnumDeclaration(statement))for(const member of statement.members){
  last=member.initializer?Number(member.initializer.getText(enumFile)):last+1;
  if(!Number.isSafeInteger(last))throw Error('Unsupported species enum expression');
  ids[member.name.getText(enumFile)]=last;
}
const directory=path.join(reference,'src/data/balance/species'),map={};
for(const file of fs.readdirSync(directory).filter(name=>/^generation-.*\.ts$/.test(name)).sort()){
  const source=ts.createSourceFile(file,fs.readFileSync(path.join(directory,file),'utf8'),ts.ScriptTarget.Latest,true);
  const visit=node=>{
    if(ts.isBinaryExpression(node)&&ts.isObjectLiteralExpression(node.right)&&ts.isElementAccessExpression(node.left)){
      const name=node.left.argumentExpression?.getText(source).replace('SpeciesId.','');
      const property=node.right.properties.find(p=>p.name?.getText(source)==='passives');
      if(ids[name]&&property&&ts.isPropertyAssignment(property)){
        const expression=property.initializer;
        if(ts.isPropertyAccessExpression(expression))map[ids[name]]=expression.name.text;
        else if(ts.isObjectLiteralExpression(expression)){
          const forms={};for(const p of expression.properties)
            if(ts.isPropertyAssignment(p)&&ts.isPropertyAccessExpression(p.initializer)&&/^\d+$/.test(p.name.getText(source)))forms[p.name.getText(source)]=p.initializer.name.text;
          map[ids[name]]=forms;
        }
      }
    }
    ts.forEachChild(node,visit);
  };visit(source);
}
if(!Object.keys(map).length)throw Error('No passive assignments found');
fs.writeFileSync('src/data/passive-catalog.mjs','// Upstream species/balance passive assignments; names resolve against the early ability catalogue.\nexport const passiveNames='+JSON.stringify(map,null,2)+';\nexport function passiveName(id,form=0){const p=passiveNames[id];return typeof p===\'string\'?p:p?.[form];}\n');
console.log(`Imported ${Object.keys(map).length} species passive assignments`);
