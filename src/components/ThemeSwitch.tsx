import { useTheme } from '../theme/ThemeProvider';
import './theme-switch.css';

/** uiverse theme-switch 改造版（D5）。checked = 深色。 */
export default function ThemeSwitch() {
  const { theme, toggle } = useTheme();
  // label 包裹 input 的原生结构保留；aria 文案随状态变化
  const label = theme === 'dark' ? '切换到浅色主题' : '切换到深色主题';

  return (
    <label className="theme-switch" aria-label={label} title={label}>
      <input
        type="checkbox"
        className="theme-switch__checkbox"
        checked={theme === 'dark'}
        onChange={toggle}
      />
      <div className="theme-switch__container">
        <div className="theme-switch__circle-container" />
        <div className="theme-switch__sun-moon-container">
          <div className="theme-switch__moon">
            <div className="theme-switch__spot" />
            <div className="theme-switch__spot" />
            <div className="theme-switch__spot" />
          </div>
        </div>
        <div className="theme-switch__clouds" />
        <div className="theme-switch__stars-container">
          <svg viewBox="0 0 44 24" fill="currentColor" aria-hidden="true">
            <circle cx="6" cy="6" r="1.1" />
            <circle cx="16" cy="3.5" r="0.8" />
            <circle cx="26" cy="7" r="1.3" />
            <circle cx="35" cy="4" r="0.7" />
            <circle cx="12" cy="14" r="0.9" />
            <circle cx="24" cy="16" r="0.6" />
            <circle cx="33" cy="13" r="1.0" />
            <circle cx="40" cy="9" r="0.7" />
          </svg>
        </div>
      </div>
    </label>
  );
}
