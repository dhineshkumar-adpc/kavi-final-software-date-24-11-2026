const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1366,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.goto('file://'+require('path').resolve(__dirname,'../index.html')); await p.waitForTimeout(1000);
  const r=await p.evaluate(()=>{
    const T=(n,f)=>{const t=performance.now();const v=f();return [n,Math.round(performance.now()-t)+'ms'];};
    const out=[];
    var names=['Ravi','Anbu','Kumar','Selvam','Murugan','Raja','Mani','Suresh'];
    // 30000 dispatch bills (80% returned), 24000 returns, 4000 sites
    for(var i=1;i<=30000;i++){ var ret=i%5!==0; var bn='VBCS-'+String(i).padStart(6,'0');
      DB.sales.push({id:DB._sid++,bill_no:bn,customer:names[i%8]+' '+(i%3000),phone:'9'+String(100000000+(i%3000)).slice(0,9),address:'Street '+i,out_date:'2022-0'+(1+i%9)+'-10',in_date:'2022-0'+(1+i%9)+'-20',days:10,months:1,total:5000,loading:100,advance:1000,balance:ret?0:4100,status:ret?'RETURNED':'PENDING',created_at:'2022-0'+(1+i%9)+'-10T10:00:00Z',items:[{product:'Span',qty:10,price:5,group_type:'MAIN',amount:500},{product:'Jacky',qty:4,price:5,group_type:'MAIN',amount:200}]});
      if(ret){ DB.returns.push({id:DB._rid++,return_bill_no:'GCS-R'+i,original_bill_no:bn,customer:names[i%8]+' '+(i%3000),phone:'9'+String(100000000+(i%3000)).slice(0,9),return_date:'2022-0'+(1+i%9)+'-20',actual_days:10,actual_months:1,total_rental:5000,loading:100,unloading:50,damage:0,prev_advance:1000,additional_pay:0,final_balance:4150,status:'FULLY PAID',notes:'',items:[{product:'Span',qty:10,group_type:'MAIN'},{product:'Jacky',qty:4,group_type:'MAIN'}]}); } }
    for(var s=1;s<=4000;s++){ DB.sites.push({id:s+10,site_no:'SITE-'+s,customer:'Site '+(s%800),phone:'8'+String(100000000+(s%800)).slice(0,9),address:'x',created_at:'2022-01-01T00:00:00Z',status:s%10===0?'OPEN':'CLOSED',outBatches:[{id:1,date:'2026-08-01',expected_return:'',loading:0,items:[{product:'Span',qty:10,price:5,group:'MAIN'}]}],inBatches:s%10===0?[]:[{id:1,date:'2026-08-20',payment:100,damage:0,unloading:0,rentCharged:1000,items:[{product:'Span',qty:10,group:'MAIN'}]}],payments:[],missingItems:[]}); }
    __dbVer++;
    out.push(['sales',DB.sales.length,'returns',DB.returns.length,'sites',DB.sites.length]);
    out.push(T('index build',()=>ix()));
    out.push(T('retAC search "ravi"',()=>getReturnableBills('ravi',8)));
    out.push(T('onAC returns',()=>apiGetReturns('ravi 1',12)));
    out.push(T('searchBills render',()=>apiGetBills('ravi',100)));
    out.push(T('apiGetPending',()=>apiGetPending()));
    out.push(T('customer index (cold)',()=>buildCustIndex()));
    out.push(T('customer index (cached)',()=>buildCustIndex()));
    out.push(T('monthly build (cold)',()=>moBuild()));
    out.push(T('clRender',()=>{swMain('clients');}));
    out.push(T('loadMonthlyBills',()=>loadMonthlyBills()));
    out.push(T('dashboard',()=>renderDashboard()));
    out.push(T('stringify DB',()=>{window.__len=JSON.stringify(DB).length;}));
    out.push(['json MB',(window.__len/1048576).toFixed(1)]);
    out.push(T('saveDB + persist',()=>{saveDB();__VBCS.persistNow();}));
    return out;
  });
  r.forEach(x=>console.log(x.join(' ')));
  await p.evaluate(()=>swMain('smallc')); await p.waitForTimeout(500);
  const t0=Date.now(); await p.evaluate(()=>{swSC('pending');loadPending();}); console.log('pending tab',Date.now()-t0,'ms');
  const t1=Date.now(); await p.evaluate(()=>{swSC('missing');}); console.log('missing tab',Date.now()-t1,'ms');
  const t2=Date.now(); await p.evaluate(()=>{swSC('bills');}); console.log('bills tab',Date.now()-t2,'ms');
  console.log('errors',errs);
  await b.close();
})();
