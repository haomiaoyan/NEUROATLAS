#!/usr/bin/env node
/* neuroatlas · B0 验收脚本
   口径见 docs/plan-大脑神经.md §五：
   - 两主题（light/dark）× 视口（1280/375）
   - 断言：data-theme 生效、双主题背景不同、正文对比度 ≥4.5、无横向溢出、
           数据色两主题相同、切换持久化、webgl2 可用性前置检查
   - 坑 #12：触摸断言独立进程（B0 无触摸断言，留桩）
   - 坑 #14：preview 加 --host 0.0.0.0
   - 坑 #15：vite build 的 TEMP/TMP 指到项目内 .tmp */

import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}/`;
const THEMES = ['light', 'dark'];
const VIEWPORTS = [1280, 375];

const results = [];
let failed = 0;
function record(id, ok, detail) {
  results.push({ id, ok, detail });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${detail}`);
}
function skip(id, detail) {
  results.push({ id, ok: null, detail });
  console.log(`SKIP  ${id}  ${detail}`);
}

/* ---------- 坑 #15：TEMP/TMP 指到项目内 ---------- */
const tmpDir = path.join(ROOT, '.tmp');
mkdirSync(tmpDir, { recursive: true });
const childEnv = { ...process.env, TEMP: tmpDir, TMP: tmpDir };

/* ---------- build ---------- */
if (!process.argv.includes('--no-build')) {
  console.log('→ vite build（TEMP/TMP → .tmp）');
  const r = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
    cwd: ROOT,
    env: childEnv,
    stdio: 'inherit',
  });
  record('build', r.status === 0, r.status === 0 ? 'vite build 成功' : 'vite build 失败');
  if (r.status !== 0) {
    writeReport();
    process.exit(1);
  }
}

/* ---------- preview server（坑 #14：--host 0.0.0.0） ---------- */
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--host', '0.0.0.0', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, env: childEnv, stdio: 'pipe' },
);

async function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(BASE, resolve);
        req.on('error', reject);
        req.setTimeout(1000, () => req.destroy(new Error('timeout')));
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return false;
}

/* ---------- Chrome 查找 ---------- */
function findChrome() {
  const candidates = [
    process.env.NEUROATLAS_CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p));
}

/* ---------- 对比度（WCAG） ---------- */
function parseColor(c) {
  const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
}
function luminance(rgb) {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}
function contrastRatio(a, b) {
  const A = parseColor(a);
  const B = parseColor(b);
  if (!A || !B) return -1;
  const l1 = luminance(A);
  const l2 = luminance(B);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/* ---------- 主流程 ---------- */
const ready = await waitForServer(20000);
if (!ready) {
  record('server', false, 'preview 20s 内未就绪');
  writeReport();
  server.kill();
  process.exit(1);
}
record('server', true, `preview 就绪 ${BASE}`);

const executablePath = findChrome();
if (!executablePath) {
  skip('browser', '未找到 Chrome/Edge，设置 NEUROATLAS_CHROME 后重跑');
  writeReport();
  server.kill();
  process.exit(2);
}

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--disable-gpu', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage();

/* webgl2 前置检查（计划 §五.9）——B0 无 hero，仅记录可用性 */
await page.goto(BASE, { waitUntil: 'networkidle0' });
const webgl2 = await page.evaluate(() => {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2'));
  } catch {
    return false;
  }
});
if (webgl2) record('webgl2-available', true, 'webgl2 可用');
else skip('webgl2-available', 'webgl2 不可用，B1 起 hero 断言将按 SKIP 处理');

const evaluate = (fn, ...args) => page.evaluate(fn, ...args);

async function loadWithTheme(theme) {
  await page.evaluateOnNewDocument((t) => localStorage.setItem('neuroatlas-theme', t), theme);
  await page.goto(BASE, { waitUntil: 'networkidle0' });
}

async function getEffectiveBg(elHandle) {
  return evaluate((el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const b = getComputedStyle(node).backgroundColor;
      if (b && b !== 'transparent' && !b.startsWith('rgba(0, 0, 0, 0)')) return b;
      node = node.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  }, elHandle);
}

const bgByTheme = {};
const dataColorsByTheme = {};

