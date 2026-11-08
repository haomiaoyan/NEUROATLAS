import type { CSSProperties, ReactNode, ReactElement } from 'react';

/** PillNav（用户提供的胶囊导航源码，.jsx 保持原样）的类型声明。 */
export interface PillNavItem {
  label: string;
  href: string;
  /** 可选图标（渲染在 label 前） */
  icon?: ReactNode;
  /** 无障碍名称（图标条目必填） */
  ariaLabel?: string;
}

export interface PillNavProps {
  logo?: ReactNode;
  logoAlt?: string;
  logoHref?: string;
  items?: PillNavItem[];
  activeHref?: string;
  defaultActiveIndex?: number;
  onItemClick?: (item: PillNavItem, index: number, event: unknown) => void;
  linkComponent?: unknown;
  theme?: string;
  layout?: string;
  size?: string;
  surface?: string;
  itemStyle?: string;
  hoverEffect?: string;
  indicator?: string;
  highlightColor?: string;
  highlightTextColor?: string;
  barColor?: string;
  textColor?: string;
  bounce?: number;
  stretch?: number;
  intro?: boolean;
  collapse?: string;
  onMenuToggle?: (open: boolean) => void;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

declare function PillNav(props: PillNavProps): ReactElement;
export default PillNav;
