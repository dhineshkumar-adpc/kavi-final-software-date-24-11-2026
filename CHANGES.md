# Garuda Construction Service — Update (Nov 2026)

1. Return auto-fill shows only bills that still have items to return (fully-returned bills hidden).
2. Pending tab: "Settle Now" on every pending bill (dispatch, return, site) -> Payment Receipt bill (RCPT-xxxxxx) with PDF/WhatsApp. All receipts listed under Pending tab.
3. Qty boxes start empty (placeholder 0); typing 10 gives 10, never 100/010. Applies to every number box.
4. இறக்குக்கூலி (Unloading) added to Return bills and Site Ledger returns (bill, totals, Excel).
5. New "Customers" tab: auto from bills + manual add/edit; per-customer bills, payment history, 30-day rent. Bill forms auto-fill known customers.
6. Monthly Bills (30-day collection) tab + site panel button; new "(c) Copyright" tab with company details and logo (embedded).
7. Lifelong-safety: atomic saves, previous-copy, daily (60 days) + monthly (forever) compressed backups in "Backups" folder, auto-recovery from damaged file, never overwrites a damaged file, flush-on-close, indexed lookups, list caps (tested with 30,000 bills / 24,000 returns / 4,000 sites).
Also fixed: same-day return, advance deducted twice on partial returns, stale qty when switching bills, bill number skipped by preview, 2nd partial-return over-qty.
Tests: node tests/e2e.js (needs Playwright), node tests/storage_test.js

## Update 2
- Site Ledger partial return bill: every line shows OUT (rending) date -> return date, days, rate and amount per lot. Full site bill lists every lot the same way.
- Loading / Unloading shown in ONE row. A4 sheet now holds 16 rows (was 12) so fewer pages.
- Neater screens: Site Ledger tabs (Find / New / All bills) and per-site tabs (Summary, OUT, IN, Missing, Bills, Payments); dispatch/return forms have the summary in a sticky right column, stock panel collapsible.
- Employees: salary settings (per day / per hour, OT rate, allowance), documents view/download, advances, attendance edit + OT, payment history and attendance download (Excel/PDF), auto payroll with manual edit, salary slip with OT and advance.

## Update 3 — Network Sync + bug sweep
Network Sync
- FIXED false "conflict" on slow links (a device's own change echoed back as another device's change; the sync then stopped).
- FIXED data-loss risk: choosing "keep my unsynced changes" at start-up could upload an EMPTY database (exe mode).
- Conflict dialog now ALWAYS saves the version that gets replaced to Backups (Conflict_*.json.gz) — restore it from the Backup tab.
- Version guard: PCs running an older build can no longer overwrite the host's newer data (HTTP 426 + clear message).
- gzip transfer + cached host snapshot + size-based timeouts (large databases no longer time out forever).
- New: "Test connection" button with plain-language reasons (wrong PIN / host app not running / NetBird not connected / version mismatch), host shows its IP addresses, optional LAN access (PIN required), warning when no PIN is set, port-in-use message.
- Window can be closed while changes are unsynced (asks first; changes stay saved locally).
- Screens refresh after data arrives from another PC.
Other bugs fixed
- Restoring an old backup (or receiving old data) now gets every collection + a safe bill counter (previously new screens could crash).
- A bill can no longer be saved with more pieces than are in stock (qty was silently cut while the total stayed).
- A failed save no longer burns a bill number; Excel/Full backup export is compact (3x smaller).
- Number boxes: select-on-focus no longer races with fast typing.
Tests: tests/sync_test.js, sync_test2.js (real host + client over HTTP), fuzz.js (random operations + stock/balance invariants), bugs.js.

