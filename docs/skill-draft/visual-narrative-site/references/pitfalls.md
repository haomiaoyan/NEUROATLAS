# 实测坑全集（现象 → 根因 → 修复 → 通用规则）

22 条，全部来自真实调试会话。

**编号说明**：本文件编号自成体系，按类别排（布局 → 构建 → 交互）。源码注释里的 `坑 #N` 引自早期计划文档的另一套编号，两套不等价，对照见文末。

## 布局类

### 1. 全宽层不能用 100vw
**现象**：全宽背景/氛围色斑层在有限宽容器的页面里横向溢出 8px，四种写法三种溢出。
**根因**：`100vw` 是视口宽**含滚动条**，而内容区是 `clientWidth`。
**修复**：零溢出的唯一写法是 `width: calc(100vw - var(--sbw)); left: 50%; translateX(-50%)`，`--sbw` 由 JS 写入真实滚动条宽。**但如果元素在 body 直下、未套限宽容器，`width:100%` 就等于 `clientWidth`，根本不需要这套 hack。**
**规则**：先确认元素在不在限宽容器里，再决定用不用 `--sbw`。多数「100vw 溢出」是误判层级导致的过度修复。

### 2. `--sbw` 不能只算一次
**现象**：挂载时算出的滚动条宽是 0，滚动条在 ~310ms 后才出现，布局随后歪掉。
**根因**：滚动条出现/消失**不触发 `resize` 事件**。
**修复**：`new ResizeObserver(applySbw).observe(document.documentElement)`。
**规则**：任何依赖「视口宽减滚动条宽」的值都必须由 ResizeObserver 驱动，不能只在 mount 时算。

### 3. `scrollWidth` 不含尾部 padding
**现象**：横向轨道的行程算短了，最后一张卡片没走完就差一点点。
**根因**：`scrollWidth` 统计内容边界，容器的 `padding-right` 不计入。
**修复**：轨道宽度自行合成：

```js
const cards = Array.from(track.querySelectorAll('.station'));
let w = 0;
cards.forEach((c) => (w += c.offsetWidth));
const cs = getComputedStyle(track);
w += (parseFloat(cs.columnGap) || 0) * Math.max(0, cards.length - 1)
   + (parseFloat(cs.paddingLeft) || 0)
   + (parseFloat(cs.paddingRight) || 0);
```

**规则**：任何「靠滚动量/内容宽计算行程」的地方都自己合成，别信 `scrollWidth`。

### 4. pin 起点必须让出固定导航
**现象**：pin 住后标题被固定导航遮住一截。
**修复**：`start: 'top 68px'`（导航 64px 含边框，留 4px 间隙）。实测 pinTop 精确 68.0。
**规则**：pin/native-scroll 的 `start` 值必须写成「导航高度 + 显式间隙」，并在验收里断言 `pinTop - navBottom >= 4`。

### 5. flex 属性对 absolute 包裹层的子元素无效
**现象**：标题被导航裁切，高度塌成内容高。
**根因**：内容层被 absolute 容器包裹，`flex: 1` 不生效。
**修复**：`height: 100%`（父链都已是 100%）。
**规则**：改布局容器时逐层检查定位方式；`flex` 只在直接 flex 子项上生效。

### 6. 绝对定位层不参与 flex 布局
**现象**：flex 容器里唯一的流内子项被顶到顶部，底部留白。
**修复**：`margin-top: auto` 压底。
**规则**：`position:absolute` 的兄弟节点不占据 flex 主轴空间，排版计算要么按「只剩流内项」算，要么显式指定。

### 7. `scroll-behavior: smooth` 让脚本内所有 scrollIntoView/scrollTo 变异步
**现象**：脚本里 `scrollIntoView()` 后等 500ms，坐标仍错位、hover 落空、`elementFromPoint` 返回 none。
**修复**：程序化滚动一律 `scrollIntoView({ behavior: 'instant', block: 'center' })` / `scrollTo({ top, behavior: 'instant' })`。
**规则**：全局 `smooth` 是给用户点击锚点用的；脚本里出现 `smooth` 就是 bug。

## 构建类

### 8. vitest 全绿 ≠ 能构建
**根因**：esbuild 剥类型，类型错误不拦截 tests。
**修复**：验收以 `tsc --noEmit && vite build` 为准。
**规则**：验收门禁里 build 与 test 并列，谁都不能替代谁。

### 9. Windows esbuild 临时目录随机失败
**现象**：间歇性 `Access denied`，重跑就好。
**修复**：子进程 env 里把 `TEMP`/`TMP` 指到项目内 `.tmp/`。
**规则**：任何在 Windows 上 spawn 构建/打包子进程的脚本都要接管临时目录。

### 10. Vite preview 默认只听 IPv6
**现象**：`http://127.0.0.1:4173` 连不上，但 `localhost` 可以。
**修复**：`vite preview --host 0.0.0.0`。
**规则**：验收脚本里 base URL 用 `127.0.0.1` 并显式指定 host，别依赖 localhost 解析顺序。

