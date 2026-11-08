# NEUROATLAS · 神经图谱

一份用可交互可视化讲解神经信号基础知识的**课程教学演示网站**。

> 你的头骨里约有 86,000,000,000 个神经元——每一个都正在和你一起读这行字。

## 它是什么 / 不是什么

- **是**：前端课程作品，用滚动叙事 + 可视化讲解「一颗粒子如何在脑中以 120 m/s 奔跑」
- **不是**：医疗建议，也不是真实临床数据的复现；每个数字旁都标了文献出处或「教学示意」

## 内容结构

| 章节 | 内容 |
|---|---|
| Hero | 数字冲击开场（TechText 标题 + SwarmCursor 粒子群） |
| CHAPTER 01 长舞台 | 动作电位：静息 -70 mV → 阈值 -55 mV → 峰值 +30 mV → 120 m/s |
| CHAPTER 02 突触 | 电信号 ↔ 化学信号的换乘站 |
| CHAPTER 03 大脑地图 | 皮层分区与 20% 的能量账单 |
| CHAPTER 04 记忆 | 短期记忆 → 海马体转写 → 长期记忆（H.M. 案例） |

## 技术栈

- React 18 + Vite 5 + TypeScript（strict）
- 动效：gsap@3.15.1（ScrollTrigger 长舞台 pin + scrub）
- TechText / SwarmCursor（React Bits 源码集成，三处适配改动）
- 双主题（浅色默认 / 深色一键切换），数据编码色采用 Okabe-Ito 色盲友好色板且不随主题变化
- 无障碍：所有可视化 `role="img"` + `aria-label`；`prefers-reduced-motion` 下动效全停、信息不减

## 运行

```bash
npm install
npm run dev        # 开发（localhost:5173）
npm run build      # 类型检查 + 构建
npm run verify     # 46 条脚本化验收（对比度/溢出/pin/travel/帧率，双主题各跑）
npm test           # vitest（主题逻辑 + 出处系统校验）
```

## 工程约定

- 每个数字必须在 `src/data/sources.ts` 注册并带 `source` 字段（vitest 强制校验）
- 验收以 `npm run build` 为准（vitest 不拦类型错），`scripts/verify.mjs` 为浏览器级断言
- 分批交付：`b0` 脚手架与双主题 → `b1` Hero → `b2` 导航与组件 → `b3` 长舞台 → `b4` 内容章节 → `b5` 收尾，每个 tag 可独立回滚
