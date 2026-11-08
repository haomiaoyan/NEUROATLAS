import { useEffect, useRef } from 'react';
import ThemeSwitch from './ThemeSwitch';
import './topnav.css';

/** 正式导航（B2）。fixed 覆盖在 hero 之上，毛玻璃底；进度条贴导航下缘。
    进度用 scroll+rAF 计算（不经过 ScrollTrigger，规避坑 #6 的文档高度缓存）。
    类名全部 .topnav .topnav__xxx 形式（坑 #9：裸类名会被 .topnav a 压过）。 */
export default function TopNav() {
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
    <header className="topnav">
      <span className="topnav__brand">NEUROATLAS</span>
      <span className="topnav__switch-slot">
        <ThemeSwitch />
      </span>
      <div className="topnav__progress" ref={barRef} aria-hidden="true" />
    </header>
  );
}
