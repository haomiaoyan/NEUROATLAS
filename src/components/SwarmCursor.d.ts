import type { CSSProperties, ReactNode, ReactElement } from 'react';

/** SwarmCursor（React Bits 源码，.jsx 保持原样）的类型声明。 */
export interface SwarmCursorProps {
  count?: number;
  size?: number;
  shape?: string;
  color?: string;
  accentColor?: string;
  spread?: number;
  speed?: number;
  swirl?: number;
  tail?: number;
  trail?: number;
  wander?: number;
  depth?: number;
  targets?: string;
  idle?: string;
  clickEffect?: string;
  hideCursor?: boolean;
  intro?: boolean;
  enabled?: boolean;
  lightMode?: boolean;
  dpr?: number;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

declare function SwarmCursor(props: SwarmCursorProps): ReactElement;
export default SwarmCursor;
