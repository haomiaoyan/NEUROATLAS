# 运行时测量配方（verify.mjs）

无头浏览器验收脚本的可复用结构。全部条目在新写的项目上验证过，数字是实现参数，不是普适常量。

## 选型与三个启动前提

- `puppeteer-core` + 系统 Chrome（不下载浏览器，CI 与本地同一份）
- Chrome 查找走候选列表 + 环境变量覆盖（`NEUROATLAS_CHROME` 之类），找不到就 SKIP 而不是 FAIL
- `vite preview --host 0.0.0.0`：默认只听 IPv6，`127.0.0.1` 连不上
- Windows 上把 `TEMP`/`TMP` 指到项目内目录再 spawn 构建子进程，否则 esbuild 临时目录随机 Access denied

```js
const tmpDir = path.join(ROOT, '.tmp');
mkdirSync(tmpDir, { recursive: true });
const childEnv = { ...process.env, TEMP: tmpDir, TMP: tmpDir };
spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { cwd: ROOT, env: childEnv, stdio: 'inherit' });
```

启动顺序：build（可 `--no-build` 跳过）→ spawn preview → 轮询 `http.get` 到就绪（20s 上限）→ 连 Chrome。每步 `record(id, ok, detail)`，`detail` 里必须带实测数值，不要写「通过」。

## 13 种测量技术

| 测什么 | 怎么测 |
|---|---|
| 主题是否生效 | `document.documentElement.dataset.theme` + 取 body `getComputedStyle().backgroundColor` |
| 对比度（WCAG） | 取元素 computed `color`，向上遍历找首个非透明背景，按 WCAG 公式算 `(hi+0.05)/(lo+0.05)`，**两主题各算一遍**（实测 light 8.43 / dark 7.60） |
| 横向溢出 | `documentElement.scrollWidth <= clientWidth + 1`，多视口（1280/375/768）× 多主题 |
| canvas 有内容 | **CDP 截图 → 页内 `new Image()` 解码 → 逐像素与背景亮度差值计数**。WebGL canvas 未开 `preserveDrawingBuffer` 时 `readPixels`/`toDataURL` 只读到空缓冲 |
| 2D canvas 在动 / 已停帧 | `toDataURL()` 前后两次比对：指针在场应不同（在动），指针离开 1.6s 后应相同（停帧）。**基准采样要 `i += 16` 抽稀**，全量 `getImageData` 会把主线程堵死 |
| 帧率 | 页面注入 rAF 采集环收集 timestamp，CDP 鼠标沿利萨茹轨迹移动 10s，**弃前 1s 热身**取中位数（实测 16.7ms ≈ 60fps，747/751 帧） |
| 滚动进度条 | 读 computed `transform` 的 matrix 首个分量当 scaleX；断言顶部 ≤0.01、底部 ≥0.99 |
| hover 效果 | 截图管线不捕获 DOM 重绘时（内联改红背景 diff=0），改用 computed style 断言（`transform`/`opacity`/`mixBlendMode`/`filter`）+ 截图亮度界限（防黑块、防不可见） |
| 触摸 / 降级模拟 | **必须独立浏览器进程**：CDP `setTouchEmulationEnabled` 关不掉；`emulateMediaFeatures` 用于 reduced-motion 安全 |
| 主题持久化 | 不能在注入过 `evaluateOnNewDocument` 的页面上 reload（会再次注入覆盖），用**新开 page** 验证 |
| 主题切换后真实像素 | 点开关后量 hero 背景亮度 + canvas 字形明暗主导（暗底应浅字形多于深字形，倍数 ≥2），防「CSS 对了渲染没跟上」的假绿 |
| ScrollTrigger pin | 滚到行程中段，量 section `rect.top` ≈ 预期 pinTop；暴露 `window.__stage()` 验收钩子返回 `{pinCount, travel, trackW, winW, sectionTop, trackX}` |
| 合成行程 | `travel == 自合成轨道宽 - 裁剪窗宽`，差值 ≤1px，跑两个视口（1280/1440 均实测 0.0px） |

## 坐标与管线陷阱

**`elementHandle.boundingBox()` 是视口坐标；`page.screenshot({clip})` 是页面坐标。** 页内滚动后必须 `clip.y += scrollY`。这个坑造成过 3 条断言假 FAIL。

```js
const box = await (await page.$('[data-glow-card]')).boundingBox();
const sy = await evaluate(() => window.scrollY);
const clip = { x: Math.round(box.x - 12), y: Math.round(box.y - 12 + sy), width: ..., height: ... };
```

**截图管线局限：** 某些 headless 环境下截图只捕获 canvas 纹理更新，不捕获 DOM 重绘（JS 内联改红背景，diff 恒为 0）。先做一次「注入已知可见变化 → 看 diff 是否非 0」的探针，再决定视觉断言走像素还是 computed style。

## 断言必须能失败

写完一条断言后，反向改一次被测代码确认它 FAIL。计划审核最容易漏的就是「验收机制本身失效」——断言恒真、或超时后返回一个恰好满足条件的默认值。

## 收尾

```js
function writeReport() {
  writeFileSync(path.join(ROOT, '.tmp', 'verify-report.json'), JSON.stringify(results, null, 2));
}
process.on('exit', () => server.kill());
```

报告落文件而不是只打 stdout，才能在后续轮次里拿历史实测值做对照（防止把估算值写进文档）。
