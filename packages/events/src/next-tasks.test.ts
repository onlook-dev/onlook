import { describe, expect, it } from 'bun:test';
import { MAX_NEXT_TASK_SKETCH_SHAPES, nextTaskPicturesIn, nextTaskPicturesLine, nextTaskSketchOf, nextTasksOffered, type NextTask } from './next-tasks.js';

const clip = '0123456789ab-00000000-0000-4000-8000-000000000001';

describe('the pictures a next-task offer names (ONL-2977)', () => {
  it('reads back what the offer wrote, one entry per task', () => {
    const result = `Studio is showing these tasks.\n${nextTaskPicturesLine([{ clip }, { skeleton: 'story' }, null])}`;
    expect(nextTaskPicturesIn(result)).toEqual([{ clip }, { skeleton: 'story' }, undefined]);
  });

  it('shows text where an entry is not a stored image or a known sketch', () => {
    const line = `${'Card pictures: '}${JSON.stringify([{ clip: '../../etc/passwd' }, { skeleton: 'hero' }, { html: '<b>' }])}`;
    expect(nextTaskPicturesIn(line)).toEqual([undefined, undefined, undefined]);
  });

  it('names nothing for a result without the line, or with one that does not parse', () => {
    expect(nextTaskPicturesIn(undefined)).toBeUndefined();
    expect(nextTaskPicturesIn('Studio is showing these tasks.')).toBeUndefined();
    expect(nextTaskPicturesIn('Card pictures: [{')).toBeUndefined();
  });
});

describe('each offered task carries its own picture (ONL-2977)', () => {
  const result = nextTaskPicturesLine([{ clip }, { skeleton: 'row' }, null]);

  it('pairs the pictures with the tasks in the call’s order, from either harness', () => {
    const tasks = [{ title: 'Make the button solid', line: 'A warm fill' }, { title: 'Tighten the promises' }, { title: 'Rewrite the story' }];
    const expected: NextTask[] = [{ title: 'Make the button solid', line: 'A warm fill', picture: { clip } }, { title: 'Tighten the promises', picture: { skeleton: 'row' } }, { title: 'Rewrite the story' }];
    expect(nextTasksOffered({ tasks }, result)?.tasks).toStrictEqual(expected);
    expect(nextTasksOffered({ tool: 'suggest_next_tasks', arguments: JSON.stringify({ tasks }) }, result)?.tasks).toStrictEqual(expected);
  });

  it('keeps each picture on its own task when an earlier task has no title', () => {
    const offered = nextTasksOffered({ tasks: [{ title: ' ' }, { title: 'Tighten the promises' }, { title: 'Rewrite the story' }] }, result);
    const expected: NextTask[] = [{ title: 'Tighten the promises', picture: { skeleton: 'row' } }, { title: 'Rewrite the story' }];
    expect(offered?.tasks).toStrictEqual(expected);
  });

  it('pictures nothing when the result names no pictures', () => {
    expect(nextTasksOffered({ tasks: [{ title: 'Rewrite the story' }] }, 'Studio is showing these tasks.')?.tasks).toStrictEqual([{ title: 'Rewrite the story' }]);
    expect(nextTasksOffered({ tasks: [{ title: 'Rewrite the story' }] })?.tasks).toStrictEqual([{ title: 'Rewrite the story' }]);
  });
});

describe('the sketch an agent gives a task that adds something new (ONL-2959)', () => {
  const line = (pictures: unknown[]) => `Card pictures: ${JSON.stringify(pictures)}`;

  it('reads a sketch back shape by shape, with no height on a line or a circle', () => {
    const sketch = [
      { kind: 'outline', x: 30, y: 5, w: 40, h: 90 },
      { kind: 'heading', x: 36, y: 15, w: 28, h: 9 },
      { kind: 'circle', x: 45, y: 40, w: 10 },
    ];
    expect(nextTaskPicturesIn(line([{ sketch }]))).toStrictEqual([
      { sketch: [{ kind: 'outline', x: 30, y: 5, w: 40, h: 90 }, { kind: 'heading', x: 36, y: 15, w: 28 }, { kind: 'circle', x: 45, y: 40, w: 10 }] },
    ]);
  });

  it('keeps every shape inside the box, in whole units', () => {
    expect(nextTaskPicturesIn(line([{ sketch: [{ kind: 'block', x: -20, y: 40.6, w: 400, h: 12 }] }]))).toStrictEqual([
      { sketch: [{ kind: 'block', x: 0, y: 41, w: 100, h: 12 }] },
    ]);
  });

  it('drops a shape it cannot draw and keeps the rest, up to the cap', () => {
    const drawn = { kind: 'text' as const, x: 10, y: 10, w: 40 };
    const broken = [{ kind: 'path', x: 1, y: 1, w: 1 }, { kind: 'block', x: 1, y: 1, w: 10 }, { kind: 'text', x: '1', y: 1, w: 1 }, { kind: 'image', x: 1, y: 1, w: 0, h: 5 }];
    expect(nextTaskPicturesIn(line([{ sketch: [...broken, drawn] }]))).toStrictEqual([{ sketch: [drawn] }]);
    const many = Array.from({ length: 20 }, () => drawn);
    expect(nextTaskSketchOf(many)).toHaveLength(MAX_NEXT_TASK_SKETCH_SHAPES);
  });

  it('shows text where no shape survives, or the sketch is not a list', () => {
    expect(nextTaskPicturesIn(line([{ sketch: [{ kind: 'svg', x: 0, y: 0, w: 10 }] }, { sketch: '<svg/>' }, { sketch: [] }]))).toEqual([undefined, undefined, undefined]);
  });
});
