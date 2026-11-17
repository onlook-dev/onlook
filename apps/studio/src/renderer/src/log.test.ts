import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import type { RendererLogLine } from '@studio/events';

const sent: RendererLogLine[] = [];
let throwFromDoor = false;

(globalThis as { window?: unknown }).window = {
  studio: {
    log(line: RendererLogLine) {
      if (throwFromDoor) throw new Error('bridge torn');
      sent.push(line);
    },
    telemetryException() {},
  },
};

const { log, setLogMirror } = await import('./log.js');
setLogMirror(false);

afterAll(() => {
  Reflect.deleteProperty(globalThis, 'window');
});

beforeEach(() => {
  sent.length = 0;
  throwFromDoor = false;
});

describe('the renderer log', () => {
  it('stamps the door process and scrubs paths in the message and the fields', () => {
    log('canvas').warn('failed at /Users/wren/repo/src/x.ts', { where: '/Users/wren/repo/.env' });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.process).toBe('tab');
    expect(sent[0]!.msg).toBe('failed at <path>');
    expect(sent[0]!.fields).toEqual({ where: '<path>' });
  });

  it('drops content-named fields, top level and nested, from the same list main uses', () => {
    log('chat').warn('turn failed', {
      prompt: 'the user typed this',
      status: 'error',
      detail: { content: 'model output', count: 3 },
    });
    expect(sent[0]!.fields).toEqual({ status: 'error', detail: { count: 3 } });
  });

  it('carries the level it was called at', () => {
    log('x').debug('d');
    log('x').info('i');
    log('x').error('e');
    expect(sent.map((line) => line.level)).toEqual(['debug', 'info', 'error']);
  });

  it('a cyclic field value neither throws nor hangs (ONL-2343 review)', () => {
    const cyclic: Record<string, unknown> = { name: 'loop' };
    cyclic['self'] = cyclic;
    expect(() => log('x').error('boom', { cyclic })).not.toThrow();
    expect(sent).toHaveLength(1);
  });

  it('flattens past the depth cap instead of walking forever', () => {
    log('x').info('deep', { a: { b: { c: { d: 'far' } } } });
    expect(sent[0]!.fields).toEqual({ a: { b: '[object]' } });
  });

  it('bounds a long array to a count', () => {
    log('x').info('wide', { items: Array.from({ length: 50 }, (_, i) => i) });
    expect((sent[0]!.fields as { items: unknown[] }).items).toHaveLength(20);
  });

  it('a torn bridge is not the caller`s problem', () => {
    throwFromDoor = true;
    expect(() => log('x').error('still fine')).not.toThrow();
  });
});
