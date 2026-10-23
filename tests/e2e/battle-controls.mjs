// Focused visible-HUD regression check, using the dev-only UI harness.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const port = 5201;
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { ready = (await fetch(`http://127.0.0.1:${port}/ui-harness.html`)).ok; } catch { /* starting */ }
    if (ready) break;
    await sleep(200);
  }
  if (!ready) throw new Error('UI harness did not start');
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/ui-harness.html?s=battle-input`);
  await page.getByRole('menu', { name: 'Battle commands' }).waitFor();
  const menu = page.getByRole('menu', { name: 'Battle commands' });
  const actions = () => page.evaluate(() => window.__battleSubmissions);

  await menu.getByRole('button', { name: /Techniques/ }).click();
  const enabledSkill = menu.locator('.cmd-row:not(.is-disabled)').first();
  const skillName = (await enabledSkill.locator('.cmd-label').innerText()).split('\n')[0];
  await enabledSkill.click();
  await menu.getByRole('button', { name: 'Back' }).click();
  if ((await actions()).length) throw new Error('Back from targeting submitted a command');
  await menu.getByRole('button', { name: new RegExp(skillName, 'i') }).first().click();
  if (await menu.locator('.target-chip').count()) await menu.locator('.target-chip').first().click();
  const skillAction = (await actions()).at(-1);
  if (skillAction?.kind !== 'skill') throw new Error(`Technique did not submit through HUD: ${JSON.stringify(skillAction)}`);

  await menu.getByRole('button', { name: /Items/ }).click();
  await menu.getByRole('button', { name: /Senzu Fragment/ }).click();
  await menu.locator('.target-chip').first().click();
  const itemAction = (await actions()).at(-1);
  if (itemAction?.kind !== 'item' || itemAction.itemId !== 'senzu_small' || !itemAction.targetUid) throw new Error(`Item targeting failed: ${JSON.stringify(itemAction)}`);

  await menu.getByRole('button', { name: /^Attack/ }).click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  const attackAction = (await actions()).at(-1);
  if (attackAction?.kind !== 'attack' || attackAction.targetUid !== 'e:1:cell-probe') throw new Error(`Keyboard target selection failed: ${JSON.stringify(attackAction)}`);
  if (errors.length) throw new Error(`Page errors: ${errors.join('; ')}`);
  console.log('PASS visible battle technique, item, back, and keyboard target controls');
} finally {
  await browser?.close();
  vite.kill();
}
