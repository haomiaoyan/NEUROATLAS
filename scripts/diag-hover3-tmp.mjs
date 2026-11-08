import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--disable-gpu','--enable-unsafe-swiftshader','--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://127.0.0.1:4174/', { waitUntil: 'networkidle0' });
await page.evaluate(() => document.querySelector('.card-group').scrollIntoView({ block: 'center' }));
await new Promise(r => setTimeout(r, 500));
const cards = await page.$$('[data-glow-card]');
const box1 = await cards[0].boundingBox();
const cx = box1.x + box1.width / 2, cy = box1.y + box1.height / 2;
await page.mouse.move(cx, cy, { steps: 4 });
await new Promise(r => setTimeout(r, 600));
const info = await page.evaluate(([x, y]) => {
  const card = document.querySelector('[data-glow-card]');
  const top = document.elementFromPoint(x, y);
  return {
    cardTop: Math.round(card.getBoundingClientRect().top),
    topAtCenter: top ? top.tagName + '.' + String(top.className).slice(0, 40) : 'none',
    hovered: card.matches(':hover'),
    scrollY: window.scrollY,
  };
}, [cx, cy]);
console.log(JSON.stringify(info, null, 2));
await browser.close();
