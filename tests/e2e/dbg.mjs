import { launch, shot, snap, waitFor } from './lib.mjs';
const t = await launch();
const { page } = t;
await waitFor(page, () => window.__AOTS__ && window.__AOTS__.snapshot().assetsReady);
await page.getByRole('button', { name: /new game/i }).first().click();
await page.getByRole('button', { name: /^Normal/ }).first().click();
let n = 0;
for (let i = 0; i < 80; i++) {
  await page.waitForTimeout(400);
  const s = await snap(page);
  if (s.dialogue && n < 3) { await shot(page, `cut-${n++}`); }
  if (s.dialogue) await page.keyboard.press('Enter');
  if (s.screen === 'world' && !s.scriptActive && !s.dialogue) break;
}
await page.waitForTimeout(800);
await shot(page, 'world-after-intro');
console.log(JSON.stringify(await page.evaluate(() => ({ s: window.__AOTS__.snapshot().screen, sim: window.__AOTS__.sim() }))));
console.log('errors', t.errors);
await t.close();
