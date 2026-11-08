#!/usr/bin/env node
/* 诊断 v4：用户路径 = 加载浅色 → 点成深色 → 拉大窗口。用 elementFromPoint 找出白色区域是谁画的 */
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
await new Promise((r) => setTimeout(r, 900));

await page.click('.theme-switch');
await new Promise((r) => setTimeout(r, 900));
const s1 = await page.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  heroBg: getComputedStyle(document.querySelector('[data-hero]')).backgroundColor,
}));
console.log('小窗口切深色后:', JSON.stringify(s1));

/* 拉大窗口 —— 用户报告的触发动作 */
await page.setViewport({ width: 1400, height: 900 });
await new Promise((r) => setTimeout(r, 1200));

const s2 = await page.evaluate(() => {
  const hero = document.querySelector('[data-hero]');
  const swarm = document.querySelector('.hero__swarm');
  const canvas = document.querySelector('.swarm-cursor-canvas');
  const tech = document.querySelector('.tech-text-canvas');
  const probe = document.elementFromPoint(700, 450);
  const cs = probe ? getComputedStyle(probe) : null;
  return {
    theme: document.documentElement.dataset.theme,
    heroBg: getComputedStyle(hero).backgroundColor,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    swarmBox: swarm ? swarm.getBoundingClientRect().toJSON() : null,
    swarmPos: swarm ? getComputedStyle(swarm).position : null,
    webglCanvas: canvas
      ? { w: canvas.width, h: canvas.height, cssW: canvas.clientWidth, cssH: canvas.clientHeight }
      : null,
    techCanvas: tech ? { w: tech.width, h: tech.height } : null,
    probeAt700x450: probe ? `${probe.tagName}.${probe.className}`.slice(0, 80) : null,
    probeBg: cs ? cs.backgroundColor : null,
  };
});
console.log('拉大到 1400×900 后:', JSON.stringify(s2, null, 2));

await page.screenshot({ path: '.tmp/resize-dark-big.png' });
console.log('截图: .tmp/resize-dark-big.png');

/* 再缩回小窗口看是否恢复 */
await page.setViewport({ width: 900, height: 650 });
await new Promise((r) => setTimeout(r, 1000));
const s3 = await page.evaluate(() => ({
  heroBg: getComputedStyle(document.querySelector('[data-hero]')).backgroundColor,
}));
console.log('缩回 900 后:', JSON.stringify(s3));

await browser.close();
process.exit(0);
