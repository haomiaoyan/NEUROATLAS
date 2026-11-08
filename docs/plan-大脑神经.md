# neuroatlas · 大脑与神经科普站 · 实施计划

> 状态：**v2 —— 已完成独立审核并逐条核实，16 条意见（7 MAJOR + 9 MINOR）全部采纳修订**。待用户确认 v2 后进入 B0。
> 需求来源：`D:\deepseek---dsh----test\医学可视化网站-启动提示词.md` + grill 提问 11 项决策 + `11111.md` 参考材料（uiverse 片段 ×4、TechText、SwarmCursor）。
> 写于 2026-11-08，审核修订同日。

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

**D1 · 技术栈**：React 18 + Vite ^5 + TypeScript（strict）+ Node ≥ 20。动效依赖只加 `gsap@3.15.1`。测试框架 vitest（配置 `passWithNoTests: true` + 至少 1 个冒烟测试）。禁用 ThreeUI / React Bits npm 思维整体引入 / ScrollSmoother（提示词 §二）。

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
2. 组件级固定尺寸可保留，但需在 375px 视口实测不溢出（与 §五 视口矩阵统一）；
3. `theme-switch__spot:nth-last-of-type(3)`（规则在 242-247 行）疑为笔误：材料里只有 235 行一处 `nth-of-type(2)`；且 11111.md 中**没有该组件的 HTML**——若原页有 3 个 spot，`nth-last-of-type(3)` 匹配的是**第 1 个**而非第 3 个，会覆盖基础规则（223 行）。B0 需从 uiverse 原页取 HTML（或按 3 个 spot 推断），并对**全部 3 个 spot** 渲染实测；
4. 渲染实测后再入库，不凭样式表判断。

**D6 · 长舞台章节**：三层结构（`.stage-pin` 全宽 / `.stage-window` 限宽裁剪 / `.station-track` 横向轨道）。遵守坑 #1-#4、#6：`--sbw` 由 ResizeObserver 观察 `documentElement` 写入；位移基准用 `clientWidth`；轨道宽度自行合成（不用 `scrollWidth`）；pin 起点 `'top 64px'`；`fonts.ready` 和 `load` 各 `ScrollTrigger.refresh()` 一次。

**D7 · 医学内容**：
- 所有数字集中在 `src/data/sources.ts`，每条带 `source` 字段（作者/机构/年份），页面用 `<Source>` 组件渲染出处。
- 查不到真实数据的，明确标「教学示意，非真实数据」。
- 边界声明（这是教学演示、不是医疗建议）放首屏可见位置（hero 下方窄条），不是页脚小字。

**D8 · 数据编码色**：固定 Okabe-Ito 色盲友好色板。色板定义在 `tokens.css` 的独立 `:root { --data-1 … --data-8 }` 块，**不随 data-theme 切换**；B0 定义变量，B4 图表消费；verify 断言两个主题下数据色计算值相同。

**D9 · 响应式**：<768px 长舞台降级竖排静态列表 + 单次淡入（pin 数 = 0）；SwarmCursor 不挂载；TechText 保留但关动效：`sweep={false}` + `intro='none'`（canvas 静态渲染标题文字，reduced-motion 下同样处理）。

**D11 · 实施细则（审核补充，实施者不必自行发明）**：
- 字体栈：容器 `font-family` 设「英文展示字体（B1 实测定，候选 Inter / Space Grotesk）+ 中文系统栈（"PingFang SC", "Microsoft YaHei"）」；TechText 未传 `fontFamily` 时走 `getComputedStyle(container).fontFamily`（11111.md:541），B1 的 CJK 实测以该栈为基准。
- hero 层叠：TechText 作为 SwarmCursor 的 **children** 渲染——SwarmCursor 的 canvas `absolute inset:0` 且在内容层之前（11111.md:2346-2377），内容层 `position:relative` 自然盖在 canvas 上，canvas `pointer-events:none` 不拦截交互。
- hero 布局**预留边界声明条位置**（约 40px 占位），避免 B5 加入时挤压 hero、使 B1 实测指标失效。
- `sources.ts` 校验机制：TS 类型要求 `source?: SourceRef` 字段 + vitest 遍历单测（B4）。
- 视口矩阵统一：1280 / 768 / 375 × 两主题。

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

**B0 · 脚手架 + 双主题 + 验收工具**（tag `b0`）
- Vite + React + TS 初始化；`tokens.css` 两套变量（含 `--glow-blend`：light=multiply / dark=screen）+ 独立 `:root` Okabe-Ito 数据色块（D8）；ThemeProvider；ThemeSwitch（uiverse 改造，含从原页取 HTML + 3 个 spot 全量实测，D5）。
- **创建 `scripts/verify.mjs` 骨架**（视口循环 + 截图 + 断言框架）与 vitest 配置（`passWithNoTests` + 冒烟测试）——否则 B0 自己的验收无法执行。
- 验收：`npm run build` 成功；verify 断言两主题 body 背景色实测不同、正文对比度 ≥4.5；数据色两主题计算值相同；切换后重载保持。

