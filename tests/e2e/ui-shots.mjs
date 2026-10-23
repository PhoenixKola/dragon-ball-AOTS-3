// Screenshots every UI state at 3 viewports via the dev-only harness and checks basic layout invariants.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = 5199;
const OUT = 'docs/ui-evidence';
mkdirSync(OUT, { recursive: true });
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { stdio: 'pipe' });
let ready = false;
vite.stdout.on('data', (d) => { if (String(d).includes('Local')) ready = true; });
vite.stderr.on('data', (d) => process.stderr.write(d));
for (let i = 0; i < 100 && !ready; i++) await new Promise((r) => setTimeout(r, 200));

const VIEWPORTS = [[1024, 600], [1280, 720], [1920, 1080]];
const MENU_TABS = { 'menu-status': 'Status', 'menu-party': 'Party', 'menu-abilities': 'Abilities', 'menu-items': 'Items', 'menu-equipment': 'Equipment', 'menu-journal': 'Journal', 'menu-options': 'Options', 'menu-save': 'Save' };
const SCENES = ['title', 'title-nosave', 'title-loading', 'title-newgame', 'title-options', 'world', ...Object.keys(MENU_TABS), 'shop', 'travel', 'save', 'options', 'help', 'credits', 'confirm', 'dialogue', 'dialogue-narrator', 'choice', 'card', 'caption', 'toast', 'battle-input', 'battle-skills', 'battle-target', 'battle-guard', 'battle-reduced', 'battle-anim', 'battle-tutorial', 'rewards', 'defeat'];

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const report = [];
for (const [w, h] of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const net = [];
  page.on('request', (r) => { if (!r.url().startsWith(`http://127.0.0.1:${PORT}`) && !r.url().startsWith('data:')) net.push(r.url()); });
  for (const s of SCENES) {
    const q = s === 'battle-target' ? 'battle-input' : s;
    await page.goto(`http://127.0.0.1:${PORT}/ui-harness.html?s=${q}`, { timeout: 120000 });
    await page.waitForSelector('.stage', { timeout: 15000 });
    await page.waitForTimeout(400);
    if (MENU_TABS[s]) await page.getByRole('tab', { name: MENU_TABS[s], exact: true }).click().catch(() => {});
    if (s === 'battle-skills') await page.getByRole('button', { name: /Techniques/ }).first().click().catch(() => {});
    if (s === 'battle-target') {
      await page.getByRole('button', { name: /^Attack/ }).first().click().catch(() => {});
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(150);
    }
    if (s === 'dialogue') await page.waitForTimeout(1500);
    await page.waitForTimeout(250);
    const m = await page.evaluate(() => {
      const de = document.documentElement;
      const bad = [];
      document.querySelectorAll('.stage *').forEach((el) => {
        const r = el.getBoundingClientRect();
        const st = document.querySelector('.stage').getBoundingClientRect();
        if (r.width > 0 && (r.right > st.right + 2 || r.bottom > st.bottom + 2) && !el.closest('.scroll,.shell-body,.cmd-list,.credits-scroll,.log') && getComputedStyle(el).position !== 'absolute' ) bad.push(el.className || el.tagName);
      });
      // text or children clipped by an overflow-hidden/ellipsis container (the 'Super Perfect Cell' nameplate class of bug)
      const clipped = [];
      document.querySelectorAll('.stage *').forEach((el) => {
        const cs = getComputedStyle(el);
        if (!el.getClientRects().length || el.closest('.sr-only')) return;
        if ((cs.overflowX !== 'visible') && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll' && el.scrollWidth > el.clientWidth + 1 && el.textContent.trim()) clipped.push(`${el.className || el.tagName}:${el.textContent.trim().slice(0, 24)}`);
        if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) clipped.push(`ellipsis:${el.textContent.trim().slice(0, 24)}`);
      });
      return { clipped: [...new Set(clipped)].slice(0, 6), hscroll: de.scrollWidth > de.clientWidth + 1, vscroll: de.scrollHeight > de.clientHeight + 1, overflowing: [...new Set(bad)].slice(0, 5), buttons: [...document.querySelectorAll('button')].filter((b) => b.getClientRects().length && (b.getBoundingClientRect().height < 30)).length };
    });
    let clear = null;
    if (s.startsWith('battle-') && s !== 'battle-guard' && s !== 'battle-reduced') {
      clear = await page.evaluate(() => {
        const st = document.querySelector('.stage').getBoundingClientRect();
        const zone = { l: st.left + st.width * 0.2, r: st.left + st.width * 0.8, t: st.top + st.height * 0.3, b: st.top + st.height * 0.78 };
        const hits = [];
        for (const sel of ['.command-menu', '.ally-col', '.enemy-strip', '.turn-order']) {
          const el = document.querySelector(sel); if (!el) continue;
          const r = el.getBoundingClientRect();
          if (r.right > zone.l && r.left < zone.r && r.bottom > zone.t && r.top < zone.b) hits.push(sel);
        }
        return hits;
      });
    }
    const hint = s === 'battle-target' ? await page.evaluate(() => window.__ui?.get().battle?.targetHint ?? null) : undefined;
    report.push({ scene: s, w, h, ...m, centreCovered: clear && clear.length ? clear : undefined, targetHint: hint });
    await page.screenshot({ path: `${OUT}/${s}-${w}x${h}.png` });
  }
  report.push({ scene: '_errors', w, h, errors, externalRequests: net });
  await page.close();
}
await browser.close();
vite.kill();
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
const bad = report.filter((r) => r.centreCovered || r.hscroll || r.vscroll || (r.overflowing && r.overflowing.length) || (r.clipped && r.clipped.length) || (r.errors && r.errors.length) || (r.externalRequests && r.externalRequests.length));
console.log(`${report.length} checks, ${bad.length} flagged`);
for (const b of bad) console.log(JSON.stringify(b));
