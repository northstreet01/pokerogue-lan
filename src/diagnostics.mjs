const KEY='pokerogue-diagnostics-v1',LIMIT=240;
let rows=[],loaded=false,timer=null;
function load(){if(!loaded){loaded=true;try{const saved=JSON.parse(globalThis.localStorage?.getItem(KEY)??'[]');if(Array.isArray(saved))rows=saved.slice(-LIMIT);}catch{}}return rows;}
export function flushDiagnostics(){if(timer!==null)clearTimeout(timer);timer=null;try{globalThis.localStorage?.setItem(KEY,JSON.stringify(load()));}catch{}}
// Only catalogue IDs, bounded counters and known error codes enter the log.
// Never serialize errors, save payloads, profile IDs, URLs or arbitrary messages.
export function diagnosticCode(error){
  const code=String(error?.code??error?.message??'');
  return /^(?:(?:LOCAL|ORIGINAL|DESKTOP|GACHA|INVALID|UNKNOWN|MISSING|DUPLICATE|UNSUPPORTED|UNREAD|ASYNC|EGG|COOP)_[A-Z0-9_]{1,64}|ENOSPC|EACCES|EPERM|SQLITE_BUSY|SQLITE_FULL)$/.test(code)?code:
    ['TypeError','RangeError','SyntaxError','Error'].includes(error?.name)?error.name:'UNKNOWN_ERROR';
}
export function recordDiagnostic(event,details={}){
  try{const safe={};for(const [key,value] of Object.entries(details)){
    if(!['code','operation','mode','phase','wave','species','form','choice','gacha','revision','line','column'].includes(key))continue;
    if(typeof value==='number'&&Number.isFinite(value)||typeof value==='string'&&/^[a-zA-Z0-9_.:-]{1,100}$/.test(value))safe[key]=value;
  }
  load().push({at:new Date().toISOString(),event:String(event).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48),details:safe});
  if(rows.length>LIMIT)rows.splice(0,rows.length-LIMIT);
  if(timer===null){timer=setTimeout(flushDiagnostics,250);timer.unref?.();}
  }catch{}
}
export function diagnosticSnapshot(){return {format:'pokerogue-diagnostics',version:1,exportedAt:new Date().toISOString(),entries:load().slice()};}
export function installDiagnostics({document:doc=globalThis.document,window:win=globalThis,version,context=()=>({}),coopSnapshot=()=>null}={}){
  const onError=event=>recordDiagnostic('uncaught-error',{code:diagnosticCode(event.error),line:event.lineno,column:event.colno});
  const onRejection=event=>recordDiagnostic('unhandled-rejection',{code:diagnosticCode(event.reason)});
  win.addEventListener('error',onError);win.addEventListener('unhandledrejection',onRejection);win.addEventListener('pagehide',flushDiagnostics);
  const button=doc.createElement('button');button.id='app-export-diagnostics';button.type='button';button.textContent='导出诊断';
  button.title='导出单人、联机与存档错误记录；重启后仍可导出最近记录';
  for(const type of ['keydown','keyup'])button.addEventListener(type,event=>event.stopPropagation());
  button.addEventListener('click',()=>{
    recordDiagnostic('export',context());flushDiagnostics();
    const data={...diagnosticSnapshot(),appVersion:version,coop:coopSnapshot()};
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const link=doc.createElement('a');link.href=url;link.download=`pokerogue-diagnostics-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
    link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  (doc.getElementById('desktopControls')??doc.body).append(button);
  recordDiagnostic('app-start');
  return ()=>{flushDiagnostics();button.remove();win.removeEventListener('error',onError);win.removeEventListener('unhandledrejection',onRejection);win.removeEventListener('pagehide',flushDiagnostics);};
}
