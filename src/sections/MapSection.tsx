import FactChip from '../components/FactChip';
import { getFact } from '../data/sources';
import './chapters.css';
import './map.css';

const REGIONS = [
  { id: 'frontal', name: '额叶', fn: '决策、计划、自我控制', fill: 'var(--data-1)' },
  { id: 'parietal', name: '顶叶', fn: '触觉与空间定位', fill: 'var(--data-3)' },
  { id: 'temporal', name: '颞叶', fn: '听觉与语言理解', fill: 'var(--data-4)' },
  { id: 'occipital', name: '枕叶', fn: '视觉处理', fill: 'var(--data-5)' },
  { id: 'cerebellum', name: '小脑', fn: '运动协调与平衡', fill: 'var(--data-6)' },
];

/** CHAPTER 03 · 大脑地图：谁在负责什么（B4）。轮廓为示意（教学示意象限，D7）。 */
export default function MapSection() {
  const cortex = getFact('cortex-neurons');
  const energy = getFact('brain-energy');
  return (
    <section className="chapter" id="map">
      <div className="chapter__inner">
        <header className="chapter__head">
          <p className="chapter__kicker">CHAPTER 03 · 大脑地图</p>
          <h2 className="chapter__title">谁在负责什么</h2>
        </header>
        <div className="chapter__grid chapter__grid--flip">
          <div className="chapter__text">
            <p className="chapter__body">
              皮层只有约 2 毫米厚，却装着约 <strong className="fact">{cortex.value}</strong> 个神经元，
              并消耗全身约 <strong className="fact">{energy.value}</strong> 的能量。
              把它摊平大约有一张报纸大——功能分区的地图大致如下，但真实大脑的边界比你想象的模糊得多。
            </p>
            <FactChip fact={cortex} />
            <FactChip fact={energy} />
          </div>
          <figure
            className="chapter__viz"
            data-viz
            role="img"
            aria-label="大脑分区示意图（教学示意，顶视图）：额叶负责决策与计划，顶叶负责触觉与空间定位，颞叶负责听觉与语言理解，枕叶负责视觉处理，小脑负责运动协调与平衡"
          >
            <svg viewBox="0 0 360 300" aria-hidden="true">
              {/* 额叶 */}
              <path
                className="map-region"
                style={{ fill: REGIONS[0].fill }}
                d="M60 40 C110 8 250 8 300 40 C312 72 302 102 282 116 L78 116 C58 102 48 72 60 40 Z"
              >
                <title>{`${REGIONS[0].name}：${REGIONS[0].fn}`}</title>
              </path>
              {/* 顶叶 */}
              <path
                className="map-region"
                style={{ fill: REGIONS[1].fill }}
                d="M78 124 L282 124 C296 144 292 170 272 186 L88 186 C68 170 64 144 78 124 Z"
              >
                <title>{`${REGIONS[1].name}：${REGIONS[1].fn}`}</title>
              </path>
              {/* 颞叶（左右） */}
              <path
                className="map-region"
                style={{ fill: REGIONS[2].fill }}
                d="M74 192 C52 198 40 226 54 250 C68 268 94 260 98 238 C102 220 92 200 88 192 Z"
              >
                <title>{`${REGIONS[2].name}：${REGIONS[2].fn}`}</title>
              </path>
              <path
                className="map-region"
                style={{ fill: REGIONS[2].fill }}
                d="M286 192 C308 198 320 226 306 250 C292 268 266 260 262 238 C258 220 268 200 272 192 Z"
              >
                <title>{`${REGIONS[2].name}：${REGIONS[2].fn}`}</title>
              </path>
              {/* 枕叶 */}
              <path
                className="map-region"
                style={{ fill: REGIONS[3].fill }}
                d="M122 194 L238 194 C244 222 230 246 204 254 L156 254 C130 246 116 222 122 194 Z"
              >
                <title>{`${REGIONS[3].name}：${REGIONS[3].fn}`}</title>
              </path>
              {/* 小脑 */}
              <ellipse className="map-region" style={{ fill: REGIONS[4].fill }} cx="180" cy="274" rx="72" ry="18">
                <title>{`${REGIONS[4].name}：${REGIONS[4].fn}`}</title>
              </ellipse>
              {/* 中线 */}
              <line className="map-midline" x1="180" y1="12" x2="180" y2="256" />
            </svg>
            <figcaption>轮廓为教学示意，未按真实比例；分区边界在真实大脑中并非如此分明。</figcaption>
          </figure>
        </div>
        <ul className="map-legend">
          {REGIONS.map((r) => (
            <li key={r.id} className="map-legend__item">
              <span className="map-legend__dot" style={{ background: r.fill }} aria-hidden="true" />
              <strong>{r.name}</strong>
              <span>{r.fn}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
