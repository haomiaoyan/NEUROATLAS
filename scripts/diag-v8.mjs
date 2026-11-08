#!/usr/bin/env node
/* 诊断 v8：JPEG 排除透明干扰 + 读回隐藏是否生效 + 逐元素删除锁定白色画手 */
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = 'http://localhost:5173/';
const chrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--disable-gpu', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 650 });
await page.evaluateOnNewDocument(() => localStorage.setItem('neuroatlas-theme', 'light'));
await page.goto(BASE, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 700));
await page.click('.theme-switch');
await new Promise((r) => setTimeout(r, 700));
await page.setViewport({ width: 1400, height: 900 });
await new Promise((r) => setTimeout(r, 1200));

const heroBox = await page.evaluate(() => document.querySelector('[data-hero]').getBoundingClientRect().toJSON());
const brightness = async (type) => {
  const clip = { x: heroBox.x, y: heroBox.y, width: Math.round(heroBox.width), height: Math.round(heroBox.height) };
  const b64 =
    type === 'jpeg'
      ? await page.screenshot({ type: 'jpeg', quality: 80, clip, encoding: 'base64' })
      : await page.screenshot({ clip, encoding: 'base64' });
  return page.evaluate(async (src) => {
    const img = new Image();
    img.src = 'data:image/' + (src.startsWith('/') ? 'jpeg' : 'png') + ';base64,' + src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let sum = 0, n = 0, transparent = 0;
    for (let i = 0; i < d.length; i += 40) {
      if (d[i + 3] < 250) transparent++;
      sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      n++;
    }
    return { lum: (sum / n).toFixed(1), transparentPct: ((transparent / n) * 100).toFixed(1) };
  }, b64);
};

console.log('PNG:', JSON.stringify(await brightness('png')));
console.log('JPEG:', JSON.stringify(await brightness('jpeg')));

/* 逐元素 REMOVE（不是 hide），每次读回确认 */
const steps = [
  ['swarm canvas', '.swarm-cursor-canvas'],
  ['tech canvas', '.tech-text-canvas'],
  ['swarm 容器', '.hero__swarm'],
  ['hero__inner', '.hero__inner'],
  ['hero__boundary', '.hero__boundary'],
];
for (const [name, sel] of steps) {
  const r = await page.evaluate((s) => {
    const els = [...document.querySelectorAll(s)];
    els.forEach((el) => el.remove());
    return els.length;
  }, sel);
  await new Promise((r2) => setTimeout(r2, 350));
  const b = await brightness('png');
  console.log(`删除 ${name}（命中 ${r} 个）后:`, JSON.stringify(b));
}

await browser.close();
process.exit(0);
