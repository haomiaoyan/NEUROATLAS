#!/usr/bin/env node
/* 诊断 v5：白色来源判定
   A) 隐藏 .hero__swarm → 白块消失则白色是 SwarmCursor canvas 画的
   B) gl.isContextLost() → StrictMode 双挂载 loseContext 嫌疑
   C) RO 触发计数 → resize 后 canvas.width 是否更新 */
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
await new Promise((r) => setTimeout(r, 800));
await page.click('.theme-switch');
await new Promise((r) => setTimeout(r, 800));

/* 挂 RO 探针 */
await page.evaluate(() => {
  window.__roCount = 0;
  const swarm = document.querySelector('.hero__swarm');
  const ro = new ResizeObserver(() => { window.__roCount++; });
  ro.observe(swarm);
});

await page.setViewport({ width: 1400, height: 900 });
await new Promise((r) => setTimeout(r, 1200));

const probe = await page.evaluate(() => {
  const canvas = document.querySelector('.swarm-cursor-canvas');
  const gl = canvas.getContext('webgl2');
  return {
    roCount: window.__roCount,
    canvasW: canvas.width,
    cssW: canvas.clientWidth,
    contextLost: gl ? gl.isContextLost() : 'no-gl',
  };
});
console.log('拉大后探针:', JSON.stringify(probe));

/* A 实验：隐藏 swarm 容器，量 hero 亮度 */
const lum = () =>
  page.evaluate(async () => {
    const hero = document.querySelector('[data-hero]');
    const box = hero.getBoundingClientRect().toJSON();
    /* page.screenshot 在 evaluate 里拿不到，返回标记，由外部截图 */
    return box;
  });
const box = await lum();
const shot = async (name) => {
  const b64 = await page.screenshot({ encoding: 'base64', clip: box });
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
console.log('hero 平均亮度（swarm 可见）:', (await shot()).toFixed(1));
await page.evaluate(() => { document.querySelector('.hero__swarm').style.display = 'none'; });
await new Promise((r) => setTimeout(r, 300));
console.log('hero 平均亮度（swarm 隐藏）:', (await shot()).toFixed(1));
await page.evaluate(() => { document.querySelector('.hero__swarm').style.display = ''; });

await browser.close();
process.exit(0);
