// Real-app dialogue interaction test: mouse-only click-through, keyboard, rapid double click, and skip.
// Serve a UI build:  npx vite build --outDir dist-ui --emptyOutDir ; node tests/e2e/dialogue-click.mjs
import fs from 'node:fs';
process.env.DIST_DIR = process.env.DIST_DIR || 'dist-ui';
const { launch } = await import('./lib.mjs');

const out = [];
const log = (m) => { out.push(m); console.log(m); };
let failures = 0;
const check = (ok, m) => { log(`${ok ? 'PASS' : 'FAIL'}  ${m}`); if (!ok) failures++; };

const { page, errors, close } = await launch({ width: 1280, height: 720, port: 4188 });
const snap = () => page.evaluate(() => { const s = window.__AOTS__.snapshot(); return { id: s.dialogue?.id ?? null, text: s.dialogue?.text ?? null, screen: s.screen, scriptActive: s.scriptActive }; });
const dom = () => page.evaluate(() => { const d = document.querySelector('.dialogue'); return d ? { id: Number(d.getAttribute('data-dlg-id')), rest: d.querySelector('.dialogue-rest')?.textContent ?? '', text: d.querySelector('.dialogue-text')?.textContent ?? '' } : null; });
const clickBox = async () => { const b = await page.locator('.dialogue-body').boundingBox(); await page.mouse.click(b.x + b.width * 0.5, b.y + b.height * 0.45); };

await page.waitForFunction(() => window.__AOTS__ && window.__AOTS__.snapshot().assetsReady, null, { timeout: 60000 });
await page.getByRole('button', { name: 'New Game' }).click();
await page.getByRole('button', { name: /^Normal/ }).click();

// 1) the real opening cutscene: mouse only
log('--- opening cutscene (real new game) ---');
await page.waitForFunction(() => window.__AOTS__.busy(), null, { timeout: 20000 });
let opening = 0;
const t0 = Date.now();
while (Date.now() - t0 < 60000) {
  if (!(await page.evaluate(() => window.__AOTS__.busy()))) break;
  await page.waitForTimeout(250);
  const d = await dom();
  if (!d) continue;
  await page.waitForTimeout(100);
  await clickBox();
  await page.waitForTimeout(80);
  const a = await dom();
  if (a && a.id === d.id && a.rest === '') { await page.waitForTimeout(220); await clickBox(); }
  else if (a && a.id === d.id) { await page.waitForTimeout(300); await clickBox(); }
  opening++;
  await page.waitForTimeout(250);
}
const afterOpening = await snap();
check(opening >= 3, `opening cutscene produced ${opening} clickable dialogue lines`);
check(afterOpening.id === null || opening >= 3, 'opening cutscene did not soft-lock');
await page.waitForFunction(() => !window.__AOTS__.busy(), null, { timeout: 30000 }).catch(() => {});
check(!(await page.evaluate(() => window.__AOTS__.busy())), 'script finished and world is free after the opening cutscene');

const lines = (n, tag) => Array.from({ length: n }, (_, i) => `${tag} line ${i + 1}: this is a deliberately long sentence so the typewriter is still running when it is clicked.`);

async function runChain(tag, n, advanceFn) {
  const L = lines(n, tag);
  await page.evaluate((l) => { window.__chain = window.__AOTS__.testDialogue(l); }, L);
  let prevId = null;
  let ok = true;
  for (let i = 0; i < n; i++) {
    await page.waitForSelector('.dialogue', { timeout: 5000 });
    await page.waitForFunction((t) => document.querySelector('.dialogue-text')?.textContent.startsWith(t.slice(0, 12)), L[i], { timeout: 5000 });
    const d = await dom();
    if (prevId !== null && d.id !== prevId + 1) { log(`  ${tag} #${i + 1}: id ${d.id} expected ${prevId + 1}`); ok = false; }
    // first activation while typing: completes the line, does NOT advance
    await advanceFn.first();
    await page.waitForTimeout(60);
    const mid = await dom();
    if (!mid || mid.id !== d.id || mid.rest !== '') { log(`  ${tag} #${i + 1}: first activation advanced or did not complete (${JSON.stringify(mid && { id: mid.id, rest: mid.rest.length })})`); ok = false; }
    await page.waitForTimeout(200);
    await advanceFn.second();
    await page.waitForTimeout(120);
    const next = await dom();
    if (i < n - 1) {
      if (!next || next.id !== d.id + 1 || !next.text.startsWith(L[i + 1].slice(0, 12))) { log(`  ${tag} #${i + 1}: expected next line, got ${JSON.stringify(next && { id: next.id, text: next.text.slice(0, 30) })}`); ok = false; }
    } else if (next) { await page.waitForTimeout(150); if (await dom()) { log(`  ${tag}: dialogue still open after last line`); ok = false; } }
    prevId = d.id;
  }
  await page.evaluate(() => window.__chain);
  return ok;
}

log('--- mouse-only click-through (16 lines) ---');
check(await runChain('mouse', 16, { first: clickBox, second: clickBox }), '16 mouse clicks-pairs: each line completes on click 1 and advances exactly one line on click 2');

log('--- keyboard (Enter, Space, E, Z) ---');
let kb = true;
for (const key of ['Enter', 'Space', 'KeyE', 'KeyZ']) {
  const k = key === 'Space' ? 'Space' : key === 'KeyE' ? 'e' : key === 'KeyZ' ? 'z' : 'Enter';
  kb = (await runChain(`key-${key}`, 3, { first: () => page.keyboard.press(k), second: () => page.keyboard.press(k) })) && kb;
}
check(kb, 'keyboard confirm keys complete then advance one line at a time');

log('--- rapid double click after completion advances ONE line ---');
{
  const L = lines(3, 'dbl');
  await page.evaluate((l) => { window.__chain = window.__AOTS__.testDialogue(l); }, L);
  await page.waitForSelector('.dialogue');
  const d0 = await dom();
  await clickBox();
  await page.waitForTimeout(80);
  await page.waitForTimeout(250);
  await clickBox();
  await page.waitForTimeout(20);
  await clickBox(); // rapid second click within 160ms
  await page.waitForTimeout(250);
  const d1 = await dom();
  check(!!d1 && d1.id === d0.id + 1, `double click advanced exactly one line (id ${d0.id} -> ${d1?.id})`);
  await page.keyboard.press('k');
  await page.evaluate(() => window.__chain);
}

log('--- skip (K) never soft-locks ---');
{
  await page.evaluate((l) => { window.__chain = window.__AOTS__.testDialogue(l); }, lines(8, 'skip'));
  await page.waitForSelector('.dialogue');
  await page.keyboard.press('k');
  await page.evaluate(() => window.__chain);
  await page.waitForTimeout(300);
  check((await dom()) === null, 'skip closed the whole chain');
  check(!(await page.evaluate(() => window.__AOTS__.busy())), 'world is free after skip');
}

check(errors.filter((e) => !/404/.test(e)).length === 0, `no page errors (${errors.filter((e) => !/404/.test(e)).join(' | ') || 'none'})`);
await close();
log(failures ? `RESULT: ${failures} FAILED` : 'RESULT: ALL PASSED');
fs.mkdirSync('tests/logs', { recursive: true });
fs.writeFileSync('tests/logs/e2e-dialogue.log', out.join(String.fromCharCode(10)) + String.fromCharCode(10));
process.exit(failures ? 1 : 0);
