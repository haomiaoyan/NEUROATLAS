import { useEffect } from 'react';
import Hero from './sections/Hero';
import ScaleAxis from './sections/ScaleAxis';
import SignalStage from './sections/SignalStage';
import SynapseSection from './sections/SynapseSection';
import MapSection from './sections/MapSection';
import MemorySection from './sections/MemorySection';
import QuizSection from './sections/QuizSection';
import Outro from './sections/Outro';
import TopNav from './components/TopNav';
import GlowCard from './components/GlowCard';
import { FACTS } from './data/sources';
import './styles/reveal.css';

/** B7 页面：尺度轴总览（CH01 之前）+ 四章 + 目录 + Outro。 */
export default function App() {
  useEffect(() => {
    /* 验收钩子：页面所有 data-fact 的 id 必须在注册表内 */
    (window as unknown as Record<string, unknown>).__factIds = FACTS.map((f) => f.id);

    /* 章节入场淡入：统一给章节头/可视化/尺度轴加类，reduced-motion 直接可见 */
    const els = document.querySelectorAll('.chapter__head, .chapter__viz, .scale__list');
    els.forEach((el) => el.classList.add('reveal'));
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('reveal--in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('reveal--in');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <TopNav />
      <Hero />
      <ScaleAxis />
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
      <QuizSection />
      <Outro />
    </>
  );
}
