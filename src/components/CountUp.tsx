import { useEffect, useRef, useState } from 'react';

const fmt = (n: number) => n.toLocaleString('en-US');

/** 进视口数字滚动（B7）。reduced-motion 直接显示终值；data-countup 存期望终值供验收断言比对。 */
export default function CountUp({
  value,
  unit = '',
  prefix = '',
  duration = 900,
}: {
  value: number;
  unit?: string;
  prefix?: string;
  duration?: number;
}) {
  const finalText = `${prefix}${fmt(value)}${unit}`;
  const reduced =
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [display, setDisplay] = useState(reduced ? fmt(value) : '0');
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reduced) {
      setDisplay(fmt(value));
      return;
    }
    let raf = 0;
    let start = 0;
    let played = false;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - (1 - p) ** 3;
      setDisplay(fmt(Math.round(value * eased)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !played) {
          played = true;
          raf = requestAnimationFrame(tick);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    if (ref.current) io.observe(ref.current);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [value, duration, reduced]);

  return (
    <span ref={ref} data-countup={finalText}>
      {prefix}
      {display}
      {unit}
    </span>
  );
}
