import { describe, expect, it } from 'bun:test';
import { thumbnailTextAtlas, withThumbnailTextPage, type ThumbnailTextPlacement } from './text.js';

const label = (id: string, text = 'Checkout\nSecond pass'): ThumbnailTextPlacement => ({
  id, kind: 'text', text, size: 'large', scale: 0.5, order: 0,
  rect: { x: 10, y: 20, width: 200, height: 70 }, wrapWidth: 400,
});

describe('project preview text', () => {
  it('keeps words, explicit line breaks, wrapping and Canvas type sizes in isolated atlas slots', () => {
    const atlas = thumbnailTextAtlas([label('first'), label('second', 'Review')], 'font');
    expect(atlas.html).toContain('Checkout\nSecond pass');
    expect(atlas.html).toContain('width:400px;transform:scale(0.5)');
    expect(atlas.html).toContain('font-size:48px');
    expect(atlas.html).toContain('line-height:1.35');
    expect(atlas.html).toContain('white-space:pre-wrap;overflow-wrap:anywhere');
    expect(atlas.slots.get('first')).toEqual({ x: 0, y: 0, width: 200, height: 70 });
    expect(atlas.slots.get('second')).toEqual({ x: 0, y: 71, width: 200, height: 70 });
  });

  it('treats authored HTML as text and forbids remote content', () => {
    const atlas = thumbnailTextAtlas([label('label', '<img src="https://example.test" onerror="alert(1)">&')], 'font');
    expect(atlas.html).not.toContain('<img');
    expect(atlas.html).toContain('&lt;img');
    expect(atlas.html).toContain('&quot;');
    expect(atlas.html).toContain('default-src \'none\'');
  });

  it('uses the Canvas default wrapping width for unresized small and medium labels', () => {
    for (const [size, fontSize] of [['small', 16], ['medium', 28]] as const) {
      const atlas = thumbnailTextAtlas([{ ...label(size), size, wrapWidth: undefined }], 'font');
      expect(atlas.html).toContain('width:max-content;max-width:480px');
      expect(atlas.html).toContain(`font-size:${String(fontSize)}px`);
    }
  });

  it('bounds atlas slots and falls back for oversized text', () => {
    const atlas = thumbnailTextAtlas(Array.from({ length: 30 }, (_, index) => label(String(index))), 'font');
    expect(atlas.slots.size).toBe(24);
    expect(thumbnailTextAtlas([label('huge', 'a'.repeat(65_537))], 'font').slots.size).toBe(0);
  });

  it.each(['success', 'failure', 'timeout'] as const)('destroys the transient page after %s', async (outcome) => {
    let destroyed = 0;
    let stillActive: (() => boolean) | undefined;
    const rendered = withThumbnailTextPage(() => ({
      destroy: () => { destroyed += 1; },
      render: async (active) => {
        stillActive = active;
        if (outcome === 'failure') throw new Error('lost renderer');
        if (outcome === 'timeout') return new Promise<string>(() => undefined);
        return 'pixels';
      },
    }), 60);
    if (outcome === 'success') expect(await rendered).toBe('pixels');
    else await expect(rendered).rejects.toThrow();
    expect(destroyed).toBe(1);
    expect(stillActive?.()).toBe(false);
  });

  it('does not start capture when loading completes after timeout', async () => {
    let loaded: (() => void) | undefined;
    let captures = 0;
    const loading = new Promise<void>((resolve) => { loaded = resolve; });
    const rendered = withThumbnailTextPage(() => ({
      destroy: () => undefined,
      render: async (active) => {
        await loading;
        if (!active()) return;
        captures += 1;
      },
    }), 60);
    await expect(rendered).rejects.toThrow('timeout');
    loaded?.();
    await loading;
    expect(captures).toBe(0);
  });

  it('counts page construction against its deadline and destroys without starting an expired render', async () => {
    let rendered = false;
    let destroyed = false;
    await expect(withThumbnailTextPage(() => {
      Bun.sleepSync(25);
      return {
        destroy: () => { destroyed = true; },
        render: async () => { rendered = true; return 'pixels'; },
      };
    }, 60)).rejects.toThrow('timeout');
    expect(rendered).toBe(false);
    expect(destroyed).toBe(true);
  });
});
