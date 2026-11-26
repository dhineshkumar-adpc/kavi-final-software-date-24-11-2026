const fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm'),zlib=require('zlib');
const html=fs.readFileSync(require('path').resolve(__dirname,'../index.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const loader=scripts.find(s=>s.includes('window.__VBCS='));
let pass=0,fail=0; const ok=(c,m)=>{ c?pass++:fail++; console.log(c?'  ✓':'  ✗ FAIL:',m); };
function mkDB(n){ return {invMain:[{id:1,product:'A',total_stock:10,in_qty:0,out_qty:0}],invSub:[],sales:Array.from({length:n},(_,i)=>({id:i+1,bill_no:'B'+i})),returns:[],_meta:{}}; }
function boot(dir, preDB){
  const handlers={}; const ls={}; 
  const el=()=>({style:{},classList:{toggle(){},add(){},remove(){}},addEventListener(){},appendChild(){},insertBefore(){},setAttribute(){},parentNode:{removeChild(){},insertBefore(){}},textContent:'',innerHTML:''});
  const win={addEventListener:(e,f)=>{(handlers[e]=handlers[e]||[]).push(f)},removeEventListener(){},dispatchEvent(){},DB:preDB};
  const doc={readyState:'loading',getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:()=>el(),body:el()};
  const ctx={window:win,document:doc,localStorage:{getItem:k=>ls[k]??null,setItem:(k,v)=>{ls[k]=v},removeItem:k=>{delete ls[k]}},
    require:(m)=>m==='electron'?{shell:{openExternal(){}}}:require(m),process:{env:{VBCS_DATA_DIR:dir},execPath:'/x/y.exe',getSystemVersion:()=>'10.0.0',platform:'win32'},
    Event:function(){},setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},console,Buffer,URL,confirm:()=>true,alert:(m)=>{ctx.__alerts.push(m)},__alerts:[],
    swMain(){},TAB_ORDER:[],toast(){},loadStock(){},location:{reload(){}},indexedDB:undefined,Promise,JSON,Date,Math,Object,Array,String,Number,parseInt,parseFloat,Map,Set};
  ctx.window.window=win; ctx.window.document=doc; ctx.window.localStorage=ctx.localStorage;
  vm.createContext(ctx); vm.runInContext(loader,ctx);
  return {ctx,win,handlers};
}
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vbcs-')); const main=path.join(dir,'Garuda_Construction_Service_Data.json');
  console.log('1. first run → atomic write + backup');
  let a=boot(dir); 
  await new Promise(r=>{ a.handlers.load[0](); setTimeout(r,300); });
  a.win.DB=mkDB(500); a.win.__VBCS.persist();
  ok(fs.existsSync(main),'data file written'); ok(!fs.existsSync(main+'.tmp'),'no temp file left');
  ok(JSON.parse(fs.readFileSync(main)).sales.length===500,'data content correct');
  await new Promise(r=>setTimeout(r,800));
  const bk=path.join(dir,'Backups'); const files=fs.existsSync(bk)?fs.readdirSync(bk):[];
  ok(files.some(f=>/^GCS_Daily_/.test(f))&&files.some(f=>/^GCS_Monthly_/.test(f)),'daily + monthly backups created: '+files.join(','));
  ok(zlib.gunzipSync(fs.readFileSync(path.join(bk,files[0]))).length>100,'backup is valid gzip');
  console.log('2. second save keeps previous copy');
  a.win.DB=mkDB(700); a.win.__VBCS.persist();
  ok(fs.existsSync(path.join(dir,'Garuda_Construction_Service_Data.prev.json')),'.prev.json kept');
  console.log('3. truncated/corrupt data file → auto-recover');
  fs.writeFileSync(main,'{"invMain":[{"id":1},"sales":[{"id":1,'); // truncated
  let b2=boot(dir); await new Promise(r=>{ b2.handlers.load[0](); setTimeout(r,300); });
  const rec=b2.win.__VBCS.remote;
  ok(rec&&rec.sales.length>=500,'recovered '+(rec&&rec.sales.length)+' bills from '+b2.win.__VBCS.recovered);
  ok(fs.readdirSync(dir).some(f=>/damaged/.test(f)),'damaged file preserved (renamed), not overwritten');
  console.log('4. data file deleted → restore from backups');
  try{fs.unlinkSync(main);}catch(e){} try{fs.unlinkSync(path.join(dir,'Garuda_Construction_Service_Data.prev.json'));}catch(e){}
  let c=boot(dir); await new Promise(r=>{ c.handlers.load[0](); setTimeout(r,300); });
  ok(c.win.__VBCS.remote&&c.win.__VBCS.remote.sales.length>=500,'recovered from backup after deletion');
  console.log('5. corrupt + NO backups → refuse to overwrite');
  const dir2=fs.mkdtempSync(path.join(os.tmpdir(),'vbcs-')); const m2=path.join(dir2,'Garuda_Construction_Service_Data.json'); fs.writeFileSync(m2,'garbage{');
  let d=boot(dir2); await new Promise(r=>{ d.handlers.load[0](); setTimeout(r,300); });
  ok(d.win.__VBCS.blocked===true,'write blocked'); d.win.DB=mkDB(3); d.win.__VBCS.persist();
  ok(fs.readFileSync(m2,'utf8')==='garbage{','original damaged file untouched');
  ok(fs.readdirSync(dir2).some(f=>/RECOVERY/.test(f)),'new data safely written to RECOVERY file');
  console.log('6. restore from listed backup');
  const list=a.win.__VBCS.listBackups(); ok(list.length>=2,'backups listed: '+list.length);
  a.win.DB=mkDB(9); const r=a.win.__VBCS.restoreBackup(list[0].name);
  ok(r&&a.win.DB.sales.length>=500,'restoreBackup loads old data ('+a.win.DB.sales.length+')');
  ok(fs.readdirSync(bk).some(f=>/BeforeRestore/.test(f)),'safety copy of current data taken before restore');
  console.log('7. 30MB data write speed');
  a.win.DB=mkDB(300000); const t=Date.now(); a.win.__VBCS.persist(); console.log('   persist ms',Date.now()-t,'size MB',(fs.statSync(main).size/1048576).toFixed(1));
  ok(JSON.parse(fs.readFileSync(main)).sales.length===300000,'large file intact');
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2)});
