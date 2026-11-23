const { open, shot } = require('./lib.cjs');

const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
const tab = async (page, label) => (await page.$(`[role=tablist]:last-of-type [role=tab][aria-label="${label}"]`)) || (await page.$(`[role=tab][aria-label="${label}"]`));

(async () => {
  const { browser, page, logs } = await open({ query: 'seed=demo' });

  // --- E. Статистика → Рік → «Рік у крапках»
  await (await tab(page, 'Статистика')).click();
  await page.waitForTimeout(900);
  await page.getByText('Рік', { exact: true }).click();
  await page.waitForTimeout(1600);
  const info = await page.evaluate(() => {
    const box = document.querySelector('[aria-label^="Рік у крапках"]');
    if (!box) return null;
    box.scrollIntoView({ block: 'center' });
    const svg = [...box.querySelectorAll('svg')].find((s) => s.getBoundingClientRect().width > 150);
    const r = svg.getBoundingClientRect();
    return { label: box.getAttribute('aria-label'), x: r.x, y: r.y, w: r.width, h: r.height, paths: svg.querySelectorAll('path').length };
  });
  check('блок «Рік у крапках» присутній у річному режимі', !!info, info ? info.label.slice(0, 80) : '');
  if (info) {
    await page.waitForTimeout(500);
    await shot(page, '06-year-heatmap');
    const pitch = info.w / 53;
    check('сітка має висоту 7 клітинок', Math.abs(info.h - pitch * 7) < 1.5, `h=${info.h.toFixed(1)} pitch=${pitch.toFixed(2)}`);
    check('контури груп зібрані в кілька path', info.paths >= 3 && info.paths <= 8, `path=${info.paths}`);
    // дотик до клітинки: стовпець 30, рядок 2 → середа, 29 липня
    await page.mouse.move(info.x + 30.5 * pitch, info.y + 2.5 * pitch);
    await page.mouse.down();
    await page.waitForTimeout(250);
    let text = await page.evaluate(() => document.body.innerText);
    check('дотик показує дату й тривалість', /ср, 29 лип\. · /.test(text), (text.match(/ср, 29 лип\.[^\n]*/) || ['—'])[0]);
    // проведення пальцем на 3 клітинки праворуч → 1 серпня? (+3 стовпці = +21 день → 19 серпня)
    for (let i = 1; i <= 6; i += 1) { await page.mouse.move(info.x + (30.5 + i * 0.5) * pitch, info.y + 2.5 * pitch); await page.waitForTimeout(40); }
    await page.mouse.up();
    await page.waitForTimeout(300);
    text = await page.evaluate(() => document.body.innerText);
    check('проведення пальцем змінює вибрану ніч', /ср, 19 серп\. · /.test(text), (text.match(/ср, \d+ [а-я]+\. ·[^\n]*/) || ['—'])[0]);
    await shot(page, '07-year-heatmap-selected');
    // перемикач джерела: годинник
    await page.locator('[role=tab]', { hasText: 'Годинник' }).first().click();
    await page.waitForTimeout(900);
    const nights = await page.evaluate(() => (document.querySelector('[aria-label^="Рік у крапках"]')?.getAttribute('aria-label') || '').slice(0, 60));
    check('перемикач «Годинник» перебудовує крапки', /Записано \d+ /.test(nights), nights);
    await page.locator('[role=tab]', { hasText: 'Мої записи' }).first().click();
    await page.waitForTimeout(500);
  }

  // --- F. аркуш запису: відкриття, барабан, перетягування вниз
  await (await page.$('[aria-label="Додати запис сну"]')).click();
  await page.waitForTimeout(1000);
  const sheetRect = await page.evaluate(() => {
    const m = [...document.querySelectorAll('div')].find((d) => d.style.position === 'fixed' && d.style.zIndex === '1000');
    if (!m) return null;
    const sheet = m.children[m.children.length - 1].getBoundingClientRect();
    return { x: sheet.x, y: sheet.y, w: sheet.width, h: sheet.height };
  });
  check('аркуш запису відкрився', !!sheetRect && sheetRect.h > 300, sheetRect ? `h=${sheetRect.h.toFixed(0)} y=${sheetRect.y.toFixed(0)}` : '');
  await shot(page, '08-sheet');
  if (sheetRect) {
    // центрування цифр у барабані: група «число + підпис» відносно центра колонки
    const offsets = await page.evaluate(() => {
      const out = [];
      const wheels = [...document.querySelectorAll('[aria-label="Години"], [aria-label="Хвилини"]')];
      for (const w of wheels) {
        const wr = w.getBoundingClientRect();
        const unit = [...w.querySelectorAll('div')].find((d) => /^(год|хв)$/.test(d.textContent || '') && d.children.length === 0);
        const num = [...w.querySelectorAll('div')].filter((d) => d.children.length === 0 && /^\d+$/.test(d.textContent || '')).find((d) => getComputedStyle(d).opacity === '1');
        if (!unit || !num) continue;
        const ur = unit.getBoundingClientRect();
        const range = document.createRange(); range.selectNodeContents(num);
        const nr = range.getBoundingClientRect();
        out.push({ label: w.getAttribute('aria-label'), value: num.textContent, groupCenterOffset: +(((nr.left + ur.right) / 2) - (wr.left + wr.width / 2)).toFixed(1) });
      }
      return out;
    });
    console.log('    барабан (зсув центру групи від центру колонки, px):', JSON.stringify(offsets));
    check('барабан: обидві колонки знайдено', offsets.length === 2);
    // перетягування за смужку вниз
    const hdr = await page.evaluate(() => { const r = [...document.querySelectorAll('div')].find((d) => d.textContent === 'Запис сну').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    const hx = hdr.x;
    const hy = hdr.y;
    await page.mouse.move(hx, hy);
    await page.mouse.down();
    for (let i = 1; i <= 10; i += 1) { await page.mouse.move(hx, hy + i * 28); await page.waitForTimeout(18); }
    await page.screenshot({ path: 'shots/09-sheet-dragging.png' });
    await page.mouse.up();
    await page.waitForTimeout(1200);
    const still = await page.evaluate(() => [...document.querySelectorAll('div')].some((d) => d.style.position === 'fixed' && d.style.zIndex === '1000'));
    check('потяг за смужку вниз закриває аркуш', !still);
  }

  // --- G. порада «Ще одна»
  await (await tab(page, 'Сьогодні')).click();
  await page.waitForTimeout(900);
  const tipBefore = await page.evaluate(() => document.querySelector('[aria-live=polite], [aria-label="Показати іншу пораду"]') ? document.body.innerText.match(/(Порада|Цікавий факт|Факт)[\s\S]{0,200}/)?.[0] : '');
  await (await page.$('[aria-label="Показати іншу пораду"]')).click();
  await page.waitForTimeout(900);
  const tipAfter = await page.evaluate(() => document.body.innerText.match(/(Порада|Цікавий факт|Факт)[\s\S]{0,200}/)?.[0]);
  check('«Ще одна» змінює пораду', tipBefore !== tipAfter, (tipAfter || '').replace(/\n/g, ' ').slice(0, 70));

  // --- H. демо-дані: діалог із двома варіантами
  await (await tab(page, 'Параметри')).click();
  await page.waitForTimeout(900);
  await page.getByText('Прибрати демонстраційні дані', { exact: true }).click();
  await page.waitForTimeout(300);
  const alerts = await page.evaluate(() => window.__alerts.map((a) => ({ title: a.title, buttons: a.buttons.map((b) => b.text) })));
  check('діалог видалення демо має кнопки', alerts.length === 1, JSON.stringify(alerts));
  await shot(page, '10-settings');

  console.log(logs.length ? 'LOGS:\n' + logs.join('\n') : 'LOGS: нічого');
  console.log(`\nПідсумок: ${results.filter(Boolean).length}/${results.length}`);
  await browser.close();
})().catch((e) => { console.error('СЦЕНАРІЙ ВПАВ:', e); process.exit(1); });
