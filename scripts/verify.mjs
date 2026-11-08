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

await page.setViewport({ width: 1280, height: 800 });

/* ===================== B2 · 导航/进度条/卡片 ===================== */

/* 1) 进度条：顶部 scaleX≈0，滚动到底 ≈1（读 transform 矩阵） */
const readProgress = () =>
  evaluate(() => {
    const t = getComputedStyle(document.querySelector('.progress-bar')).transform;
    const m = /matrix\(([^)]+)\)/.exec(t);
    return m ? Number(m[1].split(',')[0]) : -1;
  });
await loadWithTheme('light');
await page.setViewport({ width: 1280, height: 800 });
const pTop = await readProgress();
await evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await new Promise((r) => setTimeout(r, 500));
const pBottom = await readProgress();
record(
  'progress-bar',
  pTop <= 0.01 && pBottom >= 0.99,
  `顶部 ${pTop.toFixed(3)}（≤0.01），底部 ${pBottom.toFixed(3)}（≥0.99）`,
);

/* 2) 发光卡片 hover：computed style 断言 + 亮度界限。
   说明：本环境（headless Chrome）截图管线只捕获 canvas 纹理更新、不捕获 DOM 重绘
   （diag-shot2/3/4：JS 内联改红背景 diff=0），像素 diff 不可用。
   改用可客观判定的 computed style：hover 态 transform/描边/光晕全应用，
   且混合模式随主题切换（坑 #8：light=multiply / dark=screen）。
   亮度界限仍用真实像素（防黑块/防不可见）。 */
async function glowCardCheck(theme) {
  await loadWithTheme(theme);
  await page.setViewport({ width: 1280, height: 800 });
  await evaluate(() => document.querySelector('.card-group').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await new Promise((r) => setTimeout(r, 500));
  const box = await (await page.$('[data-glow-card]')).boundingBox();
  const syG = await evaluate(() => window.scrollY); /* boundingBox 视口坐标 → screenshot clip 页面坐标 */
  const clip = { x: Math.round(box.x - 12), y: Math.round(box.y - 12 + syG), width: Math.round(box.width + 24), height: Math.round(box.height + 24) };
  const shotLum = async () => {
    const b64 = await page.screenshot({ encoding: 'base64', clip });
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
      let sum = 0, n = 0;
      for (let i = 0; i < d.length; i += 40) {
        sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        n++;
      }
      return sum / n;
    }, b64);
  };
  await page.mouse.move(10, 10, { steps: 3 }); /* 显式离开卡片 */
  await new Promise((r) => setTimeout(r, 500));
  const beforeLum = await shotLum();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await new Promise((r) => setTimeout(r, 700));
  const hoverState = await evaluate(() => {
    const card = document.querySelector('[data-glow-card]');
    const edge = card.querySelector('.glow-card__edge');
    const halo = card.querySelector('.glow-card__halo');
    return {
      hovered: card.matches(':hover'),
      transform: getComputedStyle(card).transform,
      edgeOpacity: Number(getComputedStyle(edge).opacity),
      haloOpacity: Number(getComputedStyle(halo).opacity),
      haloBlend: getComputedStyle(halo).mixBlendMode,
    };
  });
  const afterLum = await shotLum();
  const expectedBlend = theme === 'light' ? 'multiply' : 'screen';
  const stylesOk =
    hoverState.hovered &&
    hoverState.transform !== 'none' &&
    hoverState.edgeOpacity === 1 &&
    hoverState.haloOpacity === 1 &&
    hoverState.haloBlend === expectedBlend;
  if (theme === 'light') {
    record(`glowcard:${theme}`, stylesOk && afterLum >= 180, `blend=${hoverState.haloBlend}（期望 multiply）transform/描边/光晕全应用，亮度 ${beforeLum.toFixed(1)}→${afterLum.toFixed(1)}（≥180 无黑块）`);
  } else {
    record(`glowcard:${theme}`, stylesOk && afterLum <= 90, `blend=${hoverState.haloBlend}（期望 screen）transform/描边/光晕全应用，亮度 ${beforeLum.toFixed(1)}→${afterLum.toFixed(1)}（≤90 深色内部）`);
  }
}
await glowCardCheck('light');
await glowCardCheck('dark');

