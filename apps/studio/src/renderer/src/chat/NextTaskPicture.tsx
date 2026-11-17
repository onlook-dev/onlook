import { useEffect, useMemo, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { NEXT_TASK_SKETCH_BOX, type NextTaskPicture as Picture, type NextTaskSketchKind, type NextTaskSketchShape, type NextTaskSkeleton, type TranscriptItem } from '@studio/events';
import { placeNextTasks, type NextTaskPictures } from '@studio/chat-ui';
import { REPLAY_BLOCK_ATTRIBUTE } from '../replay/derive.js';
import { peekImage, resolveImage } from './imageCache.js';
import { clipsToTrack, createPictureLoads, type PictureLoads } from './nextTaskPictures.js';

const TILE_WIDTH = 72;
const TILE_HEIGHT = 56;
const TILE: CSSProperties = {
  width: TILE_WIDTH,
  height: TILE_HEIGHT,
  flexShrink: 0,
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 'var(--radius-element)',
  border: 'var(--border-width) solid var(--color-border)',
  background: 'var(--studio-illo-surface-sunken)',
};
const CLIP: CSSProperties = { display: 'block', width: '100%', height: '100%', objectFit: 'cover' };

const ink = (style: CSSProperties): CSSProperties => ({ position: 'absolute', background: 'var(--studio-illo-ink)', borderRadius: 1, ...style });

const SKELETONS: Record<NextTaskSkeleton, ReactNode> = {
  button: (
    <>
      <span style={ink({ left: 10, top: 11, width: 38, height: 4 })} />
      <span style={ink({ left: 10, top: 19, width: 28, height: 3, background: 'var(--studio-illo-ink-soft)' })} />
      <span style={ink({ left: 10, top: 31, width: 30, height: 12, borderRadius: 2, background: 'var(--studio-illo-fill)' })} />
    </>
  ),
  row: (
    <>
      {[0, 1, 2, 3].map((i) => (
        <span key={i}>
          <span style={ink({ left: 8 + i * 15, top: 15, width: 9, height: 9, borderRadius: 5, background: 'var(--studio-illo-fill)' })} />
          <span style={ink({ left: 7 + i * 15, top: 29, width: 11, height: 3 })} />
          <span style={ink({ left: 8 + i * 15, top: 35, width: 9, height: 2, background: 'var(--studio-illo-ink-soft)' })} />
        </span>
      ))}
    </>
  ),
  story: (
    <>
      <span style={ink({ left: 8, top: 10, width: 26, height: 5, background: 'var(--studio-illo-fill)' })} />
      <span style={ink({ left: 8, top: 20, width: 26, height: 2 })} />
      <span style={ink({ left: 8, top: 26, width: 23, height: 2 })} />
      <span style={ink({ left: 8, top: 32, width: 26, height: 2 })} />
      <span style={ink({ left: 40, top: 10, width: 24, height: 36, borderRadius: 2, background: 'var(--studio-illo-photo)' })} />
    </>
  ),
};

const LINE_HEIGHT: Partial<Record<NextTaskSketchKind, number>> = { heading: 4, text: 2 };
const TONE: Record<NextTaskSketchKind, CSSProperties> = {
  heading: {},
  text: { background: 'var(--studio-illo-ink-soft)' },
  block: { borderRadius: 2, background: 'var(--studio-illo-fill)' },
  image: { borderRadius: 2, background: 'var(--studio-illo-photo)' },
  circle: { borderRadius: '50%', background: 'var(--studio-illo-fill)' },
  outline: { borderRadius: 3, background: 'transparent', boxSizing: 'border-box', border: 'var(--border-width) solid var(--studio-illo-ink)' },
};

const across = (units: number): number => Math.round((units / NEXT_TASK_SKETCH_BOX) * TILE_WIDTH);
const down = (units: number): number => Math.round((units / NEXT_TASK_SKETCH_BOX) * TILE_HEIGHT);

export function sketchShapeStyle(shape: NextTaskSketchShape): CSSProperties {
  const width = Math.max(1, across(shape.w));
  const height = shape.kind === 'circle' ? width : (LINE_HEIGHT[shape.kind] ?? Math.max(1, down(shape.h ?? 0)));
  return ink({ left: across(shape.x), top: down(shape.y), width, height, ...TONE[shape.kind] });
}

/** `null` where the task shows as text: a clip whose bytes are gone or were given up on (ONL-2977). */
export function NextTaskPicture({ picture, read }: { picture: Picture; read: PictureLoads['read'] }): ReactNode {
  if ('sketch' in picture) {
    return (
      <div style={TILE} data-testid="next-task-picture" data-picture="sketch" aria-hidden>
        {picture.sketch.map((shape, index) => (
          <span key={index} data-shape={shape.kind} style={sketchShapeStyle(shape)} />
        ))}
      </div>
    );
  }
  if ('skeleton' in picture) {
    return (
      <div style={TILE} data-testid="next-task-picture" data-picture="skeleton" aria-hidden>
        {SKELETONS[picture.skeleton]}
      </div>
    );
  }
  const url = read(picture.clip);
  if (url == null) return null;
  return (
    <div style={TILE} data-testid="next-task-picture" data-picture="clip" aria-hidden>
      <img src={url} alt="" style={CLIP} {...{ [REPLAY_BLOCK_ATTRIBUTE]: '' }} />
    </div>
  );
}

let appLoads: PictureLoads | undefined;

export function appPictureLoads(): PictureLoads {
  appLoads ??= createPictureLoads({ resolve: resolveImage, peek: peekImage });
  return appLoads;
}

export function useNextTaskPictures(loads: PictureLoads, items: readonly TranscriptItem[], isStreaming: boolean): NextTaskPictures {
  const cards = useMemo(() => placeNextTasks(items, isStreaming), [items, isStreaming]);
  useEffect(() => loads.track(clipsToTrack(cards)), [loads, cards]);
  const version = useSyncExternalStore(loads.subscribe, loads.version);
  return useMemo(
    () => ({
      draw: (task) => (task.picture === undefined ? null : <NextTaskPicture picture={task.picture} read={loads.read} />),
      isSettled: (clip) => loads.read(clip) !== undefined,
    }),
    [loads, version],
  );
}
