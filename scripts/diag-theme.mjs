#!/usr/bin/env node
/* 诊断：深色模式下 hero 区域的实际渲染状态（用户报告：背景仍浅、标题变灰） */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4174;
const BASE = `http://127.0.0.1:${PORT}/`;

const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--host', '0.0.0.0', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: 'ignore' },
);
await new Promise((resolve, reject) => {
  const deadline = Date.now() + 15000;
  const poll = () => {
    http.get(BASE, resolve).on('error', () => (Date.now() < deadline ? setTimeout(poll, 250) : reject(new Error('server'))));
  };
  poll();
});

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
await page.setViewport({ width: 1280, height: 800 });
await page.evaluateOnNewDocument(() => localStorage.setItem('neuroatlas-theme', 'dark'));
await page.goto(BASE, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1200));

const css = await page.evaluate(() => ({
  attr: document.documentElement.dataset.theme,
  bodyBg: getComputedStyle(document.body).backgroundColor,
  heroBg: getComputedStyle(document.querySelector('[data-hero]')).backgroundColor,
  innerColor: getComputedStyle(document.querySelector('.hero__inner')).color,
  titleColor: getComputedStyle(document.querySelector('.hero__title')).color,
}));
console.log('CSS 状态:', JSON.stringify(css, null, 2));

/* TechText 画布是 2D，可直接读像素：统计字形笔画的明暗 */
const canvasInfo = await page.evaluate(() => {
  const c = document.querySelector('.tech-text-canvas');
  const ctx = c.getContext('2d');
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let dark = 0, light = 0, total = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 40) {
      total++;
      const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      if (lum > 128) light++; else dark++;
    }
  }
  return { opaquePx: total, lightPx: light, darkPx: dark };
});
console.log('TechText 画布字形像素:', JSON.stringify(canvasInfo));
console.log(
  canvasInfo.lightPx > canvasInfo.darkPx * 2
    ? '→ 字形以浅色为主（深色模式正确）'
    : '→ 字形以深色为主（BUG：深色模式下标题仍是深色笔画）',
);

/* hero 截图 → 页内解码 → 平均亮度（背景是深是浅） */
const hero = await page.$('[data-hero]');
const box = await hero.boundingBox();
const b64 = await page.screenshot({ encoding: 'base64', clip: box });
const lum = await page.evaluate(async (src) => {
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
console.log(`hero 截图平均亮度: ${lum.toFixed(1)} / 255（<80 为深底，>160 为浅底）`);

/* 点击开关切到 light，再量一次，模拟用户操作路径 */
await page.click('.theme-switch');
await new Promise((r) => setTimeout(r, 800));
const after = await page.evaluate(() => ({
  attr: document.documentElement.dataset.theme,
  heroBg: getComputedStyle(document.querySelector('[data-hero]')).backgroundColor,
}));
console.log('点击切回 light 后:', JSON.stringify(after));

await browser.close();
server.kill();
process.exit(0);
