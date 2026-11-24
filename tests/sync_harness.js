const fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm');
function loaderOf(htmlPath){ const html=fs.readFileSync(htmlPath,'utf8'); const sc=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]); return sc.find(s=>s.includes('window.__VBCS=')); }
function mkDB(n,extra){ return Object.assign({invMain:[{id:1,product:'A',total_stock:10,in_qty:0,out_qty:0}],invSub:[],sales:Array.from({length:n||0},(_,i)=>({id:i+1,bill_no:'B'+i})),returns:[],_meta:{schema:2}},extra||{}); }
// one app instance (host or client) with real fs/http, fake NetBird CLI, fake DOM
function node(loader,o){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vbsync-'));
  const handlers={}, ls={}; ls['vbcs_nb_cfg']=JSON.stringify(Object.assign({autoConnect:false,live:true,pin:'1234'},o.cfg));
  const log=[]; const alerts=[]; let confirmAns=o.confirm===undefined?true:o.confirm;
  const el=()=>({style:{},classList:{toggle(){},add(){},remove(){}},addEventListener(){},appendChild(){},insertBefore(){},setAttribute(){},parentNode:{removeChild(){},insertBefore(){}},textContent:'',innerHTML:''});
  const nbStatus={innerHTML:'',style:{}}; const httpReal=require('http'); const httpW=o.putDelay?Object.assign({},httpReal,{createServer:(h)=>httpReal.createServer((q,r)=>{ if(q.method==='PUT'){ const e=r.end.bind(r); r.end=(...a)=>setTimeout(()=>e(...a),o.putDelay); } h(q,r); })}):httpReal;
  const win={addEventListener:(e,f)=>{(handlers[e]=handlers[e]||[]).push(f)},removeEventListener(){},dispatchEvent(){}};
  const doc={readyState:'loading',getElementById:(i)=>i==='nb-status'?nbStatus:null,querySelector:()=>null,querySelectorAll:(q)=>/vbcs-app/.test(q)?[{textContent:''}]:[],addEventListener(){},createElement:()=>el(),body:Object.assign(el(),{appendChild(){ if(!win.DB) win.DB=win.__VBCS.remote||mkDB(0); }})};
  const fakeCP={execFile:(f,a,op,cb)=>{ setImmediate(()=>cb(null,JSON.stringify({management:{connected:true},netbirdIp:'100.64.0.1/16',peers:{connected:1,details:[]}}),'')); }};
  const ctx={window:win,document:doc,localStorage:{getItem:k=>ls[k]??null,setItem:(k,v)=>{ls[k]=String(v)},removeItem:k=>{delete ls[k]}},
    require:(m)=>m==='electron'?{shell:{openExternal(){}}}:m==='child_process'?fakeCP:m==='http'?httpW:require(m),
    process:{env:{VBCS_DATA_DIR:dir},execPath:'/x/y.exe',resourcesPath:'/nonexistent',getSystemVersion:()=>'10.0.0',platform:'win32'},
    Event:function(){},setTimeout,clearTimeout,setInterval:(f,ms)=>setInterval(f,ms>1000?ms/10:ms),clearInterval,console:{log(){},error:(...a)=>log.push(a.join(' '))},Buffer,URL,
    confirm:(m)=>{ log.push('CONFIRM '+m.split('\n')[0]); return typeof confirmAns==='function'?confirmAns(m):confirmAns; },alert:(m)=>alerts.push(m),
    swMain(){},TAB_ORDER:[],toast(){},loadStock(){},location:{reload(){}},indexedDB:undefined,Promise,JSON,Date,Math,Object,Array,String,Number,parseInt,parseFloat,Map,Set,Error,RegExp,encodeURIComponent,decodeURIComponent};
  win.window=win; win.document=doc; win.localStorage=ctx.localStorage;
  for(const k in (o.ls||{})) ls[k]=o.ls[k];
  if(o.db) fs.writeFileSync(path.join(dir,'Garuda_Construction_Service_Data.json'),JSON.stringify(o.db));
  vm.createContext(ctx); vm.runInContext(loader,ctx);
  return {dir,win,ctx,log,alerts,ls,status:()=>nbStatus.innerHTML,setConfirm:(f)=>{confirmAns=f;},
    async start(){ await new Promise(r=>{ handlers.load[0](); setTimeout(r,o.bootWait||1200); }); if(!win.DB) win.DB=win.__VBCS.remote||mkDB(0); return this; },
    edit(fn){ fn(win.DB); win.__VBCS.queueSave(); },
    V:()=>win.__VBCS, stop(){ try{ win.__VBCS.persistNow(); }catch(e){} } };
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
module.exports={loaderOf,mkDB,node,sleep};
