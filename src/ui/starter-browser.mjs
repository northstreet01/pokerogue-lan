// Browsing never changes the original selector's species indices or team data.
export function findStarters(entries, data, filters, blocked = () => false, hasRibbon = () => false) {
  const query=String(filters.query??'').trim().toLocaleLowerCase();
  const result=entries.filter(species=>{
    const dex=data.dexData[species.speciesId];
    return (!query || species.name.toLocaleLowerCase().includes(query) || String(species.speciesId)===query)
      && (!filters.unlocked || !!dex?.caughtAttr)
      && (!filters.ribbon || (filters.ribbon==='earned' ? hasRibbon(species.speciesId) : !hasRibbon(species.speciesId)))
      && (filters.type==='' || species.type1===Number(filters.type) || species.type2===Number(filters.type))
      && (filters.cost==='' || data.getSpeciesStarterValue(species.speciesId)<=Number(filters.cost));
  });
  result.sort((a,b)=>{
    const cost=id=>data.getSpeciesStarterValue(id);
    return (filters.sort==='cost'?cost(a.speciesId)-cost(b.speciesId):filters.sort==='stats'?b.baseTotal-a.baseTotal:0)
      || a.speciesId-b.speciesId;
  });
  return result.map(species=>({species,blocked:blocked(species.speciesId)}));
}

