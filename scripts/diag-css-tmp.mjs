import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--disable-gpu','--enable-unsafe-swiftshader','--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0,150)); });
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0,150)));
await page.goto('http://127.0.0.1:4174/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 500));
const info = await page.evaluate(() => {
  let found = null;
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = [...sheet.cssRules]; } catch { continue; }
    const hit = rules.find(r => r.selectorText === '.theme-switch');
    if (hit) found = { display: hit.style.display, rulesInSheet: rules.length };
  }
  const label = document.querySelector('.theme-switch');
  return {
    sheets: document.styleSheets.length,
    themeSwitchRule: found,
    labelClass: label ? label.className : 'NO LABEL',
    labelDisplay: label ? getComputedStyle(label).display : '-',
    labelParentChain: (() => { let c = [], n = label; while (n && n !== document.body) { c.push(n.tagName + '.' + String(n.className).slice(0, 25)); n = n.parentElement; } return c.join(' < '); })(),
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
