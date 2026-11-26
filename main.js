const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('path'), fs = require('fs');
const { execFile } = require('child_process');

// ── Where things live ────────────────────────────────────────────────────────
// Settings : %APPDATA%\Garuda Construction Service\datapath.txt  (written by the installer,
//            always writable, survives updates / uninstall)
// Database : the "data folder" chosen in the installer (default: Documents\Garuda Construction Service Data)
// Cache    : %APPDATA%\Garuda Construction Service\app-cache
const cfgDir = path.join(app.getPath('appData'), 'Garuda Construction Service');
const cfgFile = path.join(cfgDir, 'datapath.txt');
try { fs.mkdirSync(cfgDir, { recursive: true }); } catch (e) {}
app.setPath('userData', path.join(cfgDir, 'app-cache'));

const exeDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);

function readLine(f) {
  try { return fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)[0].trim(); } catch (e) { return ''; }
}
function canWrite(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const t = path.join(dir, '.vbcs-write-test');
    fs.writeFileSync(t, 'ok'); fs.unlinkSync(t);
    return true;
  } catch (e) { return false; }
}

// Called once the app is ready (dialogs need that). Returns the data folder or null (user exited).
function resolveDataDir() {
  const defaultDir = path.join(app.getPath('documents'), 'Garuda Construction Service Data');
  let chosen = readLine(cfgFile) || readLine(path.join(exeDir, 'datapath.txt')) || defaultDir;
  let remember = true;

  while (!canWrite(chosen)) {
    const r = dialog.showMessageBoxSync({
      type: 'warning', title: 'Garuda Construction Service',
      message: 'The data folder is not available',
      detail: chosen + '\n\nIs the drive / pen-drive connected? Your data is NOT lost - it is still in that folder.',
      buttons: ['Try again', 'Choose another folder', 'Use Documents folder (this time only)', 'Exit'],
      defaultId: 0, cancelId: 3, noLink: true
    });
    if (r === 0) continue;
    if (r === 1) {
      const p = dialog.showOpenDialogSync({ title: 'Choose data folder', properties: ['openDirectory', 'createDirectory'] });
      if (p && p[0]) { chosen = p[0]; remember = true; }
      continue;
    }
    if (r === 2) { chosen = defaultDir; remember = false; continue; }
    return null;
  }
  if (remember) { try { fs.writeFileSync(cfgFile, chosen, 'utf8'); } catch (e) {} }
  return chosen;
}

if (!app.requestSingleInstanceLock()) app.quit();
let win, dataDir;

