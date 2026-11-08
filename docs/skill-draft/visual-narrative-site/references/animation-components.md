# 动画组件移植要点（TechText / SwarmCursor）

两个第三方 canvas 组件的集成记录。**只在复用这两个组件时读**；换别的组件不必看，但「集成要改哪几处、改完怎么验」的套路通用。

## TechText（2D canvas 逐字网格标题）

约 990 行，效果是把文字渲染成虚线网格字形，指针移动处出现透镜揭示（字形实心化）。

**唯一必须知道的设计：sprite 缓存键包含 ink 色值。**

```js
const key = [text, family, fontWeight, fontSize, letterSpacing, align,
             ink, dashLength, dashGap, strokeWidth, lineStyle,
             width, height, dpr].join('|');
```

`ink` 在里面，所以**主题切换会自动重建字形**，不需要手动清缓存。这是移植时最容易删掉的一行——删了以后主题一切换标题就还是旧色。

**集成改动（4 处以内）**

1. 容器 `color: var(--ink)`——canvas 从 `getComputedStyle(container).color` 取值，继承链对了就够
2. 组件内部 `MutationObserver` 监听 `documentElement` 的 `data-theme`/`class`/`style` 变化并 wake 重绘
3. `sweep={false}`（不要自带扫光，会和透镜效果打架）
4. 中文副标不进 canvas——CJK 字形测量未验证，走 DOM 文本

**停帧机制（不用改代码就有了）**

`sweep=false` 时 `active = pointer.inside || dragging`。指针离开 → settling 收敛 → rAF 停、画面冻结；`pointerenter` 唤醒。

**验收方式**

`canvas.toDataURL()` 双采样：指针在场时两次应不同（在动）；指针离开 1.6s 后两次应相同（已停帧）。采样时 `i += 16` 抽稀，全量 `getImageData` 会堵死主线程。

## SwarmCursor（WebGL2 粒子群）

约 950 行，每帧 2 次半拉格朗日平流 + 12 步压力求解，`blendFunc(ONE, ONE_MINUS_SRC_ALPHA)` + `premultipliedAlpha: true`。

**集成改动（3 处）**

1. `lightMode` / `color` / `accentColor` 从 CSS 变量读——WebGL 需要具体色值：

```js
const cs = getComputedStyle(document.documentElement);
const ink = cs.getPropertyValue('--ink').trim();
// useMemo 依赖 theme，主题变化时重新取值
```

2. `<768px` 与 reduced-motion 条件下不挂载（`matchMedia` 监听）
3. **cleanup 里删掉 `WEBGL_lose_context.loseContext()`**——见 `pitfalls.md` 第 12 条，不删会导致 StrictMode 下拿到已死 context、画面变白块

**层叠：TechText 作为 SwarmCursor 的 children**

canvas `position:absolute; inset:0` 在内容层之下，`pointer-events:none` 不拦截指针。两个 canvas 同屏时实测 rAF 帧间隔中位 16.7ms（60fps 满帧，747/751 帧样本）。

**降级**

`<768px` 与 reduced-motion 不挂载；IntersectionObserver 离屏自动停帧。

## 通用套路（换别的动画组件也适用）

| 步骤 | 判据 |
|---|---|
| 找缓存键 | 组件里有 `[...].join('|')` 的地方就是缓存键，检查它是否包含所有会变的外部输入（主题色、字号、DPR） |
| 找 cleanup | 看有没有主动销毁 context / 移除全局监听；主动销毁 context 在 React StrictMode 下几乎必炸 |
| 找挂载条件 | 移动端/reduced-motion 必须能不挂载，用 matchMedia 而不是 CSS 隐藏 |
| 定验收 | 每个组件至少要有一条「在动」和一条「该停时停了」的断言，都靠 `toDataURL` 双采样 |

**别做的事**：不要为了适配主题去改组件的渲染逻辑。先看缓存键和 CSS 变量能不能覆盖——这两个能覆盖大部分情况。
