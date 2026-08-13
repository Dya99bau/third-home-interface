import puppeteer from 'puppeteer-core';

const errors = [];
const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
});
const page = await browser.newPage();
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
page.on('requestfailed', (req) => errors.push(`[requestfailed] ${req.url()} - ${req.failure()?.errorText}`));
page.on('response', (res) => {
  if (res.status() >= 400) errors.push(`[http ${res.status()}] ${res.url()}`);
});

await page.goto('http://localhost:8080/', { waitUntil: 'networkidle0' });
// default mode is already the editor/space view on fresh load - just wait for the model + decoder to settle
await new Promise((r) => setTimeout(r, 3000));

const state = await page.evaluate(() => ({
  dataMode: document.querySelector('.app')?.getAttribute('data-mode'),
  hasCanvas: !!document.querySelector('canvas'),
}));
console.log('state on fresh load:', JSON.stringify(state));
console.log('--- errors ---');
console.log(errors.length ? errors.join('\n') : 'none');
await browser.close();
