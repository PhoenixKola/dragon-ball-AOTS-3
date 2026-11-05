// Visual smoke from an earned save whose map/position are adapted only for this art fixture.
import { readFileSync } from 'node:fs';
import { launch, shot } from './lib.mjs';

const t = await launch({ width: 1280, height: 720, port: 4186 });
try {
  const envelope = JSON.parse(readFileSync('tests/logs/saves/beat-11.json', 'utf8'));
  const state = JSON.parse(envelope.body);
  state.mapId = 'mountain_lab';
  state.x = 22 * 32 + 16;
  state.y = 18 * 32 + 30;
  envelope.body = JSON.stringify(state);
  let hash = 2166136261;
  for (let i = 0; i < envelope.body.length; i++) hash = Math.imul(hash ^ envelope.body.charCodeAt(i), 16777619);
  envelope.checksum = (hash >>> 0).toString(16).padStart(8, '0');
  await t.page.evaluate((text) => localStorage.setItem('aots3.cell.v1.slot0', text), JSON.stringify(envelope));
  await t.page.reload();
  await t.page.waitForFunction(() => window.__AOTS__?.snapshot().assetsReady, null, { timeout: 30000 });
  await t.page.getByRole('button', { name: /continue/i }).first().click();
  await t.page.waitForFunction(() => window.__AOTS__?.snapshot().game?.mapId === 'mountain_lab' && !window.__AOTS__.snapshot().loading, null, { timeout: 30000 });
  await t.page.waitForTimeout(700);
  await shot(t.page, 'mountain-lab-broken-weather-monitor', 'tests/logs/screens/world-refresh');
  const external = t.requests.filter((url) => !url.startsWith('http://127.0.0.1') && !url.startsWith('data:') && !url.startsWith('blob:'));
  console.log(JSON.stringify({ fixture: 'earned beat-11 save adapted to mountain_lab', map: 'mountain_lab', errors: t.errors, externalRequests: external }));
  if (t.errors.length || external.length) process.exitCode = 1;
} finally {
  await t.close();
}
