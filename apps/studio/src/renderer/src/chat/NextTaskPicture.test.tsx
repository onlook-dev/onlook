import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextTaskPicture, sketchShapeStyle } from './NextTaskPicture.js';

const draw = (picture: Parameters<typeof NextTaskPicture>[0]['picture'], url: string | null | undefined) =>
  renderToStaticMarkup(<NextTaskPicture picture={picture} read={() => url} />);

describe('the picture beside a next task (ONL-2977)', () => {
  test('keeps a clip of the user’s page out of session replay', () => {
    expect(draw({ clip: 'c1' }, 'blob:c1')).toMatch(/<img[^>]*data-replay-block=""/);
  });

  test('draws nothing for a clip whose bytes are gone or still loading, so the task shows as text', () => {
    expect(draw({ clip: 'c1' }, null)).toBe('');
    expect(draw({ clip: 'c1' }, undefined)).toBe('');
  });

  test('draws a sketch without asking for any bytes', () => {
    expect(draw({ skeleton: 'row' }, undefined)).toContain('data-picture="skeleton"');
  });
});

describe('the agent’s sketch beside a next task (ONL-2959)', () => {
  test('draws one shape per entry without asking for any bytes', () => {
    const markup = draw({ sketch: [{ kind: 'outline', x: 30, y: 5, w: 40, h: 90 }, { kind: 'text', x: 36, y: 20, w: 28 }] }, undefined);
    expect(markup).toContain('data-picture="sketch"');
    expect(markup.match(/data-shape=/g)).toHaveLength(2);
  });

  test('maps the box onto the tile in whole pixels, and keeps a circle round on a wide tile', () => {
    expect(sketchShapeStyle({ kind: 'block', x: 50, y: 50, w: 50, h: 50 })).toMatchObject({ left: 36, top: 28, width: 36, height: 28 });
    expect(sketchShapeStyle({ kind: 'circle', x: 0, y: 0, w: 20 })).toMatchObject({ width: 14, height: 14 });
  });

  test('draws a line at its own thickness, whatever height it was given', () => {
    expect(sketchShapeStyle({ kind: 'text', x: 0, y: 0, w: 50, h: 80 }).height).toBe(2);
  });
});
