export function titleMusic(date=new Date()) {
  return date.getMonth()===11 || date.getMonth()===0&&date.getDate()<=15 ? 'winter_title' : 'title';
}
export function musicLabel(key) {
  return {title:'PokéRogue 标题曲 · Firel',winter_title:'冬季标题曲 · Andr06',menu:'经典菜单音乐',
    evolution:'进化',evolution_fanfare:'进化完成',heal:'宝可梦恢复'}[key] ?? String(key).replaceAll('_',' ');
}
export function showMusicCaption(key,muted=false) {
  if(typeof document==='undefined')return;
  const toolbar=document.getElementById('desktopControls');if(!toolbar)return;
  let label=document.getElementById('now-playing');
  if(!label){label=document.createElement('span');label.id='now-playing';label.setAttribute('role','status');toolbar.append(label);}
  const text=`♫ ${musicLabel(key)}${muted?'（静音）':''}`;
  if(label.textContent!==text)label.textContent=text;
}
