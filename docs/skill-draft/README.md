# 技能整理素材 → skill 草稿：交付说明

本目录是依据 `docs/技能整理素材-方法与动画全集.md` 整理出的 **skill 草稿**，供审核。

## 目录结构

```
docs/skill-draft/visual-narrative-site/
├── SKILL.md                       主文件：七阶段流程 + 提问清单 + 审核模板 + 汇报格式
├── references/
│   ├── verify-recipes.md          13 种运行时测量技术 + 两个坐标/管线陷阱
│   └── pitfalls.md                22 条实测坑（现象→根因→修复→通用规则）
└── assets/
    ├── long-stage.tsx             长舞台 GSAP 驱动（可直接改参数用）
    ├── long-stage.css             长舞台三层结构 CSS
    ├── tokens.css                 双主题 tokens（含混合模式变量）
    └── verify-skeleton.mjs.md     验收脚本骨架（markdown 包裹，便于阅读）
```

安装时把整个目录搬到 skills 目录即可；`assets/verify-skeleton.mjs.md` 若要用请去掉 `.md` 后缀并改回 `.mjs`。

## 相对原素材做的改动

| 原素材 | 草稿 | 原因 |
|---|---|---|
| 20 条坑 | 22 条 | 新增第 21 条（`setViewport` 后布局异步，实测造成偶发 FAIL）、第 22 条（渐变描边不能用 `mask-composite`/`border-image`，原素材 §5.7 只写在实现细节里，属于通用规则） |
| 坑编号按「发现顺序」 | 按类别排（布局/构建/交互） | 便于检索；文末附与源码 `坑 #N` 的对应说明，明确两套编号不等价 |
| §5 动画细节 11 小节全部保留 | 未进 skill | 那是具体组件的集成记录（sprite 缓存键、每帧算法、集成改动逐条），属于项目实现而非可复用技术；只把其中可复用的结构（长舞台三层、双主题 tokens）抽成 assets |
| 「实战案例」框 | 已删除 | 按原素材给的整理原则：保留判据和数字，删业务细节 |
| 具体数字（68px、3.5 行程、16.7ms、8.43 对比度等） | 全部保留 | 这些是实现参数与验收阈值，换项目需要重新标定，但知道量级能省一轮试错 |
| §7 数据出处系统 | **未收录** | 见下 |

## 两个待你决定的点

**1. §7「科普/医学内容数据出处系统」放哪**

原素材建议「独立成 skill 或并入主 skill 附录」。它确实是通用能力（任何数据类内容站的诚实性底线），但和「可视化叙事网站交付」的触发条件几乎不重叠——做数据站的人不一定做长滚动叙事，反过来也是。

三种放法：
- A. 并入主 skill 附录（触发词最宽，但主 skill 会变长，且大部分时候用不到）
- B. 独立成第二个 skill（`content-sourcing`，触发条件干净）
- C. 不收录（判定为过窄）

**2. 本项目的动画细节要不要另立一份**

TechText（sprite 缓存键含 ink 色值 → 主题切换自动重建）、SwarmCursor（每帧 2 次半拉格朗日平流 + 12 步压力求解）、停帧机制（`sweep=false` 时 `active = pointer.inside || dragging`）这些是这套组件本身的移植要点。

如果以后还要用这两个组件，值得单独留一份；如果只做这一次，删掉更干净。

## 已验证的事实

- `npx tsc --noEmit` 退出 0
- `npx vitest run` 7 passed
- `node scripts/verify.mjs` 45 断言全 PASS（含 build）
- 修 harness 后连跑 2 次无 FAIL

## 顺带修的脚本 bug

`scripts/verify.mjs` 的 `overflow-375:*` 断言存在竞态：`page.setViewport(375)` 后立刻读 `scrollWidth`，此时 `clientWidth` 已是 375 但 `scrollWidth` 仍是 1280，断言必 FAIL。已加 `setViewportSettled()` 封装（等两次 rAF + 400ms + 轮询到稳定且 `clientWidth === width`），并把 1440 / 375 两处也一并替换。这个 bug 在原素材里被记成「全 PASS」，实际是**只跑一次没暴露**——已作为第 21 条写进 pitfalls。
