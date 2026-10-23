import { launch, shot } from './lib.mjs';
const t = await launch({ width: 1280, height: 720, port: 4470 });
const { page } = t;
await page.waitForFunction(() => window.__AOTS__?.snapshot().assetsReady, null, { timeout: 30000 });
await page.evaluate(() => window.__AOTS__.settings({ showTutorials: false, battleSpeed: 1 }));
await page.getByRole('button', { name: /new game/i }).first().click();
await page.getByRole('button', { name: /^Normal/ }).first().click();
const held = new Set();
let shots = { miss: false, perfect: false, good: false };
let cueSeq = 0;
for (let n = 0; n < 4000 && !(shots.miss && shots.perfect); n++) {
  const u = await page.evaluate(() => window.__AOTS__.snapshot());
  if (u.dialogue) { await page.keyboard.press('Enter'); await page.waitForTimeout(120); continue; }
  if (u.screen === 'battle' && u.battle) {
    for (const k of [...held]) { await page.keyboard.up(k); held.delete(k); }
    const b = u.battle;
    if (b.phase === 'input' && b.commands) { const a = await page.evaluate(() => window.__AOTS__.advice()); if (a) await page.evaluate((x) => window.__AOTS__.submit(x), a); await page.waitForTimeout(40); continue; }
    if (b.phase === 'guard' && b.guard) {
      const mode = cueSeq++ % 2 === 0 ? 'miss' : 'perfect';
      if (!shots[mode]) {
        if (mode === 'perfect') { while ((await page.evaluate(() => window.__AOTS__.snapshot().battle?.battleClock ?? 0)) < b.guard.impactAt - 8) await page.waitForTimeout(4); await page.keyboard.press('Digit' + b.guard.slot); }
        await page.waitForFunction((id) => { const x = window.__AOTS__.snapshot().battle; return !x || !x.guard || x.guard.id !== id; }, b.guard.id, { timeout: 5000 });
        await page.waitForTimeout(150);
        await shot(page, `guard-${mode}`, 'tests/logs/screens/final');
        shots[mode] = true;
      }
      await page.waitForFunction((id) => { const x = window.__AOTS__.snapshot().battle; return !x || !x.guard || x.guard.id !== id; }, b.guard.id, { timeout: 5000 }).catch(() => {});
      continue;
    }
    await page.waitForTimeout(40);
    continue;
  }
  if (u.screen === 'world' && !u.scriptActive && !u.loading) {
    const goal = await page.evaluate(() => window.__AOTS__.goal());
    if (!goal || goal.kind === 'done') break;
    const target = goal.kind === 'walk' ? { x: goal.x, y: goal.y } : await page.evaluate((id) => window.__AOTS__.standPoint(id), goal.entityId);
    const d = await page.evaluate(([x, y]) => window.__AOTS__.dirTo(x, y), [target.x, target.y]);
    const want = new Set(['ShiftLeft']);
    if (d && !d.blocked) { if (d.dx > 0.35) want.add('KeyD'); if (d.dx < -0.35) want.add('KeyA'); if (d.dy > 0.35) want.add('KeyS'); if (d.dy < -0.35) want.add('KeyW'); }
    for (const k of [...held]) if (!want.has(k)) { await page.keyboard.up(k); held.delete(k); }
    for (const k of want) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); }
  }
  await page.waitForTimeout(60);
}
console.log(JSON.stringify(shots), 'errors', t.errors);
await t.close();
