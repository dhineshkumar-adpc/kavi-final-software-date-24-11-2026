const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.goto('file://'+(process.argv[2]||require('path').resolve(__dirname,'../index.html'))); await p.waitForTimeout(800);
  const res=await p.evaluate((seeds)=>{
    var out=[];
    seeds.forEach(function(seed){
      // fresh DB
      DB=freshDB(); saveDB(); var s=seed; function rnd(){ s=(s*1664525+1013904223)%4294967296; return s/4294967296; } function ri(a,b){ return a+Math.floor(rnd()*(b-a+1)); }
      DB.invMain.forEach(function(r){ r.total_stock=r.total_stock||50; });
      var viol=[], log=[]; function V(m){ if(viol.length<8) viol.push(m); }
      var allNames=DB.invMain.concat(DB.invSub).map(function(r){return r.product;});
      function avail(n){ var a=getStockData('MAIN').concat(getStockData('SUB')).find(function(x){return x.name===n;}); return a?a.available:0; }
      for(var step=0;step<260;step++){
        var op=ri(1,9);
        try{
          if(op<=2){ // dispatch
            var items=[],k=ri(1,3); for(var i=0;i<k;i++){ var n=allNames[ri(0,allNames.length-1)], q=ri(1,6); if(avail(n)<q||items.some(function(x){return x.name===n;})) continue; items.push({name:n,qty:q,price:ri(1,9),type:'per day',group:'MAIN',amount:0}); }
            if(!items.length) continue; var od=addDays(td(),-ri(0,80)), days=ri(1,40); items.forEach(function(it){ it.amount=it.qty*it.price*days; });
            var tot=items.reduce(function(a,i){return a+i.amount;},0), adv=ri(0,tot);
            var r=apiAddOrder({billNo:newBN(),customer:'C'+ri(1,6),phone:'90000000'+ri(10,15),address:'x',outDate:od,inDate:addDays(od,days),days:days,months:1,items:items,total:tot,loading:ri(0,3)*100,advance:adv,balance:tot-adv,sheetType:'MAIN'});
            if(r.status!=='ok') V('order failed '+JSON.stringify(r));
          } else if(op<=4){ // partial/full return of random open bill
            var open=DB.sales.filter(function(x){ var o=billOutstanding(x.bill_no); return o&&o.total>0; }); if(!open.length) continue;
            var sa=open[ri(0,open.length-1)], o=billOutstanding(sa.bill_no), its=[];
            Object.keys(o.map).forEach(function(key){ var m=o.map[key]; if(m.outstanding>0&&rnd()<0.7){ its.push({name:m.name,qty:ri(1,m.outstanding),group:m.group}); } });
            if(!its.length) continue; var rd=td(), days=daysBetween(sa.out_date,rd);
            var rent=its.reduce(function(a,i){ var pr=(sa.items.find(function(x){return x.product===i.name;})||{}).price||0; return a+i.qty*pr*days; },0);
            var prior=(ix().retsByOrig.get(sa.bill_no)||[]).length;
            var fb=round2(rent+(prior?0:sa.loading)-(prior?0:sa.advance));
            var r2=apiAddReturn({returnBillNo:newBN(),originalBillNo:sa.bill_no,customer:sa.customer,phone:sa.phone,returnDate:rd,actualDays:days,actualMonths:1,items:its,totalRental:rent,loading:prior?0:sa.loading,unloading:ri(0,2)*50,damage:0,prevAdvance:prior?0:sa.advance,additionalPay:0,finalBalance:fb,notes:''});
            if(r2.status!=='ok') V('return failed '+JSON.stringify(r2));
          } else if(op===5){ // settle a return balance
            var rb=DB.returns.filter(function(x){return x.final_balance>0;}); if(!rb.length) continue; var rr=rb[ri(0,rb.length-1)], pay=ri(1,Math.ceil(rr.final_balance));
            var r3=apiSettlePayment({billNo:rr.return_bill_no,payAmount:Math.min(pay,rr.final_balance),type:'RETURN',method:'Cash'}); if(r3.status!=='ok') V('settle failed '+JSON.stringify(r3));
          } else if(op===6){ // site create/out
            var site=DB.sites.filter(function(x){return x.status==='OPEN';}); var st;
            if(!site.length||rnd()<0.25){ st=apiCreateSite({customer:'S'+ri(1,5),phone:'91000000'+ri(10,15),address:'site'}).site; } else st=site[ri(0,site.length-1)];
            var n2=allNames[ri(0,allNames.length-1)], q2=ri(1,8); if(avail(n2)>=q2) apiAddSiteOut(st.id,addDays(td(),-ri(0,60)),[{name:n2,qty:q2,price:ri(1,9),group:'MAIN'}],'',ri(0,2)*100);
          } else if(op===7){ // site return
            var so=DB.sites.filter(function(x){return x.status==='OPEN'&&computeSiteTotals(x).totalPending>0;}); if(!so.length) continue; var sx=so[ri(0,so.length-1)], t=computeSiteTotals(sx), its2=[];
            Object.keys(t.byProduct).forEach(function(k){ var pr=t.byProduct[k]; if(pr.pending>0&&rnd()<0.7) its2.push({name:pr.name,qty:ri(1,pr.pending),group:'MAIN'}); });
            if(its2.length){ var dd=td(); var r4=apiAddSiteIn(sx.id,dd,its2,ri(0,200),'',0,ri(0,2)*50); if(r4.status!=='ok'&&!/before the OUT/.test(r4.message)) V('site in failed '+JSON.stringify(r4)); }
          } else if(op===8){ // site mark missing / resolve
            var so2=DB.sites.filter(function(x){return x.status==='OPEN';}); if(!so2.length) continue; var sy=so2[ri(0,so2.length-1)], t2=computeSiteTotals(sy);
            var unres=(sy.missingItems||[]).filter(function(m){return !m.resolved;});
            if(unres.length&&rnd()<0.5){ apiResolveMissingItem(sy.id,unres[0].id,td()); }
            else { var ks=Object.keys(t2.byProduct).filter(function(k){return t2.byProduct[k].pending>0;}); if(ks.length){ var pr2=t2.byProduct[ks[0]]; apiMarkSiteMissing(sy.id,td(),[{name:pr2.name,qty:ri(1,pr2.pending),group:'MAIN',chargeType:rnd()<0.3?'fixed':'rent',fixedAmount:ri(1,500)}]); } }
          } else { // monthly collection
            var rows=moBuild().rows.filter(function(r){return r.pending>0;}); if(rows.length){ var row=rows[ri(0,rows.length-1)], m=row.months.find(function(x){return x.pending>0;}); apiCollectMonthly({type:row.type,ref:row.ref,no:m.no,amount:Math.min(m.pending,ri(1,500)),method:'Cash'}); }
          }
        }catch(e){ V('EXCEPTION at step '+step+' op'+op+': '+e.message); }
      }
      // ---- invariants ----
      var outSum={}, inSum={}; function add(o,k,v){ k=(k||'').trim().toLowerCase(); o[k]=(o[k]||0)+v; }
      DB.sales.forEach(function(x){ x.items.forEach(function(i){ add(outSum,i.product,i.qty); }); });
      DB.returns.forEach(function(x){ x.items.forEach(function(i){ add(inSum,i.product,i.qty); }); });
      DB.sites.forEach(function(st){ (st.outBatches||[]).forEach(function(b){ b.items.forEach(function(i){ add(outSum,i.product,i.qty); }); }); (st.inBatches||[]).forEach(function(b){ b.items.forEach(function(i){ add(inSum,i.product,i.qty); }); });
        (st.missingItems||[]).forEach(function(m){ if(m.resolved&&m.chargeType!=='fixed') add(inSum,m.product,m.qty); }); });
      DB.invMain.concat(DB.invSub).forEach(function(r){ var k=r.product.trim().toLowerCase(); if((r.out_qty||0)!==(outSum[k]||0)) V('OUT mismatch '+r.product+': inv '+r.out_qty+' vs records '+(outSum[k]||0)); if((r.in_qty||0)!==(inSum[k]||0)) V('IN mismatch '+r.product+': inv '+r.in_qty+' vs records '+(inSum[k]||0)); if(r.total_stock-r.out_qty+r.in_qty<0) V('NEGATIVE stock '+r.product); });
      var seen={}; DB.sales.forEach(function(x){ if(seen[x.bill_no]) V('duplicate bill '+x.bill_no); seen[x.bill_no]=1; if(x.balance<0) V('negative balance '+x.bill_no); }); DB.returns.forEach(function(x){ if(seen[x.return_bill_no]) V('duplicate return bill '+x.return_bill_no); seen[x.return_bill_no]=1; });
      DB.sales.forEach(function(x){ var o=billOutstanding(x.bill_no); Object.keys(o.map).forEach(function(k){ if(o.map[k].returned>o.map[k].dispatched) V('over-returned '+x.bill_no+' '+k); }); });
      DB.sites.forEach(function(st){ var t=computeSiteTotals(st); if(t.totalPending<0||t.balanceDue<0) V('site negative '+st.site_no); if(Math.abs(t.grandTotal-(t.grandRent+t.totalLoading+t.totalUnloading+t.totalDamage))>0.01) V('site total mismatch '+st.site_no); });
      var rc={}; allReceipts().forEach(function(r){ if(rc[r.receipt_no]) V('duplicate receipt '+r.receipt_no); rc[r.receipt_no]=1; });
      if(JSON.stringify(JSON.parse(JSON.stringify(DB)))!==JSON.stringify(DB)) V('JSON round-trip differs');
      out.push({seed:seed,sales:DB.sales.length,returns:DB.returns.length,sites:DB.sites.length,receipts:Object.keys(rc).length,viol:viol});
    });
    return out;
  },[1,7,42,2026]);
  res.forEach(r=>console.log('seed',r.seed,'sales',r.sales,'returns',r.returns,'sites',r.sites,'receipts',r.receipts,'→',r.viol.length?r.viol:'ALL INVARIANTS OK'));
  console.log('page errors',errs.length?errs:'none'); await b.close();
})();
