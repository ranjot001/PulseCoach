// Stand-in for Contract 3. Track C replaces this with the real debrief card.
export function renderDebriefCard(container, stats) {
  if (!container) return;
  try {
    const p = document.createElement('p');
    const score = stats && Number.isFinite(stats.score) ? ` You scored ${stats.score}.` : '';
    p.textContent = `Debrief coming soon.${score}`;
    container.replaceChildren(p);
  } catch {
    // The card never throws.
  }
}