export function mountStarterBrowser({entries,data,types,storage,blocked,onLocate,describe,hasRibbon = () => false,candyInfo,onReduceCost,onCandyAction}) {
  const root=document.createElement('details');root.id='starter-browser';
  const summary=document.createElement('summary');summary.textContent='查找精灵';root.append(summary);
  const filters={query:'',unlocked:false,type:'',cost:'',sort:'number',ribbon:''};
  try { const saved=JSON.parse(storage?.getItem('settings')??'{}').starterBrowser;
    if(saved){filters.ribbon=['earned','missing'].includes(saved.ribbon)?saved.ribbon:'';filters.unlocked=saved.unlocked===true;filters.type=types.some(t=>String(t[0])===saved.type)?saved.type:'';
      filters.cost=['1','2','3','5','10'].includes(saved.cost)?saved.cost:'';
      filters.sort=['number','cost','stats'].includes(saved.sort)?saved.sort:'number';}
  }catch{}
  let page=0;
  const controls=document.createElement('div');controls.className='starter-browser-controls';
  const results=document.createElement('div');results.className='starter-browser-results';
  const status=document.createElement('div');status.setAttribute('role','status');
  const paging=document.createElement('div');
  const detail=document.createElement('pre');detail.className='starter-browser-detail';detail.hidden=true;
  const upgrade=document.createElement('div');let alive=true,busy=false;
  const inspect=species=>{
    detail.textContent=describe(species);detail.hidden=false;upgrade.replaceChildren();
    if(!candyInfo)return;
    const info=candyInfo(species.speciesId),line=document.createElement('p');
    line.textContent=`本人${info.candySpeciesName??''}糖果：${info.candies} · 亲密进度 ${info.friendship}/${info.cap} · 初始物种费用 ${info.cost}`;upgrade.append(line);
    const action=(label,kind,price,disabled=false)=>{
      const button=document.createElement('button');button.type='button';button.textContent=label;
      button.disabled=busy||disabled||info.eligible===false||info.candies<price;
      button.onclick=()=>{button.textContent='确认：'+label;button.onclick=async()=>{
        if(busy)return;busy=true;button.disabled=true;
        try{if(kind==='reduction')await onReduceCost(species.speciesId);else await onCandyAction(species.speciesId,kind);
          if(alive){busy=false;render();inspect(species);}}
        catch(error){if(alive){button.textContent=({CANDY_INSUFFICIENT:'糖果不足',CANDY_REDUCTION_MAX:'降费已满',CANDY_SPECIES_LOCKED:'尚未解锁该物种',CANDY_RETRY_PENDING:'请先重试尚未保存的操作',GACHA_INVENTORY_FULL:'蛋库存已满'})[error.message]??'保存失败，点击重试';button.disabled=false;}}
        finally{busy=false;}
      };};upgrade.append(button);
    };
    if(info.price===null)line.textContent+=' · 降费已满';
    else if(onReduceCost)action('降低费用至 '+info.nextCost+'（'+info.price+' 颗糖果）','reduction',info.price);
    else line.textContent+='；在大厅收藏的糖果页面中可消费';
    if(info.passiveName){
      const passive=document.createElement('p');passive.textContent='被动特性：'+info.passiveName+' · '+(info.passive===2?'已启用':info.passive===1?'已解锁，已关闭':'未解锁');upgrade.append(passive);
      if(onCandyAction&&info.passiveAvailable){
        if(info.passive)action(info.passive===2?'关闭被动特性':'启用被动特性','toggle',0);
        else action('解锁被动特性（'+info.passivePrice+' 颗糖果）','passive',info.passivePrice);
      }
    }
    if(onCandyAction)action('购买'+(info.candySpeciesName??'同种')+'蛋（'+info.eggPrice+' 颗糖果）','egg',info.eggPrice,info.eggFull);
  };
  const save=()=>{try{const settings=JSON.parse(storage?.getItem('settings')??'{}');
    settings.starterBrowser={...filters,query:undefined};storage?.setItem('settings',JSON.stringify(settings));}catch{}};
  const render=()=>{
    const rows=findStarters(entries,data,filters,blocked,hasRibbon),pages=Math.max(1,Math.ceil(rows.length/24));
    page=Math.min(page,pages-1);results.replaceChildren();
    for(const {species,blocked:occupied} of rows.slice(page*24,page*24+24)){
      const button=document.createElement('button');button.type='button';
      button.textContent=`${species.speciesId} ${species.name} · ${data.getSpeciesStarterValue(species.speciesId)}点${hasRibbon(species.speciesId)?' · 经典通关缎带':''}${occupied?' · 队友已选':''}`;
      button.addEventListener('click',()=>{root.open=false;button.blur();onLocate(species);});results.append(button);
      if(describe){const inspect=document.createElement('button');inspect.type='button';inspect.textContent=`查看 ${species.name} 详情`;
        inspect.onclick=()=>{showDetail(species);};results.append(inspect);}
    }
    status.textContent=rows.length?`${rows.length} 个结果 · ${page+1}/${pages}页；点击定位，仍需在原界面确认选队`:'没有匹配结果，请调整筛选';
    previous.disabled=page===0;next.disabled=page+1>=pages;
  };
  const search=document.createElement('input');search.type='search';search.placeholder='名称或图鉴编号';search.setAttribute('aria-label','搜索精灵');
  search.addEventListener('input',()=>{filters.query=search.value;page=0;render();});controls.append(search);
  const select=(label,key,options)=>{
    const wrapper=document.createElement('label');wrapper.textContent=label;
    const node=document.createElement('select');
    for(const [value,text] of options){const option=document.createElement('option');option.value=String(value);option.textContent=text;node.append(option);}
    node.value=filters[key];node.addEventListener('change',()=>{filters[key]=node.value;page=0;save();render();});
    wrapper.append(node);controls.append(wrapper);return node;
  };
  const type=select('属性','type',[['','全部'],...types]);
  const cost=select('最高费用','cost',[['','不限'],...['1','2','3','5','10'].map(n=>[n,n])]);
  const sort=select('排序','sort',[['number','图鉴编号'],['cost','费用升序'],['stats','种族值总和']]);
  const ribbon=select('本人经典缎带','ribbon',[['','全部'],['earned','已获得'],['missing','未获得']]);
  const label=document.createElement('label'),unlocked=document.createElement('input');unlocked.type='checkbox';unlocked.checked=filters.unlocked;
  unlocked.addEventListener('change',()=>{filters.unlocked=unlocked.checked;page=0;save();render();});label.append(unlocked,'仅当前可选图鉴已解锁');controls.append(label);
  const reset=document.createElement('button');reset.type='button';reset.textContent='重置筛选';
  reset.onclick=()=>{Object.assign(filters,{query:'',unlocked:false,type:'',cost:'',sort:'number',ribbon:''});
    search.value=type.value=cost.value=ribbon.value='';sort.value='number';unlocked.checked=false;page=0;save();render();};controls.append(reset);
  const previous=document.createElement('button'),next=document.createElement('button');previous.type=next.type='button';previous.textContent='上一页';next.textContent='下一页';
  previous.onclick=()=>{page--;render();};next.onclick=()=>{page++;render();};paging.append(previous,next);
  for(const event of ['keydown','keyup'])root.addEventListener(event,e=>e.stopPropagation());
  root.addEventListener('toggle',()=>{if(root.open)render();});
  const showDetail=inspect;
  root.append(controls,status,detail,upgrade,results,paging);document.body.append(root);render();
  return ()=>{alive=false;root.remove();};
}
