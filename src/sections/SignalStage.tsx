import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './signal-stage.css';

gsap.registerPlugin(ScrollTrigger);

const STATIONS = [
  {
    n: '01',
    title: '静息态',
    mv: '-70 mV',
    text: '神经元安静时，膜内外维持约 70 毫伏的电位差，钠钾泵默默值守，为下一次发射蓄势。',
  },
  {
    n: '02',
    title: '刺激到来',
    mv: '去极化',
    text: '邻近神经元传来的电信号打开钠通道，带正电的钠离子涌入，膜电位开始爬升。',
  },
  {
    n: '03',
    title: '越过阈值',
    mv: '-55 mV',
    text: '一旦越过约 -55 mV 的门槛，「全有全无」发射启动——刺激不够就完全沉默，够了就全力开火。',
  },
  {
    n: '04',
    title: '动作电位',
    mv: '+30 mV',
    text: '膜电位瞬间反转、冲上峰值，随后钾通道接棒复极化，把电位拉回基线，清空跑道。',
  },
  {
    n: '05',
    title: '远途传递',
    mv: '120 m/s',
    text: '在有髓鞘的轴突上，信号以最高约 120 米每秒的速度跳跃式前进，一路奔向下一名邻居。',
  },
];

/** 长舞台：电信号传导（B3）。
    三层结构（D6/附加段1）：.stage-pin（全宽背景）→ .stage-window（限宽裁剪）→ .stage-track（横向轨道）。
    规则落地：pin 起点 'top 68px'（--nav-h=64 含边框，留 4px 间隙，坑 #4）；
    位移基准 clientWidth；轨道宽度自行合成不用 scrollWidth（坑 #3）；
    行程 = 位移 × 3.5；<768px 与 reduced-motion 降级竖排静态（D9）。
    注意：本节在 body 直下、未套限宽容器，width:100% 即 clientWidth，
    坑 #1 的 100vw 写法只在限宽容器内需要（此处留 --sbw 机制备用）。 */
export default function SignalStage() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const curveRef = useRef<SVGPathElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    /* --sbw：ResizeObserver 观察 documentElement 盒模型（坑 #2：滚动条出现不触发 resize） */
    const applySbw = () => {
      const sbw = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.setProperty('--sbw', `${sbw}px`);
    };
    applySbw();
    const sbwRo = new ResizeObserver(applySbw);
    sbwRo.observe(document.documentElement);

    /* 轨道宽度自行合成（坑 #3：scrollWidth 不含尾部 padding） */
    const synthTrackWidth = () => {
      const track = trackRef.current;
      if (!track) return 0;
      const cards = Array.from(track.querySelectorAll<HTMLElement>('.station'));
      let w = 0;
      cards.forEach((c) => (w += c.offsetWidth));
      const cs = getComputedStyle(track);
      const gap = parseFloat(cs.columnGap) || 0;
      const padL = parseFloat(cs.paddingLeft) || 0;
      const padR = parseFloat(cs.paddingRight) || 0;
      return w + gap * Math.max(0, cards.length - 1) + padL + padR;
    };

    /* 动作电位曲线：先量长度，供 scrub 描画 */
    const curve = curveRef.current;
    const curveLen = curve ? curve.getTotalLength() : 0;
    if (curve) {
      curve.style.strokeDasharray = `${curveLen}`;
      curve.style.strokeDashoffset = `${curveLen}`;
    }

    /* 坑 #6：字体加载会改变文档高度，fonts.ready 和 load 各 refresh 一次 */
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh, refresh);
    if (document.readyState === 'complete') refresh();
    else window.addEventListener('load', refresh, { once: true });

    const mm = gsap.matchMedia();

    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      const track = trackRef.current;
      const win = track?.parentElement;
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
          onUpdate: (self) => {
            if (counterRef.current) {
              const idx = Math.min(STATIONS.length, Math.floor(self.progress * STATIONS.length) + 1);
              counterRef.current.textContent = `${String(idx).padStart(2, '0')} / ${String(STATIONS.length).padStart(2, '0')}`;
            }
          },
        },
      });
      tl.to(track, { x: () => -distance(), ease: 'none' }, 0);
      if (curve) {
        tl.to(curve, { strokeDashoffset: 0, ease: 'none' }, 0);
      }

      /* 验收钩子（verify.mjs 用，D10） */
      (window as unknown as Record<string, unknown>).__stage = () => ({
        pinCount: ScrollTrigger.getAll().filter((s) => s.vars.pin).length,
        travel: distance(),
        trackW: synthTrackWidth(),
        winW: win.clientWidth,
        sectionTop: section.getBoundingClientRect().top,
        trackX: gsap.getProperty(track, 'x') as number,
      });

      return () => {
        delete (window as unknown as Record<string, unknown>).__stage;
      };
    });

    /* 移动端/降级：单次淡入 */
    const fadeTargets = sectionRef.current?.querySelectorAll('.stage-fade');
    const io =
      fadeTargets && fadeTargets.length
        ? new IntersectionObserver(
            (entries) =>
              entries.forEach((e) => {
                if (e.isIntersecting) e.target.classList.add('stage-in');
              }),
            { threshold: 0.15 },
          )
        : null;
    fadeTargets?.forEach((t) => io?.observe(t));

    return () => {
      mm.revert();
      sbwRo.disconnect();
      io?.disconnect();
      window.removeEventListener('load', refresh);
    };
  }, []);

  return (
    <section className="stage-section" id="signal" ref={sectionRef} data-stage>
      <div className="stage-pin">
        <div className="stage-window">
          <header className="stage-head stage-fade">
            <p className="stage-kicker">CHAPTER 01</p>
            <h2 className="stage-title">一颗粒子的极速狂奔</h2>
            <p className="stage-sub">
              从「静息」到「发射」，一次动作电位只用约 1 毫秒——文献出处见页尾「参考资料」。
            </p>
            <span className="stage-counter" ref={counterRef} aria-hidden="true">
              01 / 05
            </span>
          </header>
          <div className="stage-track" ref={trackRef}>
            {STATIONS.map((s) => (
              <article className="station" key={s.n}>
                <span className="station__n">{s.n}</span>
                <h3 className="station__title">{s.title}</h3>
                <p className="station__mv">{s.mv}</p>
                <p className="station__text">{s.text}</p>
              </article>
            ))}
          </div>
          <svg
            className="stage-curve"
            viewBox="0 0 1100 170"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="动作电位示意图（教学示意）：膜电位从 -70mV 静息电位快速升至 +30mV 峰值，随后回落并短暂低于静息水平"
          >
            <line className="stage-curve__threshold" x1="20" y1="96" x2="1080" y2="96" />
            <text className="stage-curve__label" x="24" y="88">阈值 -55 mV</text>
            <path
              ref={curveRef}
              className="stage-curve__path"
              d="M 20 140 C 120 140 160 138 200 130 C 240 122 258 40 295 38 C 332 40 352 118 405 128 C 465 138 520 146 560 150 C 610 154 680 146 760 142 C 860 137 980 139 1080 138"
              fill="none"
            />
            <text className="stage-curve__label" x="24" y="160">-70 mV</text>
            <text className="stage-curve__label" x="285" y="26">+30 mV</text>
          </svg>
        </div>
      </div>
    </section>
  );
}
