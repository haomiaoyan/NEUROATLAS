#!/usr/bin/env node
/* 诊断 v6：DOM 解剖。有几套 hero__swarm？elementsFromPoint 全栈？逐个隐藏量亮度 */
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

const info = await page.evaluate(() => {
  const swarms = [...document.querySelectorAll('.hero__swarm')];
  const canvases = [...document.querySelectorAll('.swarm-cursor-canvas')];
  const hero = document.querySelector('[data-hero]');
  const hcs = getComputedStyle(hero);
  const stack = document.elementsFromPoint(700, 450).map((el) => {
    const cs = getComputedStyle(el);
    return `${el.tagName}.${String(el.className).slice(0, 40)} bg=${cs.backgroundColor} pos=${cs.position} z=${cs.zIndex}`;
  });
  return {
    swarmCount: swarms.length,
    canvasCount: canvases.length,
    swarmInfos: swarms.map((s) => ({
      inDoc: s.isConnected,
      rect: { w: Math.round(s.getBoundingClientRect().width), h: Math.round(s.getBoundingClientRect().height) },
      display: getComputedStyle(s).display,
    })),
    canvasInfos: canvases.map((c) => {
      const gl = c.getContext('webgl2');
      return {
        buf: `${c.width}x${c.height}`,
        css: `${c.clientWidth}x${c.clientHeight}`,
        lost: gl ? gl.isContextLost() : 'no-gl',
        visible: !!(c.offsetWidth || c.offsetHeight),
      };
    }),
    heroComputed: { height: hcs.height, bg: hcs.backgroundColor, bgImg: hcs.backgroundImage, pos: hcs.position },
    stackAt700x450: stack,
  };
});
console.log(JSON.stringify(info, null, 2));

/* 逐个隐藏量亮度 */
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
console.log('亮度·全可见:', (await brightness()).toFixed(1));
for (const [name, sel] of [
  ['隐藏 tech canvas', '.tech-text-canvas'],
  ['隐藏全部 swarm canvas', '.swarm-cursor-canvas'],
  ['隐藏 hero__inner', '.hero__inner'],
]) {
  await page.evaluate((s) => {
    document.querySelectorAll(s).forEach((el) => (el.style.visibility = 'hidden'));
  }, sel);
  await new Promise((r) => setTimeout(r, 250));
  console.log(`亮度·${name}:`, (await brightness()).toFixed(1));
  await page.evaluate((s) => {
    document.querySelectorAll(s).forEach((el) => (el.style.visibility = ''));
  }, sel);
  await new Promise((r) => setTimeout(r, 150));
}

await browser.close();
process.exit(0);
