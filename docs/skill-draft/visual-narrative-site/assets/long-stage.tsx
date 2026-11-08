/* 长舞台 · GSAP 驱动模板
   三条落地规则：
   1) pin 起点 = 导航高 + 显式间隙，写成字面量（'top 68px'），验收断言 pinTop - navBottom >= 4
   2) 轨道宽度自行合成，不用 scrollWidth（不含尾部 padding）
   3) 行程 = 位移 × 3.5（1 倍会一闪而过，用户会当成卡顿）

   降级：gsap.matchMedia 只在 (min-width: 768px) and (prefers-reduced-motion: no-preference) 里建 pin。
*/

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './long-stage.css';

gsap.registerPlugin(ScrollTrigger);

export default function LongStage() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    const synthTrackWidth = () => {
      const track = trackRef.current;
      if (!track) return 0;
      const cards = Array.from(track.querySelectorAll('.station'));
      let w = 0;
      cards.forEach((c) => (w += c.offsetWidth));
      const cs = getComputedStyle(track);
      return (
        w +
        (parseFloat(cs.columnGap) || 0) * Math.max(0, cards.length - 1) +
        (parseFloat(cs.paddingLeft) || 0) +
        (parseFloat(cs.paddingRight) || 0)
      );
    };

    /* 字体加载会改变文档高度，必须 refresh 两次 */
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh, refresh);
    if (document.readyState === 'complete') refresh();
    else window.addEventListener('load', refresh, { once: true });

    const mm = gsap.matchMedia();

    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      const track = trackRef.current;
      const win = track?.parentElement;   // 裁剪窗 = 轨道父元素
      const section = sectionRef.current;
      if (!track || !win || !section) return;

      const distance = () => Math.max(0, synthTrackWidth() - win.clientWidth);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 68px',
          end: () => `+=${distance() * 3.5}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
      tl.to(track, { x: () => -distance(), ease: 'none' }, 0);

      /* 验收钩子：只暴露可量测的事实，不暴露内部状态 */
      window.__stage = () => ({
        pinCount: ScrollTrigger.getAll().filter((s) => s.vars.pin).length,
        travel: distance(),
        trackW: synthTrackWidth(),
        winW: win.clientWidth,
        sectionTop: section.getBoundingClientRect().top,
        trackX: gsap.getProperty(track, 'x'),
      });

      return () => {
        delete window.__stage;
      };
    });

    return () => {
      mm.revert();
      window.removeEventListener('load', refresh);
    };
  }, []);

  return (
    <section className="stage-section" data-stage ref={sectionRef}>
      <div className="stage-pin">
        <div className="stage-window">
          <header className="stage-head">
            <p className="stage-kicker">CHAPTER 01</p>
            <h2 className="stage-title">章节标题</h2>
          </header>
          <div className="stage-track" ref={trackRef}>
            {[1, 2, 3, 4, 5].map((n) => (
              <article className="station" key={n}>
                <span className="station__n">{String(n).padStart(2, '0')}</span>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
