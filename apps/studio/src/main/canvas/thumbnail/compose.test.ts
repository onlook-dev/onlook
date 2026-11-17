import { describe, expect, it } from 'bun:test';
import {
  THUMBNAIL_MAX_BYTES,
  THUMBNAIL_SECTION_BORDER,
  THUMBNAIL_SECTION_FILL,
  composeThumbnail,
  type ThumbBitmap,
  type ThumbFill,
  type ThumbFrame,
  type ThumbImageOps,
} from './compose.js';
import type { ThumbnailRect } from './bounds.js';

const SIZE = { width: 1024, height: 525 };

function solid(width: number, height: number, blue: number, green: number, red: number): ThumbBitmap {
  const bgra = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    bgra[i * 4] = blue;
    bgra[i * 4 + 1] = green;
    bgra[i * 4 + 2] = red;
    bgra[i * 4 + 3] = 255;
  }
  return { width, height, bgra };
}

/** Premultiplied, as the platform's own rows are: no channel exceeds `alpha`. */
function veiled(width: number, height: number, blue: number, alpha: number): ThumbBitmap {
  const bgra = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    bgra[i * 4] = blue;
    bgra[i * 4 + 3] = alpha;
  }
  return { width, height, bgra };
}

interface RecordingOps extends ThumbImageOps<number> {
  readonly asked: { source: number; width: number; height: number }[];
  readonly encoded: ThumbBitmap[];
  maxConcurrent: number;
}

function recordingOps(options: {
  bitmap?: (marker: number, width: number, height: number) => ThumbBitmap | null;
  png?: Buffer;
} = {}): RecordingOps {
  const asked: { source: number; width: number; height: number }[] = [];
  const encoded: ThumbBitmap[] = [];
  let live = 0;
  const ops: RecordingOps = {
    asked,
    encoded,
    maxConcurrent: 0,
    withBitmap(source, width, height, read) {
      const marker = source;
      asked.push({ source: marker, width, height });
      const bitmap = options.bitmap ? options.bitmap(marker, width, height) : solid(width, height, marker, 0, 0);
      if (bitmap === null) return false;
      live += 1;
      ops.maxConcurrent = Math.max(ops.maxConcurrent, live);
      try {
        read(bitmap);
      } finally {
        live -= 1;
      }
      return true;
    },
    decode: (bytes) => bytes[0] ?? null,
    toPng(bitmap) {
      encoded.push({ width: bitmap.width, height: bitmap.height, bgra: Buffer.from(bitmap.bgra) });
      return options.png ?? Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    },
  };
  return ops;
}

function frame(marker: number, rect: ThumbnailRect): ThumbFrame<number> {
  return { source: marker, rect };
}

function block(fill: ThumbFill, rect: ThumbnailRect): ThumbFrame<number> {
  return { fill, rect };
}

const OPAQUE: ThumbFill = { blue: 40, green: 41, red: 42, alpha: 255 };

async function* stream(...frames: ThumbFrame<number>[]): AsyncIterable<ThumbFrame<number>> {
  for (const f of frames) yield f;
}

const alphaAt = (bitmap: ThumbBitmap, x: number, y: number): number =>
  bitmap.bgra[(y * bitmap.width + x) * 4 + 3] ?? -1;

const blueAt = (bitmap: ThumbBitmap, x: number, y: number): number =>
  bitmap.bgra[(y * bitmap.width + x) * 4] ?? -1;

describe('composeThumbnail — the transparent ground', () => {
  it('leaves every pixel outside a frame’s destination rect fully transparent', async () => {
    const ops = recordingOps();
    const result = await composeThumbnail(SIZE, stream(frame(7, { x: 100, y: 50, width: 200, height: 120 })), ops);

    expect(result.ok).toBe(true);
    const composite = ops.encoded[0] as ThumbBitmap;
    expect(alphaAt(composite, 150, 100)).toBe(255);
    expect(blueAt(composite, 150, 100)).toBe(7);
    expect(alphaAt(composite, 99, 100)).toBe(0);
    expect(alphaAt(composite, 300, 100)).toBe(0);
    expect(alphaAt(composite, 150, 49)).toBe(0);
    expect(alphaAt(composite, 150, 170)).toBe(0);
  });

  it('hands the encoder a composite whose corner pixels are fully transparent', async () => {
    const ops = recordingOps();
    await composeThumbnail(SIZE, stream(frame(3, { x: 12, y: 12, width: 900, height: 400 })), ops);

    const composite = ops.encoded[0] as ThumbBitmap;
    for (const [x, y] of [
      [0, 0],
      [SIZE.width - 1, 0],
      [0, SIZE.height - 1],
      [SIZE.width - 1, SIZE.height - 1],
    ] as const) {
      expect(alphaAt(composite, x, y)).toBe(0);
    }
  });
});

