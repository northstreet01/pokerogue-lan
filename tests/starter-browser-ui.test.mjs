import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {EventEmitter} from 'node:events';
import {JSDOM} from 'jsdom';
import * as model from '../src/ui/original-browser-model.mjs';

// Only the renderer is faked. Imported upstream controls and the browser adapter run unchanged.
const dom=new JSDOM('<body></body>');
class Object2D extends EventEmitter {
 constructor(scene,x=0,y=0,text=''){super();this.scene=scene;this.x=x;this.y=y;this.text=text;this.width=100;this.height=9;this.visible=true;this.list=[];this.frame={name:'unknown'};this.scaleX=1;this.scaleY=1;}
 get displayWidth(){return this.width*this.scaleX;}get displayHeight(){return this.height*this.scaleY;}
 add(objects){for(const object of Array.isArray(objects)?objects:[objects]){this.list.push(object);object.parentContainer=this;}return this;}
 remove(object){this.list=this.list.filter(child=>child!==object);return this;}
 bringToTop(object){this.remove(object);this.add(object);return this;}
 addAt(object,index){this.list.splice(index,0,object);object.parentContainer=this;return this;}
 getAll(){return this.list;}removeAll(destroy){if(destroy)this.list.forEach(o=>o.destroy());this.list=[];return this;}
 setText(value){this.text=value;this.width=String(value).length*36;return this;}
 getWrappedText(){return this.text.split('\n');}
 setVisible(value){this.visible=value;return this;}setPosition(x,y){this.x=x;this.y=y;return this;}
 setScale(x,y=x){this.scaleX=x;this.scaleY=y;return this;}setOrigin(){return this;}setShadowOffset(){return this;}
 setTint(...colors){this.tints=colors;return this;}clearTint(){this.tints=[];return this;}setRotation(){return this;}setColor(value){this.color=value;return this;}
 setTexture(texture,frame){this.texture={key:texture};this.frame={name:frame};return this;}setFrame(value){this.frame.name=value;return this;}
 setSize(width,height){this.width=width;this.height=height;return this;}
 setY(y){this.y=y;return this;}setStrokeStyle(){return this;}setLineWidth(){return this;}setTo(){return this;}
 fillStyle(){return this;}fillRect(){return this;}clear(){return this;}
 createGeometryMask(){return {destroy(){}};}setMask(mask){this.mask=mask;return this;}clearMask(destroy){if(destroy)this.mask?.destroy();this.mask=null;return this;}
 setAlpha(value){this.alpha=value;return this;}
 setCrop(...crop){this.crop=crop;return this;}setWordWrapWidth(){return this;}setLineSpacing(){return this;}setInteractive(){return this;}
 destroy(){this.destroyed=true;this.list.forEach(o=>o.destroy());this.list=[];this.node?.remove();this.removeAllListeners();}
}
const Phaser={GameObjects:{Container:Object2D,Line:Object2D}};
const Button=Object.fromEntries(['UP','DOWN','LEFT','RIGHT','SUBMIT','ACTION','CANCEL','MENU'].map((key,i)=>[key,i]));
const textExports={};
const textSource=fs.readFileSync(new URL('../src/ui/text.ts',import.meta.url),'utf8');
const textAst=ts.createSourceFile('text.ts',textSource,ts.ScriptTarget.Latest,true);
const selected=textAst.statements.filter(node=>ts.isEnumDeclaration(node)&&node.name.text==='TextStyle'
 ||ts.isFunctionDeclaration(node)&&['getTextColor','updateCandyCountTextStyle'].includes(node.name.text)
 ||ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>d.name.getText(textAst)==='RAINBOW_TINT'));
