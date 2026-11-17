import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import type { RendererLogLine } from '@studio/events';
import { deferred } from './testing/bridge.js';

const logged: RendererLogLine[] = [];

(globalThis as { window?: unknown }).window = {
  studio: {
    log(line: RendererLogLine) {
      logged.push(line);
    },
    telemetryException() {},
  },
};

const { setLogMirror } = await import('./log.js');
const { mirror } = await import('./mirror.js');
setLogMirror(false);

afterAll(() => {
  Reflect.deleteProperty(globalThis, 'window');
});

beforeEach(() => {
  logged.length = 0;
});

function source() {
  const answer = deferred<string>();
  const applied: string[] = [];
  const order: string[] = [];
  let listener: ((value: string) => void) | undefined;
  let unsubscribed = 0;
  const connection = mirror<string>({
    name: ['fixture', 'read value'],
    read: () => {
      order.push('read');
      return answer.promise;
    },
    subscribe: (next) => {
      order.push('subscribe');
      listener = next;
      return () => {
        unsubscribed += 1;
        listener = undefined;
      };
    },
    apply: (value) => {
      applied.push(value);
    },
  });
  return {
    answer,
    applied,
    order,
    connection,
    emit: (value: string) => listener?.(value),
    unsubscribed: () => unsubscribed,
  };
}

describe('mirror', () => {
  it('subscribes before it reads, and applies the read when no event was heard', async () => {
    const fixture = source();
    expect(fixture.order).toEqual(['subscribe', 'read']);
    expect(fixture.applied).toEqual([]);

    fixture.answer.settle('read');
    await fixture.connection.primed;
    expect(fixture.applied).toEqual(['read']);
  });

  it('applies an event that lands during the read, and stands the stale answer down', async () => {
    const fixture = source();
    fixture.emit('event');
    expect(fixture.applied).toEqual(['event']);

    fixture.answer.settle('stale read');
    await fixture.connection.primed;
    expect(fixture.applied).toEqual(['event']);
  });

  it('keeps applying events after the read, in the order they arrive', async () => {
    const fixture = source();
    fixture.answer.settle('read');
    await fixture.connection.primed;
    fixture.emit('first');
    fixture.emit('second');
    expect(fixture.applied).toEqual(['read', 'first', 'second']);
  });

  it('logs a refused read once, applies nothing, and still settles', async () => {
    const fixture = source();
    fixture.answer.refuse(new Error('main refused'));
    await fixture.connection.primed;

    expect(fixture.applied).toEqual([]);
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({ level: 'warn', subsystem: 'fixture', msg: 'read value refused' });

    fixture.emit('event');
    expect(fixture.applied).toEqual(['event']);
  });

  it('stops hearing events once stopped', async () => {
    const fixture = source();
    fixture.answer.settle('read');
    await fixture.connection.primed;

    fixture.connection.stop();
    expect(fixture.unsubscribed()).toBe(1);
    fixture.emit('after stop');
    expect(fixture.applied).toEqual(['read']);
  });

  it('lets a read in flight land after a stop, as the stores it replaced did', async () => {
    const fixture = source();
    fixture.connection.stop();
    fixture.answer.settle('read');
    await fixture.connection.primed;
    expect(fixture.applied).toEqual(['read']);
  });
});
