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

await browser.close();
server.kill();

console.log(failed === 0 ? '\n全部 PASS' : `\n${failed} 条 FAIL`);
writeReport();
process.exit(failed === 0 ? 0 : 1);

function writeReport() {
  writeFileSync(path.join(ROOT, '.tmp', 'verify-report.json'), JSON.stringify(results, null, 2));
}
