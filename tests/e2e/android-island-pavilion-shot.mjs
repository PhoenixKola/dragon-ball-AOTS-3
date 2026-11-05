// Visual QA fixture: an earned save is positioned on Android Island to inspect the generated pavilion in Phaser.
import { readFileSync } from 'node:fs';
import { launch, shot } from './lib.mjs';

const t = await launch({ width: 1280, height: 720, port: 4189 });
try {
  const envelope = JSON.parse(readFileSync('tests/logs/saves/beat-17.json', 'utf8'));
  const state = JSON.parse(envelope.body);
  state.mapId = 'android_island';
  state.x = 32 * 33 + 16;
  state.y = 32 * 15 + 16;
  envelope.body = JSON.stringify(state);
  let hash = 2166136261;
  for (let i = 0; i < envelope.body.length; i++) hash = Math.imul(hash ^ envelope.body.charCodeAt(i), 16777619);
  envelope.checksum = (hash >>> 0).toString(16).padStart(8, '0');
  await t.page.evaluate((text) => localStorage.setItem('aots3.cell.v1.slot0', text), JSON.stringify(envelope));
  await t.page.reload();
  await t.page.waitForFunction(() => window.__AOTS__?.snapshot().assetsReady, null, { timeout: 30000 });
  await t.page.getByRole('button', { name: /continue/i }).first().click();
  await t.page.waitForFunction(() => window.__AOTS__?.snapshot().game?.mapId === 'android_island' && !window.__AOTS__.snapshot().loading, null, { timeout: 30000 });
  await t.page.waitForTimeout(700);
  await shot(t.page, 'android-island-pavilion-v2', 'tests/logs/screens/world-refresh');
  const external = t.requests.filter((url) => !url.startsWith('http://127.0.0.1') && !url.startsWith('data:') && !url.startsWith('blob:'));
  console.log(JSON.stringify({ testOnlyFixture: 'earned beat-17 save adapted to android_island', map: 'android_island', prop: 'pavilion', errors: t.errors, externalRequests: external }));
  if (t.errors.length || external.length) process.exitCode = 1;
} finally {
  await t.close();
}
