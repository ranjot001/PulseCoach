// Light canvas line chart of the detrended motion signal (last few seconds).

// jsdom (the test page) has no canvas and logs an error for every getContext() call.
export const canvasSupported = () => !/jsdom/i.test(globalThis.navigator?.userAgent ?? '');

export function createChart(canvas, { spanMs = 6000, minRange = 0.06 } = {}) {
  const points = [];
  let ctx = null;
  let ctxTried = false;

  function context() {
    if (!ctxTried) {
      ctxTried = true;
      try {
        ctx = canvasSupported() ? canvas.getContext('2d') : null;
      } catch {
        ctx = null;
      }
    }
    return ctx;
  }

  return {
    push(t, value) {
      points.push({ t, v: value });
      while (points.length && points[0].t < t - spanMs) points.shift();
    },
    clear() {
      points.length = 0;
    },
    draw() {
      const c = context();
      if (!c) return;
      const w = canvas.clientWidth || 640;
      const h = canvas.clientHeight || 120;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      c.clearRect(0, 0, w, h);
      c.fillStyle = 'rgba(0, 0, 0, 0.55)';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, h / 2);
      c.lineTo(w, h / 2);
      c.stroke();
      if (points.length < 2) return;
      const tEnd = points[points.length - 1].t;
      let range = minRange;
      for (const p of points) if (p.v !== null) range = Math.max(range, Math.abs(p.v));
      c.strokeStyle = '#ffffff';
      c.lineWidth = 3;
      c.beginPath();
      let pen = false;
      for (const p of points) {
        if (p.v === null) {
          pen = false;
          continue;
        }
        const x = w - ((tEnd - p.t) / spanMs) * w;
        // Pushing down makes the signal larger; draw it downward too.
        const y = h / 2 + (p.v / range) * (h / 2 - 4);
        if (pen) c.lineTo(x, y);
        else c.moveTo(x, y);
        pen = true;
      }
      c.stroke();
    },
  };
}
