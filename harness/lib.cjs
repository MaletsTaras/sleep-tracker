const { chromium } = require('playwright');
const path = require('path');

const URL = 'file://' + path.join(__dirname, 'dist/index.html');

async function open({ w = 390, h = 844, query = 'seed=demo', dpr = 2 } = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${String(e).slice(0, 400)}`));
  await page.goto(`${URL}?${query}`);
  await page.waitForTimeout(1200);
  return { browser, page, logs };
}
const shot = (page, name) => page.screenshot({ path: path.join(__dirname, 'shots', `${name}.png`) });
module.exports = { open, shot };
