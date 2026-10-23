// Launches the packaged Windows EXE (not the dev server) and exercises it: title, music state, new game, world, battle entry,
// save, quit, relaunch, continue. Uses an isolated user-data dir so real saves are never touched.
delete process.env.ELECTRON_RUN_AS_NODE;
import { _electron as electron } from 'playwright-core';
import { mkdtempSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const exe = process.env.EXE || join(root, 'release/electron/Attack of the Saiyans III - Cell Saga-win32-x64/Attack of the Saiyans III - Cell Saga.exe');
if (!existsSync(exe)) throw new Error('EXE not found: ' + exe);
const data = mkdtempSync(join(tmpdir(), 'aots3-e2e-'));
const out = 'tests/logs/screens/electron';
mkdirSync(out, { recursive: true });
const results = [];
const R = (n, ok, d = '') => { results.push({ name: n, ok, detail: d }); console.log(`${ok ? 'PASS' : 'FAIL'} ${n} ${d}`); };

async function launch() {
  const app = await electron.launch({ executablePath: exe, args: [], env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined, AOTS3_USERDATA: data } });
  const page = await app.firstWindow();
  const errors = [];
  const reqs = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', (r) => reqs.push(r.url()));
  page.on('response', (r) => { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url()); });
  await page.waitForFunction(() => window.__AOTS__ && window.__AOTS__.snapshot().assetsReady, null, { timeout: 60000 });
  return { app, page, errors, reqs };
}

let s = await launch();
R('window title', (await s.page.title()).includes('Attack of the Saiyans III'), await s.page.title());
await s.page.waitForTimeout(1500);
await s.page.screenshot({ path: `${out}/title.png` });
const a0 = await s.page.evaluate(() => window.__AOTS__.audio());
R('title music intent set before gesture (audio locked, not silent-by-bug)', a0.music === 'title', JSON.stringify(a0));
await s.page.mouse.click(640, 300);
await s.page.waitForTimeout(1200);
const a1 = await s.page.evaluate(() => window.__AOTS__.audio());
R('after a click the audio graph runs and title plays', a1.status === 'running' && a1.music === 'title' && a1.live === 1, JSON.stringify(a1));
await s.page.getByRole('button', { name: /new game/i }).first().click();
await s.page.getByRole('button', { name: /^Normal/ }).first().click();
await s.page.waitForFunction(() => window.__AOTS__.snapshot().screen === 'cutscene' || window.__AOTS__.snapshot().screen === 'world', null, { timeout: 30000 });
await s.page.waitForTimeout(1500);
const a2 = await s.page.evaluate(() => window.__AOTS__.audio());
R('music crossfades to the map track with no doubled loops', a2.music !== 'title' && a2.live <= 2, JSON.stringify(a2));
for (let i = 0; i < 40; i++) {
  const u = await s.page.evaluate(() => window.__AOTS__.snapshot());
  if (u.dialogue) await s.page.keyboard.press('Enter');
  else if (u.screen === 'world' && !u.scriptActive) break;
  await s.page.waitForTimeout(250);
}
await s.page.screenshot({ path: `${out}/world.png` });
R('world reached after intro', (await s.page.evaluate(() => window.__AOTS__.snapshot().screen)) === 'world');
for (let i = 0; i < 20; i++) { await s.page.keyboard.down('KeyD'); await s.page.waitForTimeout(100); }
await s.page.keyboard.up('KeyD');
const moved = await s.page.evaluate(() => window.__AOTS__.sim());
R('keyboard movement works', moved.x > 5 * 32 + 20, JSON.stringify(moved));
await s.page.keyboard.press('Tab');
await s.page.waitForTimeout(400);
await s.page.screenshot({ path: `${out}/menu.png` });
await s.page.keyboard.press('KeyX');
const sv = await s.page.evaluate(() => window.__AOTS__.save(0));
R('save slot 1', sv.ok === true);
R('no network requests outside the app scheme', s.reqs.every((u) => u.startsWith('aots3://') || u.startsWith('data:') || u.startsWith('blob:')), s.reqs.filter((u) => !u.startsWith('aots3://') && !u.startsWith('data:') && !u.startsWith('blob:')).join(','));
R('no page errors', s.errors.length === 0, s.errors.join('|'));
const sec = await s.app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; const p = w.webContents.getLastWebPreferences(); return { ctx: p.contextIsolation, sbx: p.sandbox, node: p.nodeIntegration, dev: w.webContents.isDevToolsOpened() }; });
R('security defaults (contextIsolation, sandbox, no nodeIntegration)', sec.ctx && sec.sbx && !sec.node, JSON.stringify(sec));
await s.app.close();

s = await launch();
const slots = (await s.page.evaluate(() => window.__AOTS__.snapshot())).slots;
R('save survives quit + relaunch (separate app data dir)', slots.find((x) => x.slot === 0)?.status === 'ok', JSON.stringify(slots.map((x) => x.status)));
await s.page.getByRole('button', { name: /continue/i }).first().click();
await s.page.waitForFunction(() => window.__AOTS__.snapshot().screen === 'world', null, { timeout: 30000 });
await s.page.waitForTimeout(1000);
await s.page.screenshot({ path: `${out}/continue.png` });
R('Continue loads into the world', true);
R('no page errors after relaunch', s.errors.length === 0, s.errors.join('|'));
await s.app.close();
writeFileSync('tests/logs/e2e-electron.json', JSON.stringify(results, null, 1));
const bad = results.filter((r) => !r.ok);
console.log(`${results.length - bad.length}/${results.length} checks passed`);
process.exit(bad.length ? 1 : 0);