for (const theme of THEMES) {
  await loadWithTheme(theme);
  await page.setViewport({ width: 1280, height: 800 });

  const attr = await evaluate(() => document.documentElement.dataset.theme);
  record(`data-theme:${theme}`, attr === theme, `data-theme=${attr}`);

  bgByTheme[theme] = await evaluate(() => getComputedStyle(document.body).backgroundColor);

  const colorHandle = await page.$('[data-contrast="body"]');
  const textColor = await evaluate((el) => getComputedStyle(el).color, colorHandle);
  const bg = await getEffectiveBg(colorHandle);
  const ratio = contrastRatio(textColor, bg);
  record(`contrast:${theme}`, ratio >= 4.5, `正文对比度 ${ratio.toFixed(2)}（≥4.5）`);

  const overflow = await evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  record(`overflow-1280:${theme}`, overflow.sw <= overflow.cw + 1, `scrollWidth ${overflow.sw} ≤ ${overflow.cw}+1`);

  dataColorsByTheme[theme] = await evaluate(() =>
    Array.from({ length: 7 }, (_, i) =>
      getComputedStyle(document.documentElement).getPropertyValue(`--data-${i + 1}`).trim(),
    ),
  );
}

record(
  'bg-differ',
  bgByTheme.light !== bgByTheme.dark,
  `light ${bgByTheme.light} vs dark ${bgByTheme.dark}`,
);

const colorsEqual = JSON.stringify(dataColorsByTheme.light) === JSON.stringify(dataColorsByTheme.dark);
record(
  'data-colors-theme-independent',
  colorsEqual && dataColorsByTheme.light.every((c) => c.startsWith('#')),
  colorsEqual ? '7 个数据色两主题相同（D8）' : `不一致: ${JSON.stringify(dataColorsByTheme)}`,
);

/* 切换持久化：light 起步 → 点击开关 → 重载仍为 dark */
await loadWithTheme('light');
await page.click('.theme-switch');
await new Promise((r) => setTimeout(r, 300));
const stored = await evaluate(() => localStorage.getItem('neuroatlas-theme'));
record('switch-writes-storage', stored === 'dark', `localStorage=${stored}`);
/* 不能在本页 reload：evaluateOnNewDocument 会在 reload 时再次注入并覆盖 localStorage。
   用新开页面模拟真实用户（localStorage 已由应用写入，无测试注入）。 */
const page2 = await browser.newPage();
await page2.setViewport({ width: 1280, height: 800 });
await page2.goto(BASE, { waitUntil: 'networkidle0' });
const attrAfter = await page2.evaluate(() => document.documentElement.dataset.theme);
await page2.close();
record('persist-after-reload', attrAfter === 'dark', `新页面 data-theme=${attrAfter}`);

/* 主题切换后 hero 实际像素（用户报告过 dev 下 hero 背景不跟随的异常，此处为永久回归断言）。
   当前主页处于 dark（persist 测试后）。 */
const heroState = () =>
  evaluate(() => {
    const bg = getComputedStyle(document.querySelector('[data-hero]')).backgroundColor;
    const c = document.querySelector('.tech-text-canvas');
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let light = 0, dark = 0;
    for (let i = 0; i < d.length; i += 16) {
      if (d[i + 3] > 40) {
        const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        if (lum > 128) light++; else dark++;
      }
    }
    const m = bg.match(/(\d+),\s*(\d+),\s*(\d+)/);
    const bgLum = 0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3];
    return { bgLum, light, dark };
  });
const darkHero = await heroState();
record(
  'hero-pixels-dark',
  darkHero.bgLum < 80 && darkHero.light > darkHero.dark * 2,
  `hero 背景亮度 ${darkHero.bgLum.toFixed(0)}（<80），字形浅色 ${darkHero.light} vs 深色 ${darkHero.dark}`,
);
await page.click('.theme-switch');
await new Promise((r) => setTimeout(r, 900));
const lightHero = await heroState();
record(
  'hero-pixels-light',
  lightHero.bgLum > 160 && lightHero.dark > lightHero.light * 2,
  `hero 背景亮度 ${lightHero.bgLum.toFixed(0)}（>160），字形深色 ${lightHero.dark} vs 浅色 ${lightHero.light}`,
);

/* 375 视口溢出（两主题） */
for (const theme of THEMES) {
  await loadWithTheme(theme);
  await page.setViewport({ width: 375, height: 720 });
  const overflow = await evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  record(`overflow-375:${theme}`, overflow.sw <= overflow.cw + 1, `scrollWidth ${overflow.sw} ≤ ${overflow.cw}+1`);
}

/* 3 个 spot 实测（D5，记录数据不做修正） */
await loadWithTheme('light');
const spots = await evaluate(() =>
  Array.from(document.querySelectorAll('.theme-switch__moon .theme-switch__spot'), (el) => {
    const cs = getComputedStyle(el);
    return { w: cs.width, h: cs.height, top: cs.top, left: cs.left };
  }),
);
record(
  'theme-switch-spots',
  spots.length === 3 && spots.every((s) => parseFloat(s.w) > 0),
  `3 个 spot 实测: ${JSON.stringify(spots)}`,
);

/* ===================== B1 · Hero ===================== */

