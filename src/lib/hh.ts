/**
 * Hodgkin-Huxley 动作电位数值求解器。
 *
 * 出处：Hodgkin & Huxley (1952), J. Physiol. 117:500-544。
 * 采用现代教材通行的电压偏移约定：静息电位约 -65 mV。
 *
 * 单位：V/mV, t/ms, I/µA·cm^-2, C/µF·cm^-2, g/mS·cm^-2。
 *
 * 本模块是纯计算，不依赖 React 或 DOM；浏览器与 Node 均可直接调用。
 */

export interface HhParams {
  Cm: number;
  gNa: number;
  gK: number;
  gL: number;
  ENa: number;
  EK: number;
  EL: number;
}

/** 经典乌贼巨大轴突参数集（Hodgkin & Huxley, 1952）。 */
export const CLASSIC_PARAMS: HhParams = {
  Cm: 1,
  gNa: 120,
  gK: 36,
  gL: 0.3,
  ENa: 50,
  EK: -77,
  EL: -54.387,
};

export interface HhState {
  V: number;
  m: number;
  h: number;
  n: number;
}

export type Integrator = 'rk4' | 'euler';

export interface SimOptions {
  /** 时间步长，ms */
  dt: number;
  /** 总时长，ms */
  duration: number;
  /** 注入电流 I(t)，µA/cm²；默认无刺激 */
  stimulus?: (t: number) => number;
  /** 初始状态；默认经典静息态 */
  initial?: HhState;
  params?: HhParams;
  integrator?: Integrator;
}

export interface SimResult {
  t: number[];
  V: number[];
  m: number[];
  h: number[];
  n: number[];
  /** 膜电位上穿 0 mV 的时刻，ms */
  spikes: number[];
}

/** 计算 x / (1 - e^-x)，在 x→0 处用泰勒展开消除 0/0 奇点。 */
function xOverOneMinusExp(x: number): number {
  if (Math.abs(x) < 1e-6) return 1 + x / 2 + (x * x) / 12;
  return x / (1 - Math.exp(-x));
}

const alphaM = (V: number): number => xOverOneMinusExp((V + 40) / 10);
const betaM = (V: number): number => 4 * Math.exp(-(V + 65) / 18);
const alphaH = (V: number): number => 0.07 * Math.exp(-(V + 65) / 20);
const betaH = (V: number): number => 1 / (1 + Math.exp(-(V + 35) / 10));
const alphaN = (V: number): number => 0.1 * xOverOneMinusExp((V + 55) / 10);
const betaN = (V: number): number => 0.125 * Math.exp(-(V + 65) / 80);

/** 经典参数下的静息态：V = -65 mV，m/h/n 取各自稳态解。 */
export function restingState(): HhState {
  const V = -65;
  const am = alphaM(V);
  const ah = alphaH(V);
  const an = alphaN(V);
  return {
    V,
    m: am / (am + betaM(V)),
    h: ah / (ah + betaH(V)),
    n: an / (an + betaN(V)),
  };
}

/** 四维耦合微分方程组。 */
export function derivatives(s: HhState, I: number, p: HhParams = CLASSIC_PARAMS): HhState {
  const iNa = p.gNa * s.m ** 3 * s.h * (s.V - p.ENa);
  const iK = p.gK * s.n ** 4 * (s.V - p.EK);
  const iL = p.gL * (s.V - p.EL);
  return {
    V: (I - iNa - iK - iL) / p.Cm,
    m: alphaM(s.V) * (1 - s.m) - betaM(s.V) * s.m,
    h: alphaH(s.V) * (1 - s.h) - betaH(s.V) * s.h,
    n: alphaN(s.V) * (1 - s.n) - betaN(s.V) * s.n,
  };
}

function addScaled(s: HhState, d: HhState, scale: number): HhState {
  return {
    V: s.V + d.V * scale,
    m: s.m + d.m * scale,
    h: s.h + d.h * scale,
    n: s.n + d.n * scale,
  };
}

/** 单步积分：显式欧拉或经典四阶龙格-库塔。 */
function step(s: HhState, I: number, dt: number, p: HhParams, method: Integrator): HhState {
  if (method === 'euler') return addScaled(s, derivatives(s, I, p), dt);
  const k1 = derivatives(s, I, p);
  const k2 = derivatives(addScaled(s, k1, dt / 2), I, p);
  const k3 = derivatives(addScaled(s, k2, dt / 2), I, p);
  const k4 = derivatives(addScaled(s, k3, dt), I, p);
  return {
    V: s.V + (dt / 6) * (k1.V + 2 * k2.V + 2 * k3.V + k4.V),
    m: s.m + (dt / 6) * (k1.m + 2 * k2.m + 2 * k3.m + k4.m),
    h: s.h + (dt / 6) * (k1.h + 2 * k2.h + 2 * k3.h + k4.h),
    n: s.n + (dt / 6) * (k1.n + 2 * k2.n + 2 * k3.n + k4.n),
  };
}

/** 膜电位上穿给定阈值的时刻，用于发放判定与 f-I 曲线。 */
export function detectSpikes(t: number[], V: number[], threshold = 0): number[] {
  const out: number[] = [];
  for (let i = 1; i < V.length; i += 1) {
    if (V[i - 1] < threshold && V[i] >= threshold) out.push(t[i]);
  }
  return out;
}

/** 完整仿真。stimulus 在每个步长起点取值（左端点采样）。 */
export function simulate(o: SimOptions): SimResult {
  const p = o.params ?? CLASSIC_PARAMS;
  const method = o.integrator ?? 'rk4';
  const stimulus = o.stimulus ?? (() => 0);
  const steps = Math.max(1, Math.round(o.duration / o.dt));
  let s = o.initial ?? restingState();

  const t = [0];
  const V = [s.V];
  const m = [s.m];
  const h = [s.h];
  const n = [s.n];

  for (let i = 1; i <= steps; i += 1) {
    s = step(s, stimulus((i - 1) * o.dt), o.dt, p, method);
    t.push(i * o.dt);
    V.push(s.V);
    m.push(s.m);
    h.push(s.h);
    n.push(s.n);
  }

  return { t, V, m, h, n, spikes: detectSpikes(t, V) };
}
