const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+(process.argv[2]||require('path').resolve(__dirname,'../index.html'))); await p.waitForTimeout(800);
  const res=await p.evaluate((seeds)=>{
    window.confirm=function(){return true;}; window.alert=function(m){ window.__alerts=(window.__alerts||0)+1; };
    var out=[];
    seeds.forEach(function(seed){
      DB=freshDB(); saveDB(); var s=seed; function rnd(){ s=(s*1664525+1013904223)%4294967296; return s/4294967296; } function ri(a,b){ return a+Math.floor(rnd()*(b-a+1)); }
      DB.invMain.forEach(function(r){ r.total_stock=r.total_stock||50; });
      var viol=[], stats={}; function V(m){ if(viol.length<10) viol.push(m); } function C(k){ stats[k]=(stats[k]||0)+1; }
      var allNames=DB.invMain.concat(DB.invSub).map(function(r){return r.product;});
      function avail(n){ var a=getStockData('MAIN').concat(getStockData('SUB')).find(function(x){return x.name===n;}); return a?a.available:0; }
      function invariant(tag){
        var outSum={}, inSum={}; function add(o,k,v){ k=(k||'').trim().toLowerCase(); o[k]=(o[k]||0)+v; }
        DB.sales.forEach(function(x){ x.items.forEach(function(i){ add(outSum,i.product,i.qty); }); });
        DB.returns.forEach(function(x){ x.items.forEach(function(i){ add(inSum,i.product,i.qty); }); });
        DB.sites.forEach(function(st){ (st.outBatches||[]).forEach(function(b){ b.items.forEach(function(i){ add(outSum,i.product,i.qty); }); }); (st.inBatches||[]).forEach(function(b){ b.items.forEach(function(i){ add(inSum,i.product,i.qty); }); });
          (st.missingItems||[]).forEach(function(m){ if(m.resolved&&m.chargeType!=='fixed') add(inSum,m.product,m.qty); }); });
        DB.invMain.concat(DB.invSub).forEach(function(r){ var k=r.product.trim().toLowerCase(); if((r.out_qty||0)!==(outSum[k]||0)) V(tag+' OUT mismatch '+r.product+': inv '+r.out_qty+' vs records '+(outSum[k]||0)); if((r.in_qty||0)!==(inSum[k]||0)) V(tag+' IN mismatch '+r.product+': inv '+r.in_qty+' vs records '+(inSum[k]||0)); });
        if(DB.invMain.length+DB.invSub.length!==allNames.length) V(tag+' PHANTOM stock row created: '+(DB.invMain.length+DB.invSub.length)+' rows vs '+allNames.length);
      }
      function editModal(setQty){ // drive the edit modal like a user
        var m=document.getElementById('ed-modal'); if(!m) return false;
        m.querySelectorAll('.ed-it[data-f="qty"]').forEach(function(inp,i){ var v=setQty(i,Number(inp.value)||0,inp); if(v!=null){ inp.value=v; inp.dispatchEvent(new Event('input',{bubbles:true})); } });
        var before=DB._meta.savedAt; document.getElementById('ed-save').click();
        var still=document.getElementById('ed-modal'); if(still){ still.parentNode.removeChild(still); return false; } return true;
      }
      for(var step=0;step<400;step++){
        var op=ri(1,16); var tag='step'+step+' op'+op;
        try{
          if(op<=3){ var items=[],k=ri(1,3); for(var i=0;i<k;i++){ var n=allNames[ri(0,allNames.length-1)], q=ri(1,6); if(avail(n)<q||items.some(function(x){return x.name===n;})) continue; items.push({name:n,qty:q,price:ri(1,9),monthPrice:0,calcType:'daily',group:'MAIN'}); }
            if(!items.length) continue; var od=addDays(td(),-ri(0,80)), days=ri(1,40); items.forEach(function(it){ it.amount=it.qty*it.price*days; });
            var tot=items.reduce(function(a,i){return a+i.amount;},0);
            apiAddOrder({billNo:newBN(),customer:'C'+ri(1,6),phone:'90000000'+ri(10,15),address:'x',outDate:od,inDate:addDays(od,days),days:days,months:1,items:items,total:tot,loading:ri(0,3)*10,advance:ri(0,tot),balance:tot,sheetType:'MAIN'}); C('dispatch');
          } else if(op<=5){ var open=DB.sales.filter(function(x){ var o=billOutstanding(x.bill_no); return o&&o.total>0; }); if(!open.length) continue;
            var sa=open[ri(0,open.length-1)], o=billOutstanding(sa.bill_no), its=[];
            Object.keys(o.map).forEach(function(key){ var m=o.map[key]; if(m.outstanding>0&&rnd()<0.7){ its.push({name:m.name,qty:ri(1,m.outstanding),price:m.price,monthPrice:0,calcType:'daily',group:m.group}); } });
            if(!its.length) continue; var rd=td(), dd=Math.max(1,daysBetween(sa.out_date,rd)); var rent=its.reduce(function(a,i){ return a+i.qty*(i.price||0)*dd; },0);
            its.forEach(function(i){ i.amount=i.qty*(i.price||0)*dd; });
            apiAddReturn({returnBillNo:newBN(),originalBillNo:sa.bill_no,customer:sa.customer,phone:sa.phone,returnDate:rd,actualDays:dd,actualMonths:1,items:its,totalRental:rent,loading:0,prevAdvance:0,additionalPay:0,finalBalance:rent,notes:''}); C('return');
          } else if(op===6){ var site=DB.sites.filter(function(x){return x.status==='OPEN';}); var st;
            if(!site.length||rnd()<0.25){ st=apiCreateSite({customer:'S'+ri(1,5),phone:'91000000'+ri(10,15),address:'site'}).site; } else st=site[ri(0,site.length-1)];
            var n2=allNames[ri(0,allNames.length-1)], q2=ri(1,8); if(avail(n2)>=q2){ apiAddSiteOut(st.id,addDays(td(),-ri(20,60)),[{name:n2,qty:q2,price:ri(1,9),group:'MAIN'}],'',ri(0,2)*100); C('siteout'); }
          } else if(op===7){ var so=DB.sites.filter(function(x){return x.status==='OPEN'&&computeSiteTotals(x).totalPending>0;}); if(!so.length) continue; var sx=so[ri(0,so.length-1)], t=computeSiteTotals(sx), its2=[];
            Object.keys(t.byProduct).forEach(function(k){ var pr=t.byProduct[k]; if(pr.pending>0&&rnd()<0.7) its2.push({name:pr.name,qty:ri(1,pr.pending),group:'MAIN'}); });
            if(its2.length){ var r4=apiAddSiteIn(sx.id,td(),its2,ri(0,200),'',0,ri(0,2)*50); if(r4.status==='ok') C('sitein'); }
          } else if(op===8){ var so2=DB.sites.filter(function(x){return x.status==='OPEN';}); if(!so2.length) continue; var sy=so2[ri(0,so2.length-1)], t2=computeSiteTotals(sy);
            var unres=(sy.missingItems||[]).filter(function(m){return !m.resolved;});
            if(unres.length&&rnd()<0.5){ apiResolveMissingItem(sy.id,unres[0].id,td()); C('resolve'); }
            else { var ks=Object.keys(t2.byProduct).filter(function(k){return t2.byProduct[k].pending>0;}); if(ks.length){ var pr2=t2.byProduct[ks[0]]; apiMarkSiteMissing(sy.id,td(),[{name:pr2.name,qty:ri(1,pr2.pending),group:'MAIN',chargeType:rnd()<0.3?'fixed':'rent',fixedAmount:ri(1,500)}]); C('markmissing'); } }
          } else if(op===9){ if(!DB.sales.length) continue; var x=DB.sales[ri(0,DB.sales.length-1)]; var cnt=DB.sales.length; edDelDispatch(x.bill_no); if(DB.sales.length<cnt) C('DEL dispatch'); else C('del dispatch blocked');
          } else if(op===10){ if(!DB.returns.length) continue; var x=DB.returns[ri(0,DB.returns.length-1)]; var cnt=DB.returns.length; edDelReturn(x.return_bill_no); if(DB.returns.length<cnt) C('DEL return'); else C('del return blocked');
          } else if(op===11){ if(!DB.sales.length) continue; var x=DB.sales[ri(0,DB.sales.length-1)]; edEditDispatch(x.bill_no);
            if(document.getElementById('ed-modal') && document.querySelector('#ed-modal .ed-it[data-f="qty"]')){ var okk=editModal(function(i,cur){ return Math.max(1,cur+ri(-3,4)); }); C(okk?'EDIT dispatch':'edit dispatch rejected'); } else { var m=document.getElementById('ed-modal'); if(m) m.parentNode.removeChild(m); }
          } else if(op===12){ if(!DB.returns.length) continue; var x=DB.returns[ri(0,DB.returns.length-1)]; edEditReturn(x.return_bill_no);
            if(document.getElementById('ed-modal')){ var okk=editModal(function(i,cur){ return Math.max(1,cur+ri(-2,2)); }); C(okk?'EDIT return':'edit return rejected'); }
          } else if(op===13){ var st2=DB.sites.filter(function(z){return (z.outBatches||[]).length;}); if(!st2.length) continue; var z=st2[ri(0,st2.length-1)]; var cnt=z.outBatches.length; edDelSiteOut(z.id,ri(0,cnt-1)); if(z.outBatches.length<cnt) C('DEL siteout'); else C('del siteout blocked');
          } else if(op===14){ var st3=DB.sites.filter(function(z){return (z.inBatches||[]).length;}); if(!st3.length) continue; var z=st3[ri(0,st3.length-1)]; var cnt=z.inBatches.length; edDelSiteIn(z.id,ri(0,cnt-1)); if(z.inBatches.length<cnt) C('DEL sitein'); else C('del sitein blocked');
          } else if(op===15){ var st4=DB.sites.filter(function(z){return (z.outBatches||[]).length;}); if(!st4.length) continue; var z=st4[ri(0,st4.length-1)]; edEditSiteOut(z.id,ri(0,z.outBatches.length-1));
            if(document.getElementById('ed-modal')){ var okk=editModal(function(i,cur){ return Math.max(1,cur+ri(-3,4)); }); C(okk?'EDIT siteout':'edit siteout rejected'); }
          } else if(op===16){ var st5=DB.sites.filter(function(z){return (z.inBatches||[]).length;}); if(!st5.length) continue; var z=st5[ri(0,st5.length-1)]; edEditSiteIn(z.id,ri(0,z.inBatches.length-1));
            if(document.getElementById('ed-modal')){ var okk=editModal(function(i,cur){ return Math.max(1,cur+ri(-2,2)); }); C(okk?'EDIT sitein':'edit sitein rejected'); }
          }
        }catch(e){ V('EXCEPTION '+tag+': '+e.message); var m=document.getElementById('ed-modal'); if(m) m.parentNode.removeChild(m); }
        invariant(tag); if(viol.length) break;
      }
      out.push({seed:seed,stats:stats,viol:viol});
    });
    return out;
  },[1,7,42,2026,99,123,555]);
  res.forEach(r=>console.log('seed',r.seed,JSON.stringify(r.stats),'→',r.viol.length?r.viol:'OK'));
  console.log('page errors',errs);
  await b.close();
})();