/* 3) blur 组效果：hover 第 1 张时，第 2 张 computed filter/opacity 必须应用 */
await loadWithTheme('light');
await page.setViewport({ width: 1280, height: 800 });
await evaluate(() => document.querySelector('.card-group').scrollIntoView({ block: 'center', behavior: 'instant' }));
await new Promise((r) => setTimeout(r, 500));
{
  const cards = await page.$$('[data-glow-card]');
  const box1 = await cards[0].boundingBox();
  await page.mouse.move(10, 10, { steps: 3 });
  await new Promise((r) => setTimeout(r, 400));
  await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2, { steps: 4 });
  await new Promise((r) => setTimeout(r, 700));
  const s = await evaluate(() => {
    const sib = document.querySelectorAll('[data-glow-card]')[1];
    const cs = getComputedStyle(sib);
    return { filter: cs.filter, opacity: Number(cs.opacity), hovered: sib.matches(':hover') };
  });
  record(
    'card-group-blur',
    s.filter.includes('blur(3px)') && s.opacity === 0.55 && !s.hovered,
    `邻居卡 filter=${s.filter} opacity=${s.opacity} 自身 hover=${s.hovered}`,
  );
  await page.mouse.move(10, 500, { steps: 3 });
}

/* ===================== B3 · 长舞台 ===================== */

/* 1) 桌面 pin：滚到行程 40% 处，section top 应钉在 68px（navBottom 64 + 4px 间隙，坑 #4），轨道已横移 */
await loadWithTheme('light');
await page.setViewport({ width: 1280, height: 800 });
await new Promise((r) => setTimeout(r, 900)); /* 等 fonts.ready refresh（坑 #6） */
const stageMid = await evaluate(() => {
  if (!window.__stage) return null;
  const info = window.__stage();
  const top = document.querySelector('[data-stage]').offsetTop;
  window.scrollTo(0, top - 68 + info.travel * 1.4);
  return info;
});
await new Promise((r) => setTimeout(r, 900)); /* scrub:1 追赶 */
const pinned = await evaluate(() => (window.__stage ? window.__stage() : null));
record(
  'stage-pin-desktop',
  Boolean(stageMid && pinned && pinned.pinCount >= 1 && Math.abs(pinned.sectionTop - 68) <= 2 && pinned.trackX < 0),
  `pinCount=${pinned?.pinCount} pinTop=${pinned?.sectionTop?.toFixed(1)}（≈68，与导航底 64 间隙 ≥4px） trackX=${pinned?.trackX?.toFixed(0)}`,
);

/* 2) travel 合成正确（坑 #3）：travel == 自合成轨道宽 - 裁剪窗宽，两个视口各差 ≤1px */
const travel1280 = await evaluate(() => (window.__stage ? window.__stage() : null));
await page.setViewport({ width: 1440, height: 800 });
await new Promise((r) => setTimeout(r, 900));
const travel1440 = await evaluate(() => (window.__stage ? window.__stage() : null));
const d1280 = travel1280 ? Math.abs(travel1280.travel - (travel1280.trackW - travel1280.winW)) : -1;
const d1440 = travel1440 ? Math.abs(travel1440.travel - (travel1440.trackW - travel1440.winW)) : -1;
record(
  'stage-travel',
  d1280 <= 1 && d1440 <= 1 && travel1280.travel > 0,
  `1280: travel=${travel1280?.travel?.toFixed(0)} 偏差${d1280.toFixed(1)}px | 1440: travel=${travel1440?.travel?.toFixed(0)} 偏差${d1440.toFixed(1)}px（≤1px）`,
);

/* 3) 移动端降级：<768px 无 pin、轨道竖排 */
await page.setViewport({ width: 375, height: 720 });
await new Promise((r) => setTimeout(r, 900));
const mobileStage = await evaluate(() => ({
  hasHook: Boolean(window.__stage),
  dir: getComputedStyle(document.querySelector('.stage-track')).flexDirection,
}));
record(
  'stage-mobile',
  mobileStage.dir === 'column' && !mobileStage.hasHook,
  `轨道方向=${mobileStage.dir}，pin 钩子存在=${mobileStage.hasHook}（应 false）`,
);

/* 4) reduced-motion：独立页面模拟（坑 #12 触摸断言教训：模拟状态用隔离环境） */
{
  const rmPage = await browser.newPage();
  await rmPage.setViewport({ width: 1280, height: 800 });
  await rmPage.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await rmPage.goto(BASE, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 900));
  const rm = await rmPage.evaluate(() => ({
    hasHook: Boolean(window.__stage),
    pinCount: window.__stage ? window.__stage().pinCount : 0,
    ntAnimMs: parseFloat(getComputedStyle(document.querySelector('.sy-nt')).animationDuration) * 1000,
    chapterText: ['synapse', 'map', 'memory'].map(
      (id) => (document.getElementById(id)?.textContent || '').length,
    ),
  }));
  const infoIntact = rm.chapterText.every((n) => n > 100);
  record(
    'stage-reduced-motion',
    !rm.hasHook && rm.pinCount === 0,
    `pin 数=${rm.pinCount}（应为 0）`,
  );
  record(
    'reduced-motion-static',
    rm.ntAnimMs < 0.5,
    `递质动画时长=${rm.ntAnimMs}ms（<0.5ms = 全站动效停，base.css 全局兜底）`,
  );
  record(
    'reduced-motion-info-intact',
    infoIntact,
    `reduced-motion 下三章节文本量 ${rm.chapterText.join('/')}（信息一条不少，§四.4）`,
  );
  await rmPage.close();
}