### 11. 从 markdown 提取代码时，结尾的围栏污染 CSS
**现象**：`.theme-switch` 规则整段丢失，开关 0×0 不可点。
**根因**：提取时把结尾的 ` ``` ` 带进 CSS，解析器把「围栏 + 后续选择器」整段当无效规则丢弃。
**修复**：提取后检查围栏残留与括号平衡。
**规则**：从任何文本载体（markdown/文档/网页）提取样式或脚本，落盘前做一次结构校验。

### 12. React 18 StrictMode 双挂载是第三方 canvas 组件的毒药
**现象**：dev 下 hero 出现一块不透明白色矩形，ResizeObserver 没挂上，canvas 不随 resize。
**根因**：双挂载复用同一 canvas DOM 节点；cleanup 里调 `WEBGL_lose_context.loseContext()` 后，重挂载的 `getContext` 拿回**同一个已死 context**，初始化中断；死 canvas 被 Chrome 合成为不透明白块。
**修复**：cleanup 移除 `loseContext()`，canvas 随组件卸载由浏览器回收。
**规则**：第三方 canvas/WebGL 组件的 cleanup 不要主动销毁 context。**这类问题只在 dev 出现，生产构建正常——极易漏测**，验收必须在 `npm run dev` 下也跑一遍。

### 13. 第三方开关组件的 label 转发点击在 React 受控下有竞态
**现象**：主线程被动画占满时，主题开关双触发或丢失。
**根因**：checkbox `display:none` + label 转发点击。
**修复**：checkbox 改 `position:absolute; inset:0; opacity:0` 透明覆盖层直击 input；hover 微交互改由根节点 `:hover` 驱动。
**规则**：受控表单控件不要用 label 转发点击，用透明覆盖层。

## 交互与无障碍类

### 14. `mix-blend-mode: screen` 在浅色背景上等于不可见
**根因**：screen 是加光混合，白底上加不出更亮。
**修复**：深色主题 `screen`，浅色主题 `multiply` 或低透明度色斑，做成 CSS 变量 `--glow-blend` 随主题切换。实测 light=multiply / dark=screen。
**规则**：任何混合模式效果都要在两主题下各验一次实际亮度，不能只验 computed style 值对不对。

### 15. CSS 优先级：裸类名被父级选择器压过
**现象**：`.topnav__github` 的样式不生效。
**根因**：`.topnav a` (0,1,1) 压过 `.topnav__github` (0,1,0)。
**修复**：组件内一律 `.topnav .topnav__xxx`。
**规则**：BEM 块内写样式时把块名一起带上，别用单类名赌优先级。

### 16. 滚动条出现不触发 resize
见坑 #2。**规则**：ResizeObserver 观察 `documentElement`，不是 `window` 的 resize。

### 17. ScrollTrigger `end: 'max'` 缓存文档高度
**现象**：字体加载后页面变长，进度条系统性偏高。
**修复**：`document.fonts.ready` 和 `load` 各 `ScrollTrigger.refresh()` 一次。或者进度条根本不用 ScrollTrigger，改 `scroll` + rAF 节流自算。
**规则**：任何依赖文档总高的计算，都要在字体加载后重算。

### 18. React 受控 input 不能直接赋 `.value`
**修复**：

```js
const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
setter.call(input, '100');
input.dispatchEvent(new Event('input', { bubbles: true }));
```

**规则**：脚本驱动受控组件必须走原生 setter + 事件，直接赋值会被 React 的 value tracker 判定为无变化。

### 19. CDP 触摸模拟开了关不掉
**修复**：触摸断言起独立浏览器进程。
**规则**：CDP 的 `setTouchEmulationEnabled` 不可逆；一切会改变页面全局状态的模拟都隔离到新进程。

### 20. 同 URL `goto` 会恢复滚动位置
**现象**：需要「顶部状态」的断言偶发失败。
**修复**：显式 `window.scrollTo(0, 0)` 后再测量。
**规则**：断言前显式设定被测状态，不假设 `goto` 会重置。

### 21. `setViewport` 后布局是异步的，立刻读尺寸会拿到旧值
**现象**：`overflow-375:light` 断言间歇性 FAIL，detail 写着「scrollWidth 1280 ≤ 375+1」——`clientWidth` 已经是 375，`scrollWidth` 还是缩窄前的 1280。
**根因**：`page.setViewport` 只保证视口尺寸已提交，不保证页面完成 reflow。ScrollTrigger 的 pinSpacer 在 resize 后还要重算文档高度与轨道宽，这些是异步的；任何在这些重算完成前读 `scrollWidth`/`offsetWidth` 的断言都会读到旧值。
**修复**：封装 `setViewportSettled(width, height)`——setViewport 后等两次 rAF + 400ms 静置，再轮询 `{scrollWidth, clientWidth}` 直到连续两次读数相同**且** `clientWidth === width`，最多 20×100ms。

```js
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
```

**规则**：所有跨视口的断言都走这个封装，包括 1440 和 375 的复测。**这条坑的特征是「偶发」——重复跑同一份脚本才会暴露，单次全绿不能作为验收证据。**

### 22. 渐变描边不能用 `mask-composite` / `border-image`
**现象**：卡片整块变纯黑，或圆角消失。
**根因**：`mask-composite` 在多浏览器下行为不一致，一处不成立就整层被裁掉；`border-image` 不遵守 `border-radius`。
**修复**：**两层元素法**——`.edge` 渐变实心层（z1）+ `.body` 不透明 surface 层内缩 1px（z2），视觉上只剩 1px 渐变描边。
**规则**：需要「渐变边框 + 圆角」时，用两层叠加而非描边属性；这是唯一稳的写法。

## 与旧编号的不一致

源码注释与 `scripts/verify.mjs` 头部里的 `坑 #N` 引自早期计划文档（`docs/plan-大脑神经.md`），是**另一套按发现顺序排的编号**，与本文件编号不等价，不要交叉引用。

仅在 verify.mjs 头部直接写明的三条可以确认对应：

| 源码 `坑 #N` | 本文件条目 |
|---|---|
| #12 触摸断言独立进程 | 19 |
| #14 preview 加 `--host 0.0.0.0` | 10 |
| #15 vite build 的 TEMP/TMP | 9 |

其余源码注释里的编号一律回本文件按标题检索内容，不要按数字对号入座。



