import { expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { FrameRing } from './FrameRing.js';

it('changes only the resting color for artifact identity, preserving ordinary frames and all geometry', () => {
  for (const zoom of [0.25, 0.5, 1, 2, 4]) {
    for (const isEmphasised of [false, true]) {
      const ordinary = renderToStaticMarkup(<FrameRing zoom={zoom} isEmphasised={isEmphasised} />);
      const artifact = renderToStaticMarkup(<FrameRing zoom={zoom} isEmphasised={isEmphasised} accent="artifact" />);
      expect(artifact).toBe(isEmphasised ? ordinary : ordinary.replace('var(--color-border)', 'transparent'));
      expect(ordinary).not.toContain('outline:');
      expect(ordinary).not.toContain('border-radius:');
    }
  }
});
