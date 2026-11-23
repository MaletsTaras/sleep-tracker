const { open } = require('./lib.cjs');
(async () => {
  const { browser, page, logs } = await open({ query: 'seed=demo' });
  await page.locator('[role=tab]', { hasText: 'Параметри' }).first().click();
  await page.waitForTimeout(900);
  await page.getByText('Прибрати демонстраційні дані', { exact: true }).click();
  await page.waitForTimeout(900);
  const toast = await page.evaluate(() => (document.body.innerText.match(/Прибрано:[^\n]*/) || ['—'])[0]);
  await page.locator('[role=tab]', { hasText: 'Історія' }).first().click();
  await page.waitForTimeout(900);
  const left = await page.evaluate(() => (document.body.innerText.match(/\d+ записів?|\d+ запис[ів]*/) || ['—'])[0]);
  console.log('повідомлення:', toast, '| історія:', left, '| помилки:', logs.length ? logs.join(' / ') : 'немає');
  await browser.close();
})();
