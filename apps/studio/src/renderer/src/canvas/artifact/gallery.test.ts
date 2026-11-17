import {expect, it} from 'bun:test';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

it('sizes only actual action triggers and keeps tooltip/menu layers under library control, including touch wrappers', () => {
  const css = readFileSync(fileURLToPath(new URL('./gallery.css', import.meta.url)), 'utf8');
  expect(css).not.toContain('.artifact-page-actions > *');
  expect(css).not.toMatch(/\.artifact-page-actions button\s*\{/);
  expect(css).toContain(".artifact-page-actions > [data-testid='artifact-export-menu'] > button");
  expect(css).toContain(".artifact-page-actions > [data-testid='artifact-export-menu'] { width: 44px; height: 44px; flex-basis: 44px; }");
  expect(css).toContain('align-items: center;');
  expect(css).toContain("[data-menu-open='true']");
});
