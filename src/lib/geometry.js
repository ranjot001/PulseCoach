// Pure 2D geometry on pixel coordinates. Convert landmarks with toPixels first:
// normalised x and y have different scales on a non-square frame.

/** Normalised landmark {x, y} (0..1) to pixels {x, y}. */
export function toPixels(landmark, width, height) {
  return { x: landmark.x * width, y: landmark.y * height };
}

export function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Angle ABC at point b, in degrees, 0..180. NaN if either arm has zero length. */
export function angleAt(a, b, c) {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const n = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (n === 0) return NaN;
  const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / n));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Angle of the line a→b away from vertical, in degrees, 0..90. Direction does not matter. */
export function angleFromVertical(a, b) {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  if (dx === 0 && dy === 0) return NaN;
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}
