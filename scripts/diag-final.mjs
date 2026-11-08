#!/usr/bin/env node
/* 诊断 v7：终局。逐阶段追踪 contextLost 时刻 + 删除法定位白色 + 强制 buffer 重分配 */
import { existsSync, writeFileSync } from 'node:fs';
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
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('neuroatlas-theme', 'light');
  /* 尽早挂 lost 事件监听 */
  window.__lostLog = [];
  const origCreate = document.createElement.bind(document);
  document.createElement = function (tag, ...rest) {
    const el = origCreate(tag, ...rest);
    if (tag === 'canvas') {
      el.addEventListener('webglcontextlost', (e) => {
        window.__lostLog.push({ t: performance.now().toFixed(0), prevented: e.defaultPrevented });
      });
    }
    return el;
  };
});
await page.goto(BASE, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 800));

const snap = (label) =>
  page.evaluate((l) => {
    const c = document.querySelector('.swarm-cursor-canvas');
    const gl = c?.getContext('webgl2');
    return {
      label: l,
      lost: gl ? gl.isContextLost() : 'no-gl',
      buf: c ? `${c.width}x${c.height}` : '-',
      lostLog: window.__lostLog,
    };
  }, label);

console.log('加载后:', JSON.stringify(await snap('load')));
await page.click('.theme-switch');
await new Promise((r) => setTimeout(r, 800));
console.log('点击深色后:', JSON.stringify(await snap('click')));
await page.setViewport({ width: 1400, height: 900 });
await new Promise((r) => setTimeout(r, 1200));
console.log('拉大后:', JSON.stringify(await snap('resize')));

const heroBox = await page.evaluate(() => document.querySelector('[data-hero]').getBoundingClientRect().toJSON());
const brightness = async () => {
  const b64 = await page.screenshot({ encoding: 'base64', clip: heroBox });
  return page.evaluate(async (src) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let sum = 0, n = 0;
    for (let i = 0; i < d.length; i += 40) {
      sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      n++;
    }
    return sum / n;
  }, b64);
};
console.log('亮度·初始:', (await brightness()).toFixed(1));

/* 删除 canvas（比 visibility 更彻底）+ 读回验证 */
const removed = await page.evaluate(() => {
  const c = document.querySelector('.swarm-cursor-canvas');
  const applied = (() => {
    c.remove();
    return !document.contains(c);
  })();
  return applied;
});
await new Promise((r) => setTimeout(r, 400));
console.log('canvas 已删除:', removed, '亮度·删除 swarm canvas 后:', (await brightness()).toFixed(1));

/* 删除整个 hero 的内容，只留空 hero（自身 bg 深色） */
await page.evaluate(() => {
  const hero = document.querySelector('[data-hero]');
  [...hero.childNodes].forEach((n) => n.remove());
});
await new Promise((r) => setTimeout(r, 400));
console.log('亮度·hero 清空后:', (await brightness()).toFixed(1));

await browser.close();
process.exit(0);