/* ===================== B4 · 出处系统与可视化无障碍 ===================== */
await loadWithTheme('light');
await page.setViewport({ width: 1280, height: 800 });
{
  const viz = await evaluate(() =>
    [...document.querySelectorAll('[data-viz]')].map((v) => ({
      role: v.getAttribute('role'),
      aria: (v.getAttribute('aria-label') || '').trim().length,
    })),
  );
  record(
    'viz-aria',
    viz.length >= 4 && viz.every((v) => v.role === 'img' && v.aria > 10),
    `${viz.length} 个可视化全部有 role=img + 非空 aria-label（提示词 §四.4）`,
  );

  const honest = await evaluate(() => ({
    illustrative: document.body.textContent.includes('教学示意'),
    refs: Boolean(document.querySelector('.outro__refs')),
    refsTitle: document.body.textContent.includes('参考资料'),
  }));
  record(
    'source-honesty',
    honest.illustrative && honest.refs && honest.refsTitle,
    `「教学示意」标识与文末「参考资料」区块均存在（D7，B5 起出处集中文末）`,
  );
}

/* ===================== B5 · 边界声明 / Outro / 收尾 ===================== */
await loadWithTheme('light');
await page.setViewport({ width: 1280, height: 800 });
await evaluate(() => window.scrollTo(0, 0)); /* 同 URL goto 会恢复滚动位置，显式回顶 */
await new Promise((r) => setTimeout(r, 600));
{
  /* 标题几何：TechText 画布必须完整在悬浮导航之下（B5 曾回归：inner 塌高后标题被导航裁切） */
  const geo = await evaluate(() => {
    const nav = document.querySelector('[data-nav]').getBoundingClientRect();
    const c = document.querySelector('.tech-text-canvas').getBoundingClientRect();
    const hero = document.querySelector('[data-hero]').getBoundingClientRect();
    const centerRatio = (c.top + c.height / 2 - hero.top) / hero.height;
    return { navBottom: nav.bottom, canvasTop: c.top, centerRatio, heroH: hero.height };
  });
  record(
    'title-geometry',
    geo.canvasTop >= geo.navBottom && geo.centerRatio > 0.3 && geo.centerRatio < 0.7,
    `标题画布顶 ${geo.canvasTop.toFixed(0)} ≥ 导航底 ${geo.navBottom.toFixed(0)}，中心位于 hero 高度 ${geo.centerRatio.toFixed(2)} 处（0.3-0.7 居中带）`,
  );

  /* Outro：声明两栏 + 参考资料 9 条 + 社交入口 */
  const outro = await evaluate(() => {
    const o = document.querySelector('#outro');
    if (!o) return null;
    return {
      text: o.textContent.includes('不是医疗建议') && o.textContent.includes('它是什么'),
      refItems: o.querySelectorAll('.outro__refs li').length,
      social: Boolean(o.querySelector('.social')),
    };
  });
  record(
    'outro-complete',
    Boolean(outro && outro.text && outro.refItems === 9 && outro.social),
    `声明双栏=${outro?.text} 参考资料条目=${outro?.refItems}（=9） 社交入口=${outro?.social}`,
  );

  /* 章节目录锚点都指向存在的 id */
  const anchors = await evaluate(() =>
    [...document.querySelectorAll('.index__link')].map((a) => {
      const id = a.getAttribute('href').slice(1);
      return Boolean(document.getElementById(id));
    }),
  );
  record('index-anchors', anchors.length === 3 && anchors.every(Boolean), `3 个目录卡全部指向存在的章节 id`);

  /* 导航 GitHub 链接指向精确仓库（用户反馈：不能跳到总主页） */
  const navGh = await evaluate(() =>
    [...document.querySelectorAll('[data-nav] a[href]')].some(
      (a) => a.getAttribute('href') === 'https://github.com/haomiaoyan/NEUROATLAS',
    ),
  );
  record('nav-github-link', navGh, '导航含指向 github.com/haomiaoyan/NEUROATLAS 的条目');
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

  /* 3) TechText 指针离开后停帧：先证明在动，再证明停了（2D canvas 可 toDataURL）。
      鼠标点用 TechText 画布自身中心——hero 中心会落在标题画布之外（B5 加声明条后布局变化） */
  const techBox = await (await page.$('.tech-text-canvas')).boundingBox();
  await page.mouse.move(techBox.x + techBox.width / 2, techBox.y + techBox.height / 2, { steps: 4 });
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
