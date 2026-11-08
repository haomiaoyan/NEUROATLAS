#!/usr/bin/env node
/* 诊断 v3：dev 上点击开关为什么无效。抓 console/pageerror，细粒度追踪 checked 与 theme 变化 */
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
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') console.log(`[console.${m.type()}]`, m.text().slice(0, 200));
});
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));

await page.setViewport({ width: 1280, height: 800 });
await page.evaluateOnNewDocument(() => localStorage.removeItem('neuroatlas-theme'));
await page.goto(BASE, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 800));

const probe = () =>
  page.evaluate(() => ({
    checked: document.querySelector('.theme-switch__checkbox')?.checked,
    theme: document.documentElement.dataset.theme,
    reactRoot: !!document.getElementById('root')?.childElementCount,
  }));

console.log('点击前:', JSON.stringify(await probe()));

/* 路径 A：puppeteer 点 label 中心 */
await page.click('.theme-switch');
await new Promise((r) => setTimeout(r, 400));
console.log('A: 点 label 中心后:', JSON.stringify(await probe()));

/* 路径 B：直接点 checkbox 本体 */
await page.evaluate(() => document.querySelector('.theme-switch__checkbox').click());
await new Promise((r) => setTimeout(r, 400));
console.log('B: 直接 click() checkbox 后:', JSON.stringify(await probe()));

/* 路径 C：派发 change 事件 */
await page.evaluate(() => {
  const el = document.querySelector('.theme-switch__checkbox');
  el.checked = true;
  el.dispatchEvent(new Event('change', { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 400));
console.log('C: 手动 change 事件后:', JSON.stringify(await probe()));

/* 路径 D：React 响应检测 —— 根节点有没有 __reactContainer */
const reactInfo = await page.evaluate(() => {
  const root = document.getElementById('root');
  const keys = Object.keys(root);
  const input = document.querySelector('.theme-switch__checkbox');
  return { rootKeys: keys.slice(0, 4), inputKeys: Object.keys(input).length };
});
console.log('React 挂载信息:', JSON.stringify(reactInfo));

await browser.close();
process.exit(0);