describe('composeThumbnail — the arithmetic', () => {
  it('lands two frames at their own rects, neither overwriting the other', async () => {
    const ops = recordingOps();
    await composeThumbnail(
      SIZE,
      stream(frame(11, { x: 0, y: 0, width: 100, height: 100 }), frame(22, { x: 200, y: 0, width: 100, height: 100 })),
      ops,
    );

    const composite = ops.encoded[0] as ThumbBitmap;
    expect(blueAt(composite, 50, 50)).toBe(11);
    expect(blueAt(composite, 250, 50)).toBe(22);
    expect(alphaAt(composite, 150, 50)).toBe(0);
  });

  it('answers the capped size whatever the frames measure', async () => {
    const ops = recordingOps({ bitmap: (marker) => solid(4000, 3000, marker, 0, 0) });
    await composeThumbnail(SIZE, stream(frame(5, { x: 0, y: 0, width: 300, height: 200 })), ops);

    const composite = ops.encoded[0] as ThumbBitmap;
    expect({ width: composite.width, height: composite.height }).toEqual(SIZE);
    expect(composite.bgra.byteLength).toBe(SIZE.width * SIZE.height * 4);
  });

  it('asks for every frame resized to its destination rect', async () => {
    const ops = recordingOps();
    await composeThumbnail(
      SIZE,
      stream(frame(1, { x: 0, y: 0, width: 273.4, height: 140.6 }), frame(2, { x: 300, y: 0, width: 64, height: 64 })),
      ops,
    );

    expect(ops.asked).toEqual([
      { source: 1, width: 273, height: 141 },
      { source: 2, width: 64, height: 64 },
    ]);
  });

  it('paints a frame smaller than its rect without reading outside its own bitmap', async () => {
    const ops = recordingOps({ bitmap: (marker) => solid(40, 30, marker, 0, 0) });
    const result = await composeThumbnail(SIZE, stream(frame(9, { x: 10, y: 10, width: 200, height: 150 })), ops);

    expect(result.ok).toBe(true);
    const composite = ops.encoded[0] as ThumbBitmap;
    expect(blueAt(composite, 49, 39)).toBe(9);
    expect(alphaAt(composite, 50, 39)).toBe(0);
    expect(alphaAt(composite, 49, 40)).toBe(0);
  });

  it('clips a rect that runs off the output rather than throwing', async () => {
    const ops = recordingOps();
    const result = await composeThumbnail(
      SIZE,
      stream(frame(4, { x: SIZE.width - 20, y: SIZE.height - 10, width: 200, height: 200 })),
      ops,
    );

    expect(result.ok).toBe(true);
    const composite = ops.encoded[0] as ThumbBitmap;
    expect(alphaAt(composite, SIZE.width - 1, SIZE.height - 1)).toBe(255);
  });
});

