import { describe, expect, it } from 'vitest';
import { FACTS } from '../src/data/sources';

/** D7/D11：出处系统的构建期校验——页面上的每个数字必须可溯源或明确标示教学示意。 */
describe('sources.ts 出处系统', () => {
  it('每个条目 id/value/label/source 完整且非空', () => {
    expect(FACTS.length).toBeGreaterThanOrEqual(8);
    for (const f of FACTS) {
      expect(f.id, `${f.id}: id`).toBeTruthy();
      expect(f.value, `${f.id}: value`).toBeTruthy();
      expect(f.label, `${f.id}: label`).toBeTruthy();
      expect(f.source, `${f.id}: source 缺失`).toBeDefined();
      expect(f.source.name.length, `${f.id}: source.name`).toBeGreaterThan(3);
      expect(['literature', 'illustrative'], `${f.id}: kind`).toContain(f.source.kind);
    }
  });

  it('id 无重复', () => {
    const ids = FACTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('文献值与教学示意同时存在（内容诚实性的底线）', () => {
    expect(FACTS.some((f) => f.source.kind === 'literature')).toBe(true);
    expect(FACTS.some((f) => f.source.kind === 'illustrative')).toBe(true);
  });
});
