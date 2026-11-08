#!/usr/bin/env node
/* 压力测试：dev 上连续切换 6 次，每次都必须翻转（回归开关竞态修复） */
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] || 'http://localhost:5173/';
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
await page.evaluateOnNewDocument(() => localStorage.setItem('neuroatlas-theme', 'light'));
await page.goto(BASE, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1000));

let failed = 0;
const expect = ['dark', 'light', 'dark', 'light', 'dark', 'light'];
for (let i = 0; i < expect.length; i++) {
  await page.click('.theme-switch');
  await new Promise((r) => setTimeout(r, 500));
  const state = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    heroBg: getComputedStyle(document.querySelector('[data-hero]')).backgroundColor,
  }));
  const ok = state.theme === expect[i];
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  第${i + 1}次点击 → 期望 ${expect[i]}，实际 ${state.theme}，heroBg=${state.heroBg}`);
}
console.log(failed === 0 ? '\n6 次切换全部正确' : `\n${failed} 次切换失败`);
await browser.close();
process.exit(failed === 0 ? 0 : 1);