## Update 4
- Number boxes: up/down arrows kept (always visible). Fixed the real bug: a mouseup handler stopped the arrow's auto-repeat from ending, so numbers kept changing on hover. Mouse-wheel can no longer change a focused number.
- Site Ledger bills: lost (fixed-amount) items now appear as lines "⚠ காணவில்லை" with qty, OUT date → date and amount (no longer hidden inside சேதார தொகை). Found items show "திரும்ப வந்தது" with OUT → IN date, days, rate and amount. Running missing items show OUT → today.
- Missing tab: each entry shows full details; ✏ Edit (date / note / fixed amount / found date) and 🗑 Delete-Undo (stock reversed, qty returns to pending). Missing Items Bill PDF has OUT, IN, days, rate, status, amount.
- Mark / settle / edit / delete missing now refreshes Site Ledger, bill lists, stock, pending and any open full-bill view.
- Small Construction missing tab: every settlement can be undone from "Recent missing entries" (restores bill + stock; newest first).
- Salary slip redesigned: logo, company address, GSTIN, earnings/deductions tables, net pay, signatures (screen + PDF).
- Dashboard 'Rented vs Available Snapshot' now lists ALL products (was limited to first 8) and shows rented / total under each.
- Missing Items Bill PDF now uses the same sheet layout as all other bills (logo, GSTIN, Tamil, OUT -> IN dates, days, rate, amount).
- Build workflow: every push to main now also publishes a direct-download pre-release ('Latest build') with the installer .exe + SHA256.txt, so the installer no longer has to be downloaded inside the Actions zip.
- Small cleanups: duplicate object keys in site IN-bill preview, safe guard on restoreAutoBackup.
- ROOT-CAUSE FIX (old bill layout): a return bill with 'fully paid' balance (and any sheet HTML that is not valid XML) made the new bill renderer fail, and the app silently fell back to the OLD layout. Fixed the invalid <br> tag, added an XML safety net, and removed the silent old-layout fallbacks (Return bill, Site full bill, Missing bill) so every bill always uses the new sheet format.
- New workflow store-msix.yml: builds a Microsoft Store (MSIX/APPX) package. Microsoft signs Store packages for free (individual developer registration is free), so users install from the Store with no Chrome/SmartScreen/Defender warning.

## Update 5
- Small Construction missing / lost: each settlement is now stored with full details (item, qty, OUT date, date, days, rate, amount). The return bill lists lost items as "⚠ காணவில்லை" lines with the fixed amount and found items as "திரும்ப வந்தது" with days x rate; the raw "[Marked LOST ... ]" note no longer appears in the Site box. The lost / missing charge is its own row and is included in the bill total (bill math verified on 6 random data sets, ~440 settlements).
- New Missing / Lost Items Bill for Small Construction (view + PDF) - in the Missing tab (pending cards + a history list of ALL missing bills), in Completed Bills / Returns cards, and in the Customers tab bill history. Site Ledger: View + PDF buttons in the Missing tab, a card in Bills & History, and an entry in the Customers tab bill history.
- Site Ledger: "Close Site" is now disabled while any balance (incl. lost amount) is still due; the check is also enforced in the close function.
- Contacts: new View screen per contact - trips (date, site / location, amount, note, paid / due) with add / edit / delete, current location with history (a new trip automatically updates the vehicle location), edit contact details, totals.
- Bills: long addresses are wrapped evenly over the lines and the font shrinks to fit instead of being cut off; Return bill Site box now shows the original bill + site address.
- Bill view: new 🖨 Print button (also Ctrl+P while a bill is open) for every bill type — dispatch, return, site, missing/lost, receipts, salary slip. Multi-page bills print one sheet per A4 page.
- Print buttons added next to every bill download: Site Ledger (Full Site Bill, Missing/Lost bill in Missing tab and Bills & History) and Payroll salary-slip lists; every bill view window (dispatch, return, site, receipts, monthly, missing/lost, salary) already has 🖨 Print + Ctrl+P.
- Missing tab (Small Construction): old missing/lost entries (made before structured logging) now also get a Missing / Lost Items Bill - history list with View/Download, a Bill button on each 'Recent missing entries' row, bill button on return cards, and Customers tab history.
- Print now opens an in-app Print Preview first (all pages, zoom - / +, 🖨 Print, ⬇ PDF, Esc to close; Ctrl+P inside the preview prints). Windows' own print window cannot show a preview inside Electron, so the preview is built into the app.
- Site Ledger: Find Site search now works like Small Construction — suggestions appear after 2 letters (site no / name / mobile / place), showing status, balance due and pending pcs; click or ↑ ↓ + Enter opens the site directly; one match + Enter opens it.

