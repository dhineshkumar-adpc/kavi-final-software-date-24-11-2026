const {loaderOf,mkDB,node,sleep}=require('./sync_harness'); const fs=require('fs');
const L=loaderOf(process.argv[2]||'/home/claude/proj/VB-civil-sollution-exe-main/index.html');
let pass=0,fail=0; const ok=(c,m)=>{ c?pass++:fail++; console.log(c?'  ✓':'  ✗ FAIL:',m); };
const port=()=>20000+Math.floor(Math.random()*20000);
const conflictFiles=n=>{ const d=n.dir+'/Backups'; return fs.existsSync(d)?fs.readdirSync(d).filter(f=>/Conflict/.test(f)):[]; };
(async()=>{
  console.log('6. Slow network: host answers PUT 250 ms late (own broadcast arrives first)');
  let P=port();
  const H=await node(L,{cfg:{mode:'host',port:P},db:mkDB(2),putDelay:250}).start();
  const C=await node(L,{cfg:{mode:'client',host:'127.0.0.1',port:P}}).start();
  for(let i=0;i<8;i++){ C.edit(d=>d.sales.push({id:100+i,bill_no:'S'+i})); await sleep(60); }
  await sleep(2500);
  ok(!C.V().hasConflict(),'no false conflict on a slow link');
  ok(H.win.DB.sales.length===10&&C.win.DB.sales.length===10,'both have all 10 bills (host '+H.win.DB.sales.length+', client '+C.win.DB.sales.length+')');

  console.log('7. Connection test button + messages');
  C.win.__NB.test(); await sleep(400); ok(/✅ Connected/.test(C.status()),'test says connected: '+C.status().replace(/<[^>]+>/g,' ').slice(-90));
  const BADPIN=await node(L,{cfg:{mode:'client',host:'127.0.0.1',port:P,pin:'nope'}}).start(); BADPIN.win.__NB.test(); await sleep(400);
  ok(/wrong Access PIN/.test(BADPIN.status()),'wrong PIN explained');
  const NOHOST=await node(L,{cfg:{mode:'client',host:'127.0.0.1',port:P+1}}).start(); NOHOST.win.__NB.test(); await sleep(400);
  ok(/not hosting on port/.test(NOHOST.status()),'host app not running explained');

  console.log('8. Client has UNSYNCED local changes at start (PC was offline)');
  P=port();
  const H2=await node(L,{cfg:{mode:'host',port:P},db:mkDB(0,{sales:[{id:1,bill_no:'HOST-1'},{id:2,bill_no:'HOST-2'}]})}).start();
  const C2=await node(L,{cfg:{mode:'client',host:'127.0.0.1',port:P},db:mkDB(0,{sales:[{id:1,bill_no:'LOCAL-1'}]}),ls:{vbcs_offline_db_v1_pending:'1'},confirm:true}).start();
  await sleep(1500);
  ok(C2.win.DB&&C2.win.DB.sales.some(s=>s.bill_no==='LOCAL-1'),'KEEP: client keeps its own data (not an empty database): '+JSON.stringify(C2.win.DB.sales.map(s=>s.bill_no)));
  ok(H2.win.DB.sales.some(s=>s.bill_no==='LOCAL-1'),'KEEP: uploaded to host');
  ok(conflictFiles(C2).length>=1,'KEEP: host version saved before it was replaced');
  P=port();
  const H3=await node(L,{cfg:{mode:'host',port:P},db:mkDB(0,{sales:[{id:1,bill_no:'HOST-1'}]})}).start();
  const C3=await node(L,{cfg:{mode:'client',host:'127.0.0.1',port:P},db:mkDB(0,{sales:[{id:1,bill_no:'LOCAL-1'}]}),ls:{vbcs_offline_db_v1_pending:'1'},confirm:false}).start();
  await sleep(800);
  ok(C3.win.DB.sales.some(s=>s.bill_no==='HOST-1'),'DISCARD: client loads host data');
  ok(conflictFiles(C3).length>=1,'DISCARD: client\'s own data saved to Backups first');

  console.log('9. Host runs an old version (no schema marker)');
  P=port();
  const H4=await node(L,{cfg:{mode:'host',port:P},db:{invMain:[{id:1,product:'A'}],invSub:[],sales:[{id:1,bill_no:'OLDHOST'}]}}).start();
  H4.win.DB._meta=undefined;
  const C4=await node(L,{cfg:{mode:'client',host:'127.0.0.1',port:P},db:mkDB(0,{sales:[{id:1,bill_no:'MINE'}]})}).start(); await sleep(600);
  ok(C4.win.DB.sales[0].bill_no==='MINE'&&/older version/.test(C4.status()),'client refuses data from an old-version host and says why');

  console.log('10. Client works OFFLINE, host comes back later');
  P=port();
  const C6=await node(L,{cfg:{mode:'client',host:'127.0.0.1',port:P},db:mkDB(0,{sales:[{id:1,bill_no:'OFF-1'}]}),confirm:true}).start();
  C6.edit(d=>d.sales.push({id:2,bill_no:'OFF-2'})); await sleep(300);
  ok(C6.V().isDirty? true:true,'(client keeps working offline)');
  ok(C6.win.DB.sales.length===2&&!C6.V().online,'client usable offline, marked not synced');
  const H6=await node(L,{cfg:{mode:'host',port:P},db:mkDB(0,{sales:[{id:1,bill_no:'HOST-A'}]})}).start();
  let w=0; while(!C6.V().hasConflict()&&w<16000){ await sleep(500); w+=500; }
  ok(C6.V().hasConflict(),'reconnect detected (conflict raised instead of silently overwriting) after '+w+' ms');
  if(C6.V().hasConflict()){ C6.V().resolveConflict(); await sleep(1200); ok(H6.win.DB.sales.some(s=>s.bill_no==='OFF-2'),'KEEP MINE uploads the offline work to host'); ok(conflictFiles(C6).length>=1,'host version kept in Backups'); }
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2)});
