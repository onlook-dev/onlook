import { describe, expect, it } from 'bun:test';
import type { CanvasDoc } from '@studio/events';
import { inspirationOpeningFor, type InspirationAsk } from './inspiration.js';

const frame = { id: 'frame-1', kind: 'browser' as const, name: 'Mobbin', x: 0, y: 0, width: 1512, height: 1680, order: 0, content: { homeUrl: 'https://mobbin.com/explore/web' } };
const note = { id: 'text-1', kind: 'text' as const, name: 'Note', x: 0, y: 0, width: 100, height: 40, order: 1, content: { text: 'hi' } };
const doc = { nodes: { [frame.id]: frame, [note.id]: note } } as unknown as CanvasDoc;

const ask = (over: Partial<InspirationAsk> = {}): InspirationAsk => ({
  isOn: true,
  isBusy: false,
  alreadyOpened: false,
  doc,
  frameId: frame.id,
  repoIdentity: 'repo',
  ...over,
});

describe('inspirationOpeningFor', () => {
  it('opens on an idle session with the Frame on its canvas, naming the Frame', () => {
    expect(inspirationOpeningFor(ask())).toContain('frame-1');
  });

  it('opens nothing with the flag off', () => {
    expect(inspirationOpeningFor(ask({ isOn: false }))).toBeUndefined();
  });

  it('opens nothing while a turn runs or a prompt waits', () => {
    expect(inspirationOpeningFor(ask({ isBusy: true }))).toBeUndefined();
  });

  it('opens once per Frame', () => {
    expect(inspirationOpeningFor(ask({ alreadyOpened: true }))).toBeUndefined();
  });

  it('opens nothing for a Frame the canvas does not hold, or an object that is not a Frame', () => {
    expect(inspirationOpeningFor(ask({ frameId: 'ghost' }))).toBeUndefined();
    expect(inspirationOpeningFor(ask({ frameId: note.id }))).toBeUndefined();
    expect(inspirationOpeningFor(ask({ doc: null }))).toBeUndefined();
  });
});
