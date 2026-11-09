const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const web = process.env.TEST_WEB_URL;
    const api = process.env.TEST_API_URL;
    await page.goto(web + '/sign-in');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await page.getByLabel('Email', { exact: true }).fill('customer@example.test');
    await page.getByRole('button', { name: 'Send reset code', exact: true }).click();
    await page.getByLabel('Reset code', { exact: true }).waitFor();
    const messages = await (await fetch(process.env.TEST_MAIL_URL)).json();
    const code = messages.at(-1).htmlContent.match(/<strong>(\d{6})<\/strong>/)[1];
    await page.getByLabel('Reset code', { exact: true }).fill(code);
    await page.getByLabel('New password', { exact: true }).fill('Browser-password-123');
    await page.getByLabel('Confirm new password', { exact: true }).fill('Mismatch-password-123');
    await page.getByRole('button', { name: 'Reset password', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Your passwords do not match.' }).waitFor();
    await page.getByLabel('Confirm new password', { exact: true }).fill('Browser-password-123');
    await page.getByRole('button', { name: 'Reset password', exact: true }).click();
    await page.getByRole('heading', { name: 'Password updated', exact: true }).waitFor();
    await page.getByRole('link', { name: 'Back to sign in' }).click();
    const login = await page.request.post(api + '/api/Auth/login', {
      data: { email: 'customer@example.test', password: 'Browser-password-123' },
    });
    assert.equal(login.status(), 200);
    // Isolate the public tracking path so a fallback account request cannot hide dropped IDs.
    await page.route('**/api/Order/user/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.goto(web + '/tracking?order=FEATURE-DELIVERED');
    await page.getByRole('button', { name: 'View All Items', exact: true }).click();
    await page.getByRole('button', { name: 'Leave a review', exact: true }).click();
    await page.locator('textarea').fill('Great shirt');
    const response = page.waitForResponse(r => r.url() === api + '/api/Review' && r.request().method() === 'POST');
    await page.getByRole('button', { name: /submit review/i }).click();
    assert.equal((await response).status(), 201);
    assert.equal(await page.getByText('Missing item reference IDs.', { exact: true }).count(), 0);
    console.log('PASS: browser password reset, mismatch validation, new-password login and tracking review submission');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