/* 截图 → 页内解码 → 统计与 hero 背景差异超阈值的像素数。
   页内解码的原因：SwarmCursor 未开 preserveDrawingBuffer，readPixels 只会读到空缓冲（11111.md:1611-1617）。 */
async function countHeroPixels() {
  const hero = await page.$('[data-hero]');
  const box = await hero.boundingBox();
  const b64 = await page.screenshot({ encoding: 'base64', clip: box });
  return evaluate(async (src) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const bg = getComputedStyle(document.querySelector('[data-hero]')).backgroundColor;
    const m = bg.match(/(\d+),\s*(\d+),\s*(\d+)/);
    const br = +m[1], bgc = +m[2], bb = +m[3];
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - br) + Math.abs(d[i + 1] - bgc) + Math.abs(d[i + 2] - bb) > 24) n++;
    }
    return n;
  }, b64);
}

for (const theme of THEMES) {
  await loadWithTheme(theme);
  await page.setViewport({ width: 1280, height: 800 });
  await new Promise((r) => setTimeout(r, 800)); /* 等 intro 粒子就位 */

  /* 1) hero 画布有内容（SwarmCursor + TechText 常驻字形） */
  const px = await countHeroPixels();
  record(`hero-content:${theme}`, px >= 1500, `hero 非背景像素 ${px}（≥1500）`);

  /* 2) 交互期帧率：CDP 鼠标在 hero 内走利萨茹轨迹 10s，rAF 间隔弃前 1s 取中位数 ≤33ms */
  await evaluate(() => {
    window.__raf = [];
    const loop = (t) => {
      window.__raf.push(t);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  const heroBox = await (await page.$('[data-hero]')).boundingBox();
  const cx = heroBox.x + heroBox.width / 2;
  const cy = heroBox.y + heroBox.height / 2;
  const rx = Math.min(300, heroBox.width * 0.3);
  const ry = Math.min(160, heroBox.height * 0.25);
  for (let i = 0; i < 100; i++) {
    const a = (i / 100) * Math.PI * 4;
    await page.mouse.move(cx + rx * Math.sin(a), cy + ry * Math.sin(2 * a), { steps: 2 });
    await new Promise((r) => setTimeout(r, 100));
  }
  const stats = await evaluate(() => {
    const ts = window.__raf;
    const cutoff = ts[0] + 1000;
    const gaps = [];
    for (let i = 1; i < ts.length; i++) {
      if (ts[i] >= cutoff) gaps.push(ts[i] - ts[i - 1]);
    }
    gaps.sort((a, b) => a - b);
    return { n: gaps.length, median: gaps.length ? gaps[Math.floor(gaps.length / 2)] : -1 };
  });
  record(
    `raf-median:${theme}`,
    stats.median > 0 && stats.median <= 33 && stats.n >= 300,
    `${stats.n} 帧，中位间隔 ${stats.median}ms（≤33ms）`,
  );

  /* 3) TechText 指针离开后停帧：先证明在动，再证明停了（2D canvas 可 toDataURL） */
  await page.mouse.move(cx, cy, { steps: 4 });
  const snapA = await evaluate(() => document.querySelector('.tech-text-canvas').toDataURL());
  await new Promise((r) => setTimeout(r, 300));
  const snapB = await evaluate(() => document.querySelector('.tech-text-canvas').toDataURL());
  record(`techtext-animating:${theme}`, snapA !== snapB, '指针在场时 TechText 在重绘');

  await page.mouse.move(5, 5, { steps: 6 }); /* 移出 hero（到顶部导航区） */
  await new Promise((r) => setTimeout(r, 1600)); /* 等 settling 收敛（plan 预算 500ms + 裕量） */
  const idleA = await evaluate(() => document.querySelector('.tech-text-canvas').toDataURL());
  await new Promise((r) => setTimeout(r, 400));
  const idleB = await evaluate(() => document.querySelector('.tech-text-canvas').toDataURL());
  record(`techtext-idle-stop:${theme}`, idleA === idleB, '指针离开后 TechText 停帧（画面冻结）');

  /* 4) 滚动往返无残留：hero 仍正常有粒子内容 */
  await evaluate(() => window.scrollTo(0, 2000));
  await new Promise((r) => setTimeout(r, 400));
  await evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 600));
  const pxAfter = await countHeroPixels();
  record(`scroll-residue:${theme}`, pxAfter >= 1500, `往返后 hero 非背景像素 ${pxAfter}（≥1500）`);
}

await page.setViewport({ width: 1280, height: 800 });

await browser.close();
server.kill();

console.log(failed === 0 ? '\n全部 PASS' : `\n${failed} 条 FAIL`);
writeReport();
process.exit(failed === 0 ? 0 : 1);

function writeReport() {
  writeFileSync(path.join(ROOT, '.tmp', 'verify-report.json'), JSON.stringify(results, null, 2));
}
