import { describe, it, expect } from 'vitest';
import { createFlowModel, isGoodCompression } from '../src/lib/flow.js';
import { config } from '../src/config.js';

const good = { intervalMs: 545, fullRecoil: true };
const push = (model, n, event, from = 0, every = 545) => {
  let t = from;
  for (let i = 0; i < n; i++) model.onCompression(event, (t += every));
  return t;
};

describe('flow model', () => {
  it('ten good compressions at 110 a minute take the value above 70', () => {
    const m = createFlowModel(config);
    const t = push(m, 10, good);
    expect(m.value(t)).toBeGreaterThan(70);
  });

  it('with no compressions it halves every FLOW_HALF_LIFE_MS', () => {
    const m = createFlowModel(config);
    const t = push(m, 20, good);
    const grace = 60000 / config.RATE_MIN;
    const v0 = m.value(t + grace);
    expect(m.value(t + grace + config.FLOW_HALF_LIFE_MS)).toBeCloseTo(v0 / 2, 6);
    expect(m.value(t + grace + 2 * config.FLOW_HALF_LIFE_MS)).toBeCloseTo(v0 / 4, 6);
    // Steady in-target compressions never drain it between pushes.
    expect(m.value(t + 500)).toBe(m.value(t));
  });

  it('poor compressions fill it more slowly', () => {
    const fast = createFlowModel(config);
    const noRecoil = createFlowModel(config);
    const offRate = createFlowModel(config);
    const t = push(fast, 8, good);
    push(noRecoil, 8, { intervalMs: 545, fullRecoil: false });
    push(offRate, 8, { intervalMs: 800, fullRecoil: true }, 0, 545);
    expect(noRecoil.value(t)).toBeLessThan(fast.value(t));
    expect(offRate.value(t)).toBeLessThan(fast.value(t));
    expect(isGoodCompression(good, config)).toBe(true);
    expect(isGoodCompression({ intervalMs: 400, fullRecoil: true }, config)).toBe(false);
    expect(isGoodCompression({ fullRecoil: true }, config)).toBe(false);
  });

  it('reset() returns it to 0', () => {
    const m = createFlowModel(config);
    const t = push(m, 10, good);
    m.reset();
    expect(m.value(t)).toBe(0);
  });

  it('never leaves 0 to 100', () => {
    const m = createFlowModel(config);
    expect(m.value(0)).toBe(0);
    const t = push(m, 500, good);
    expect(m.value(t)).toBeLessThanOrEqual(100);
    expect(m.value(t)).toBeGreaterThan(99);
    expect(m.value(t + 10 * 60 * 1000)).toBeGreaterThanOrEqual(0);
    expect(m.value(t - 100000)).toBeLessThanOrEqual(100);
  });
});
