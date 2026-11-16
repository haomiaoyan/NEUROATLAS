import { describe, expect, it } from 'vitest';
import { CLASSIC_PARAMS, derivatives, detectSpikes, restingState, simulate, type HhState } from '../src/lib/hh';

const mid: HhState = { V: -65, m: 0.05, h: 0.6, n: 0.32 };

describe('Hodgkin-Huxley 求解器', () => {
  it('速率函数在 V=-40 与 V=-55 的 0/0 奇点处仍为有限值', () => {
    const atM = derivatives({ ...mid, V: -40 }, 0);
    const atN = derivatives({ ...mid, V: -55 }, 0);
    for (const d of [atM, atN]) {
      for (const key of ['V', 'm', 'h', 'n'] as const) {
        expect(Number.isFinite(d[key]), `${key} 非有限值`).toBe(true);
      }
    }
    expect(atM.m).toBeGreaterThan(0.5);
    expect(atN.n).toBeGreaterThan(0);
  });

  it('静息态在 200 ms 无刺激仿真中保持稳定', () => {
    const r = simulate({ dt: 0.01, duration: 200 });
    const vEnd = r.V[r.V.length - 1];
    expect(Math.abs(vEnd + 65)).toBeLessThan(0.5);
    expect(r.spikes.length).toBe(0);
    expect(restingState().V).toBe(-65);
    expect(CLASSIC_PARAMS.gNa).toBe(120);
  });

  it('阈上刺激产生全幅度动作电位，峰值上穿 0 mV', () => {
    const r = simulate({
      dt: 0.01,
      duration: 50,
      stimulus: (t) => (t < 20 ? 10 : 0),
    });
    expect(r.spikes.length).toBeGreaterThanOrEqual(1);
    expect(Math.max(...r.V)).toBeGreaterThan(0);
    expect(Math.min(...r.V)).toBeLessThan(-65);
  });

  it('阈下刺激不产生动作电位', () => {
    const r = simulate({
      dt: 0.01,
      duration: 50,
      stimulus: (t) => (t < 20 ? 2 : 0),
    });
    expect(r.spikes.length).toBe(0);
    expect(Math.max(...r.V)).toBeLessThan(-40);
  });

  it('Δt=0.08 ms 时 Euler 已发散，RK4 仍保持有限', () => {
    const stim = (t: number): number => (t < 20 ? 10 : 0);
    const euler = simulate({ dt: 0.08, duration: 50, stimulus: stim, integrator: 'euler' });
    const rk4 = simulate({ dt: 0.08, duration: 50, stimulus: stim, integrator: 'rk4' });
    expect(euler.V.some((v) => !Number.isFinite(v))).toBe(true);
    expect(rk4.V.every(Number.isFinite)).toBe(true);
    expect(Math.max(...rk4.V)).toBeLessThan(100);
  });

  it('Δt=0.1 ms 时两种积分器均发散（负面结果，用于说明步长上限）', () => {
    const stim = (t: number): number => (t < 20 ? 10 : 0);
    for (const method of ['euler', 'rk4'] as const) {
      const r = simulate({ dt: 0.1, duration: 50, stimulus: stim, integrator: method });
      expect(r.V.some((v) => !Number.isFinite(v))).toBe(true);
    }
  });

  it('spike 检测与直接上穿统计一致', () => {
    const r = simulate({ dt: 0.01, duration: 50, stimulus: (t) => (t < 20 ? 10 : 0) });
    let manual = 0;
    for (let i = 1; i < r.V.length; i += 1) {
      if (r.V[i - 1] < 0 && r.V[i] >= 0) manual += 1;
    }
    expect(detectSpikes(r.t, r.V).length).toBe(manual);
  });
});
