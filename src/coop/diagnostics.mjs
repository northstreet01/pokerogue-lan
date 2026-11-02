const KEY='pokerogue-coop-diagnostics-v1';
const LIMIT=180;
let rows=null,storage=null,timer=null;

export function flushCoopDiagnostics(){
  if(timer!==null)clearTimeout(timer);timer=null;
  try{if(rows&&storage)storage.setItem(KEY,JSON.stringify(rows));}catch{}
}

function entries(){
  const current=globalThis.localStorage;
  if(rows===null||storage!==current){
    flushCoopDiagnostics();storage=current;rows=safeRead();
  }
  return rows;
}
globalThis.addEventListener?.('pagehide',flushCoopDiagnostics);

function safeRead(){
  try{const value=JSON.parse(globalThis.localStorage?.getItem(KEY)??'[]');return Array.isArray(value)?value.slice(-LIMIT):[];}
  catch{return [];}
}

/** Small local ring buffer. Deliberately stores no room/run IDs, names, tokens,
 * Pokémon nicknames, profile data, or raw action payloads. */
export function recordCoopDiagnostic(event,details={}){
  try{
    const buffer=entries();
    buffer.push({at:new Date().toISOString(),event:String(event).slice(0,48),details});
    if(buffer.length>LIMIT)buffer.splice(0,buffer.length-LIMIT);
    if(timer===null){timer=setTimeout(flushCoopDiagnostics,250);timer.unref?.();}
  }catch{/* Diagnostics must never interrupt gameplay. */}
}

export function coopDiagnosticSnapshot(){
  const saved=entries();flushCoopDiagnostics();
  return {format:'pokerogue-coop-diagnostics',version:1,exportedAt:new Date().toISOString(),
    entries:saved.slice()};
}
export function exportCoopDiagnostics(){
  const data=coopDiagnosticSnapshot();
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`pokerogue-coop-diagnostics-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
  link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  return data.entries.length;
}
