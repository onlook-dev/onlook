import { expect, it } from 'bun:test';
import { PANEL_SURFACE } from './surface.js';
import { SURFACE } from './rowGeometry.js';

it('keeps the sidebar on the same static surface as the chat and Canvas toolbar', () => {
  expect(SURFACE).toBe(PANEL_SURFACE);
  expect(SURFACE.backgroundColor).toBe('var(--studio-ground)');
  expect(SURFACE.backgroundImage).toBe('linear-gradient(var(--color-background-surface), var(--color-background-surface))');
  expect(SURFACE).not.toHaveProperty('backdropFilter');
  expect(SURFACE).not.toHaveProperty('WebkitBackdropFilter');
});
