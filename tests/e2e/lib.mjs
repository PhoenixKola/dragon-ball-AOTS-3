import { chromium } from 'playwright-core';
import { start } from '../../tools/serve-dist.mjs';
import { mkdirSync } from 'node:fs';

export const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

export async function launch({ width = 1280, height = 720, port = 4180 } = {}) {
  const server = await start(port);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--enable-unsafe-swiftshader', '--use-gl=swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('request', (r) => requests.push(r.url()));
  await page.goto(`http://127.0.0.1:${port}/`);
  return { server, browser, page, errors, requests, close: async () => { await browser.close(); server.close(); } };
}

export const shot = async (page, name, dir = 'tests/logs/screens') => { mkdirSync(dir, { recursive: true }); await page.screenshot({ path: `${dir}/${name}.png` }); };
export const snap = (page) => page.evaluate(() => window.__AOTS__.snapshot());
export const waitFor = async (page, fn, timeout = 15000, arg) => page.waitForFunction(fn, arg, { timeout });
