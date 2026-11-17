// Markup and rules only: Bun has no DOM, so a real double-click is the acceptance walk's to prove.

import { expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ArtifactSummary } from '@studio/events';
import { ArtifactTitle, renameOpensOnClick } from './ArtifactTitle.js';

const artifact: ArtifactSummary = { id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Pricing', pagePath: 'pages/index.html', updatedAt: '2026-01-01T00:00:00.000Z', readOnly: false };

it('opens the canvas rename on the second click and on a keyboard activation, never on the first click', () => {
  for (const detail of [1, 2, 3]) expect(renameOpensOnClick(detail, false)).toBe(true);
  expect(renameOpensOnClick(1, true)).toBe(false);
  expect(renameOpensOnClick(2, true)).toBe(false);
  // Enter and Space on the focused button, which fire a click no second press follows.
  expect(renameOpensOnClick(0, true)).toBe(true);
});

it('offers the name as a control with the rename label, and says so when the artifact is read-only', () => {
  const editable = renderToStaticMarkup(<ArtifactTitle artifact={artifact} label={artifact.title} renameOnDoubleClick />);
  expect(editable).toContain('data-testid="artifact-title-button"');
  expect(editable).not.toContain('data-testid="artifact-title-input"');
  expect(editable).not.toContain('disabled');
  expect(editable).not.toContain('outline:none');
  expect(renderToStaticMarkup(<ArtifactTitle artifact={{ ...artifact, readOnly: true }} label={artifact.title} />)).toContain('disabled');
});

it('lets canvas title gestures reach React Flow while library titles remain isolated', () => {
  const canvas = renderToStaticMarkup(<ArtifactTitle artifact={artifact} label={artifact.title} draggable renameOnDoubleClick />);
  expect(canvas).not.toContain('nodrag');
  expect(canvas).not.toContain('nopan');
  expect(canvas).toContain('cursor:grab');
  const library = renderToStaticMarkup(<ArtifactTitle artifact={artifact} label={artifact.title} />);
  expect(library).toContain('nodrag nopan');
});

it('lets a disabled canvas title pass pointer gestures to its draggable bar', () => {
  const canvas = renderToStaticMarkup(<ArtifactTitle artifact={{...artifact, readOnly: true}} label={artifact.title} draggable renameOnDoubleClick />);
  expect(canvas).toContain('disabled');
  expect(canvas).toContain('pointer-events:none');
});

it('paints a working title inside its glyphs without a transformed mask layer', () => {
  const working = renderToStaticMarkup(<ArtifactTitle artifact={artifact} label={artifact.title} isShimmering />);
  expect(working).toContain('data-artifact-shimmer');
  expect(working).toContain('background-clip: text');
  expect(working).toContain('prefers-reduced-motion: reduce');
  expect(working).not.toContain('studio-shimmer-clone');
  const resting = renderToStaticMarkup(<ArtifactTitle artifact={artifact} label={artifact.title} />);
  expect(resting).not.toContain('data-artifact-shimmer');
});
