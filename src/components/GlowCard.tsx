import type { ReactNode } from 'react';
import './glow-card.css';

/** 发光边框卡片（B2）。双层元素法实现渐变描边（坑 #7：mask-composite 会整卡纯黑，禁用）。
    外圈光晕用 --glow-blend（浅色 multiply / 深色 screen，D2）。 */
export default function GlowCard({
  title,
  accent = '1',
  children,
}: {
  title: string;
  /** 序号，用于限定描边渐变的角度变化（纯装饰） */
  accent?: string;
  children: ReactNode;
}) {
  return (
    <div className={`glow-card glow-card--${accent}`} data-glow-card>
      <span className="glow-card__edge" aria-hidden="true" />
      <span className="glow-card__halo" aria-hidden="true" />
      <div className="glow-card__body">
        <h3 className="glow-card__title">{title}</h3>
        <div className="glow-card__content">{children}</div>
      </div>
    </div>
  );
}
