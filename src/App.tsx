import Hero from './sections/Hero';
import ThemeSwitch from './components/ThemeSwitch';

/** B0/B1 过渡期页面：Hero + 下方保留验收锚点（对比度段落、数据色板）。 */
export default function App() {
  return (
    <>
      <header className="topnav">
        <span className="topnav__brand">NEUROATLAS</span>
        <span className="topnav__switch-slot">
          <ThemeSwitch />
        </span>
      </header>
      <Hero />
      <main className="b0-main">
        <p className="b0-body" data-contrast="body">
          章节施工中（B3-B4）。本段为验收锚点：正文对比度断言取本段计算样式（--ink-2 对实际背景）。
          神经元之间平均每个有约 7,000 个突触连接，全脑连接总量在百万亿量级——
          这个数字没有单篇论文能精确给出，属于「教学示意」级别（出处系统在 B4 上线）。
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
