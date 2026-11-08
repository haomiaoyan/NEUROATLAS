import Hero from './sections/Hero';
import TopNav from './components/TopNav';
import GlowCard from './components/GlowCard';
import SocialLinks from './components/SocialLinks';
import Source from './components/Source';

/** B2 页面：TopNav + Hero + 组件验收区（卡片组 / 社交图标 / 对比度锚点）。 */
export default function App() {
  return (
    <>
      <TopNav />
      <Hero />
      <main className="b0-main">
        <h2 className="b0-h2">三个章节，正在路上</h2>
        <p className="b0-body" data-contrast="body">
          本段为验收锚点：正文对比度断言取本段计算样式（--ink-2 对实际背景）。
          神经元之间平均每个有约 7,000 个突触连接，全脑连接总量在百万亿量级
          <Source>教学示意，非精确文献值</Source>
        </p>
        <div className="card-group">
          <GlowCard title="电信号 · 8.3 任务">
            一个动作电位如何沿着轴突以最高 120 m/s 的速度奔跑——长舞台章节将把它拉成一条可以横向
            巡览的「信号跑道」。
          </GlowCard>
          <GlowCard title="突触 · 百万亿连接" accent="2">
            每个神经元平均与约 7,000 个同伴相连。连接的强弱如何变化，就是「学习」在物理世界的样子。
          </GlowCard>
          <GlowCard title="记忆 · 如何留下痕迹" accent="3">
            你昨天的记忆此刻存在于哪里？海马体如何把短期印象转写成皮层里的长期档案。
          </GlowCard>
        </div>
        <div className="b0-social-row">
          <SocialLinks />
        </div>
        <div
          className="b0-swatches"
          data-viz
          role="img"
          aria-label="Okabe-Ito 数据编码色板示例：七个色块，主题切换时不变"
        >
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <span key={i} className={`b0-swatch b0-swatch--${i}`} aria-hidden="true" />
          ))}
        </div>
      </main>
    </>
  );
}
