import Hero from './sections/Hero';
import SignalStage from './sections/SignalStage';
import SynapseSection from './sections/SynapseSection';
import MapSection from './sections/MapSection';
import MemorySection from './sections/MemorySection';
import Outro from './sections/Outro';
import TopNav from './components/TopNav';
import GlowCard from './components/GlowCard';

/** B5 页面：完整站点。锚点段（对比度/色板）保留在目录区供 verify 使用。 */
export default function App() {
  return (
    <>
      <TopNav />
      <Hero />
      <SignalStage />
      <SynapseSection />
      <MapSection />
      <MemorySection />
      <main className="index">
        <h2 className="index__title">漏掉了？从这里挑一章</h2>
        <p className="index__body" data-contrast="body">
          章节可以随时跳转。本段同时是验收锚点：正文对比度断言取本段计算样式（--ink-2 对实际背景）。
          全站数字的文献出处统一列在页尾「参考资料」。
        </p>
        <div className="card-group">
          <a className="index__link" href="#synapse">
            <GlowCard title="CHAPTER 02 · 突触">
              电信号换成化学语言的地方。7,000 个连接点与百万亿量级的总图景。
            </GlowCard>
          </a>
          <a className="index__link" href="#map">
            <GlowCard title="CHAPTER 03 · 大脑地图" accent="2">
              谁在负责什么：皮层 160 亿神经元的分区地图，以及 20% 的能量账单。
            </GlowCard>
          </a>
          <a className="index__link" href="#memory">
            <GlowCard title="CHAPTER 04 · 记忆" accent="3">
              突触强度如何改变，H.M. 的手术如何证明海马体是转写员。
            </GlowCard>
          </a>
        </div>
        <div
          className="index__swatches"
          data-viz
          role="img"
          aria-label="Okabe-Ito 数据编码色板示例：七个色块，主题切换时不变"
        >
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <span key={i} className={`index__swatch index__swatch--${i}`} aria-hidden="true" />
          ))}
        </div>
      </main>
      <Outro />
    </>
  );
}
