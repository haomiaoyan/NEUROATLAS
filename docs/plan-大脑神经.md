# neuroatlas · 大脑与神经科普站 · 实施计划

> 状态：**待用户确认**（确认后进入子代理独立审核）。
> 需求来源：`D:\deepseek---dsh----test\医学可视化网站-启动提示词.md` + grill 提问 11 项决策 + `11111.md` 参考材料（uiverse 片段 ×4、TechText、SwarmCursor）。
> 写于 2026-11-08。

---

## 一、现状分析

新建项目，目录 `D:\ai项目（自用）\neuroatlas\`（已 `git init`，目前只有本计划文档）。无现有代码，无历史包袱。

已确定的需求决策（grill 阶段完成）：

| 项 | 结论 |
|---|---|
| 选题 | 大脑与神经，大众科普 |
| 受众 | 评分老师，UI 观感权重最高 |
| 第一眼 | 数字冲击型：「860 亿神经元」（Azevedo et al. 2009） |
| 数据 | 真实数据标来源，查不到的明确标「教学示意」 |
| 形态 | 多章节长滚动单页 |
| 主题 | **双主题**：浅色专业（默认）+ 深色沉浸（一键切换）——2026-11-08 用户修订，原「仅浅色」作废 |
| 3D | 不用 three.js |
| 动效依赖 | 只加 gsap@3.15.1（版本写死不带 `^`） |
| 互动 | 长舞台章节 + 鼠标跟随（由 SwarmCursor 承担）+ React Bits 风格标题（TechText 源码集成） |

---

## 二、决策表

**D1 · 技术栈**：React 18 + Vite + TypeScript。动效依赖只加 `gsap@3.15.1`。禁用 ThreeUI / React Bits npm 思维整体引入 / ScrollSmoother（提示词 §二）。

**D2 · 双主题系统**：
- 实现：`<html data-theme="light|dark">` + `tokens.css` 两套 CSS 变量；初始值 = localStorage → `prefers-color-scheme` → light 兜底；切换后持久化。
- 切换开关：uiverse theme-switch 片段（11111.md:108-309）改造后放固定导航右侧。
- TechText 默认 `currentColor` 取色，容器设 `color: var(--ink)` 即自动跟随主题；其源码已用 MutationObserver 监听 `documentElement` 的 `class/style/data-theme` 变化并重绘（TechText 源码 1348-1353 行），无需额外接线。
- SwarmCursor 接主题：源码 `lightMode` 属性控制默认 ink 色与 soft 系数（1582、2115 行），由 React 主题状态传入。
- **坑 #8 对策**：发光/混合类效果双套实现——深色用 `screen`（加光），浅色用低透明度色斑 + `multiply`；由 CSS 变量切换，不写死任何一种。
- 数据编码色不随主题变（见 D8）。

**D3 · 鼠标跟随 = SwarmCursor，不再单独做光晕系统**。两者功能重叠，做两套跟随必然叠加冲突。SwarmCursor 限定在 hero 区（`overflow:hidden` 容器内）：全页挂载会与长滚动冲突，且流体模拟（每帧 2 次 move + 12 步压力求解）开销大。移动端与 reduced-motion 下不挂载。

**D4 · Hero 标题 = TechText**（用户提供的 React Bits 完整源码，canvas 单行文字 + 虚线网格 + 透镜揭示 + 可拖拽）。canvas 内主标题用「NEUROATLAS」，中文副标用普通 DOM（canvas 逐字物理对中文可用但风险高，见 §五风险）。

**D5 · uiverse 片段改造流程**（按提示词附加段 3，共 4 个：theme-switch、社交图标、发光卡片、blur 卡片组）：
1. 硬编码颜色 → 换项目 CSS 变量；
2. 组件级固定尺寸可保留，但需在 320px 视口实测不溢出；
3. `theme-switch__spot:nth-last-of-type(3)`（247 行）疑为笔误（另两处用 `nth-of-type`），实测第三个斑点是否渲染，确认后修正；
4. 渲染实测后再入库，不凭样式表判断。

**D6 · 长舞台章节**：三层结构（`.stage-pin` 全宽 / `.stage-window` 限宽裁剪 / `.station-track` 横向轨道）。遵守坑 #1-#4、#6：`--sbw` 由 ResizeObserver 观察 `documentElement` 写入；位移基准用 `clientWidth`；轨道宽度自行合成（不用 `scrollWidth`）；pin 起点 `'top 64px'`；`fonts.ready` 和 `load` 各 `ScrollTrigger.refresh()` 一次。

**D7 · 医学内容**：
- 所有数字集中在 `src/data/sources.ts`，每条带 `source` 字段（作者/机构/年份），页面用 `<Source>` 组件渲染出处。
- 查不到真实数据的，明确标「教学示意，非真实数据」。
- 边界声明（这是教学演示、不是医疗建议）放首屏可见位置（hero 下方窄条），不是页脚小字。

**D8 · 数据编码色**：固定 Okabe-Ito 色盲友好色板，两个主题用同一套，不进主题变量。

**D9 · 响应式**：<768px 长舞台降级竖排静态列表 + 单次淡入（pin 数 = 0）；SwarmCursor 不挂载；TechText 保留（pointer 事件兼容触屏，reduced-motion 下自动停）。

**D10 · 验收**：`tsc --noEmit` / `npm run build` / `vitest run` / `scripts/verify.mjs` 四条全绿才算过（坑 #5：以 build 为准，vitest 不拦类型错）。verify.mjs 对 light/dark 各跑一遍。

---

## 三、文件清单（新建项目）

```
neuroatlas/
├─ package.json  vite.config.ts  tsconfig.json  index.html
├─ docs/plan-大脑神经.md        ← 本文件
├─ scripts/verify.mjs           ← 验收脚本
├─ src/
│  ├─ main.tsx  App.tsx
│  ├─ theme/ThemeProvider.tsx   ← data-theme 管理 + localStorage
│  ├─ styles/tokens.css         ← 双主题变量（含混合模式变量）
│  ├─ styles/base.css
│  ├─ components/
│  │  ├─ TechText.tsx + .css    ← 用户源码入库，改动见 B1
│  │  ├─ SwarmCursor.tsx + .css ← 用户源码入库，改动见 B1
│  │  ├─ ThemeSwitch.tsx        ← uiverse 改造
│  │  ├─ TopNav.tsx             ← 固定导航 + 进度条
│  │  ├─ SocialLinks.tsx        ← uiverse 改造
│  │  ├─ Source.tsx             ← 数据出处标注
│  │  ├─ GlowCard.tsx           ← 发光边框卡片（uiverse 改造，两层伪元素法，坑 #7）
│  │  └─ LongStage.tsx          ← 长舞台容器
│  ├─ sections/                 ← Hero / SignalStage / Synapse / Map / Memory / Outro
│  └─ data/sources.ts           ← 全部数字与出处
└─ tests/                       ← vitest 单测
```

---

## 四、分批次实施（每批独立可部署、可回滚，批末打 tag）

**B0 · 脚手架 + 双主题**（tag `b0`）
- Vite + React + TS 初始化；`tokens.css` 两套变量（含 `--glow-blend`：light=multiply / dark=screen）；ThemeProvider；ThemeSwitch（uiverse 改造）。
- 验收：`npm run build` 成功；verify 断言两主题 body 背景色实测不同、正文对比度 ≥4.5；切换后重载保持。

**B1 · Hero**（tag `b1`）
- TechText 入库，改动仅 3 处：① 容器色接 `var(--ink)`；② reduced-motion 行为验证（源码已处理）；③ 中文副标不进 canvas，用 DOM。
- SwarmCursor 入库，改动 2 处：① 接 ThemeProvider（`lightMode`/`color`）；② `<768px` 与 reduced-motion 条件挂载。
- 验收：两主题下 canvas 采样非空；hero `scrollWidth ≤ clientWidth+1`；hero 交互 10s 的 rAF 帧间隔中位数 ≤ 33ms。

**B2 · 导航 + 通用组件**（tag `b2`）
- TopNav（fixed，实测高度记入文档）+ 进度条（坑 #6 双 refresh）；Source 组件；SocialLinks；GlowCard（坑 #7：两层伪元素法，不用 mask-composite）+ blur 卡片组。
- 验收：pinTop − navBottom ≥ 4px（实测）；卡片 hover 两主题实测无黑块/不可见。

**B3 · 长舞台章节**（tag `b3`）
- SignalStage（电信号传导叙事，横向轨道）。
- 验收：跨视口 travel 差值 ≤1px；`<768px` pin=0；进度条到底读数 99-100%。

**B4 · 内容章节 + 出处系统**（tag `b4`）
- Synapse / Map / Memory 三节；`sources.ts` 全量数字过一遍。
- 验收：构建期校验每个数字带 `source` 字段；「教学示意」标签按需出现。

**B5 · 收尾**（tag `b5`）
- Outro + 首屏边界声明；reduced-motion 全站断言；两主题全量 verify。
- 验收：§五清单全 PASS。

---

## 五、验收标准（脚本化，verify.mjs 断言清单）

light/dark 各一遍，任一红即停：

1. `tsc --noEmit` 0 error；`npm run build` 成功；`vitest run` 0 failed
2. `scrollWidth ≤ clientWidth + 1`（1280 / 768 / 375 三视口 × 两主题）
3. 正文对比度 ≥ 4.5、大字 ≥ 3.0（按两主题 token 组合计算）
4. 长舞台 travel 差值 ≤ 1px；`<768px` pin 数 = 0；reduced-motion 下 ScrollTrigger 触发数 = 预期静态值
5. 全宽层 `left ≈ 0` 且 `width ≥ clientWidth`
6. `sources.ts` 每个数字字段带 `source`（构建期校验）
7. hero rAF 帧间隔中位数 ≤ 33ms（B1 实测口径）

「不卡顿」「观感好」不作为验收标准；观感最终由用户目视确认。

---

## 六、不做什么

- three.js / 任何 3D 场景
- ScrollSmoother / ThreeUI / React Bits 其余组件
- 真实医疗建议类内容；用户数据收集；后端
- 移动端专属动效（只做静态降级）
- 深浅之外的第三主题

---

## 七、风险与待实测项

1. **SwarmCursor + TechText 同屏**：WebGL2 流体 + 2D canvas 同时跑，帧率必须 B1 实测；超标则 SwarmCursor `count` 800→400，或两者只在指针进入 hero 时激活（SwarmCursor 已有 IntersectionObserver + TechText 已有 idle 判定，有降级空间）。
2. **TechText 中文渲染**：源码默认场景是拉丁字（React Bits 演示 "React Bits"），CJK 字形测量（`actualBoundingBox*`）未验证，B1 先实测；不行则 canvas 主标题用英文、中文走 DOM。
3. **theme-switch 第三斑点**：`nth-last-of-type(3)` 疑为笔误，B0 实测确认。
4. **SwarmCursor 与页面滚动**：源码监听 `window` 的 pointer 事件并在容器内 `elementFromPoint`，限 hero 后需确认滚动经过 hero 时不产生残留粒子（B2 实测）。
