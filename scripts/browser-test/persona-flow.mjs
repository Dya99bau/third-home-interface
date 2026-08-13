import puppeteer from 'puppeteer-core';

const errors = [];
const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
});
const page = await browser.newPage();
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
page.on('requestfailed', (req) => errors.push(`[requestfailed] ${req.url()} - ${req.failure()?.errorText}`));
page.on('response', (res) => {
  if (res.status() >= 400) errors.push(`[http ${res.status()}] ${res.url()}`);
});

await page.goto('http://localhost:8080/', { waitUntil: 'networkidle0' });

// Click the "Third Home" nav tab to enter personas mode
await page.waitForSelector('.mode-btn');
const clicked1 = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('.mode-btn'));
  const btn = btns.find((b) => b.textContent.trim().toLowerCase().includes('third home') || b.textContent.trim().toLowerCase().includes('home'));
  if (btn) { btn.click(); return btn.textContent.trim(); }
  return null;
});
console.log('clicked nav button:', clicked1);
await new Promise((r) => setTimeout(r, 800));

const inPersonas = await page.evaluate(() => !!document.querySelector('.personas-root'));
console.log('personas-root visible:', inPersonas);

// Click the first persona card
const cardClicked = await page.evaluate(() => {
  const card = document.querySelector('.persona-card');
  if (card) { card.click(); return card.querySelector('.persona-card-label')?.textContent; }
  return null;
});
console.log('clicked persona card:', cardClicked);
await new Promise((r) => setTimeout(r, 500));

const detailVisible = await page.evaluate(() => !!document.querySelector('.persona-detail'));
console.log('persona-detail overlay visible:', detailVisible);

// Click "Let's begin!"
const beginClicked = await page.evaluate(() => {
  const btn = document.querySelector('.persona-begin-btn');
  if (btn) { btn.click(); return true; }
  return false;
});
console.log('clicked Lets begin:', beginClicked);
await new Promise((r) => setTimeout(r, 1200));

const editorState = await page.evaluate(() => {
  const app = document.querySelector('.app');
  return {
    dataMode: app?.getAttribute('data-mode'),
    hasCanvas: !!document.querySelector('canvas'),
    editorActiveBtn: !!document.querySelector('.mode-btn.active')?.textContent,
    activeBtnText: document.querySelector('.mode-btn.active')?.textContent?.trim(),
  };
});
console.log('post-begin state:', JSON.stringify(editorState));

// Try clicking a floor/booking cell area (raycasted 3D, so just check canvas + no crash after a click in the middle)
const box = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const r = c.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
});
if (box.w > 0) {
  await page.mouse.click(box.x, box.y);
  await new Promise((r) => setTimeout(r, 500));
}

const finalCheck = await page.evaluate(() => ({
  dataMode: document.querySelector('.app')?.getAttribute('data-mode'),
  bodyText: document.body.innerText.slice(0, 200),
}));
console.log('final state after canvas click:', JSON.stringify(finalCheck));

console.log('--- console/page errors ---');
console.log(errors.length ? errors.join('\n') : 'none');

await browser.close();
