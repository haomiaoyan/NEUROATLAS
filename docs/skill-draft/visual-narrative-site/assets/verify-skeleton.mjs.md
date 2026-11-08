# verify.mjs 骨架

可直接复制的验收脚本结构。改三处即可移植：`PORT` / `BASE`、Chrome 候选路径、断言区。

```js
#!/usr/bin/env node
/* 验收脚本
   口径：两主题 × 两视口；断言全部可脚本判定。
   三前提：preview 加 --host 0.0.0.0；Windows 的 TEMP/TMP 指到项目内；
          视口变更后用 setViewportSettled（布局是异步的）。 */

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
function writeReport() {
  writeFileSync(path.join(ROOT, '.tmp', 'verify-report.json'), JSON.stringify(results, null, 2));
}

/* Windows esbuild 临时目录 */
const tmpDir = path.join(ROOT, '.tmp');
mkdirSync(tmpDir, { recursive: true });
const childEnv = { ...process.env, TEMP: tmpDir, TMP: tmpDir };

/* build（--no-build 可跳过） */
if (!process.argv.includes('--no-build')) {
  const r = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
    cwd: ROOT, env: childEnv, stdio: 'inherit',
  });
  record('build', r.status === 0, r.status === 0 ? 'vite build 成功' : 'vite build 失败');
  if (r.status !== 0) { writeReport(); process.exit(1); }
}

/* preview（必须 --host 0.0.0.0） */
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

function findChrome() {
  return [
    process.env.SITE_CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ].filter(Boolean).find((p) => existsSync(p));
}

/* WCAG */
function parseColor(c) {
  const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
}
function luminance(rgb) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}
function contrastRatio(a, b) {
  const A = parseColor(a), B = parseColor(b);
  if (!A || !B) return -1;
  const l1 = luminance(A), l2 = luminance(B);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/* ===== 主流程 ===== */
const ready = await waitForServer(20000);
if (!ready) { record('server', false, 'preview 20s 内未就绪'); writeReport(); server.kill(); process.exit(1); }
record('server', true, `preview 就绪 ${BASE}`);

const executablePath = findChrome();
if (!executablePath) { skip('browser', '未找到 Chrome/Edge'); writeReport(); server.kill(); process.exit(2); }

const browser = await puppeteer.launch({
  executablePath, headless: true,
  args: ['--disable-gpu', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage();
const evaluate = (fn, ...args) => page.evaluate(fn, ...args);

async function loadWithTheme(theme) {
  await page.evaluateOnNewDocument((t) => localStorage.setItem('theme', t), theme);
  await page.goto(BASE, { waitUntil: 'networkidle0' });
}

/* 关键：视口变更后布局是异步的，直接读 scrollWidth 会拿到旧值 */
async function setViewportSettled(width, height = 800) {
  await page.setViewport({ width, height });
  await evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await new Promise((r) => setTimeout(r, 400));
  const read = () => evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  let prev = await read();
  for (let i = 0; i < 20; i += 1) {
    await new Promise((r) => setTimeout(r, 100));
    const cur = await read();
    if (cur.sw === prev.sw && cur.cw === prev.cw && cur.cw === width) return cur;
    prev = cur;
  }
  return prev;
}

/* ===== 断言区 ===== */
for (const theme of THEMES) {
  await loadWithTheme(theme);
  const overflow = await setViewportSettled(1280, 800);

  const attr = await evaluate(() => document.documentElement.dataset.theme);
  record(`data-theme:${theme}`, attr === theme, `data-theme=${attr}`);

  const colorHandle = await page.$('[data-contrast="body"]');
  const textColor = await evaluate((el) => getComputedStyle(el).color, colorHandle);
  const bg = await evaluate(() => getComputedStyle(document.body).backgroundColor);
  const ratio = contrastRatio(textColor, bg);
  record(`contrast:${theme}`, ratio >= 4.5, `正文对比度 ${ratio.toFixed(2)}（≥4.5）`);

  record(`overflow-1280:${theme}`, overflow.sw <= overflow.cw + 1,
    `scrollWidth ${overflow.sw} ≤ ${overflow.cw}+1`);

  const mobile = await setViewportSettled(375, 720);
  record(`overflow-375:${theme}`, mobile.sw <= mobile.cw + 1,
    `scrollWidth ${mobile.sw} ≤ ${mobile.cw}+1`);
}

await brokerCleanup();
process.exit(failed ? 1 : 0);
```

## 收尾

```js
async function brokerCleanup() {
  writeReport();
  await browser.close();
  server.kill();
}
process.on('exit', () => { try { server.kill(); } catch {} });
```

## 七个易错点

| 点 | 正确做法 |
|---|---|
| 视口切换 | 用 `setViewportSettled`，别 `setViewport` 后立刻读尺寸 |
| 主题持久化 | 新开 page 验，别在注入过 `evaluateOnNewDocument` 的页面 reload |
| 触摸/reduced-motion | 独立 page 或独立浏览器进程 |
| 截图坐标 | `boundingBox()` 是视口坐标，`screenshot({clip})` 是页面坐标，`clip.y += scrollY` |
| 状态重置 | 同 URL `goto` 会恢复滚动位置，显式 `scrollTo(0,0)` |
| 程序化滚动 | 一律 `behavior: 'instant'`（全局 smooth 会让等待失效） |
| 断言可信度 | 每条写完反向改代码确认它 FAIL，否则可能是恒真 |
