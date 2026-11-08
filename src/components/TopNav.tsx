import { useEffect, useRef } from 'react';
import PillNav from './PillNav';
import ThemeSwitch from './ThemeSwitch';
import { useTheme } from '../theme/ThemeProvider';
import './topnav.css';

const ITEMS = [
  { label: '信号', href: '#signal' },
  { label: '突触', href: '#synapse' },
  { label: '地图', href: '#map' },
  { label: '记忆', href: '#memory' },
  { label: 'GitHub', href: 'https://github.com/haomiaoyan/NEUROATLAS' },
];

/** 悬浮胶囊导航（B5 用户指定样式，PillNav 源码集成）。
    进度条独立于胶囊、固定在视口最上缘（scroll+rAF，规避坑 #6）。
    GitHub 项指向精确仓库地址（用户反馈 #1：不能跳到总主页）。 */
export default function TopNav() {
  const { theme } = useTheme();
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div className="progress-bar" ref={barRef} aria-hidden="true" />
      <div className="navhost" data-nav>
        <PillNav
          logo={<span className="navhost__brand">NEUROATLAS</span>}
          logoHref="#"
          items={ITEMS}
          theme={theme}
          ariaLabel="站点导航"
        />
      </div>
      <div className="navhost__switch">
        <ThemeSwitch />
      </div>
    </>
  );
}
