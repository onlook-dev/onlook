import { expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const styles = readFileSync(new URL('./frame.css', import.meta.url), 'utf8');

for (const selector of ['frame-failure-glyph', 'frame-loading-glyph']) {
  it(`${selector} leaves the frame visible behind its icon (ONL-3089)`, () => {
    const rule = styles.match(new RegExp(`\\.${selector} \\{([^}]+)\\}`))?.[1];
    expect(rule).toBeDefined();
    expect(rule).not.toMatch(/background(?:-color|-image)?\s*:/);
    expect(rule).toContain('width: 36px');
    expect(rule).toContain('height: 36px');
  });
}
