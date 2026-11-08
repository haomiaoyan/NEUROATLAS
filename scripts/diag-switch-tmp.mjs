import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--disable-gpu','--enable-unsafe-swiftshader','--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://127.0.0.1:4174/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 500));
const info = await page.evaluate(() => {
  const el = document.querySelector('.theme-switch');
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const top = document.elementFromPoint(cx, cy);
  return {
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    display: cs.display, visibility: cs.visibility, pointerEvents: cs.pointerEvents,
    topAtCenter: top ? top.tagName + '.' + String(top.className).slice(0, 40) : 'none',
    inViewport: r.top >= 0 && r.bottom <= innerHeight,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
