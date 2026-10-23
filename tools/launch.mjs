// Starts the local server FIRST, waits until it answers, then opens the default browser.
import { exec } from 'node:child_process';
import { start } from './serve-dist.mjs';

const base = Number(process.env.PORT || 4173);
let server = null;
let port = base;
for (let i = 0; i < 10 && !server; i++) {
  port = base + i;
  try {
    server = await start(port);
  } catch (e) {
    if (e && e.code !== 'EADDRINUSE') throw e;
  }
}
if (!server) {
  console.error('Could not find a free port.');
  process.exit(1);
}
const url = `http://127.0.0.1:${port}/`;
// confirm the server really answers before opening the browser
for (let i = 0; i < 40; i++) {
  try {
    const r = await fetch(url);
    if (r.ok) break;
  } catch { /* retry */ }
  await new Promise((r) => setTimeout(r, 100));
}
console.log(`AOTS3 Cell Saga is running at ${url}  (close this window to stop)`);
if (!process.env.NO_BROWSER) exec(process.platform === 'win32' ? `start "" "${url}"` : `xdg-open "${url}"`);
