import { launch, shot } from './lib.mjs';
const t = await launch({ width: 1280, height: 720, port: 4460 });
const { page } = t;
await page.waitForFunction(() => window.__AOTS__?.snapshot().assetsReady, null, { timeout: 30000 });
await page.evaluate(() => window.__AOTS__.settings({ showTutorials: false }));
await page.getByRole('button', { name: /new game/i }).first().click();
await page.getByRole('button', { name: /^Normal/ }).first().click();
for (let i = 0; i < 60; i++) { const u = await page.evaluate(() => window.__AOTS__.snapshot()); if (u.dialogue) await page.keyboard.press('Enter'); else if (u.screen === 'world' && !u.scriptActive && !u.loading) break; await page.waitForTimeout(250); }
await page.evaluate(() => window.__AOTS__.setEncounters(false));
const held = new Set();
async function walkTo(id) {
  for (let n = 0; n < 900; n++) {
    const sp = await page.evaluate((i) => window.__AOTS__.standPoint(i), id);
    const pos = await page.evaluate(() => window.__AOTS__.sim());
    if (Math.hypot(sp.x - pos.x, sp.y - pos.y) < 9) break;
    const d = await page.evaluate(([x, y]) => window.__AOTS__.dirTo(x, y), [sp.x, sp.y]);
    const want = new Set();
    if (d.dx > 0.35) want.add('KeyD'); if (d.dx < -0.35) want.add('KeyA'); if (d.dy > 0.35) want.add('KeyS'); if (d.dy < -0.35) want.add('KeyW'); want.add('ShiftLeft');
    for (const k of [...held]) if (!want.has(k)) { await page.keyboard.up(k); held.delete(k); }
    for (const k of want) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); }
    await page.waitForTimeout(60);
  }
  for (const k of [...held]) { await page.keyboard.up(k); held.delete(k); }
  const sp = await page.evaluate((i) => window.__AOTS__.standPoint(i), id);
  const key = { up: 'KeyS', down: 'KeyW', left: 'KeyD', right: 'KeyA' }[sp.face];
  await page.keyboard.down(key); await page.waitForTimeout(100); await page.keyboard.up(key);
}
await walkTo('ch_land1');
await page.waitForTimeout(300);
await shot(page, 'chest-closed', 'tests/logs/screens/final');
await page.keyboard.press('KeyE');
await page.waitForTimeout(500);
await shot(page, 'chest-open', 'tests/logs/screens/final');
const st1 = await page.evaluate(() => ({ opened: window.__AOTS__.state().opened.filter((k) => k.startsWith('chest:')), inv: window.__AOTS__.state().inventory }));
await page.keyboard.press('KeyE'); await page.waitForTimeout(400);
const st2 = await page.evaluate(() => ({ inv: window.__AOTS__.state().inventory }));
console.log(JSON.stringify({ st1, sameAfterSecondPress: JSON.stringify(st1.inv) === JSON.stringify(st2.inv) }));
await page.evaluate(() => window.__AOTS__.save(0));
await page.reload();
await page.waitForFunction(() => window.__AOTS__?.snapshot().assetsReady, null, { timeout: 30000 });
await page.getByRole('button', { name: /continue/i }).first().click();
await page.waitForFunction(() => window.__AOTS__.snapshot().screen === 'world' && !window.__AOTS__.snapshot().loading, null, { timeout: 30000 });
await page.waitForTimeout(600);
await shot(page, 'chest-after-reload', 'tests/logs/screens/final');
console.log('errors', t.errors);
await t.close();
