import { useEffect, useRef, useState } from 'react';
import './spike-lab.css';

/** 阈值对应的滑块强度（教学示意映射：0→−70 mV，55→−55 mV） */
const THRESHOLD = 55;
const REST_MV = -70;
const THRESHOLD_MV = -55;
const PEAK_MV = 30;

function potentialAt(level: number): number {
  if (level >= THRESHOLD) return PEAK_MV;
  return Math.round(REST_MV + (level / THRESHOLD) * (THRESHOLD_MV - REST_MV));
}

/** B11 互动模块：动作电位发射器（用户确认形式/位置/触发/降级）。
    纯 React 状态 + CSS 过渡，无第三方依赖；数字取自 sources.ts 已注册的 action-potential-values。 */
export default function SpikeLab() {
  const [level, setLevel] = useState(30);
  const [fired, setFired] = useState<null | boolean>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(0);

  useEffect(() => {
    if (pathRef.current) setLen(pathRef.current.getTotalLength());
  }, []);

  const fire = () => setFired(level >= THRESHOLD);
  const changeLevel = (v: number) => {
    setLevel(v);
    setFired(null); /* 强度变了，旧结果作废，等下一次施加刺激 */
  };

  const reached = fired === true;
  const potential = fired === null ? potentialAt(level) : reached ? PEAK_MV : potentialAt(level);
  const status =
    fired === null
      ? '调整强度，然后施加刺激'
      : reached
        ? '已发射 · 全有全无：越过阈值就全力开火'
        : '未达阈值 · 全有全无：不发射';

  return (
    <section className="spike" aria-label="动手试一次：动作电位发射器">
      <header className="spike__head">
        <p className="spike__kicker">INTERACTIVE</p>
        <h3 className="spike__title">动手试一次：全有全无</h3>
        <p className="spike__intro">
          拖动刺激强度，再点「施加刺激」。没越过 −55 mV 阈值，神经元完全沉默；一旦越过，
          就直接冲到 +30 mV 的峰值——没有「发射一点点」这回事。
        </p>
      </header>

      <div className="spike__panel">
        <div className="spike__controls">
          <label className="spike__label" htmlFor="spike-level">
            刺激强度 <span className="spike__level">{level}%</span>
          </label>
          <input
            id="spike-level"
            className="spike__range"
            type="range"
            min="0"
            max="100"
            step="1"
            value={level}
            onChange={(e) => changeLevel(Number(e.target.value))}
          />
          <div className="spike__scale" aria-hidden="true">
            <span>0（静息）</span>
            <span>55（阈值）</span>
            <span>100</span>
          </div>
          <button className="spike__btn" type="button" onClick={fire}>
            施加刺激
          </button>
          <p className="spike__status" role="status" aria-live="polite" data-spike-status={fired === null ? 'idle' : reached ? 'fired' : 'blocked'}>
            <strong data-fact="action-potential-values">{potential} mV</strong>
            <span>{status}</span>
          </p>
        </div>

        <div className="spike__viz">
          <svg viewBox="0 0 320 130" data-viz role="img" aria-label="动作电位曲线示意：未达阈值时保持静息电位，越过阈值后膜电位快速升至 +30 mV 峰值并回落">
            <line className="spike__axis" x1="10" y1="104" x2="310" y2="104" />
            <line className="spike__threshold" x1="10" y1="64" x2="310" y2="64" />
            <text className="spike__tick" x="12" y="118">−70 mV</text>
            <text className="spike__tick" x="12" y="58">−55 mV</text>
            <text className="spike__tick" x="128" y="14">+30 mV</text>
            <path
              ref={pathRef}
              className="spike__curve"
              data-spike-drawn={reached ? 'yes' : 'no'}
              style={{ strokeDasharray: len, strokeDashoffset: reached ? 0 : len }}
              d="M 10 104 C 60 104 78 100 94 90 C 108 80 118 22 140 20 C 160 22 170 96 196 100 C 222 106 242 110 262 104 C 282 100 300 103 310 102"
              fill="none"
            />
          </svg>
          <p className="spike__caption">
            {reached ? '曲线已描画：一次全幅度的动作电位。' : fired === false ? '曲线保持空白：刺激不够，就完全没有输出。' : '等待施加刺激。'}
          </p>
        </div>
      </div>
    </section>
  );
}
