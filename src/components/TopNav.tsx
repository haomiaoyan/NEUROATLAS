import { useEffect, useRef, useState } from 'react';
import PillNav from './PillNav';
import ThemeSwitch from './ThemeSwitch';
import { useTheme } from '../theme/ThemeProvider';
import './topnav.css';

/** 项目图标：三节点神经回路（同 favicon.svg）。 */
function BrandIcon() {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#101319" />
      <rect width="32" height="32" rx="8" fill="none" stroke="#818cf8" strokeOpacity="0.45" strokeWidth="1.4" />
      <g stroke="#818cf8" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.9">
        <path d="M9 22 L15 11 L23 17" />
        <path d="M15 11 L10 7" />
      </g>
      <circle cx="9" cy="22" r="2.6" fill="#56b4e9" />
      <circle cx="15" cy="11" r="3.2" fill="#818cf8" />
      <circle cx="23" cy="17" r="2.4" fill="#56b4e9" />
      <circle cx="10" cy="7" r="1.8" fill="#e8eaf0" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

const SECTION_IDS = ['scale', 'signal', 'synapse', 'map', 'memory'];

const ITEMS = [
  { label: '尺度', href: '#scale' },
  { label: '信号', href: '#signal' },
  { label: '突触', href: '#synapse' },
  { label: '地图', href: '#map' },
  { label: '记忆', href: '#memory' },
  { icon: <GitHubIcon />, label: '', ariaLabel: 'GitHub 项目仓库', href: 'https://github.com/haomiaoyan/NEUROATLAS' },
];

/** 悬浮胶囊导航（PillNav 源码集成）。B7：activeHref 跟随滚动高亮当前章节。 */
export default function TopNav() {
  const { theme } = useTheme();
  const barRef = useRef<HTMLDivElement>(null);
  const [activeHref, setActiveHref] = useState('#scale');

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;

      /* 章节高亮：判定线取视口顶部 160px（导航 68px 之后再留余量） */
      let current = SECTION_IDS[0];
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 160) current = id;
      }
      setActiveHref(`#${current}`);
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
          logo={<BrandIcon />}
          logoAlt="NEUROATLAS 首页"
          logoHref="#"
          items={ITEMS}
          activeHref={activeHref}
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
