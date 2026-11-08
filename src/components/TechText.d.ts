import type { CSSProperties, ReactElement } from 'react';

/** TechText（React Bits 源码，.jsx 保持原样）的类型声明。类型放宽为 string/number 以匹配源码运行时行为。 */
export interface TechTextProps {
  text?: string;
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  letterSpacing?: number;
  color?: string;
  accentColor?: string;
  align?: string;
  reach?: number;
  softness?: number;
  dashLength?: number;
  dashGap?: number;
  strokeWidth?: number;
  lineStyle?: string;
  reveal?: string;
  specks?: number;
  selection?: boolean;
  labels?: boolean;
  draggable?: boolean;
  bounce?: number;
  sweep?: boolean;
  speed?: number;
  clickKick?: boolean;
  intro?: string;
  introDuration?: number;
  guides?: boolean;
  className?: string;
  style?: CSSProperties;
}

declare function TechText(props: TechTextProps): ReactElement;
export default TechText;
