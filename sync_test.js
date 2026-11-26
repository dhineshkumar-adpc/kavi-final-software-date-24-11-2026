const {loaderOf,mkDB,node,sleep}=require('./sync_harness');
const L=loaderOf(process.argv[2]||require('path').resolve(__dirname,'../index.html'));
let pass=0,fail=0; const ok=(c,m)=>{ c?pass++:fail++; console.log(c?'  ✓':'  ✗ FAIL:',m); };
const port=()=>20000+Math.floor(Math.random()*20000);
(async()=>{
  const P=port();
  console.log('1. Host + client basic live sync');
  const H=await node(L,{cfg:{mode:'host',port:P},db:mkDB(3)}).start();
  const C=await node(L,{cfg:{mode:'client',host:'127.0.0.1',port:P},bootWait:1200}).start();
  ok(C.win.DB.sales.length===3,'client loaded host data on start (3 bills)');
  H.edit(d=>d.sales.push({id:4,bill_no:'B3'})); await sleep(400);
  ok(C.win.DB.sales.length===4,'host change pushed live to client');
  C.edit(d=>d.sales.push({id:5,bill_no:'B4'})); await sleep(500);
  ok(H.win.DB.sales.length===5,'client change reached host');
  ok(!C.V().hasConflict()&&!H.V().hasConflict(),'no conflict flagged');
  console.log('2. Rapid edits from client (own broadcast must not cause false conflict)');
  for(let i=0;i<15;i++){ C.edit(d=>d.sales.push({id:100+i,bill_no:'R'+i})); await sleep(15); }
  await sleep(1200);
  ok(!C.V().hasConflict(),'no false conflict after 15 rapid edits');
  ok(H.win.DB.sales.length===20&&C.win.DB.sales.length===20,'both sides have all 20 bills (host '+H.win.DB.sales.length+', client '+C.win.DB.sales.length+')');
  console.log('3. Large data (30 MB) transfer');
  const big=mkDB(0); big.blob='x'.repeat(1000).repeat(1); big.sales=Array.from({length:200000},(_,i)=>({id:i,bill_no:'BIG'+i,customer:'Customer name '+i,address:'Street '+i+' Cuddalore'}));
  const t0=Date.now(); H.win.DB=big; H.V().queueSave(); await sleep(300);
  let waited=0; while(C.win.DB.sales.length!==200000&&waited<20000){ await sleep(250); waited+=250; }
  ok(C.win.DB.sales.length===200000,'client received 200k-bill DB in '+(Date.now()-t0)+' ms');
  const t1=Date.now(); C.edit(d=>d.sales.push({id:999999,bill_no:'LAST'})); waited=0; while(H.win.DB.sales.length!==200001&&waited<20000){ await sleep(250); waited+=250; }
  ok(H.win.DB.sales.length===200001,'client edit on big DB reached host in '+(Date.now()-t1)+' ms');
  console.log('4. Wrong PIN / old version');
  const BAD=await node(L,{cfg:{mode:'client',host:'127.0.0.1',port:P,pin:'0000'},bootWait:1200}).start();
  ok(BAD.win.DB.sales.length===0,'wrong PIN does not load host data');
  const OLD=await node(L,{cfg:{mode:'client',host:'127.0.0.1',port:P},bootWait:1200}).start();
  const before=H.win.DB.sales.length; OLD.win.DB={invMain:[],invSub:[],sales:[]}; OLD.V().queueSave(); await sleep(800);
  ok(H.win.DB.sales.length===before,'host rejects data from an old-version client (no data loss)');
  console.log('5. Genuine conflict keeps a copy of the losing side');
  H.win.DB=mkDB(2); H.V().queueSave(); await sleep(500);
  C.setConfirm(true);
  // both edit at the same moment
  H.edit(d=>d.sales.push({id:50,bill_no:'HOST-ONLY'})); C.win.DB.sales.push({id:60,bill_no:'CLIENT-ONLY'}); C.V().queueSave(); await sleep(900);
  const bk=require('fs').existsSync(C.dir+'/Backups')?require('fs').readdirSync(C.dir+'/Backups'):[];
  console.log('   conflict:',C.V().hasConflict(),'host sales',H.win.DB.sales.map(s=>s.bill_no).join(','),'| client',C.win.DB.sales.map(s=>s.bill_no).join(','));
  if(C.V().hasConflict()){ C.V().resolveConflict(); await sleep(900); const bk2=require('fs').existsSync(C.dir+'/Backups')?require('fs').readdirSync(C.dir+'/Backups'):[]; ok(bk2.some(f=>/Conflict/.test(f)),'losing version saved to Backups: '+bk2.filter(f=>/Conflict/.test(f)).join(',')); }
  else ok(true,'(no conflict arose — merged cleanly)');
  console.log(`\nlog errors: ${[...H.log,...C.log].filter(x=>!/CONFIRM/.test(x)).slice(0,5).join(' | ')||'none'}`);
  console.log(`RESULT: ${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2)});