describe('composeThumbnail — stacking one thing over another', () => {
  it('hands an opaque frame’s own pixels to the later frame where the two overlap', async () => {
    const ops = recordingOps();
    await composeThumbnail(
      SIZE,
      stream(
        frame(11, { x: 0, y: 0, width: 100, height: 100 }),
        frame(22, { x: 50, y: 0, width: 100, height: 100 }),
      ),
      ops,
    );

    const composite = ops.encoded[0] as ThumbBitmap;
    expect(blueAt(composite, 25, 50)).toBe(11);
    expect(blueAt(composite, 75, 50)).toBe(22);
    expect(blueAt(composite, 125, 50)).toBe(22);
    expect(alphaAt(composite, 75, 50)).toBe(255);
    expect(alphaAt(composite, 25, 50)).toBe(255);
  });

  it('keeps what is underneath where a frame’s own pixels are transparent', async () => {
    const ops = recordingOps({
      bitmap: (marker, width, height) =>
        marker === 2 ? veiled(width, height, 0, 0) : solid(width, height, marker, 0, 0),
    });
    await composeThumbnail(
      SIZE,
      stream(
        frame(1, { x: 0, y: 0, width: 100, height: 100 }),
        frame(2, { x: 0, y: 0, width: 100, height: 100 }),
      ),
      ops,
    );

    const composite = ops.encoded[0] as ThumbBitmap;
    expect(blueAt(composite, 50, 50)).toBe(1);
    expect(alphaAt(composite, 50, 50)).toBe(255);
  });

  it('keeps a channel inside a byte when a frame’s rows are not premultiplied', async () => {
    const ops = recordingOps({
      bitmap: (marker, width, height) =>
        marker === 2 ? veiled(width, height, 255, 128) : solid(width, height, 255, 0, 0),
    });
    await composeThumbnail(
      SIZE,
      stream(
        frame(1, { x: 0, y: 0, width: 100, height: 100 }),
        frame(2, { x: 0, y: 0, width: 100, height: 100 }),
      ),
      ops,
    );

    const composite = ops.encoded[0] as ThumbBitmap;
    expect(blueAt(composite, 50, 50)).toBe(255);
    expect(alphaAt(composite, 50, 50)).toBe(255);
  });

  it('blends a half-transparent frame with the one beneath rather than replacing it', async () => {
    const ops = recordingOps({
      bitmap: (marker, width, height) =>
        marker === 2 ? veiled(width, height, 0, 128) : solid(width, height, 255, 0, 0),
    });
    await composeThumbnail(
      SIZE,
      stream(
        frame(1, { x: 0, y: 0, width: 100, height: 100 }),
        frame(2, { x: 0, y: 0, width: 100, height: 100 }),
      ),
      ops,
    );

    const composite = ops.encoded[0] as ThumbBitmap;
    expect(blueAt(composite, 50, 50)).toBeGreaterThan(0);
    expect(blueAt(composite, 50, 50)).toBeLessThan(255);
    expect(alphaAt(composite, 50, 50)).toBe(255);
  });
});

describe('composeThumbnail — a block with no source image', () => {
  it('leaves the underlying frame visible through rounded section corners, including when clipped', async () => {
    const ops = recordingOps();
    await composeThumbnail(SIZE, stream(
      frame(9, { x: 0, y: 0, width: 200, height: 200 }),
      { fill: THUMBNAIL_SECTION_FILL, rect: { x: -10, y: 20, width: 110, height: 80 },
        outline: { radius: 16, width: 2, colour: THUMBNAIL_SECTION_BORDER } },
    ), ops);
    const bitmap = ops.encoded[0]!;
    expect(blueAt(bitmap, 99, 20)).toBe(9);
    expect(blueAt(bitmap, 50, 20)).toBe(73);
    expect(blueAt(bitmap, 50, 50)).toBe(51);
    expect(blueAt(bitmap, 0, 50)).toBe(51);
    expect(alphaAt(bitmap, 99, 20)).toBe(255);
    expect(blueAt(bitmap, 100, 50)).toBe(9);
  });

  it('antialiases subpixel section outlines without clearing pixels outside the rounded surface', async () => {
    const ops = recordingOps();
    await composeThumbnail(SIZE, stream(
      { fill: THUMBNAIL_SECTION_FILL, rect: { x: 20, y: 20, width: 20, height: 16 },
        outline: { radius: 2, width: 0.25, colour: THUMBNAIL_SECTION_BORDER } },
    ), ops);
    const bitmap = ops.encoded[0]!;
    expect(alphaAt(bitmap, 20, 20)).toBeLessThan(255);
    expect(alphaAt(bitmap, 30, 20)).toBe(255);
    expect(blueAt(bitmap, 30, 20)).toBe(57);
    expect(blueAt(bitmap, 30, 25)).toBe(51);
    expect(alphaAt(bitmap, 19, 25)).toBe(0);
  });

  it('leaves no transparent pixel where a block lands over a frame, asking for no bitmap', async () => {
    const ops = recordingOps();
    await composeThumbnail(
      SIZE,
      stream(frame(9, { x: 0, y: 0, width: 200, height: 200 }), block(OPAQUE, { x: 50, y: 50, width: 60, height: 40 })),
      ops,
    );

    const composite = ops.encoded[0] as ThumbBitmap;
    expect(alphaAt(composite, 60, 60)).toBe(255);
    expect(blueAt(composite, 60, 60)).toBe(OPAQUE.blue);
    expect(blueAt(composite, 10, 10)).toBe(9);
    expect(alphaAt(composite, 250, 60)).toBe(0);
    expect(ops.asked).toEqual([{ source: 9, width: 200, height: 200 }]);
  });

  it('counts as a drawn frame, so a canvas of blocks alone still encodes', async () => {
    const ops = recordingOps();
    const result = await composeThumbnail(SIZE, stream(block(OPAQUE, { x: 12, y: 12, width: 80, height: 30 })), ops);

    expect(result.ok).toBe(true);
    expect(ops.asked).toHaveLength(0);
    expect(ops.encoded).toHaveLength(1);
  });

  it('clips a block that runs off the output rather than throwing', async () => {
    const ops = recordingOps();
    const result = await composeThumbnail(
      SIZE,
      stream(block(OPAQUE, { x: SIZE.width - 20, y: SIZE.height - 10, width: 200, height: 200 })),
      ops,
    );

    expect(result.ok).toBe(true);
    const composite = ops.encoded[0] as ThumbBitmap;
    expect(alphaAt(composite, SIZE.width - 1, SIZE.height - 1)).toBe(255);
  });
});

