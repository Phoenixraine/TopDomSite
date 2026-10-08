// usage: node shoot.mjs out.png "house=barn&w=2000&h=1400"
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const jobs = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (let i = 0; i < jobs.length; i += 2) {
  const [out, q] = [jobs[i], jobs[i + 1]];
  const p = new URLSearchParams(q);
  const page = await browser.newPage({ viewport: { width: +p.get('w') || 2000, height: +p.get('h') || 1400 } });
  page.on('console', m => console.log('[console]', m.text()));
  page.on('pageerror', e => console.log('[err]', e.message));
  await page.goto('http://127.0.0.1:8123/render.html?' + q);
  await page.waitForFunction(() => window.__done, null, { timeout: 300000 });
  const data = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
  fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
  console.log('wrote', out);
  await page.close();
}
await browser.close();
