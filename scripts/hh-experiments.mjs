/**
 * HH 数值实验 E1-E5。所有数据由 simulate() 实跑产出，不手写。
 *
 * 运行：npm run experiment
 * 输出：../coursework-2026fall/data/hh-*.csv
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { simulate } from '../src/lib/hh.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', '..', 'coursework-2026fall', 'data');
mkdirSync(outDir, { recursive: true });

const cols = (rows, columns) =>
  [columns.join(','), ...rows.map((r) => columns.map((c) => r[c] ?? '').join(','))].join('\n') + '\n';

function save(name, rows, columns) {
  writeFileSync(resolve(outDir, name), cols(rows, columns), 'utf8');
  console.log(`saved ${name}: ${rows.length} rows`);
}

const pulse = (amplitude) => (t) => (t < 20 ? amplitude : 0);
const finiteMax = (xs) => (xs.every(Number.isFinite) ? Math.max(...xs) : NaN);

console.log('E1 步长收敛性');
const ref = simulate({ dt: 0.001, duration: 50, stimulus: pulse(10), integrator: 'rk4' });
const e1 = [];
for (const method of ['euler', 'rk4']) {
  for (const dt of [0.002, 0.005, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1]) {
    const r = simulate({ dt, duration: 50, stimulus: pulse(10), integrator: method });
    let rmse = NaN;
    if (r.V.every(Number.isFinite)) {
      let sum = 0;
      let n = 0;
      for (let i = 0; i < r.t.length; i += 1) {
        const ri = Math.round(r.t[i] / 0.001);
        if (ri >= ref.V.length) break;
        const d = r.V[i] - ref.V[ri];
        sum += d * d;
        n += 1;
      }
      rmse = Math.sqrt(sum / n);
    }
    e1.push({
      method,
      dt,
      rmse_mV: Number.isFinite(rmse) ? rmse.toFixed(4) : 'diverged',
      maxV: Number.isFinite(finiteMax(r.V)) ? finiteMax(r.V).toFixed(3) : 'diverged',
      spikes: r.spikes.length,
    });
  }
}
save('hh-e1-step.csv', e1, ['method', 'dt', 'rmse_mV', 'maxV', 'spikes']);

console.log('E2 阈值与全有全无');
const e2 = [];
for (let I = 0; I <= 20.001; I += 0.5) {
  const amp = Number(I.toFixed(2));
  const r = simulate({ dt: 0.01, duration: 30, stimulus: (t) => (t < 5 ? amp : 0), integrator: 'rk4' });
  e2.push({
    I_uAcm2: amp.toFixed(1),
    fired: r.spikes.length > 0 ? 1 : 0,
    spikeCount: r.spikes.length,
    firstSpike_ms: r.spikes.length ? r.spikes[0].toFixed(2) : '',
    peak_mV: Number.isFinite(finiteMax(r.V)) ? finiteMax(r.V).toFixed(2) : 'diverged',
  });
}
save('hh-e2-threshold.csv', e2, ['I_uAcm2', 'fired', 'spikeCount', 'firstSpike_ms', 'peak_mV']);

console.log('E3 f-I 曲线');
const e3 = [];
for (let I = 2; I <= 20; I += 1) {
  const r = simulate({ dt: 0.01, duration: 1000, stimulus: () => I, integrator: 'rk4' });
  const n = r.spikes.length;
  const freq = n >= 2 ? ((n - 1) * 1000) / (r.spikes[n - 1] - r.spikes[0]) : 0;
  e3.push({
    I_uAcm2: I,
    spikeCount: n,
    freq_Hz: freq.toFixed(2),
    firstSpike_ms: n ? r.spikes[0].toFixed(2) : '',
  });
}
save('hh-e3-fi.csv', e3, ['I_uAcm2', 'spikeCount', 'freq_Hz', 'firstSpike_ms']);

console.log('E4 通道参数敏感性');
const e4 = [];
for (const gNa of [60, 90, 120, 150, 180]) {
  for (const gK of [18, 27, 36, 45, 54]) {
    const r = simulate({
      dt: 0.01,
      duration: 100,
      stimulus: pulse(10),
      integrator: 'rk4',
      params: { Cm: 1, gNa, gK, gL: 0.3, ENa: 50, EK: -77, EL: -54.387 },
    });
    e4.push({
      gNa,
      gK,
      peak_mV: finiteMax(r.V).toFixed(2),
      min_mV: Math.min(...r.V).toFixed(2),
      spikeCount: r.spikes.length,
      firstSpike_ms: r.spikes.length ? r.spikes[0].toFixed(2) : '',
    });
  }
}
save('hh-e4-params.csv', e4, ['gNa', 'gK', 'peak_mV', 'min_mV', 'spikeCount', 'firstSpike_ms']);

console.log('E5 浏览器端性能（Node 环境，供趋势参考）');
const e5 = [];
for (const duration of [100, 500, 1000]) {
  for (const method of ['rk4', 'euler']) {
    const samples = [];
    for (let k = 0; k < 5; k += 1) {
      const t0 = performance.now();
      simulate({ dt: 0.01, duration, stimulus: pulse(10), integrator: method });
      samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    const steps = Math.round(duration / 0.01);
    e5.push({
      duration_ms: duration,
      steps,
      method,
      median_ms: samples[2].toFixed(2),
      steps_per_ms: (steps / samples[2]).toFixed(0),
    });
  }
}
save('hh-e5-perf.csv', e5, ['duration_ms', 'steps', 'method', 'median_ms', 'steps_per_ms']);

const threshold = e2.find((r) => r.fired === 1)?.I_uAcm2;
const maxStable = (method) =>
  Math.max(...e1.filter((r) => r.method === method && r.rmse_mV !== 'diverged').map((r) => r.dt));
const minDiverged = (method) => {
  const xs = e1.filter((r) => r.method === method && r.rmse_mV === 'diverged').map((r) => r.dt);
  return xs.length ? Math.min(...xs) : NaN;
};
console.log(`\n关键结论（均由上表数据算出）:`);
console.log(`阈下/阈上分界 I=${threshold} µA/cm²`);
console.log(`RK4 最大稳定步长 ${maxStable('rk4')} ms / 最小发散步长 ${minDiverged('rk4')} ms`);
console.log(`Euler 最大稳定步长 ${maxStable('euler')} ms / 最小发散步长 ${minDiverged('euler')} ms`);
console.log(`f-I: I=10 -> ${e3.find((r) => r.I_uAcm2 === 10)?.freq_Hz} Hz`);
console.log(`输出目录: ${outDir}`);
