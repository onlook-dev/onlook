import { describe, expect, it } from 'bun:test';
import { en } from '@studio/i18n/strings';
import { starterPage } from './starter.js';

describe('the page a drawn artifact starts on', () => {
  it('starts light without relying on the host color scheme', () => {
    expect(starterPage()).toContain('color-scheme: light');
    expect(starterPage()).toContain('background: #ffffff');
  });
  it('sizes the viewport box with its padding inside, so a blank page does not scroll', () => {
    // `min-height: 100vh` plus padding under the default content-box is taller than the
    // viewport by exactly that padding, and the guest scrolls with nothing to scroll to.
    const page = starterPage();

    expect(page).toContain('box-sizing: border-box');
    expect(page).toContain('min-height: 100vh');
  });

  it('shrinks its padding with the box, which a designer can draw far below the default', () => {
    expect(starterPage()).toContain('padding: clamp(');
  });

  it('says what it is and that chat is how it changes, from the catalogue', () => {
    const page = starterPage();

    expect(page).toContain(en['canvas.artifact.starter.heading']);
    expect(page).toContain(en['canvas.artifact.starter.body']);
    expect(page).toContain(en['canvas.artifact.starter.title']);
  });

  it('escapes the copy it interpolates, so a catalogue entry cannot open a tag', () => {
    // Every value here is ours, and the escape is what keeps that true of a later one.
    expect(starterPage()).not.toMatch(/<h1><[^/]/);
  });
});