describe('composeThumbnail — streaming', () => {
  it('draws each of twenty-four frames before pulling the next one', async () => {
    const frames = Array.from({ length: 24 }, (_, i) =>
      frame(i + 1, { x: (i % 6) * 170, y: Math.floor(i / 6) * 130, width: 160, height: 120 }),
    );
    const trace: string[] = [];
    const ops = recordingOps();
    const drawing: ThumbImageOps<number> = {
      ...ops,
      withBitmap(source, width, height, read) {
        trace.push(`draw:${String(source)}`);
        return ops.withBitmap(source, width, height, read);
      },
    };
    /* The pull is what the streaming contract is about: a compositor that buffered
       every decoded frame first would show 24 pulls before the first draw. */
    async function* pulling(): AsyncIterable<ThumbFrame<number>> {
      for (const one of frames) {
        trace.push(`pull:${String(one.source)}`);
        await Promise.resolve();
        yield one;
      }
    }

    const result = await composeThumbnail(SIZE, pulling(), drawing);

    expect(result.ok).toBe(true);
    expect(trace).toHaveLength(48);
    expect(trace.slice(0, 6)).toEqual(['pull:1', 'draw:1', 'pull:2', 'draw:2', 'pull:3', 'draw:3']);
    for (let i = 0; i < 24; i += 1) {
      expect(trace[i * 2]).toBe(`pull:${String(i + 1)}`);
      expect(trace[i * 2 + 1]).toBe(`draw:${String(i + 1)}`);
    }
  });
});

describe('composeThumbnail — refusals', () => {
  it('refuses an empty stream and encodes nothing', async () => {
    const ops = recordingOps();
    const result = await composeThumbnail(SIZE, stream(), ops);

    expect(result).toEqual({ ok: false, reason: 'no-frames' });
    expect(ops.encoded).toHaveLength(0);
  });

  it('abandons on the first undecodable frame, having asked for one bitmap only', async () => {
    const ops = recordingOps({ bitmap: (marker) => (marker === 2 ? null : solid(10, 10, marker, 0, 0)) });
    const result = await composeThumbnail(
      SIZE,
      stream(frame(2, { x: 0, y: 0, width: 10, height: 10 }), frame(3, { x: 20, y: 0, width: 10, height: 10 })),
      ops,
    );

    expect(result).toEqual({ ok: false, reason: 'frame-failed' });
    expect(ops.asked).toHaveLength(1);
    expect(ops.encoded).toHaveLength(0);
  });

  it('abandons when the producer throws mid-stream', async () => {
    const ops = recordingOps();
    async function* failing(): AsyncIterable<ThumbFrame<number>> {
      yield frame(1, { x: 0, y: 0, width: 10, height: 10 });
      throw new Error('capture refused');
    }

    const result = await composeThumbnail(SIZE, failing(), ops);

    expect(result).toEqual({ ok: false, reason: 'frame-failed' });
    expect(ops.encoded).toHaveLength(0);
  });

  it('refuses an encoded composite over the one-megabyte ceiling', async () => {
    const ops = recordingOps({ png: Buffer.alloc(THUMBNAIL_MAX_BYTES + 1) });
    const result = await composeThumbnail(SIZE, stream(frame(1, { x: 0, y: 0, width: 10, height: 10 })), ops);

    expect(result).toEqual({ ok: false, reason: 'too-large' });
  });

  it('answers the encoded bytes when they sit under the ceiling', async () => {
    const png = Buffer.alloc(THUMBNAIL_MAX_BYTES);
    const ops = recordingOps({ png });
    const result = await composeThumbnail(SIZE, stream(frame(1, { x: 0, y: 0, width: 10, height: 10 })), ops);

    expect(result).toEqual({ ok: true, png });
  });
});
