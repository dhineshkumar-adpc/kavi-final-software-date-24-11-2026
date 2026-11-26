const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1000,height:1400}});
  p.on('pageerror',e=>console.log('PE',e.message)); p.on('dialog',d=>d.accept());
  await p.goto('file://'+require('path').resolve(__dirname,'../index.html')); await p.waitForTimeout(800);
  const r=await p.evaluate(()=>{
    var s=apiCreateSite({customer:'dinesh',phone:'9786033425',address:'Plot 5, Salem'}).site;
    apiAddSiteOut(s.id,addDays(td(),-30),[{name:'Tie Beam Sheet - 5 feet',qty:10,price:3,group:'MAIN'},{name:'Tie Beam Sheet - 7 feet',qty:4,price:5,group:'MAIN'}],'',300);
    apiAddSiteOut(s.id,addDays(td(),-12),[{name:'Tie Beam Sheet - 5 feet',qty:6,price:3,group:'MAIN'}],'',0);
    apiAddSiteIn(s.id,addDays(td(),-2),[{name:'Tie Beam Sheet - 5 feet',qty:12,group:'MAIN'},{name:'Tie Beam Sheet - 7 feet',qty:1,group:'MAIN'}],1000,'',0,250);
    var st=findSiteById(s.id); curSiteId=s.id;
    var bb=buildSiteInBillObj(st,addDays(td(),-2),[],1000,'',0,1,0,250,st.inBatches[0]);
    return {lines:bb.items.map(i=>i.name+' '+i.qty+' '+i.detailText+' '+i.amount), out:bb.outDateText, rent:st.inBatches[0].rentCharged};
  });
  console.log(JSON.stringify(r,null,1));
  await p.evaluate(()=>{ window.scrollTo(0,0); viewSiteInBatch(curSiteId,0); }); await p.screenshot({path:'s10_siteIn.png'});
  await p.evaluate(()=>{ el('bill-modal').style.display='none'; viewSiteFullBill(); }); await p.screenshot({path:'s11_sitefull.png'});
  await b.close();
})();
