import FactChip from '../components/FactChip';
import { getFact } from '../data/sources';
import './chapters.css';
import './memory.css';

const STAGES = [
  { title: '短期记忆', time: '秒 → 分钟', text: '此刻持有的信息，容量只有几个组块，不打扰就消散。' },
  { title: '海马体转写', time: '睡眠中高峰', text: '海马体像转写员，把当天重要的片段重放、打包，送往皮层。' },
  { title: '长期记忆', time: '天 → 一生', text: '写进皮层的连接 weights——突触强度改变，记忆才真正落袋。' },
];

/** CHAPTER 04 · 记忆：如何留下痕迹（B4） */
export default function MemorySection() {
  const hm = getFact('hm-case');
  const ltp = getFact('ltp');
  return (
    <section className="chapter" id="memory">
      <div className="chapter__inner">
        <header className="chapter__head">
          <p className="chapter__kicker">CHAPTER 04 · 记忆</p>
          <h2 className="chapter__title">如何留下痕迹</h2>
        </header>
        <div className="chapter__grid">
          <div className="chapter__text">
            <p className="chapter__body">
              记忆不是存在某一个格子里的文件，而是突触连接强度的改变。1973 年科学家在海马体里
              第一次拍到这种改变（LTP）：被反复激活的突触会变强——这就是「学习」的物理形态。
              而证明海马体是转写员的，是一台注定载入教科书的手术。
            </p>
            <FactChip fact={ltp} />
            <FactChip fact={hm} />
          </div>
          <figure
            className="chapter__viz"
            data-viz
            role="img"
            aria-label="记忆形成流程（教学示意）：短期记忆保存数秒到数分钟，海马体在睡眠中把片段转写给皮层，形成可保存一生的长期记忆"
          >
            <ol className="mem-flow">
              {STAGES.map((s, i) => (
                <li key={s.title} className="mem-step">
                  <span className="mem-step__idx" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div>
                    <strong className="mem-step__title">{s.title}</strong>
                    <span className="mem-step__time">{s.time}</span>
                    <p className="mem-step__text">{s.text}</p>
                  </div>
                  {i < STAGES.length - 1 && <span className="mem-step__arrow" aria-hidden="true" />}
                </li>
              ))}
            </ol>
            <figcaption>流程为教学示意：转写的具体机制仍是活跃的研究领域。</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
