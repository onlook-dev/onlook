import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { PREVIEWS } from './registry.js';

const css = readFileSync(new URL('./toolPreview.css', import.meta.url), 'utf8');
const motionRules = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)', css.indexOf('[data-tpp-pane] *:not')));

const declarationsFor = (selector: string): string => {
  const rules = [...motionRules.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  return rules.find((rule) => rule[1]?.split(',').some((part) => part.trim() === selector))?.[2] ?? '';
};

const stageSelector = '[data-tool-preview] [data-tpp-pane] [data-tool-illustration]';
const stillAt = (kind?: string, pointer = false): number => {
  const selector = kind === undefined ? stageSelector
    : `${stageSelector.slice(0, -1)}="${kind}"]${pointer ? ' [data-tool-pointer]' : ''}`;
  const declarations = declarationsFor(selector);
  const delay = /--tool-preview-still:\s*(-[\d.]+)s/.exec(declarations)?.[1];
  if (delay === undefined && kind === undefined) throw new Error('Missing default illustration still');
  return delay === undefined ? stillAt() : -Number(delay);
};

describe('toolbar illustration reduced-motion stills', () => {
  it('pauses real timelines with higher specificity than the pane head start, including own-delay run layers', () => {
    expect(css).toContain('[data-tpp-pane] *:not([data-own-delay]) { animation-delay: -0.45s !important }');
    const declarations = declarationsFor(`${stageSelector} *`);
    expect(declarations).toContain('animation-play-state: paused !important');
    expect(declarations).toContain('animation-delay: var(--tool-preview-still) !important');
    expect(stageSelector.match(/\[/g)).toHaveLength(3);
    expect(motionRules).not.toMatch(/animation-(duration|iteration-count|fill-mode)\s*:/);
    expect(declarationsFor('[data-tool-preview]')).toContain('animation: none !important');
    expect(declarations).not.toContain('animation: none');
  });

  it('keeps selected handles, the arrow and moved content visible after the grab phase', () => {
    const progress = stillAt('select') / 3.6;
    expect(progress).toBeGreaterThan(0.70);
    expect(progress).toBeLessThan(0.84);
  });

  it('shows the complete window and artifact while keeping their drawing cursor fully opaque', () => {
    for (const kind of ['frame', 'artifact']) {
      expect(stillAt(kind) / 3.6).toBeGreaterThanOrEqual(0.72);
      expect(stillAt(kind) / 3.6).toBeLessThan(0.88);
      expect(stillAt(kind, true) / 3.6).toBeGreaterThan(0.56);
      expect(stillAt(kind, true) / 3.6).toBeLessThanOrEqual(0.68);
    }
  });

  it('shows every translated text character, the outline, caret and clicking pointer together', () => {
    const elapsed = stillAt('text');
    expect(elapsed / 3.6).toBeGreaterThan(0.70);
    expect(elapsed / 3.6).toBeLessThan(0.76);
    expect((elapsed % 0.8) / 0.8).toBeLessThan(0.5);
    expect(stillAt('text', true) / 3.6).toBeGreaterThan(0.12);
    expect(stillAt('text', true) / 3.6).toBeLessThan(0.20);
  });

  it('shows the placed image and ring, and the middle of the pan and both run directions', () => {
    expect(stillAt('image') / 3.6).toBeGreaterThan(0.64);
    expect(stillAt('image') / 3.6).toBeLessThan(0.82);
    expect(stillAt('pan')).toBe(1.8);
    expect(stillAt('run') / 3.6).toBe(0.5);
    expect(1 - stillAt('run') / 3.6).toBe(0.5);
  });

  for (const entry of PREVIEWS) {
    it(`preserves ${entry.id}'s authored durations and exposes its still selector`, () => {
      for (const running of entry.id === 'run' ? [false, true] : [false]) {
        const Content = entry.Content;
        const markup = renderToStaticMarkup(<Content running={running} />);
        expect(markup).toContain(`data-tool-illustration="${entry.id}"`);
        const animations = [...markup.matchAll(/animation:([^";]+)/g)].map((match) => match[1] ?? '');
        expect(animations.length).toBeGreaterThan(0);
        for (const animation of animations) {
          for (const track of animation.split(/, (?=[a-z])/)) {
            expect(track).toContain(track.startsWith('ttp-blink') ? '0.8s' : '3.6s');
            expect(track).toContain('infinite');
          }
        }
        if (entry.id === 'run') {
          expect(markup.match(/data-own-delay/g)).toHaveLength(3);
          expect(markup.match(new RegExp(running ? 'reverse both' : 'normal both', 'g'))).toHaveLength(3);
        }
        if (['frame', 'artifact', 'text', 'select'].includes(entry.id)) {
          expect(markup).toContain('data-tool-pointer');
        }
      }
    });
  }
});