vm.runInNewContext(ts.transpileModule(selected.map(n=>n.getText(textAst)).join('\n'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:textExports});
const text={...textExports,
 addBBCodeTextObject:(scene,x,y,value)=>new Object2D(scene,x,y).setText(value).setScale(1/6),
 addTextObject:(scene,x,y,value)=>new Object2D(scene,x,y).setText(value).setScale(1/6),
 addTextInputObject:(scene,x,y)=>{const input=new Object2D(scene,x,y);input.node=dom.window.document.createElement('input');
 dom.window.document.body.append(input.node);input.setFocus=()=>input.node.focus();input.setBlur=()=>input.node.blur();return input;}};
const windowModule={WindowVariant:{THIN:1,XTHIN:2},addWindow:(scene,x,y,w,h)=>{const object=new Object2D(scene,x,y);object.width=w;object.height=h;return object;}};
const cache={};
let fixtureSpecies;
function load(name){
 if(cache[name])return cache[name];
 const result={};cache[name]=result;
 const source=fs.readFileSync(new URL(`../src/ui/${name}.ts`,import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:result,Phaser,console,Map,Set,Promise,require(key){
  if(key==='../battle-scene')return {Button};
  if(key==='./text')return text;if(key==='./ui')return {Mode:{STARTER_SELECT:11,OPTION_SELECT:15}};
  if(key==='../data/starter-colors.json')return {default:JSON.parse(fs.readFileSync(new URL('../src/data/starter-colors.json',import.meta.url),'utf8'))};if(key==='./window')return windowModule;
  if(key==='../i18n')return {default:{t:key=>key.split(':')[1]}};
  if(key==='../data/type')return {Type:{0:'NORMAL',9:'FIRE',10:'WATER'}};
  if(key==='../data/ability')return {allAbilities:[{}, {name:'猛火'}],getSpeciesPassive:()=>({name:'结实'})};
  if(key==='../data/move')return {MoveCategory:{0:'PHYSICAL'},allMoves:[{}, {name:'撞击',effect:'招式说明',power:40,accuracy:100,pp:35,type:0,category:0}]};
  if(key==='../utils')return {fixedInt:value=>value};
  if(key==='../data/pokemon-stat')return {getStatName:()=> 'HP'};
  if(key==='../data/nature')return {getNatureName:()=> '勤奋'};
  if(key==='../field/pokemon')return {PlayerPokemon:{prototype:{generateCompatibleTms(){this.compatibleTms=[];}}}};
  if(key==='../data/egg-moves')return {speciesEggMoves:{1:[1]}};
  if(key==='../data/tms')return {tmSpecies:{}};
  if(key==='./pokedex-world-data')return {
    biomeIds:()=>[0,1],biomeName:id=>'区域'+id,buildHabitatIndex:()=>new Map([[1,[{biome:0}]]]),evolutionFamily:id=>[id],
    habitatEntries:()=>[{label:'区域0 - 普通',unlocked:true,description:'白天'}],
    formEntries:species=>species.forms.map((_,formIndex)=>({label:'形态'+formIndex,species,formIndex,unlocked:false,description:'图鉴预览'})),
    evolutionEntries:species=>species.speciesId===1 ? [{label:'进化：精灵2',species:fixtureSpecies[1],formIndex:0,unlocked:true,description:'Lv.16'}] : []
  };
  if(key==='./original-browser-model.mjs')return model;
  return load(key.replace('./',''));
 }});return result;
}
const {OriginalStarterBrowser}=load('original-starter-browser');
function fixture(readOnly=false){
 const keyboard={enabled:true,resets:0,resetKeys(){this.resets++;}};
 const ui={mode:11,config:null,stack:[],playSelect(){},playError(){},showTooltip(){},hideTooltip(){},getMode(){return this.mode;},getHandler(){return {show:args=>{this.config=args[0];}};},async setOverlayMode(mode,config){this.stack.push(this.mode);this.mode=mode;this.config=config;if(config.supportHover)config.options[0]?.onHover?.();},async revertMode(){this.mode=this.stack.pop();}};
 const scene={input:Object.assign(new EventEmitter(),{keyboard}),ui,playSound(){},add:Object.fromEntries(['container','sprite','image','nineslice','rectangle'].map(key=>[key,(x,y)=>new Object2D(scene,x,y)]))};
 scene.make={graphics:()=>new Object2D(scene)};
 const tweens=[];scene.tweens={add:config=>{const tween={...config,remove(){this.removed=true;}};tweens.push(tween);return tween;},addCounter:config=>{const tween={...config,remove(){this.removed=true;}};tweens.push(tween);return tween;},killTweensOf:target=>tweens.filter(t=>t.targets===target).forEach(t=>t.remove())};
 scene.add.polygon=(x,y)=>new Object2D(scene,x,y);
 const species=Array.from({length:70},(_,i)=>({speciesId:i+1,generation:1,name:'精灵'+(i+1),forms:[],baseStats:[45,49,49,65,65,45],baseTotal:318,ability1:1,ability2:0,abilityHidden:0,type1:0,type2:null,getRootSpeciesId(){return this.speciesId;},getLevelMoves:()=>[[1,1]],getIconAtlasKey:()=> 'icons',getIconId:()=> '1'}));
 fixtureSpecies=species;
 const data={dexData:Object.fromEntries(species.map(s=>[s.speciesId,{caughtAttr:1n,ivs:[1,2,3,4,5,6]}])),getSpeciesDefaultDexAttr:()=>1n,getSpeciesDexAttrProps:()=>({}),getSpeciesStarterValue:()=>3,getNaturesForAttr:()=>[0]};
 let balance=40,calls=0,complete,fail;const writes=[];
 const personal={hasClassicRibbon:id=>id===1,canBuyCandyReduction:!readOnly,candyInfo:()=>({candies:balance,eligible:true,price:20,nextCost:2,tier:0,passive:0,passiveAvailable:true,passivePrice:40,passiveName:'结实',eggPrice:20,candySpeciesName:'精灵1',friendship:0,cap:75}),
 purchaseCandyUpgrade(id,kind){calls++;writes.push({id,kind});return new Promise((resolve,reject)=>{complete=()=>{balance-=20;resolve();};fail=reject;});}};
 const chosen=[],preview=[],parent=new Object2D(scene);let allowed=true,occupied=2;
 const browser=new OriginalStarterBrowser(scene,parent,{entries:species,data,personal,readOnly,blocked:id=>id===occupied,pokerus:()=>false,preview:s=>preview.push(s.speciesId),choose:s=>chosen.push(s.speciesId),describe:s=>s.name+'\n状态：已解锁',allowed:()=>allowed&&ui.mode===11,bind:(target,action)=>{target.click=action;}});
 browser.open();
 return {browser,keyboard,parent,chosen,preview,personal,ui,writes,get calls(){return calls;},complete:()=>complete(),fail:()=>fail(Error('WRITE_FAILED')),setAllowed:value=>allowed=value,setOccupied:value=>occupied=value};
}
test('native catalogue previews without selecting; scrolls and confirms via the existing selector',()=>{
 const f=fixture(),b=f.browser;assert.equal(b.rows.length,70);assert.deepEqual(f.chosen,[]);assert.equal(f.preview.at(-1),1);
 b.setCursor(69);assert.equal(b.firstRow,1);assert.equal(b.cells[60].root.visible,true);assert.equal(b.cells[61].root.visible,false);
 b.processInput(Button.ACTION);assert.deepEqual(f.chosen,[70]);assert.equal(b.opened,false);
 b.destroy();assert.equal(f.parent.list[0].destroyed,true);
});

test('mouse wheel scrolls the grid, stays inside its panel and releases its scene listener',()=>{
 const {browser:b}=fixture(),input=b.scene.input;
 input.emit('wheel',null,[],0,100);assert.equal(b.firstRow,0);
 input.emit('wheel',null,[b.cells[0].icon],0,100);assert.equal(b.firstRow,1);assert.equal(b.cursor,9);
 input.emit('wheel',null,[b.cells[0].icon],0,-100);assert.equal(b.firstRow,0);assert.equal(b.cursor,0);
 b.inspect();input.emit('wheel',null,[b.cells[0].icon],0,100);assert.equal(b.firstRow,0);
 b.destroy();assert.equal(input.listenerCount('wheel'),0);
});
test('keyboard navigation uses imported filter menu; cancel unwinds menu then browser',()=>{
 const {browser:b}=fixture();b.processInput(Button.UP);assert.equal(b.focus,'bar');
 b.processInput(Button.ACTION);assert.equal(b.bar.openDropDown,true);
 b.processInput(Button.CANCEL);assert.equal(b.bar.openDropDown,false);assert.equal(b.opened,true);
 b.processInput(Button.CANCEL);assert.equal(b.opened,false);b.processInput(Button.MENU);assert.equal(b.opened,true);b.destroy();
});
test('text entry pauses keyboard and restores it on cancel, accept and teardown',()=>{
 const f=fixture(),b=f.browser;b.processInput(Button.SUBMIT);b.edit(1);assert.equal(f.keyboard.enabled,false);
 b.input.node.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(f.keyboard.enabled,true);
 b.edit(1);b.input.node.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
 assert.equal(f.keyboard.enabled,true);assert.equal(b.textFilters.getValue(1),'撞击');
 b.edit(0);b.destroy();assert.equal(f.keyboard.enabled,true);assert.equal(dom.window.document.querySelector('input'),null);
});

test('search acceptance restores keyboard even if refreshing the renderer fails',()=>{
 const f=fixture(),b=f.browser;b.edit(1);
 const errors=[];const onError=event=>{errors.push(event.error);event.preventDefault();};dom.window.addEventListener('error',onError);
 b.textFilters.onChange=()=>{throw Error('RENDER_FAILED');};
 b.input.node.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
 assert.equal(errors.length,1);assert.equal(f.keyboard.enabled,true);assert.equal(b.entry,undefined);
 dom.window.removeEventListener('error',onError);b.destroy();
});
test('native purchases confirm, reject duplicate clicks, and retain a retry after failed writes',async()=>{
 const f=fixture(),b=f.browser;b.inspect();b.detailActions[1]();
 const reduction=f.ui.config.options.find(o=>o.label.includes('reduceCost'));reduction.handler();assert.equal(f.calls,0);
 const yes=f.ui.config.options[0];yes.handler();yes.handler();assert.equal(f.calls,1);assert.equal(b.busy,true);
 assert.equal(f.ui.config.noCancel,true);assert.equal(f.ui.config.captureMenu,true);
 f.fail();await new Promise(setImmediate);assert.match(b.purchaseNotice.text,/保存失败/);
 f.ui.config.options[0].handler();assert.equal(f.calls,2);f.complete();await new Promise(setImmediate);
 assert.equal(f.personal.candyInfo(1).candies,20);assert.equal(b.busy,false);assert.equal(f.ui.mode,11);assert.equal(f.ui.stack.length,0);b.destroy();
});

test('upstream candy layers use species colors, half-progress crop and the original max-count style',()=>{
 const {StarterCandyDisplay,getStarterColors}=load('starter-candy-display');
 const f=fixture(),display=new StarterCandyDisplay(f.browser.scene,0,0);
 display.update({candies:9999,friendship:30,cap:60},1);
 assert.equal(display.darkness.crop[3],8);assert.equal(display.countText.tints.length,4);
 assert.equal(display.candy.tints[0],Number.parseInt(getStarterColors(1)[0],16));
 display.update({candies:1,friendship:0,cap:60},1);assert.equal(display.darkness.crop[3],16);assert.equal(display.countText.tints.length,0);
 display.darkness.emit('pointerover');display.destroy();f.browser.destroy();
});

test('original candy menu dims unavailable upgrades and omits maxed reductions',()=>{
 const {candyUpgradeOptions}=load('starter-candy-menu');let purchases=0,denied=0;
 const options=candyUpgradeOptions({passive:0,passivePrice:40,passiveAvailable:false,eligible:false,candies:9999,price:null,eggPrice:20},['112233','aabbcc'],()=>purchases++,()=>denied++,()=>{});
 assert.equal(options.length,3);assert.equal(options[0].style,text.TextStyle.SHADOW_TEXT);
 assert.equal(options[0].itemArgs.join(','),'808080,808080');options[0].handler();options[1].handler();
 assert.equal(purchases,0);assert.equal(denied,2);
});

test('cancelled confirmations and retired menu callbacks cannot spend candy',async()=>{
 const f=fixture(),b=f.browser;b.inspect();b.detailActions[1]();
 f.ui.config.options[1].handler();const oldYes=f.ui.config.options[0];f.ui.config.options[1].handler();oldYes.handler();assert.equal(f.calls,0);
 const oldUpgrade=f.ui.config.options[0];await f.ui.config.options.at(-1).handler();oldUpgrade.handler();assert.equal(f.calls,0);assert.equal(f.ui.mode,11);
 b.destroy();
});

test('retry stays bound to the failed species when browsing another candy entry',async()=>{
 const f=fixture(),b=f.browser;b.inspect();b.detailActions[1]();f.ui.config.options[1].handler();f.ui.config.options[0].handler();
 f.fail();await new Promise(setImmediate);await f.ui.config.options[1].handler();
 b.setCursor(3);b.inspect();b.detailActions[1]();f.ui.config.options[0].handler();
 assert.equal(f.writes.length,2);assert.equal(f.writes[1].id,1);assert.equal(f.writes[1].kind,'reduction');
 f.complete();await new Promise(setImmediate);b.destroy();
});
test('read-only collection opens native details and never selects or purchases',()=>{
 const f=fixture(true);f.browser.processInput(Button.ACTION);assert.ok(f.browser.detail);assert.deepEqual(f.chosen,[]);
 assert.equal(f.browser.detailActions.length,2);f.browser.processInput(Button.CANCEL);assert.equal(f.browser.detail,undefined);f.browser.destroy();
});
test('live peer occupancy refreshes decorations; stale pointer callbacks cannot act after teardown',()=>{
 const f=fixture(),b=f.browser;assert.equal(b.cells[1].occupied.visible,true);f.setOccupied(3);b.setCursor(0);
 assert.equal(b.cells[1].occupied.visible,false);assert.equal(b.cells[2].occupied.visible,true);
 const callback=b.tools[2].click;b.destroy();callback();assert.deepEqual(f.chosen,[]);
});

test('ported monster cells keep stable pointer targets when scrolling swaps icon sprites',()=>{
 const f=fixture(),b=f.browser,hit=b.cells[0].hit,oldIcon=b.cells[0].icon;
 b.firstRow=1;b.setCursor(9);
 assert.equal(b.cells[0].hit,hit);assert.equal(oldIcon.destroyed,true);
 assert.equal(b.cells[0].root.species.speciesId,10);hit.click();assert.equal(b.cursor,9);
 b.destroy();
});

test('pokedex ability and move lists use hover overlays and return to the same detail page',async()=>{
 const f=fixture(true),b=f.browser;b.inspect();const page=b.detail;
 page.cursor=1;page.activate();assert.equal(f.ui.mode,15);assert.equal(page.info.active,true);
 assert.equal(f.ui.config.captureMenu,true);assert.equal(f.ui.config.supportHover,true);
 await f.ui.config.options.at(-1).handler();assert.equal(f.ui.mode,11);assert.equal(page.info.active,false);
 assert.equal(b.detail,page);
 page.cursor=2;page.activate();assert.equal(page.moves.active,true);
 assert.equal(page.moves.pow.text,'40');assert.equal(page.moves.pp.text,'35');assert.equal(page.moves.desc.text,'招式说明');
 const oldHover=f.ui.config.options[0].onHover;
 await f.ui.config.options.at(-1).handler();oldHover();assert.equal(page.moves.active,false);
 b.processInput(Button.CANCEL);assert.equal(b.detail,undefined);assert.equal(b.opened,true);b.destroy();
});

test('closing IV and description panels removes their active tweens and masks',()=>{
 const f=fixture(true),b=f.browser;b.inspect();const page=b.detail;
 page.actions[0]();const ivTween=page.ivs.ivTween;assert.ok(ivTween);
 page.info.show('说明');const graphics=page.info.textMaskRect;
 b.processInput(Button.CANCEL);assert.equal(ivTween.removed,true);assert.equal(graphics.destroyed,true);
 b.destroy();
});

test('evolution links restore the previous detail and grid without choosing or retaining overlays',async()=>{
 const f=fixture(true),b=f.browser;b.inspect();const page=b.detail;
 page.cursor=8;page.activate();assert.equal(f.ui.mode,15);
 const select=f.ui.config.options[0].handler;select();select();await new Promise(setImmediate);
 assert.equal(f.ui.mode,11);assert.equal(f.ui.stack.length,0);assert.equal(b.detail.model.species.speciesId,2);
 assert.equal(b.detailHistory.length,1);assert.deepEqual(f.chosen,[]);
 select();await new Promise(setImmediate);assert.equal(b.detailHistory.length,1);
 b.processInput(Button.CANCEL);assert.equal(b.detail.model.species.speciesId,1);assert.equal(b.detail.cursor,8);
 b.processInput(Button.CANCEL);assert.equal(b.detail,undefined);assert.equal(b.cursor,0);
 assert.equal(f.keyboard.enabled,true);b.destroy();
});

test('biome filtering supports all, one habitat, unknown and keyboard traversal of all seven headings',()=>{
 const f=fixture(),b=f.browser,biomes=b.bar.getFilter(2);
 biomes.toggleOptionState(0);assert.equal(b.rows.length,70);
 biomes.setCursor(1);assert.deepEqual(b.rows.map(s=>s.speciesId),[1]);
 biomes.toggleOptionState(1);biomes.setCursor(3);assert.deepEqual(b.rows.map(s=>s.speciesId),[1]);
 biomes.toggleOptionState(1);assert.equal(b.rows.length,69);
 b.focus='bar';b.filterCursor=0;b.processInput(Button.LEFT);assert.equal(b.filterCursor,6);
 b.processInput(Button.RIGHT);assert.equal(b.filterCursor,0);b.destroy();
});

test('form previews refresh stats, types and moves and restore the previous form without choosing',async()=>{
 const f=fixture(true),b=f.browser,species=fixtureSpecies[0];
 species.forms=[{...species,formKey:'',forms:[]},{...species,formKey:'mega',forms:[],type1:9,baseStats:[80,80,80,80,80,80],baseTotal:480}];
 b.inspect();b.detail.cursor=9;b.detail.activate();const oldClick=f.ui.config.options[1].handler;
 oldClick();await new Promise(setImmediate);
 assert.equal(b.detail.model.props.formIndex,1);assert.equal(b.detail.model.baseTotal,480);assert.equal(b.detail.model.types[0],9);
 assert.equal(b.detail.cursor,9);assert.deepEqual(f.chosen,[]);assert.equal(f.ui.stack.length,0);
 oldClick();await new Promise(setImmediate);assert.equal(b.detailHistory.length,1);
 b.processInput(Button.CANCEL);assert.equal(b.detail.model.props.formIndex,undefined);assert.equal(b.detail.cursor,9);
 b.processInput(Button.CANCEL);assert.equal(b.detail,undefined);b.destroy();
});
test('imported menus retain multi-select all, ascending/descending sort and radial states',()=>{
 const {browser:b}=fixture(),bar=b.bar;
 const gen=bar.getFilter(0);assert.equal(gen.getVals().length,9);gen.toggleOptionState(0);assert.equal(gen.getVals().length,0);gen.toggleOptionState(0);assert.equal(gen.getVals().length,9);
 const sort=bar.getFilter(6);sort.toggleOptionState(1);assert.equal(sort.getVals()[0].val,1);assert.equal(sort.getVals()[0].dir,-1);sort.toggleOptionState(1);assert.equal(sort.getVals()[0].dir,1);
 const misc=bar.getFilter(5);misc.toggleOptionState(0);assert.equal(misc.getVals()[0].state,0);misc.toggleOptionState(0);assert.equal(misc.getVals()[0].state,2);
 bar.resetSelection(5);assert.equal(misc.getVals()[0].state,1);b.destroy();
});

test('scrollable upstream dropdown returns upward and wraps within the short canvas',()=>{
 const {DropDown,DropDownOption,DropDownLabel,DropDownType}=load('dropdown');
 const f=fixture(),scene=f.browser.scene;
 const drop=new DropDown(scene,0,0,Array.from({length:22},(_,i)=>new DropDownOption(scene,i,new DropDownLabel(String(i)))),()=>{},DropDownType.MULTI);
 f.browser.panel.add(drop);drop.setVisible(true);
 for(let i=0;i<drop.options.length;i++)drop.setCursor(i);
 assert.ok(drop.firstShown>0);assert.equal(drop.options.at(-1).visible,true);
 for(let i=drop.options.length-1;i>=0;i--)drop.setCursor(i);
 assert.equal(drop.firstShown,0);assert.equal(drop.options[0].visible,true);
 assert.ok(drop.window.height+17<=180);drop.destroy();f.browser.destroy();
});

test('saving an upgrade keeps its species details when the active filter removes it',async()=>{
 const f=fixture(),b=f.browser;let upgraded=false;
 f.personal.candyInfo=id=>({candies:40,eligible:true,price:20,nextCost:2,tier:upgraded&&id===1?1:0,passive:0,passiveAvailable:true,passivePrice:40,passiveName:'结实',eggPrice:20,candySpeciesName:'精灵'+id,friendship:0,cap:75});
 const reduction=b.bar.getFilter(4);reduction.options[1].setOptionState(2);b.refresh();b.inspect();
 b.detailActions[1]();f.ui.config.options.find(o=>o.label.includes('reduceCost')).handler();f.ui.config.options[0].handler();upgraded=true;f.complete();await new Promise(setImmediate);
 assert.equal(b.rows.some(s=>s.speciesId===1),false);
 assert.equal(b.detail.model.species.speciesId,1);
 b.destroy();
});
