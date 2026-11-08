#!/usr/bin/env node
/* 诊断 v2：直接测 DEV 服务器(5173) + 用户点击路径（light 加载 → 点击 → dark） */
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
await page.setViewport({ width: 1280, height: 800 });

/* 1) 浅色加载（清掉 localStorage） */
await page.evaluateOnNewDocument(() => localStorage.removeItem('neuroatlas-theme'));
await page.goto(BASE, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1000));
await page.screenshot({ path: '.tmp/dev-light.png' });

/* 2) 模拟用户点击开关 → 深色 */
await page.click('.theme-switch');
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: '.tmp/dev-dark.png' });

const state = await page.evaluate(() => {
  const hero = document.querySelector('[data-hero]');
  const bg = hero ? getComputedStyle(hero).backgroundColor : 'NO HERO';
  const inner = document.querySelector('.hero__inner');
  let glyph = 'NO CANVAS';
  const c = document.querySelector('.tech-text-canvas');
  if (c) {
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let light = 0, dark = 0;
    for (let i = 0; i < d.length; i += 8) {
      if (d[i + 3] > 40) {
        const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        if (lum > 128) light++; else dark++;
      }
    }
    glyph = `浅色笔画 ${light} / 深色笔画 ${dark}`;
  }
  const m = bg.match(/(\d+),\s*(\d+),\s*(\d+)/);
  const bgLum = m ? (0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3]).toFixed(0) : '?';
  return {
    theme: document.documentElement.dataset.theme,
    heroBg: bg,
    heroBgLum: bgLum,
    innerColor: inner ? getComputedStyle(inner).color : 'NO .hero__inner',
    glyphs: glyph,
  };
});
console.log('DEV 服务器 · 点击切到深色后:', JSON.stringify(state, null, 2));
console.log('截图已存: .tmp/dev-light.png 和 .tmp/dev-dark.png');

await browser.close();
process.exit(0);
