# 技能整理素材 → skill 草稿：交付说明

本目录是依据 `docs/技能整理素材-方法与动画全集.md` 整理出的 **skill 草稿**，供审核。

## 目录结构

```
docs/skill-draft/visual-narrative-site/
├── SKILL.md                          主文件：七阶段流程 + 提问清单 + 审核模板 + 汇报格式
├── references/
│   ├── verify-recipes.md             13 种运行时测量技术 + 两个坐标/管线陷阱
│   ├── pitfalls.md                   22 条实测坑（现象→根因→修复→通用规则）
│   ├── animation-components.md       第三方 canvas 组件集成套路 + 两个组件的移植要点
│   └── content-sourcing.md           内容出处系统（数字必须有出处或标教学示意）
└── assets/
    ├── long-stage.tsx                长舞台 GSAP 驱动（可直接改参数用）
    ├── long-stage.css                长舞台三层结构 CSS
    ├── tokens.css                    双主题 tokens（含混合模式变量）
    └── verify-skeleton.mjs.md        验收脚本骨架（markdown 包裹，便于阅读）
```

安装：把 `visual-narrative-site/` 整个目录搬到 skills 目录即可。`assets/verify-skeleton.mjs.md` 若要用请去掉 `.md` 后缀并改回 `.mjs`。

## 相对原素材做的改动

| 原素材 | 草稿 | 原因 |
|---|---|---|
| 20 条坑 | 22 条 | 新增第 21 条（`setViewport` 后布局异步，本轮实测造成偶发 FAIL）、第 22 条（渐变描边不能用 `mask-composite`/`border-image`，原素材只写在 §5.7 实现细节里，属通用规则） |
| 坑编号按「发现顺序」 | 按类别排（布局/构建/交互） | 便于检索；文末说明与源码 `坑 #N` 是两套编号、不等价，只能按标题搜内容 |
| §5 动画细节 11 小节 | 拆成 `animation-components.md` + 2 个 assets | 保留可复用部分（缓存键含 ink、cleanup 删 loseContext、停帧判据、挂载条件），删掉逐条 diff 式记录 |
| §7 数据出处系统 | 独立成 `content-sourcing.md` | 见下 |
| 「实战案例」框 | 全部删除 | 按原素材给的整理原则：保留判据和数字，删业务细节 |
| 具体数字（68px、3.5 行程、16.7ms、8.43 对比度、blur(3px)/opacity .55 等） | 全部保留 | 这些是实现参数与验收阈值，换项目要重新标定，但知道量级能省一轮试错 |

## 我替你做的两个决定

**1. §7 出处系统：独立成 `content-sourcing.md`，不并入主文件**

理由：它的触发条件和主流程几乎不重叠（做长滚动叙事不一定有可溯源数字，做数据站也不一定长滚动），并入会让主文件变长且大部分时候用不到。独立成 reference 后，SKILL.md 里用一行「页面有数字 → 读 content-sourcing」建立触发。

**2. TechText / SwarmCursor 细节：保留，但收敛成套路**

理由：这两个组件的**具体行数、每帧算法**对下次没用，但「找缓存键 / 找 cleanup / 找挂载条件 / 定停帧验收」这套检查顺序对任何第三方动画组件都适用。所以写成「通用套路表 + 两个组件的具体落点」，前者是知识，后者是佐证。

如果你确定不再复用这两个组件，删掉 `animation-components.md` 的第 1、2 节即可，套路表仍成立。

## 已验证的事实

- `npx tsc --noEmit` 退出 0
- `npx vitest run` 7 passed
- `node scripts/verify.mjs` 45 断言全 PASS（含 build 那条）
- harness 修复后连跑 2 次无 FAIL（`--no-build` 口径 44 条）
- SKILL.md frontmatter：name 合规，description 418 字符（限 1024），以 "Use when" 开头

## 顺带修的脚本 bug

`scripts/verify.mjs` 的 `overflow-375:*` 断言有竞态：`page.setViewport(375)` 后立刻读 `scrollWidth`，此时 `clientWidth` 已是 375 但 `scrollWidth` 仍是 1280，断言必 FAIL。

已加 `setViewportSettled()`（两次 rAF + 400ms + 轮询到 `{sw,cw}` 连续两次相同且 `cw === width`），并把 1440 / 375 两处也一并替换。

原素材把这个状态记成「48 断言全 PASS」，实际数字是 45 条且只跑一次没暴露这个竞态——**重复跑才暴露**。已作为第 21 条写进 pitfalls，并把素材文档里的断言数与竞态说明一并更正。

## 审核建议的切入点

如果只看一处，看 `references/pitfalls.md` 的编号说明与第 21 条——它同时暴露了「原素材记录不准」和「单次全绿不可信」两件事，是这份草稿里唯一带自我修正性质的内容。
