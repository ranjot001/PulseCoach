// Push-size strip along the bottom of the stage: every push against the compressor's
// own start, so the pushes can be seen shrinking before the app calls the switch.

const REF_PCT = 70; // a travelRatio of 1 ("your start") sits at 70% of the plot height

/**
 * @param {number|null} travelRatio this push's travel ÷ the compressor's baseline, or null
 * @param {object} config needs FATIGUE_TRAVEL_DROP
 * @returns {{ heightPct: number, tone: 'base' | 'ok' | 'low' }}
 */
export function barView(travelRatio, config) {
  if (travelRatio === null || travelRatio === undefined || !Number.isFinite(travelRatio)) {
    return { heightPct: REF_PCT, tone: 'base' };
  }
  const heightPct = Math.max(0, Math.min(100, travelRatio * REF_PCT));
  const tone = travelRatio <= 1 - config.FATIGUE_TRAVEL_DROP ? 'low' : 'ok';
  return { heightPct, tone };
}

/**
 * @param {HTMLElement} container the strip is appended here
 * @param {object} config needs PUSH_BARS, FATIGUE_TRAVEL_DROP
 */
export function createPushBars(container, config) {
  const root = document.createElement('div');
  root.className = 'pc-bars';
  const head = document.createElement('div');
  head.className = 'pc-bars__head';
  const title = document.createElement('span');
  title.className = 'pc-bars__title';
  title.textContent = 'Push size vs your start';
  const label = document.createElement('span');
  label.className = 'pc-bars__label';
  head.append(title, label);

  const plot = document.createElement('div');
  plot.className = 'pc-bars__plot';
  const ref = document.createElement('div');
  ref.className = 'pc-bars__ref';
  ref.style.bottom = `${REF_PCT}%`;
  const refText = document.createElement('span');
  refText.textContent = 'your start';
  ref.append(refText);
  plot.append(ref);
  root.append(head, plot);
  container.append(root);

  let maxTravel = 0; // largest raw travel so far, for bars while the baseline is being set

  return {
    element: root,
    push(event) {
      const view = barView(event?.travelRatio ?? null, config);
      let height = view.heightPct;
      if (view.tone === 'base') {
        const travel = Number.isFinite(event?.travel) ? event.travel : 0;
        maxTravel = Math.max(maxTravel, travel);
        height = maxTravel > 0 ? (travel / maxTravel) * REF_PCT : REF_PCT;
      }
      const bar = document.createElement('i');
      bar.className = `pc-bars__bar pc-bars__bar--${view.tone}`;
      bar.dataset.tone = view.tone;
      bar.style.height = `${height.toFixed(1)}%`;
      plot.append(bar);
      const bars = plot.querySelectorAll('.pc-bars__bar');
      for (let i = 0; i < bars.length - config.PUSH_BARS; i++) bars[i].remove();
    },
    clear() {
      plot.querySelectorAll('.pc-bars__bar').forEach((b) => b.remove());
      maxTravel = 0;
    },
    /** @param {string} text @param {'muted'|'warn'|null} [tone] */
    setLabel(text, tone = null) {
      if (label.textContent !== (text || '')) label.textContent = text || '';
      label.dataset.tone = tone || '';
    },
  };
}
