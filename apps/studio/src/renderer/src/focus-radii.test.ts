import { readFileSync } from 'node:fs';
import { expect, it } from 'bun:test';

it('Section name and sidebar caret focus rings use the defined element radius', () => {
  const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
  const theme = readFileSync(new URL('./theme/studio.css', import.meta.url), 'utf8');
  expect(theme).toMatch(/--radius-element:\s*4px/);
  for (const [selector, width, offset] of [['canvas-section-name', 1, 2], ['design-row-caret', 2, 1]] as const) {
    const rule = css.match(new RegExp(`\\.${selector}:focus-visible\\s*\\{([^}]+)\\}`))?.[1];
    expect(rule).toContain('border-radius: var(--radius-element)');
    expect(rule).toContain(`outline: ${width}px solid var(--color-accent)`);
    expect(rule).toContain(`outline-offset: ${offset}px`);
  }
  expect(css).not.toContain('--radius-control');
});
