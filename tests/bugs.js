const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('file:///home/claude/proj/VB-civil-sollution-exe-main/index.html'); await p.waitForTimeout(800);
 const r=await p.evaluate(()=>{ var o={};
   // 1. old backup without the new collections -> every new screen must still work
   var old={invMain:DB.invMain,invSub:DB.invSub,sales:[{id:1,bill_no:'GCS-000007',customer:'Old',phone:'9000000000',address:'',out_date:'2026-01-01',in_date:'2026-01-05',days:5,months:1,total:500,loading:0,advance:0,balance:500,status:'PENDING',created_at:'2026-01-01T00:00:00Z',items:[{product:'Span',qty:2,price:5,group_type:'MAIN',amount:50}]}],returns:[],_sid:2,_rid:1};
   DB=old; ensureDBShape(DB); saveDB();
   o.shape=DB._bnid===7&&Array.isArray(DB.paymentLog)&&Array.isArray(DB.clients)&&Array.isArray(DB.empAdvances)&&DB._meta.schema===2;
   try{ swMain('clients'); swMain('smallc'); swSC('monthly'); swMain('employees'); swMain('payroll'); swMain('attendance'); swMain('sites'); o.screens=true; }catch(e){ o.screens=e.message; }
   // 2. not enough stock -> rejected, bill number not burned
   var n0=DB._bnid; var big=apiAddOrder({billNo:'X1',customer:'a',phone:'1',items:[{name:'Span',qty:99999,price:1,group:'MAIN'}],days:1,total:1,advance:0,balance:1});
   o.stock=big.status==='error'&&/Not enough stock/.test(big.message)&&DB.sales.length===1;
   var e2=apiAddOrder({billNo:'X2',customer:'a',phone:'1',items:[],days:1,total:0}); o.empty=e2.status==='error';
   // 3. compact export
   o.compact=JSON.stringify(DB).indexOf('\n')<0;
   return o; });
 console.log(JSON.stringify(r),'errors',errs.length?errs:'none'); await b.close(); })();
