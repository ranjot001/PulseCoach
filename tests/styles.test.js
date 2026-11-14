// Stylesheet checks for the design pass (task B7). jsdom does no layout, so these read the CSS.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(import.meta.dirname, '../src/styles.css'), 'utf8');
const claude = readFileSync(resolve(import.meta.dirname, '../CLAUDE.md'), 'utf8');
const rootBlock = css.match(/:root\s*\{([^}]*)\}/)[1];
const withoutComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every declaration for `selector`, from all the rules whose selector list ends with it. */
function block(selector) {
  const re = new RegExp(`(^|\\n)${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`, 'g');
  return [...css.matchAll(re)].map((m) => m[2]).join('\n');
}

describe('design tokens', () => {
  it('defines every token from CLAUDE.md on :root, with the same value', () => {
    const tokenBlock = claude.match(/```css\n([\s\S]*?)```/)[1];
    const tokens = [...withoutComments(tokenBlock).matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)];
    expect(tokens.length).toBe(13);
    for (const [, name, value] of tokens) {
      const m = rootBlock.match(new RegExp(`${name}:\\s*([^;]+);`));
      expect(m, name).not.toBeNull();
      expect(m[1].trim()).toBe(value.trim());
    }
  });

  it('has no hex colour outside :root', () => {
    const rest = withoutComments(css.replace(/:root\s*\{[^}]*\}/, ''));
    expect(rest.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });

  it('turns motion off under prefers-reduced-motion', () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*animation:\s*none[\s\S]*transition:\s*none/);
  });
});

describe('sizes at 1366×768', () => {
  const minPx = (sel) => Number(block(sel).match(/font-size:\s*clamp\((\d+)px/)[1]);
  it('the rate number is at least 120 px and the pause timer at least 160 px', () => {
    expect(minPx('.hud-rate-number')).toBeGreaterThanOrEqual(120);
    expect(minPx('.switch-timer')).toBeGreaterThanOrEqual(160);
    expect(block('.hud-rate-number')).toMatch(/line-height:\s*1;/);
    expect(block('.switch-timer')).toMatch(/line-height:\s*1;/);
  });
});

describe('motion', () => {
  it('status colours change over 150 ms, the score ring fills over 600 ms, the pause timer pulses once', () => {
    expect(rootBlock).toMatch(/--ease:\s*150ms/);
    expect(block('.ring-value')).toMatch(/transition:\s*stroke-dashoffset 600ms/);
    expect(block('.switch-timer.pulse-once')).toMatch(/animation:[^;]*\s1;/);
  });
});
