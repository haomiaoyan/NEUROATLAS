import { useEffect, useMemo, useState } from 'react';
import TechText from '../components/TechText';
import SwarmCursor from '../components/SwarmCursor';
import Source from '../components/Source';
import { useTheme } from '../theme/ThemeProvider';
import './hero.css';

/** SwarmCursor 挂载条件（D9/D3）：≥768px 且无 reduced-motion */
function useSwarmEnabled(): boolean {
  const calc = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 768px)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [on, setOn] = useState<boolean>(calc);
  useEffect(() => {
    const width = window.matchMedia('(min-width: 768px)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setOn(width.matches && !motion.matches);
    width.addEventListener('change', update);
    motion.addEventListener('change', update);
    return () => {
      width.removeEventListener('change', update);
      motion.removeEventListener('change', update);
    };
  }, []);
  return on;
}

/**
 * Hero：SwarmCursor（粒子群，canvas 在内容层之下）+ TechText 主标题 + DOM 中文副标。
 * 布局按 D11 预留边界声明条位置（.hero__boundary，B5 填充）。
 */
export default function Hero() {
  const { theme } = useTheme();
  const swarmOn = useSwarmEnabled();

  // 主题色 → SwarmCursor 是 WebGL canvas，需要具体色值，从 CSS 变量读取
  const { ink, accent } = useMemo(() => {
    const cs = getComputedStyle(document.documentElement);
    return {
      ink: cs.getPropertyValue('--ink').trim() || '#1a1d21',
      accent: cs.getPropertyValue('--accent').trim() || '#4338ca',
    };
  }, [theme]);

  const inner = (
    <div className="hero__inner">
      <div className="hero__title" data-hero-title>
        <TechText
          text="NEUROATLAS"
          sweep={false}
          intro="none"
          fontSize={150}
          draggable={false}
        />
      </div>
      <p className="hero__tagline">
        你的头骨里约有 <strong className="hero__num">86,000,000,000</strong> 个神经元——
        每一个都正在和你一起读这行字。
        <Source>Azevedo et al., 2009，文献估值</Source>
      </p>
    </div>
  );

  return (
    <section className="hero" data-hero>
      {swarmOn ? (
        <SwarmCursor
          className="hero__swarm"
          lightMode={theme === 'light'}
          color={ink}
          accentColor={accent}
          idle="roam"
        >
          {inner}
        </SwarmCursor>
      ) : (
        <div className="hero__swarm">{inner}</div>
      )}
      {/* D7：边界声明条——首屏可见位置，不是页脚小字 */}
      <p className="hero__boundary" data-boundary>
        本站为课程教学演示，内容基于公开文献但不构成医疗建议 · 各章节数字旁附出处
      </p>
    </section>
  );
}