// ── WhatsApp share: save the bill PDF, put it on the clipboard, open WhatsApp Desktop on that customer's chat ──
// WhatsApp has no link that attaches a file by itself, so the last step is Ctrl+V then Enter in the chat.
function copyFileToClipboard(file) {
  return new Promise(res => {
    if (process.platform !== 'win32') return res(false);
    execFile('powershell.exe',
      ['-NoProfile', '-NonInteractive', '-STA', '-WindowStyle', 'Hidden', '-Command', 'Set-Clipboard -LiteralPath $env:VBCS_PDF'],
      { env: Object.assign({}, process.env, { VBCS_PDF: file }), windowsHide: true, timeout: 15000 },
      err => res(!err));
  });
}
// WhatsApp Desktop (Store version) can only read files it is allowed to see and fails with "file not found" when
// the name has Tamil / special characters, the file is overwritten while it uploads, or it sits in a private app folder.
// So every share is saved under a NEW plain-ASCII name in the public Documents folder.
function waShareDir() {
  const cands = [path.join(process.env.PUBLIC || 'C:\\Users\\Public', 'Documents', 'Garuda Bills'), path.join(dataDir, 'Bills PDF')];
  for (const d of cands) {
    try { fs.mkdirSync(d, { recursive: true }); fs.accessSync(d, fs.constants.W_OK); return d; } catch (x) {}
  }
  return cands[1];
}
function waCleanOld(dir) {
  try {
    const limit = Date.now() - 14 * 24 * 3600 * 1000;
    fs.readdirSync(dir).forEach(f => { const p = path.join(dir, f); try { if (/\.pdf$/i.test(f) && fs.statSync(p).mtimeMs < limit) fs.unlinkSync(p); } catch (x) {} });
  } catch (x) {}
}
function waSafeName(raw) {
  let n = String(raw || 'Bill').replace(/\.pdf$/i, '').normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^[._]+|[._]+$/g, '');
  if (!n) n = 'Bill';
  const d = new Date(), z = v => String(v).padStart(2, '0');
  return n.slice(0, 60) + '_' + d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + '_' + z(d.getHours()) + z(d.getMinutes()) + z(d.getSeconds()) + '.pdf';
}
const wait = ms => new Promise(r => setTimeout(r, ms));
ipcMain.handle('vbcs-wa-share', async (e, req) => {
  try {
    const phone = String((req && req.phone) || '').replace(/\D/g, '');
    if (phone.length < 11 || phone.length > 15) return { error: 'Invalid phone number' };
    const dir = waShareDir();
    waCleanOld(dir);
    const file = path.join(dir, waSafeName(req.name));
    fs.writeFileSync(file, Buffer.from(req.data));
    // make sure the file is really complete on disk before WhatsApp is told about it
    if (!fs.existsSync(file) || fs.statSync(file).size < 500) return { error: 'PDF file could not be saved - please try again' };
    await wait(300);
    let copied = false;
    for (let i = 0; i < 3 && !copied; i++) { copied = await copyFileToClipboard(file); if (!copied) await wait(500); }
    let opened = 'web';
    if (app.getApplicationNameForProtocol('whatsapp://')) {
      try { await shell.openExternal('whatsapp://send?phone=' + phone); opened = 'desktop'; } catch (x) {}
    }
    if (opened === 'web') shell.openExternal('https://wa.me/' + phone);
    if (!copied) shell.showItemInFolder(file);
    // Automatic send (Windows + WhatsApp Desktop): wait until the chat is really open, make SURE WhatsApp is the
    // foreground window, put the PDF on the clipboard AGAIN (it may have been overwritten while waiting), paste, Enter.
    // Keys are only sent while a window titled "WhatsApp" is in front, so nothing is ever typed into another program.
    // If any step fails the renderer is told ('vbcs-wa-auto-failed') and the PDF is left on the clipboard for Ctrl+V.
    let auto = false;
    if (opened === 'desktop' && copied && process.platform === 'win32') {
      auto = true;
      const ps = [
        "$ErrorActionPreference='SilentlyContinue'",
        "Add-Type @\"",
        "using System;using System.Text;using System.Runtime.InteropServices;",
        "public class VbcsWin{",
        "[DllImport(\"user32.dll\")]public static extern IntPtr GetForegroundWindow();",
        "[DllImport(\"user32.dll\",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder s,int n);",
        "public static string Title(){var s=new StringBuilder(512);GetWindowText(GetForegroundWindow(),s,512);return s.ToString();}}",
        "\"@",
        "$ws=New-Object -ComObject WScript.Shell",
        "function InFront{ return ([VbcsWin]::Title() -like '*WhatsApp*') }",
        "$ok=$false;$first=-1",
        "for($i=0;$i -lt 40;$i++){Start-Sleep -Milliseconds 500;if($ws.AppActivate('WhatsApp')){$ok=$true;$first=$i;break}}",
        "if(-not $ok){exit 2}",
        "if($first -le 1){Start-Sleep -Milliseconds 4500}else{Start-Sleep -Milliseconds 10000}",
        "for($k=0;$k -lt 10 -and -not (InFront);$k++){$ws.SendKeys('%');[void]$ws.AppActivate('WhatsApp');Start-Sleep -Milliseconds 500}",
        "if(-not (InFront)){exit 3}",
        "Set-Clipboard -LiteralPath $env:VBCS_PDF",
        "Start-Sleep -Milliseconds 500",
        "$ws.SendKeys('^v')",
        "Start-Sleep -Milliseconds 3500",
        "if(-not (InFront)){[void]$ws.AppActivate('WhatsApp');Start-Sleep -Milliseconds 400}",
        "if(-not (InFront)){exit 4}",
        "$ws.SendKeys('~')",
        "exit 0"
      ].join('\r\n');
      execFile('powershell.exe',
        ['-NoProfile', '-STA', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(ps, 'utf16le').toString('base64')],
        { env: Object.assign({}, process.env, { VBCS_PDF: file }), windowsHide: true },
        async (err) => {
          if (!err) { try { if (win && !win.isDestroyed()) win.webContents.send('vbcs-wa-auto-done'); } catch (x) {} return; }   // exit 0 = pasted + sent
          // failed: keep the PDF on the clipboard so the user only has to press Ctrl+V then Enter
          await copyFileToClipboard(file);
          try { if (win && !win.isDestroyed()) win.webContents.send('vbcs-wa-auto-failed', { code: err.code, file }); } catch (x) {}
        });
    }
    return { file, copied, opened, auto };
  } catch (x) { return { error: x.message }; }
});
// After a native alert()/confirm() the window can lose keyboard focus (text boxes stop accepting typing) - give it back.
ipcMain.on('vbcs-refocus', () => { try { if (win && !win.isDestroyed()) { win.blur(); win.focus(); win.webContents.focus(); } } catch (e) {} });
// Open the data / backup folder from the app
ipcMain.handle('vbcs-open-folder', async (e, which) => { try { return await shell.openPath(which === 'backups' ? path.join(dataDir, 'Backups') : dataDir); } catch (x) { return x.message; } });
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

app.whenReady().then(() => {
  dataDir = resolveDataDir();
  if (!dataDir) { app.exit(0); return; }
  process.env.VBCS_DATA_DIR = dataDir;   // read by index.html - must be set before the window is created

  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1280, height: 800, show: false, autoHideMenuBar: true, title: 'Garuda Construction Service',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  // Ctrl+Shift+D = open the folder where the database is saved
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type === 'keyDown' && i.control && i.shift && i.key.toLowerCase() === 'd') { shell.openPath(dataDir); e.preventDefault(); }
  });
  win.maximize(); win.loadFile(path.join(__dirname, 'index.html'));
  // Unsynced network changes make the page ask "leave?" — without this the window would simply refuse to close.
  win.webContents.on('will-prevent-unload', (e) => {
    const c = dialog.showMessageBoxSync(win, { type: 'question', title: 'Garuda Construction Service', buttons: ['Close anyway', 'Stay'], defaultId: 1, cancelId: 1,
      message: 'Some changes have not reached the host PC yet.',
      detail: 'They are saved on THIS PC and will be uploaded the next time you open the app and connect.' });
    if (c === 0) e.preventDefault();
  });
  win.once('ready-to-show', () => win.show());
});
app.on('window-all-closed', () => app.quit());
