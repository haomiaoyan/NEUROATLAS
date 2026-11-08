#!/usr/bin/env node
/* 生成 GitHub Social preview 图：1280×640（2:1），深色主题首屏 */
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = process.env.SHOT_BASE || 'http://localhost:5173/';
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
await page.setViewport({ width: 1280, height: 640 });
await page.evaluateOnNewDocument(() => localStorage.setItem('neuroatlas-theme', 'dark'));
await page.goto(BASE, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2200)); /* 等 intro 粒子聚拢、字体就位 */
await page.screenshot({ path: '.tmp/social-preview.png' });
console.log('已生成 .tmp/social-preview.png');
await browser.close();
process.exit(0);
