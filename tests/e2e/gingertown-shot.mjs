// Visual smoke from a legitimately earned save, without moving or changing story state.
import { readFileSync } from 'node:fs';
import { launch, shot } from './lib.mjs';

const t = await launch({ width: 1280, height: 720, port: 4185 });
try {
  const save = readFileSync('tests/logs/saves/beat-11.json', 'utf8');
  await t.page.evaluate((text) => localStorage.setItem('aots3.cell.v1.slot0', text), save);
  await t.page.reload();
  await t.page.getByRole('button', { name: /continue/i }).first().click();
  await t.page.waitForFunction(() => window.__AOTS__?.snapshot().game?.mapId === 'gingertown' && !window.__AOTS__.snapshot().loading, null, { timeout: 30000 });
  await t.page.waitForTimeout(700);
  await shot(t.page, 'gingertown-after', 'tests/logs/screens/polish');
  const external = t.requests.filter((url) => !url.startsWith('http://127.0.0.1') && !url.startsWith('data:') && !url.startsWith('blob:'));
  console.log(JSON.stringify({ map: 'gingertown', errors: t.errors, externalRequests: external }));
  if (t.errors.length || external.length) process.exitCode = 1;
} finally {
  await t.close();
}
