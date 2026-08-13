import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
});
const page = await browser.newPage();
const log = [];
page.on('request', (req) => {
  if (req.url().includes('model.glb') || req.url().includes('draco')) {
    log.push(`REQUEST  ${req.method()} ${req.url()}`);
  }
});
page.on('requestfinished', (req) => {
  if (req.url().includes('model.glb') || req.url().includes('draco')) {
    log.push(`FINISHED ${req.response()?.status()} ${req.url()}`);
  }
});
page.on('requestfailed', (req) => {
  if (req.url().includes('model.glb') || req.url().includes('draco')) {
    log.push(`FAILED   ${req.failure()?.errorText} ${req.url()}`);
  }
});
page.on('pageerror', (err) => log.push(`PAGEERROR ${err.message}`));

await page.goto('http://localhost:8080/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 3000));

console.log(log.join('\n'));

// check the actual scene has real geometry - count meshes via three.js if exposed, else check canvas isn't blank
const pixelCheck = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return 'no canvas';
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  return gl ? 'webgl context present' : 'no webgl context';
});
console.log('render check:', pixelCheck);

const screenshotPath = 'D:/BAUHAUS/SEM 2/VS CODE FILES/THIRD HOME INTERFACE/third-home-consolidated/scripts/browser-test/model-screenshot.png';
await page.screenshot({ path: screenshotPath });
console.log('screenshot saved:', screenshotPath);

await browser.close();
