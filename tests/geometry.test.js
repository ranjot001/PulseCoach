import { describe, it, expect } from 'vitest';
import { toPixels, distance, midpoint, angleAt, angleFromVertical } from '../src/lib/geometry.js';

describe('geometry', () => {
  it('a right angle gives 90°', () => {
    expect(angleAt({ x: 10, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(90);
  });

  it('a straight line gives 180°', () => {
    expect(angleAt({ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 10 })).toBeCloseTo(180);
  });

  it('is correct on a 1280×720 frame only after pixel conversion', () => {
    // In pixels: a=(640,360) b=(640,0)... use a right angle that is not 90° in normalised units.
    const W = 1280, H = 720;
    const a = { x: 0.5, y: 0.0 };   // (640, 0)
    const b = { x: 0.5, y: 0.5 };   // (640, 360)
    const c = { x: 0.5 + 360 / W, y: 0.5 }; // (1000, 360)
    const pxAngle = angleAt(toPixels(a, W, H), toPixels(b, W, H), toPixels(c, W, H));
    expect(pxAngle).toBeCloseTo(90);
    // A 45° line in pixels: 360 px across, 360 px up.
    const d = { x: 0.5 + 360 / W, y: 0.0 }; // (1000, 0)
    expect(angleAt(toPixels(a, W, H), toPixels(b, W, H), toPixels(d, W, H))).toBeCloseTo(45);
    // The same points in normalised units give the wrong answer.
    expect(angleAt(a, b, d)).not.toBeCloseTo(45);
  });

  it('toPixels, distance and midpoint', () => {
    expect(toPixels({ x: 0.25, y: 0.5 }, 1280, 720)).toEqual({ x: 320, y: 360 });
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
  });

  it('angleFromVertical', () => {
    expect(angleFromVertical({ x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(0);
    expect(angleFromVertical({ x: 0, y: 10 }, { x: 0, y: 0 })).toBeCloseTo(0);
    expect(angleFromVertical({ x: 0, y: 0 }, { x: 10, y: 10 })).toBeCloseTo(45);
    expect(angleFromVertical({ x: 0, y: 0 }, { x: -10, y: 0 })).toBeCloseTo(90);
  });

  it('degenerate inputs give NaN, not a throw', () => {
    expect(angleAt({ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 2 })).toBeNaN();
    expect(angleFromVertical({ x: 1, y: 1 }, { x: 1, y: 1 })).toBeNaN();
  });
});