**B1 · Hero**（tag `b1`）
- TechText 入库，改动 4 处：① 容器色接 `var(--ink)`；② reduced-motion 行为验证（源码已处理）；③ 中文副标不进 canvas，用 DOM；④ **新增 idle 处理**——源码无 idle 机制（`sweep` 默认 true、指针不在场仍持续 rAF，11111.md:447/1090/1259），传 `sweep={false}` 并新增「指针离开 hero 500ms 后停帧」逻辑（idle 是 SwarmCursor 的能力，TechText 没有，不能混用）。
- SwarmCursor 入库，改动 2 处：① 接 ThemeProvider（`lightMode`/`color`）；② `<768px` 与 reduced-motion 条件挂载。层叠关系按 D11（TechText 为 children）。
- 验收：**先断言 `getContext('webgl2')` 非空**（源码 1618 行无 webgl2 时静默返回，verify 环境需 SwiftShader 支持）；hero 画布有内容用 **CDP 截图像素统计**（SwarmCursor 未开 `preserveDrawingBuffer`，readPixels/toDataURL 只会读到空缓冲，11111.md:1611-1617）；hero `scrollWidth ≤ clientWidth+1`；rAF 帧间隔口径见 §五.7；指针离开 hero 后 500ms 内 rAF 停帧；滚动往返 hero 无残留粒子。

**B2 · 导航 + 通用组件**（tag `b2`）
- TopNav（fixed，实测高度记入文档）+ 进度条（坑 #6 双 refresh）；**ThemeSwitch 挂进 TopNav**——导航内类名一律写 `.topnav .topnav__xxx`，不用裸类名（坑 #9：`.topnav a` (0,1,1) 会压过 `.topnav__github` (0,1,0)）；Source 组件；SocialLinks；GlowCard（坑 #7：两层伪元素法，不用 mask-composite）+ blur 卡片组。
- 验收：短页面下进度条到底读数 = 100%（基础正确性）；卡片 hover 两主题实测无黑块/不可见。（pin 相关断言在 B3——B2 时点页面里还没有 pin。）

**B3 · 长舞台章节**（tag `b3`）
- SignalStage（电信号传导叙事，横向轨道）。
- 验收：**pinTop − navBottom ≥ 4px（坑 #4，此时才有 pin 可量）**；跨视口 travel 差值 ≤1px；`<768px` pin=0；进度条到底读数 99-100%（长舞台使文档高度大变，必须复测）。

**B4 · 内容章节 + 出处系统**（tag `b4`）
- Synapse / Map / Memory 三节；`sources.ts` 全量数字过一遍（TS 类型 + vitest 遍历，见 D11）。
- 每个可视化容器加 `role="img"` + 可读的 `aria-label`（提示词 §四.4；TechText 源码已自带，11111.md:1377）。
- 验收：构建期校验每个数字带 `source` 字段；「教学示意」标签按需出现；`[data-viz]` 节点 aria-label 非空。

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
7. hero rAF 帧间隔中位数 ≤ 33ms，**口径固定为**：CDP `Input.dispatchMouseEvent` 沿 hero 内固定轨迹移动，注入计数器采集 rAF timestamp 差值，弃前 1s 热身，取样 9s，两主题各跑一次
8. `[data-viz]` 节点均有非空 `aria-label`；数据色（`--data-*`）两主题计算值相同
9. 前置：verify 先断言 `getContext('webgl2')` 非空，否则 hero 相关断言全部标记 SKIP 并如实报告（不许静默绿）

verify.mjs 设计约束（来自提示词坑 #12/#14/#15）：
- 涉及触摸的断言**独立浏览器进程**（CDP `setTouchEmulationEnabled` 开了关不掉，会造成假通过）
- 若 verify 起 vite preview：必须加 `--host 0.0.0.0`（默认只听 IPv6，127.0.0.1 连不上）
- `npm run build` 前设 `TEMP`/`TMP` 到项目内目录（Windows esbuild 临时目录随机 Access is denied）

「不卡顿」「观感好」不作为验收标准；观感最终由用户目视确认。

---

## 六、不做什么

- three.js / 任何 3D 场景
- ScrollSmoother / ThreeUI / React Bits 其余组件
- 真实医疗建议类内容；用户数据收集；后端
- 移动端**专属**动效（移动端只保留静态呈现 + 单次淡入；TechText 静态渲染标题文字，行为定义见 D9）
- 深浅之外的第三主题

---

## 七、风险与待实测项

1. **SwarmCursor + TechText 同屏帧率**：WebGL2 流体 + 2D canvas 同时跑，且 TechText **源码没有 idle 机制**（`sweep` 默认 true，指针不在场仍持续 rAF，11111.md:447/1090/1259）——「指针进入才激活」的降级不是现成能力，B1 要新写停帧逻辑（见 B1 改动④）。超标则 SwarmCursor `count` 800→400。
2. **TechText 中文渲染**：源码默认场景是拉丁字（React Bits 演示 "React Bits"），CJK 字形测量（`actualBoundingBox*`）未验证；字体基准按 D11 字体栈，B1 先实测；不行则 canvas 主标题用英文、中文走 DOM。
3. **theme-switch 三斑点**：`nth-last-of-type(3)`（242 行）在恰好 3 个 spot 时匹配第 1 个；材料里没有组件 HTML，B0 取 HTML 后对 3 个 spot 全量实测。
4. **SwarmCursor 与页面滚动**：滚动往返 hero 的残留粒子检查放在 **B1**（hero 在 B1 即齐，不留到 B2）。
5. **verify 环境 WebGL2 可用性**：SwarmCursor 拿不到 webgl2 时静默返回（11111.md:1618）；verify 环境需 SwiftShader，§五.9 已加前置断言，不可用时如实报 SKIP。
