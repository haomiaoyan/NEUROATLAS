/** 折叠仿真面板的 DOM 级验收（不截图，用可量测断言）。 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4174;
const BASE = `http://127.0.0.1:${PORT}/`;
const candidates = [
  process.env.NEUROATLAS_CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));
if (!executablePath) {
  console.error('未找到 Chrome/Edge');
  process.exit(2);
}

const tmpDir = path.join(ROOT, '.tmp');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT)], {
  cwd: ROOT,
  env: { ...process.env, TEMP: tmpDir, TMP: tmpDir },
  stdio: 'ignore',
});

const wait = async () => {
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(BASE);
      if (r.ok) return;
    } catch {
      /* 服务器尚未就绪 */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('预览服务未就绪');
};

let failed = 0;
const record = (id, ok, detail) => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${detail}`);
};

try {
  await wait();
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--disable-gpu', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  const page = await browser.newPage();

  for (const width of [1280, 375]) {
    await page.setViewport({ width, height: 800 });
    await page.goto(BASE, { waitUntil: 'networkidle0' });

    const closed = await page.$eval('details.spike-hh', (el) => !el.open);
    record(`hh-panel-closed:${width}`, closed, `默认收起=${closed}`);

    const before = await page.$eval('.spike__curve', (el) => el.getAttribute('d').length);
    record(`legacy-curve-intact:${width}`, before > 50, `原手绘曲线 d 长度=${before}`);

    await page.click('details.spike-hh > summary');
    const opened = await page.$eval('details.spike-hh', (el) => el.open);
    record(`hh-panel-open:${width}`, opened, `展开=${opened}`);

    await page.click('.spike-hh__controls button');
    const pathLen = await page.$eval('.spike-hh__curve', (el) => el.getAttribute('d').length);
    record(`hh-curve-computed:${width}`, pathLen > 200, `仿真曲线 d 长度=${pathLen}`);

    const metrics = await page.$eval('.spike-hh__metrics', (el) => el.textContent);
    record(`hh-metrics:${width}`, /峰值/.test(metrics) && /发放/.test(metrics), metrics.trim());

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    record(`hh-panel-no-overflow:${width}`, overflow <= 1, `横向溢出=${overflow}px`);
  }

  await browser.close();
} finally {
  server.kill();
}

console.log(failed === 0 ? '\n全部 PASS' : `\n${failed} 项 FAIL`);
process.exit(failed === 0 ? 0 : 1);
