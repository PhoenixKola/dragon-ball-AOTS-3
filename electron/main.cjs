'use strict';
// Native desktop shell for AOTS3 Cell Saga. Serves the built game from app-local files through a private
// privileged scheme (aots3://app/), so no HTTP server, no browser and no Node install are needed.
const { app, BrowserWindow, protocol, session, Menu, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const APP_NAME = 'Attack of the Saiyans III - Cell Saga';
app.setName(APP_NAME);
// stable, app-specific data dir (localStorage saves live here). Browser saves are NOT touched: move them with Save/Load > Export / Import.
app.setPath('userData', process.env.AOTS3_USERDATA || path.join(app.getPath('appData'), 'AOTS3-Cell-Saga'));

const DIST = app.isPackaged ? path.join(process.resourcesPath, 'app', 'dist') : path.join(__dirname, '..', 'dist');
const ORIGIN = 'aots3://app';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.wav': 'audio/wav', '.woff2': 'font/woff2', '.map': 'application/json',
};
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: data:; connect-src 'self' blob: data:; font-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

protocol.registerSchemesAsPrivileged([{ scheme: 'aots3', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

if (!app.requestSingleInstanceLock()) app.quit();

let win = null;

function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const file = path.normalize(path.join(DIST, p));
  if (!file.startsWith(DIST + path.sep)) return null; // no path traversal
  return file;
}

function registerProtocol() {
  protocol.handle('aots3', async (request) => {
    const u = new URL(request.url);
    if (u.host !== 'app') return new Response('Forbidden', { status: 403 });
    const file = resolveFile(u.pathname);
    if (!file) return new Response('Forbidden', { status: 403 });
    try {
      const data = await fs.promises.readFile(file);
      return new Response(data, {
        status: 200,
        headers: { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Security-Policy': CSP, 'Cache-Control': 'no-cache' },
      });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}

function hardenSession(ses) {
  ses.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
  ses.setPermissionCheckHandler(() => false);
  // block every network request that is not the private app scheme (or inline data/blob/devtools)
  ses.webRequest.onBeforeRequest((details, cb) => {
    const url = details.url;
    const ok = url.startsWith(ORIGIN + '/') || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('devtools:');
    cb({ cancel: !ok });
  });
}

function createWindow() {
  const iconPath = path.join(app.isPackaged ? path.join(process.resourcesPath, 'app') : path.join(__dirname, '..'), 'build', 'icon.ico');
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    show: false,
    backgroundColor: '#05070d',
    title: APP_NAME,
    useContentSize: true,
    autoHideMenuBar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: !app.isPackaged || process.env.AOTS3_DEVTOOLS === '1',
      autoplayPolicy: 'document-user-activation-required',
      spellcheck: false,
    },
  });
  Menu.setApplicationMenu(null);
  win.removeMenu();
  win.once('ready-to-show', () => win.show());
  win.on('page-title-updated', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(ORIGIN + '/')) e.preventDefault();
  });
  win.webContents.on('will-attach-webview', (e) => e.preventDefault());
  win.webContents.on('render-process-gone', (_e, d) => {
    dialog.showErrorBox(APP_NAME, `The game window crashed (${d.reason}). Your saves are kept; please restart.`);
  });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    }
    if (input.control && input.key.toLowerCase() === 'q') app.quit();
    if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) e.preventDefault();
  });
  win.loadURL(`${ORIGIN}/index.html`);
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(() => {
  registerProtocol();
  hardenSession(session.defaultSession);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => app.quit());