## Update 5 (bills)
- Bills are WHITE (was yellow). Header: left eagle emblem removed; company name text replaced by the supplied PNG logo.
- Dispatch download: loading, total, advance (+ partial payments collected). Return download: no "total rent" row, additional charge merged into total.
- Site Ledger dispatch: return date picker -> bill, summary and site summary show days x amount till that date.
- "Additional Payment Now" / "Payment Collected Now" -> "Payment Collecting Amount" (forms + return bills).
- Small Construction: "Collect Payment" button on every open dispatch bill (Bills tab) and Pending > Settle Now. Amounts are remembered, printed on the dispatch bill, and deducted automatically on the Return bill (own row "இடைக்கால பணம் செலுத்தியது").
- WhatsApp (installed Windows app): opens the customer's chat, pastes the bill PDF and presses Enter automatically.

## Update 6
- Preview, auto-download after placing a bill, print and WhatsApp now all use the SAME hide-rules (one code path).
- WhatsApp: PDF saved under a new plain-ASCII name in C:\Users\Public\Documents\Garuda Bills (no more "file not found"), clipboard retry, smarter wait, double-click guard.
- Customers tab: every bill has View / Return (redirect) / Settle / PDF / WhatsApp; sites also Return, Full Bill and OUT-n / IN-n bill buttons.
- "இறுதி இருப்பு" -> "Pending Amount", "மூல பில்" -> "Main Bill" (all bills).

## Update 7
- Bill VIEW (screen) shows every detail again (dates from → to, rate × days, item amounts, balance). Only the downloaded / auto-downloaded / printed / WhatsApp PDF hides details.

## Update 8 — Calc Type per product + full-detail bills
- Small Construction (dispatch + return) and Site Ledger (OUT batch): every product row has Rate/day, Calc Type (Daily | 1 Month + Extra Days) and Rate/month (auto = day rate × 30, editable).
- One formula everywhere (`calcItemAmount`): Daily = Qty×Rate×Days; Monthly = Qty×MonthRate + Qty×Rate×max(0,Days−30). Used by bills, returns (FIFO lots), running rent, missing/lost items, site summary, 30-day bills.
- Calc type / month rate are saved with every bill item, return item, site lot and missing record, and restored automatically in the Return screens.
- Validation: monthly row needs Rate/month, daily row needs Rate/day ("Enter rate for <product>").
- Bills: NOTHING is hidden any more (view, download, auto-download, print, WhatsApp). Every row shows dates from → to, days and how the rent is made up; header badge "(1 Month + Extra Days)".

- Product tables made compact so Qty and Subtotal are always visible (no sideways scrolling) on Dispatch, Return and Site OUT.

- Additional Charge and Discount (amount less) rows: shown in bill VIEW only; hidden in download / auto-download / print / WhatsApp (both are already inside the Total). Everything else stays fully detailed.

- "Discount" renamed to "Less Amount" (forms + bills). Site Ledger OUT batch now has Less Amount + Additional Charge (+ note); both counted in the site total, shown in bill VIEW, hidden in download/print/WhatsApp.

## Update 6 — Discount / Less Amount / Additional Charge x2
- தள்ளுபடி — Discount (restored name) and Additional Charge are **view only**: shown when you open/preview the bill, hidden in Download / Print / WhatsApp-share (still counted in the Total).
- NEW குறைவு தொகை — Less Amount and NEW கூடுதல் கட்டணம் 2 — Additional Charge (with its own "for" note): shown in the bill view AND in the download / print / share copy.
- Applies to Dispatch, Return, Site Ledger OUT / IN batches and the Site Ledger "Discount / Less Amount / Additional Charge" buttons, full site bill, reports and customer totals.

