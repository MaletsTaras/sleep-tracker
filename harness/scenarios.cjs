const { open, shot } = require('./lib.cjs');

const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
const lensRect = (page) => page.evaluate(() => { const bar = [...document.querySelectorAll('[role=tablist]')].pop(); const r = bar.children[0].getBoundingClientRect(); const b = bar.getBoundingClientRect(); return { x: r.x - b.x, w: r.width, h: r.height, barW: b.width, barX: b.x, barY: b.y, barH: b.height }; });
const pagerLeft = (page) => page.evaluate(() => document.querySelector('[data-scroll=x]').scrollLeft);
const tabCenter = (page, label) => page.evaluate((l) => { const r = [...document.querySelectorAll('[role=tablist]')].pop().querySelector(`[role=tab][aria-label="${l}"]`).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, label);

(async () => {
  const { browser, page, logs } = await open({ query: 'seed=demo' });
  const W = 390;

  // --- A. тап по вкладці
  let before = await lensRect(page);
  await (await page.$('[role=tab][aria-label="Статистика"]')).click();
  await page.waitForTimeout(1200);
  let left = await pagerLeft(page);
  let after = await lensRect(page);
  check('тап «Статистика» гортає листок на 1 сторінку', Math.abs(left - W) < 2, `scrollLeft=${left}`);
  check('лінза поїхала вправо й стала на вкладку', after.x > before.x + 50, `x ${before.x.toFixed(1)} → ${after.x.toFixed(1)}`);
  const sel = await page.evaluate(() => [...[...document.querySelectorAll('[role=tablist]')].pop().querySelectorAll('[role=tab]')].map((e) => e.getAttribute('aria-selected')));
  check('aria-selected лише в активної вкладки', sel.join() === 'false,true,false,false', sel.join());
  await shot(page, '02-stats-week');

  // --- B. проміжне положення (як посеред свайпу)
  await page.evaluate((w) => document.querySelector('[data-scroll=x]').scrollTo({ left: w * 1.5, behavior: 'instant' }), W);
  await page.waitForTimeout(150);
  await shot(page, '03-mid-swipe');
  const mid = await lensRect(page);
  check('посеред переходу лінза розтягується', mid.w > before.w * 1.08, `ширина ${before.w.toFixed(1)} → ${mid.w.toFixed(1)}`);
  await page.evaluate((w) => document.querySelector('[data-scroll=x]').scrollTo({ left: w, behavior: 'instant' }), W);
  await page.waitForTimeout(600);

  // --- C. перетягування лінзи пальцем: від «Статистика» до «Історія»
  const from = await tabCenter(page, 'Статистика');
  const to = await tabCenter(page, 'Історія');
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const steps = 14;
  for (let i = 1; i <= steps; i += 1) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y, { steps: 1 });
    await page.waitForTimeout(24);
    if (i === 8) await shot(page, '04-lens-drag');
  }
  const dragLens = await lensRect(page);
  check('під час перетягування лінза «надута»', dragLens.h > before.h * 1.04, `висота ${before.h.toFixed(1)} → ${dragLens.h.toFixed(1)}`);
  await page.mouse.up();
  await page.waitForTimeout(1300);
  left = await pagerLeft(page);
  check('перетягування лінзи до «Історія» гортає на сторінку 2', Math.abs(left - 2 * W) < 3, `scrollLeft=${left}`);
  await shot(page, '05-history');

  // --- D. перетягування назад на «Сьогодні» з великим змахом
  const h = await tabCenter(page, 'Історія');
  const t0 = await tabCenter(page, 'Сьогодні');
  await page.mouse.move(h.x, h.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) { await page.mouse.move(h.x + ((t0.x - h.x) * i) / 10, h.y); await page.waitForTimeout(16); }
  await page.mouse.up();
  await page.waitForTimeout(1500);
  left = await pagerLeft(page);
  check('перетягування лінзи на «Сьогодні» повертає на сторінку 0', left < 3, `scrollLeft=${left}`);

  console.log(logs.length ? 'LOGS:\n' + logs.join('\n') : 'LOGS: нічого');
  console.log(`\nПідсумок: ${results.filter(Boolean).length}/${results.length}`);
  await browser.close();
})().catch((e) => { console.error('СЦЕНАРІЙ ВПАВ:', e); process.exit(1); });
