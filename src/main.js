// Minimal scaffold page. Track B replaces this.
import './styles.css';
import { createEngine } from './engine.js';
import { PRODUCT_NAME, FOOTER_LINE } from './copy.js';

document.getElementById('title').textContent = PRODUCT_NAME;
document.getElementById('footer').textContent = FOOTER_LINE;
const readout = document.getElementById('readout');

const engine = createEngine({
  stage: document.getElementById('stage'),
  onState(s) {
    readout.textContent = [
      `compressions: ${s.compressions}`,
      `rate: ${s.rate ?? '–'}`,
      `rateZone: ${s.rateZone}`,
      `issues: elbows=${s.issues.elbows} position=${s.issues.position} recoil=${s.issues.recoil} depth=${s.issues.depth}`,
    ].join('\n');
  },
  onCompression() {},
  onError(err) {
    readout.textContent = `Error (${err.code}): ${err.message}`;
  },
});

engine.start();
