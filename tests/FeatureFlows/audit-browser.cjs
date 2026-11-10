const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const login = await page.request.post(process.env.TEST_API_URL + '/api/Auth/login', {
      data: { email: 'admin@example.test', password: 'Browser-password-123' },
    });
    assert.equal(login.status(), 200);
    await page.goto(process.env.TEST_ADMIN_URL + '/audit');
    await page.getByRole('heading', { name: 'Audit log', exact: true }).waitFor();
    await page.getByText('ORDER UPDATED', { exact: true }).waitFor();
    await page.getByLabel('Action type', { exact: true }).selectOption('Orders');
    await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
    await page.getByText('ORDER UPDATED', { exact: true }).waitFor();
    assert.equal(await page.getByText('LOGIN PASSWORD', { exact: true }).count(), 0);
    await page.getByText('View details', { exact: true }).first().click();
    await page.locator('pre').filter({ hasText: 'Delivered' }).waitFor();
    console.log('PASS: admin audit page, typed filtering and before/after details in browser');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
