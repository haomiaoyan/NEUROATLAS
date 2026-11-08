import ThemeSwitch from './components/ThemeSwitch';

/** B0 临时页面：双主题验收载体。B1 起逐步替换为 Hero/TopNav。 */
export default function App() {
  return (
    <>
      <header className="topnav">
        <span className="topnav__brand">NEUROATLAS</span>
        <span className="topnav__switch-slot">
          <ThemeSwitch />
        </span>
      </header>
      <main className="b0-main">
        <h1 className="b0-title">860 亿个神经元，正在读这一行字。</h1>
        <p className="b0-body" data-contrast="body">
          这是 B0 批次的临时验收页：只验证双主题系统、主题切换开关与验收工具链。
          正文对比度断言取本段计算样式（--ink-2 对实际背景）。
          数据出处：Azevedo et al., 2009（神经元数量为文献估值）。
        </p>
        <div
          className="b0-swatches"
          data-viz
          role="img"
          aria-label="Okabe-Ito 数据编码色板示例：七个色块，主题切换时不变"
        >
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <span key={i} className={`b0-swatch b0-swatch--${i}`} aria-hidden="true" />
          ))}
        </div>
      </main>
    </>
  );
}
