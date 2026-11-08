import FactChip from '../components/FactChip';
import { getFact } from '../data/sources';
import './chapters.css';
import './synapse.css';

/** CHAPTER 02 · 突触：连接的化学（B4） */
export default function SynapseSection() {
  const per = getFact('synapses-per-neuron');
  const total = getFact('synapse-total');
  return (
    <section className="chapter" id="synapse">
      <div className="chapter__inner">
        <header className="chapter__head">
          <p className="chapter__kicker">CHAPTER 02 · 突触</p>
          <h2 className="chapter__title">连接的化学</h2>
        </header>
        <div className="chapter__grid">
          <div className="chapter__text">
            <p className="chapter__body">
              电信号奔到轴突末梢并不直接跳过去——它在这里换成化学语言。囊泡把神经递质吐进
              约 20-40 纳米的突触间隙，分子飘过对岸、扣上受体，下一个神经元才重新点火。
              电 → 化学 → 电，每一次思考都要经历亿万次这样的换乘。
            </p>
            <FactChip fact={per} />
            <FactChip fact={total} />
          </div>
          <figure
            className="chapter__viz"
            data-viz
            role="img"
            aria-label="突触结构示意图（教学示意）：轴突末梢内的囊泡释放神经递质，化学分子跨越突触间隙，与突触后膜的受体结合"
          >
            <svg viewBox="0 0 400 270" aria-hidden="true">
              {/* 突触前末梢 */}
              <path
                className="sy-terminal"
                d="M70 30 C70 12 330 12 330 30 L330 88 C330 108 300 118 270 118 L130 118 C100 118 70 108 70 88 Z"
              />
              {/* 囊泡 */}
              <circle className="sy-vesicle" cx="140" cy="52" r="16" />
              <circle className="sy-vesicle" cx="200" cy="42" r="14" />
              <circle className="sy-vesicle" cx="258" cy="56" r="16" />
              <circle className="sy-vesicle" cx="176" cy="86" r="13" />
              <circle className="sy-vesicle" cx="238" cy="90" r="14" />
              {/* 突触间隙 */}
              <line className="sy-membrane" x1="78" y1="126" x2="322" y2="126" />
              <line className="sy-membrane" x1="78" y1="186" x2="322" y2="186" />
              <text className="sy-label" x="330" y="130">突触前膜</text>
              <text className="sy-label" x="330" y="190">突触后膜</text>
              {/* 神经递质（下落动画，reduced-motion 全局关闭） */}
              <circle className="sy-nt" cx="150" cy="128" r="5" />
              <circle className="sy-nt" cx="196" cy="126" r="5" />
              <circle className="sy-nt" cx="238" cy="129" r="5" />
              <circle className="sy-nt" cx="172" cy="127" r="5" />
              <circle className="sy-nt" cx="218" cy="128" r="5" />
              {/* 突触后膜与受体 */}
              <path
                className="sy-post"
                d="M78 186 L322 186 L322 232 C322 252 300 260 270 260 L130 260 C100 260 78 252 78 232 Z"
              />
              {[110, 150, 190, 230, 270].map((x) => (
                <rect key={x} className="sy-receptor" x={x} y="186" width="16" height="9" rx="3" />
              ))}
            </svg>
            <figcaption>结构为示意图，间隙宽度未按真实比例（真实间隙 20-40 纳米）。</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