## Update 7 — Vehicle Rent (separate) + note boxes removed
- Removed the "Additional charge for" and "Additional charge 2 for" note boxes (Dispatch, Return, Site OUT / IN).
- NEW 🚚 வண்டி வாடகை — Vehicle Rent (Rs) + Vehicle / Contact on Dispatch, Return, Site OUT and Site IN. The amount is NOT in the bill Total / Balance, NOT in Income / Reports / Dashboard. It is shown as its own row (வண்டி வாடகை (தனி)) under the Total, and is saved as a trip in that Contact's history (Contacts tab -> trips, Given / Due).

## Update 8 — names swapped + Vehicle Rent switch
- Names swapped: குறைவு தொகை — Less Amount = view only (hidden in download); தள்ளுபடி — Discount = shown on bill (view + download). Forms, bills, Site Ledger buttons / history all follow this.
- Vehicle Rent: new switch "bill-la kaattu" (ON = separate row on bill, OFF = not on bill). Either way it is saved in the Contact's trip history and never counted in company Income / Expenses / Reports.

## Update 9 — Vehicle Rent inside the Total (when shown)
- Switch ON: bill shows "வண்டி வாடகை : ₹X" and it is ADDED to மொத்த தொகை (and to Balance / Site balance). Switch OFF: no row, not in Total.
- In both cases it is saved in the Contact's trip history and is excluded from company rental income / Income "collected" / Reports (money collected is treated as paying the vehicle rent first).

## Update 10
- Label text: "· view only" renamed to "· No on bill" for Less Amount and Additional Charge (forms, Site Ledger buttons and dialogs). Behaviour unchanged.

## Update 11 — Excel + WhatsApp fix
- FIXED Export Excel / Import Excel (Stock): inside the installed (Electron) app the Excel library registered itself in Node's `module.exports`, so the global `XLSX` stayed empty and both buttons failed. `XLSX` is now restored right after the library loads. Verified in a real Electron 22 run: export downloads a valid .xlsx; import of "Inventory main" / "inventory sub" sheets updates stock.
- Excel: errors now show a clear message; the SAME file can be imported again (file box reset); "No inventory sheet" message resets the status text.
- WhatsApp share: before pasting, the PDF is copied to the clipboard AGAIN (it could be overwritten while WhatsApp was starting); WhatsApp is forced to the front and keys are sent only while it really is the front window; if auto-send cannot finish, a clear message tells you to press Ctrl+V then Enter (PDF stays on the clipboard). Browser fallback also copies the PDF and says so. Share button is released as soon as the send finishes.

## Update 12 — Site Ledger uses the Small Construction Bill Summary
- Site Ledger OUT batch now has the same "💰 Bill Summary" box as Small Construction dispatch: Duration, Total Rental Amount, Loading, Less Amount (No on bill), Discount (on bill), Additional Charge (No on bill), Additional Charge 2 (on bill), Vehicle Rent + Contact + "bill-la kaattu" switch, Advance Paid, Balance Due, GRAND TOTAL. Same rule: Grand = rent + loading + additional + additional 2 + vehicle rent (if shown) - less amount - discount; Balance = Grand - Advance. Updates live while typing.
- NEW Advance Paid on Site OUT: saved as a site payment (receipt, "Advance with SITE-xxxx-OUT-n"), printed on the OUT bill (முன்பணம் / மீதி தொகை), kept when the bill is opened again from history, and counted in the site balance.
- Site Return (IN) batch: charges now sit in a "💳 Payment Settlement" box like the Small Construction return (Unloading, Damage, Less, Discount, Additional 1 + 2, Vehicle Rent, Payment Collecting Amount). Vehicle rent is now counted in the live site-balance preview.
- Removed the old partial "Bill Total" line from the OUT preview (replaced by the Bill Summary).
