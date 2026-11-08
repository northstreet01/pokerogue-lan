// Browsing never changes the original selector's species indices or team data.
export function findStarters(entries, data, filters, blocked = () => false) {
  const query=String(filters.query??'').trim().toLocaleLowerCase();
  const result=entries.filter(species=>{
    const dex=data.dexData[species.speciesId];
    return (!query || species.name.toLocaleLowerCase().includes(query) || String(species.speciesId)===query)
      && (!filters.unlocked || !!dex?.caughtAttr)
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

export function mountStarterBrowser({entries,data,types,storage,blocked,onLocate,describe}) {
  const root=document.createElement('details');root.id='starter-browser';
  const summary=document.createElement('summary');summary.textContent='查找精灵';root.append(summary);
  const filters={query:'',unlocked:false,type:'',cost:'',sort:'number'};
  try { const saved=JSON.parse(storage?.getItem('settings')??'{}').starterBrowser;
    if(saved){filters.unlocked=saved.unlocked===true;filters.type=types.some(t=>String(t[0])===saved.type)?saved.type:'';
      filters.cost=['1','2','3','5','10'].includes(saved.cost)?saved.cost:'';
      filters.sort=['number','cost','stats'].includes(saved.sort)?saved.sort:'number';}
  }catch{}
  let page=0;
  const controls=document.createElement('div');controls.className='starter-browser-controls';
  const results=document.createElement('div');results.className='starter-browser-results';
  const status=document.createElement('div');status.setAttribute('role','status');
  const paging=document.createElement('div');
  const detail=document.createElement('pre');detail.className='starter-browser-detail';detail.hidden=true;
  const save=()=>{try{const settings=JSON.parse(storage?.getItem('settings')??'{}');
    settings.starterBrowser={...filters,query:undefined};storage?.setItem('settings',JSON.stringify(settings));}catch{}};
  const render=()=>{
    const rows=findStarters(entries,data,filters,blocked),pages=Math.max(1,Math.ceil(rows.length/24));
    page=Math.min(page,pages-1);results.replaceChildren();
    for(const {species,blocked:occupied} of rows.slice(page*24,page*24+24)){
      const button=document.createElement('button');button.type='button';
      button.textContent=`${species.speciesId} ${species.name} · ${data.getSpeciesStarterValue(species.speciesId)}点${occupied?' · 队友已选':''}`;
      button.addEventListener('click',()=>{root.open=false;button.blur();onLocate(species);});results.append(button);
      if(describe){const inspect=document.createElement('button');inspect.type='button';inspect.textContent=`查看 ${species.name} 详情`;
        inspect.onclick=()=>{detail.textContent=describe(species);detail.hidden=false;};results.append(inspect);}
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
  const label=document.createElement('label'),unlocked=document.createElement('input');unlocked.type='checkbox';unlocked.checked=filters.unlocked;
  unlocked.addEventListener('change',()=>{filters.unlocked=unlocked.checked;page=0;save();render();});label.append(unlocked,'仅当前可选图鉴已解锁');controls.append(label);
  const reset=document.createElement('button');reset.type='button';reset.textContent='重置筛选';
  reset.onclick=()=>{Object.assign(filters,{query:'',unlocked:false,type:'',cost:'',sort:'number'});
    search.value=type.value=cost.value='';sort.value='number';unlocked.checked=false;page=0;save();render();};controls.append(reset);
  const previous=document.createElement('button'),next=document.createElement('button');previous.type=next.type='button';previous.textContent='上一页';next.textContent='下一页';
  previous.onclick=()=>{page--;render();};next.onclick=()=>{page++;render();};paging.append(previous,next);
  for(const event of ['keydown','keyup'])root.addEventListener(event,e=>e.stopPropagation());
  root.addEventListener('toggle',()=>{if(root.open)render();});
  root.append(controls,status,detail,results,paging);document.body.append(root);render();
  return ()=>root.remove();
}
