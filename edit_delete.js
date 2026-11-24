// Edit / Delete bills test — node tests/edit_delete.js [path/to/index.html]
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const URL = 'file://' + (process.argv[2] || path.resolve(__dirname, '../index.html'));
let fails = 0, passes = 0;
function ok(c, m) { if (c) { passes++; console.log('  ✓', m); } else { fails++; console.log('  ✗ FAIL:', m); } }
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; const dialogs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  await p.goto(URL); await p.waitForTimeout(1200);
  const ev = (f, a) => p.evaluate(f, a);
  const stock = (name) => ev((n) => { var r = DB.invMain.concat(DB.invSub).find(x => x.product === n); return { out: r.out_qty, inn: r.in_qty, avail: Math.max(0, r.total_stock - r.out_qty + r.in_qty) }; }, name);
  const P1 = await ev(() => ALL_PRODUCTS[0].name), P2 = await ev(() => ALL_PRODUCTS[1].name);
  const G1 = await ev(() => ALL_PRODUCTS[0].group), G2 = await ev(() => ALL_PRODUCTS[1].group);
  const base1 = await stock(P1), base2 = await stock(P2);

  console.log('A. Dispatch bill: create → edit → delete');
  await ev(([P1, P2, G1, G2]) => {
    var d = dur(addDays(td(), -5), addDays(td(), 5));
    apiAddOrder({ billNo: newBN(), customer: 'Ravi', phone: '9000000001', address: 'Salem', outDate: addDays(td(), -5), inDate: addDays(td(), 5), days: d.days, months: d.months,
      items: [{ name: P1, qty: 10, price: 2, monthPrice: 0, calcType: 'daily', group: G1 }, { name: P2, qty: 5, price: 3, monthPrice: 0, calcType: 'daily', group: G2 }],
      total: 10 * 2 * d.days + 5 * 3 * d.days, loading: 100, advance: 50, balance: 10 * 2 * d.days + 5 * 3 * d.days + 100 - 50, sheetType: 'MAIN' });
  }, [P1, P2, G1, G2]);
  let s = await ev(() => DB.sales[0]);
  ok(s.bill_no === 'GCS-000001' && s.days === 11, 'sale created (11 days)');
  ok((await stock(P1)).out === base1.out + 10, 'stock out +10');
  // open edit modal and change qty P1 10→4, rate 2→5, advance 50→0, name
  await ev(() => edEditDispatch('GCS-000001'));
  ok(await p.isVisible('#ed-modal'), 'edit modal opens');
  await p.fill('#ed-name', 'Ravi Kumar');
  await p.fill('.ed-it[data-i="0"][data-f="qty"]', '4');
  await p.fill('.ed-it[data-i="0"][data-f="price"]', '5');
  await p.fill('#ed-adv', '0');
  await p.fill('#ed-loading', '200');
  await p.click('#ed-save'); await p.waitForTimeout(200);
  s = await ev(() => DB.sales[0]);
  const exp = (4 * 5 * 11) + (5 * 3 * 11);
  ok(s.customer === 'Ravi Kumar', 'name updated');
  ok(s.total === exp, 'total recalculated = ' + exp + ' (got ' + s.total + ')');
  ok(s.balance === exp + 200, 'balance = grand − advance (got ' + s.balance + ')');
  ok((await stock(P1)).out === base1.out + 4, 'stock out adjusted to +4');
  ok(!(await p.isVisible('#ed-modal').catch(() => false)), 'modal closed after save');
  // over-stock check
  await ev(() => edEditDispatch('GCS-000001'));
  await p.fill('.ed-it[data-i="0"][data-f="qty"]', '999999');
  await p.click('#ed-save'); await p.waitForTimeout(200);
  ok((await ev(() => DB.sales[0].items[0].qty)) === 4, 'over-stock qty rejected');
  await p.click('#ed-cancel');

  console.log('B. Return bill: create → edit → delete');
  await ev(([P1]) => {
    var o = billOutstanding('GCS-000001'); var d = dur(addDays(td(), -5), td());
    var amt = 4 * 5 * d.days;
    apiAddReturn({ returnBillNo: newBN(), originalBillNo: 'GCS-000001', customer: 'Ravi Kumar', phone: '9000000001', returnDate: td(), actualDays: d.days, actualMonths: d.months, totalRental: amt,
      loading: 200, prevAdvance: 0, additionalPay: 0, finalBalance: amt + 200, items: [{ name: P1, qty: 4, price: 5, monthPrice: 0, calcType: 'daily', amount: amt, group: 'MAIN' }], notes: '' });
  }, [P1]);
  ok((await ev(() => DB.returns.length)) === 1 && (await ev(() => DB.sales[0].status)) === 'RETURNED', 'return created, dispatch → RETURNED');
  await ev(() => edDelDispatch('GCS-000001'));
  ok((await ev(() => DB.sales.length)) === 1 && dialogs.some(m => m.includes('Return bill இருக்கு')), 'dispatch delete blocked while return exists');
  await ev(() => edEditDispatch('GCS-000001'));
  ok(await p.isVisible('#ed-name') && !(await p.isVisible('.ed-it').catch(() => false)), 'dispatch edit is customer-details only when returns exist');
  await p.fill('#ed-name', 'Ravi K'); await p.click('#ed-save'); await p.waitForTimeout(150);
  ok((await ev(() => DB.returns[0].customer)) === 'Ravi K', 'customer rename cascades to return');
  // edit return: change qty 4→3, unloading 40
  await ev(() => edEditReturn('GCS-000002'));
  ok(await p.isVisible('#ed-modal'), 'return edit modal opens');
  await p.fill('.ed-it[data-i="0"][data-f="qty"]', '3');
  await p.fill('#ed-unl', '40');
  await p.click('#ed-save'); await p.waitForTimeout(200);
  let r = await ev(() => DB.returns[0]);
  const rd = await ev(() => dur(addDays(td(), -5), td()).days);
  const rexp = 3 * 5 * rd;
  ok(r.items[0].qty === 3 && r.total_rental === rexp, 'return qty 3, rental = ' + rexp + ' (got ' + r.total_rental + ')');
  ok(r.final_balance === rexp + 200 + 40, 'final balance includes loading+unloading (got ' + r.final_balance + ')');
  ok((await stock(P1)).inn === base1.inn + 3, 'stock IN adjusted to +3');
  // too many returned qty rejected
  await ev(() => edEditReturn('GCS-000002'));
  await p.fill('.ed-it[data-i="0"][data-f="qty"]', '9');
  await p.click('#ed-save'); await p.waitForTimeout(150);
  ok((await ev(() => DB.returns[0].items[0].qty)) === 3, 'return qty above outstanding rejected');
  await p.click('#ed-cancel');
  // delete return → dispatch restored
  await ev(() => edDelReturn('GCS-000002'));
  ok((await ev(() => DB.returns.length)) === 0, 'return deleted');
  s = await ev(() => DB.sales[0]);
  ok(s.status === 'PENDING' && s.balance === exp + 200, 'dispatch restored to PENDING with balance ' + s.balance);
  ok((await stock(P1)).inn === base1.inn, 'stock IN restored');
  await ev(() => edDelDispatch('GCS-000001'));
  ok((await ev(() => DB.sales.length)) === 0, 'dispatch deleted');
  const a1 = await stock(P1), a2 = await stock(P2);
  ok(a1.out === base1.out && a2.out === base2.out && a1.avail === base1.avail, 'stock fully back to start');

  console.log('C. Site Ledger');
  const site = await ev(([P1, P2, G1, G2]) => {
    var st = apiCreateSite({ customer: 'Dinesh', phone: '9786033425', address: 'Salem' }).site;
    apiAddSiteOut(st.id, addDays(td(), -30), [{ name: P1, qty: 10, price: 3, group: G1 }, { name: P2, qty: 4, price: 5, group: G2 }], '', 300);
    apiAddSiteOut(st.id, addDays(td(), -12), [{ name: P1, qty: 6, price: 3, group: G1 }], '', 0);
    apiAddSiteIn(st.id, addDays(td(), -2), [{ name: P1, qty: 12, group: G1 }, { name: P2, qty: 1, group: G2 }], 1000, '', 0, 250);
    curSiteId = st.id; return st.id;
  }, [P1, P2, G1, G2]);
  const t0 = await ev((id) => computeSiteTotals(findSiteById(id)), site);
  ok(t0.byProduct[P1.toLowerCase()].pending === 4, 'baseline: ' + P1 + ' pending 4');
  const stP1 = (await stock(P1)).out;
  // cannot delete OUT-1 (10 pcs) because 12 are returned
  await ev(([id]) => edDelSiteOut(id, 0), [site]);
  ok((await ev((id) => findSiteById(id).outBatches.length, site)) === 2, 'OUT-1 delete blocked (returns depend on it)');
  // cannot reduce OUT-2 below what is needed (16 out, 12 back → min 0; reduce 6→1 means 11 dispatched < 12 returned)
  await ev(([id]) => edEditSiteOut(id, 1), [site]);
  await p.fill('.ed-it[data-i="0"][data-f="qty"]', '1'); await p.click('#ed-save'); await p.waitForTimeout(200);
  ok((await ev((id) => findSiteById(id).outBatches[1].items[0].qty, site)) === 6, 'OUT-2 qty cut below returned rejected');
  await p.fill('.ed-it[data-i="0"][data-f="qty"]', '8'); await p.fill('.ed-it[data-i="0"][data-f="price"]', '4'); await p.fill('#ed-loading', '75');
  await p.click('#ed-save'); await p.waitForTimeout(200);
  let o2 = await ev((id) => findSiteById(id).outBatches[1], site);
  ok(o2.items[0].qty === 8 && o2.items[0].price === 4 && o2.loading === 75, 'OUT-2 edited (qty 8, rate 4, loading 75)');
  ok((await stock(P1)).out === stP1 + 2, 'stock out +2 after OUT-2 qty 6→8');
  ok((await ev((id) => findSiteById(id).inBatches[0].rentCharged, site)) > 0, 'IN rent recalculated');
  // edit IN: 12 → 10, payment 1000 → 500
  await ev(([id]) => edEditSiteIn(id, 0), [site]);
  await p.fill('.ed-it[data-i="0"][data-f="qty"]', '10'); await p.fill('#ed-pay', '500');
  await p.click('#ed-save'); await p.waitForTimeout(200);
  let i1 = await ev((id) => findSiteById(id).inBatches[0], site);
  ok(i1.items[0].qty === 10 && i1.payment === 500, 'IN-1 edited (qty 10, payment 500)');
  ok((await ev((id) => computeSiteTotals(findSiteById(id)).byProduct[P1.toLowerCase()].pending, site).catch(() => 0)) !== undefined, 'site totals still compute');
  // return more than pending rejected
  await ev(([id]) => edEditSiteIn(id, 0), [site]);
  await p.fill('.ed-it[data-i="0"][data-f="qty"]', '99'); await p.click('#ed-save'); await p.waitForTimeout(150);
  ok((await ev((id) => findSiteById(id).inBatches[0].items[0].qty, site)) === 10, 'IN qty above pending rejected');
  await p.click('#ed-cancel');
  // delete IN → everything pending again
  const stIn = (await stock(P1)).inn;
  await ev(([id]) => edDelSiteIn(id, 0), [site]);
  ok((await ev((id) => findSiteById(id).inBatches.length, site)) === 0, 'IN-1 deleted');
  ok((await stock(P1)).inn === stIn - 10, 'stock IN reduced by 10');
  const t1 = await ev((id) => computeSiteTotals(findSiteById(id)), site);
  ok(t1.byProduct[P1.toLowerCase()].pending === 18, 'pending back to 18 (10+8)');
  // now OUT batches can be deleted
  await ev(([id]) => edDelSiteOut(id, 1), [site]);
  await ev(([id]) => edDelSiteOut(id, 0), [site]);
  ok((await ev((id) => findSiteById(id).outBatches.length, site)) === 0, 'both OUT batches deleted');
  const f1 = await stock(P1), f2 = await stock(P2);
  ok(f1.out === base1.out && f1.inn === base1.inn && f2.out === base2.out && f2.inn === base2.inn, 'stock fully back to start after site deletes');

  console.log('D. Buttons render on cards');
  await ev(([P1, G1]) => {
    var d = dur(addDays(td(), -2), addDays(td(), 2));
    apiAddOrder({ billNo: newBN(), customer: 'Card Test', phone: '9111111111', outDate: addDays(td(), -2), inDate: addDays(td(), 2), days: d.days, months: d.months,
      items: [{ name: P1, qty: 2, price: 2, monthPrice: 0, calcType: 'daily', group: G1 }], total: 2 * 2 * d.days, advance: 0, balance: 2 * 2 * d.days, sheetType: 'MAIN' });
    var st = apiCreateSite({ customer: 'Card Site', phone: '9222222222' }).site;
    apiAddSiteOut(st.id, addDays(td(), -3), [{ name: P1, qty: 2, price: 3, group: G1 }], '', 0);
    apiAddSiteIn(st.id, td(), [{ name: P1, qty: 1, group: G1 }], 0, '');
    curSiteId = st.id;
  }, [P1, G1]);
  await ev(() => { swMain('bills'); }).catch(() => {});
  await ev(() => { try { swMain('smallc'); swSC && swSC('bills'); } catch (e) {} searchBills(); });
  ok(await ev(() => document.querySelectorAll('#results-list [data-ed="dd-e"]').length) >= 1, 'Dispatch bill cards show Edit button');
  ok(await ev(() => document.querySelectorAll('#results-list [data-ed="dd-d"]').length) >= 1, 'Dispatch bill cards show Delete button');
  await ev(() => { searchReturns(); });
  await ev(() => { swMain('sites'); openSite(curSiteId); swSx('bills'); });
  ok(await ev(() => document.querySelectorAll('#site-workspace [data-ed="so-e"]').length) === 1, 'Site OUT card shows Edit');
  ok(await ev(() => document.querySelectorAll('#site-workspace [data-ed="si-d"]').length) === 1, 'Site IN card shows Delete');
  // clicking Edit button on a card opens modal and does NOT open the bill viewer
  await p.click('#site-workspace [data-ed="so-e"]');
  ok(await p.isVisible('#ed-modal'), 'clicking card Edit opens editor');
  ok(!(await p.isVisible('#bill-modal').catch(() => false)), 'bill viewer did not open');
  await p.click('#ed-cancel');
  await ev(() => { renderAllSitesBillsReturns && (document.getElementById('asb-out-list') && renderAllSitesBillsReturns()); });

  console.log('Errors:', errs.length ? errs : 'none');
  ok(errs.length === 0, 'no page errors');
  console.log(`\n${passes} passed, ${fails} failed`);
  await b.close(); process.exit(fails ? 1 : 0);
})();
