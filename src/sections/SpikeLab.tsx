import { useEffect, useRef, useState } from 'react';
import { simulate } from '../lib/hh';
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

interface HhResult {
  path: string;
  peak: number;
  min: number;
  spikes: number;
  first: number | null;
}

/** 把仿真输出降采样成 SVG 路径；V 的显示范围 -85…+45 mV。 */
function hhCurvePath(t: number[], V: number[]): string {
  const stride = Math.max(1, Math.floor(t.length / 320));
  const segments: string[] = [];
  for (let i = 0; i < t.length; i += stride) {
    const x = 12 + (t[i] / 50) * 296;
    const y = 116 - ((V[i] + 85) / 130) * 100;
    segments.push(`${segments.length ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return segments.join(' ');
}

/** B11 互动模块：动作电位发射器（用户确认形式/位置/触发/降级）。
    纯 React 状态 + CSS 过渡，无第三方依赖；数字取自 sources.ts 已注册的 action-potential-values。 */
export default function SpikeLab() {
  const [level, setLevel] = useState(30);
  const [fired, setFired] = useState<null | boolean>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(0);
  const [hhCurrent, setHhCurrent] = useState(10);
  const [hhResult, setHhResult] = useState<HhResult | null>(null);

  useEffect(() => {
    if (pathRef.current) setLen(pathRef.current.getTotalLength());
  }, []);

  const fire = () => setFired(level >= THRESHOLD);
  const changeLevel = (v: number) => {
    setLevel(v);
    setFired(null); /* 强度变了，旧结果作废，等下一次施加刺激 */
  };

  const runHh = () => {
    const r = simulate({
      dt: 0.01,
      duration: 50,
      stimulus: (t) => (t < 20 ? hhCurrent : 0),
      integrator: 'rk4',
    });
    setHhResult({
      path: hhCurvePath(r.t, r.V),
      peak: Math.max(...r.V),
      min: Math.min(...r.V),
      spikes: r.spikes.length,
      first: r.spikes.length ? r.spikes[0] : null,
    });
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

      <details className="spike-hh">
        <summary className="spike-hh__summary">
          真实模型：Hodgkin-Huxley 数值仿真（默认收起，展开查看）
        </summary>
        <div className="spike-hh__body">
          <p className="spike-hh__note">
            上方曲线是教学示意；这里才是真正解出来的。四个耦合微分方程用 RK4 逐步积分，步长 0.01 ms，
            电导取经典 <strong data-fact="hh-params">gNa 120 / gK 36 mS/cm²</strong>（Hodgkin &amp; Huxley, 1952）。
            两条曲线形状不同是正常的：示意为好看做过修饰，仿真不做。
          </p>
          <div className="spike-hh__controls">
            <label htmlFor="hh-current">刺激电流 I = {hhCurrent} µA/cm²</label>
            <input
              id="hh-current"
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={hhCurrent}
              onChange={(e) => setHhCurrent(Number(e.target.value))}
            />
            <button type="button" onClick={runHh}>运行仿真</button>
          </div>
          <div className="spike-hh__viz">
            {hhResult ? (
              <>
                <svg viewBox="0 0 320 130" role="img" aria-label="Hodgkin-Huxley 方程数值求解得到的膜电位曲线">
                  <line className="spike-hh__axis" x1="10" y1="101" x2="310" y2="101" />
                  <line className="spike-hh__zero" x1="10" y1="51" x2="310" y2="51" />
                  <text className="spike-hh__tick" x="12" y="115">−65 mV</text>
                  <text className="spike-hh__tick" x="12" y="45">0 mV</text>
                  <path className="spike-hh__curve" d={hhResult.path} fill="none" />
                </svg>
                <p className="spike-hh__metrics">
                  峰值 <b>{hhResult.peak.toFixed(1)}</b> mV ｜ 谷值 <b>{hhResult.min.toFixed(1)}</b> mV ｜ 发放{' '}
                  <b>{hhResult.spikes}</b> 次
                  {hhResult.first !== null && ` ｜ 首次 ${hhResult.first.toFixed(2)} ms`}
                </p>
              </>
            ) : (
              <p className="spike-hh__hint">设定电流后点「运行仿真」，曲线由方程解出。</p>
            )}
          </div>
        </div>
      </details>
    </section>
  );
}
