import type { ReactNode } from 'react';
import './source.css';

/** 数据出处标注（D7）。每个真实数字旁必须出现；查不到出处的数字用「教学示意」文案而非本组件。 */
export default function Source({ children }: { children: ReactNode }) {
  return <span className="source">（出处：{children}）</span>;
}
