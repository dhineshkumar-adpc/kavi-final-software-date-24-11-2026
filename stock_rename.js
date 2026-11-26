const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.goto('file://'+(process.argv[2]||require('path').resolve(__dirname,'../index.html'))); await p.waitForTimeout(800);
  const r=await p.evaluate(()=>{
    window.confirm=()=>true;
    var L=[]; var P=DB.invMain[0].product, id=DB.invMain[0].id;
    var d=dur(addDays(td(),-2),addDays(td(),3));
    apiAddOrder({billNo:newBN(),customer:'A',phone:'9000000001',address:'x',outDate:addDays(td(),-2),inDate:addDays(td(),3),days:d.days,months:d.months,items:[{name:P,qty:10,price:2,monthPrice:0,calcType:'daily',group:'MAIN'}],total:10*2*d.days,loading:0,advance:0,balance:10*2*d.days,sheetType:'MAIN'});
    L.push('after bill: out='+DB.invMain[0].out_qty+' rows='+DB.invMain.length);
    // user renames stock item in Stock tab (UI function)
    swMain('stock'); document.getElementById('se-name-MAIN-'+id).value=P+' (new)'; saveStockItem('MAIN',id);
    L.push('renamed -> '+DB.invMain[0].product);
    var bill=DB.sales[0].bill_no;
    edDelDispatch(bill);
    L.push('after DELETE bill: rows='+DB.invMain.length+' ; renamed row out='+DB.invMain[0].out_qty+' ; avail='+getStockData('MAIN')[0].available+' ; names='+DB.invMain.map(function(x){return x.product+':'+x.out_qty+'/'+x.total_stock}).join(' | '));
    return L;
  });
  console.log(r.join('\n')); console.log(errs); await b.close();
})();
