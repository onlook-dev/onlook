import { describe, expect, it } from 'bun:test';
import { held, outcome, settle } from '@studio/fixtures';
import { createKeyedQueue } from './keyed-queue.js';

describe('createKeyedQueue', () => {
  it("runs one key's steps in the order asked for, each after the last has finished", async () => {
    const queue = createKeyedQueue<string>();
    const order: string[] = [];
    const first = held();

    const a = queue.run('k', async () => {
      order.push('a:start');
      await first.wait();
      order.push('a:end');
    });
    const b = queue.run('k', async () => {
      order.push('b');
    });
    await settle();
    expect(order).toEqual(['a:start']);

    first.open();
    await Promise.all([a, b]);
    expect(order).toEqual(['a:start', 'a:end', 'b']);
  });

  it('different keys never wait on each other', async () => {
    const queue = createKeyedQueue<number>();
    const order: string[] = [];
    const first = held();

    const blocked = queue.run(1, async () => {
      await first.wait();
      order.push('1');
    });
    await queue.run(2, async () => {
      order.push('2');
    });
    expect(order).toEqual(['2']);

    first.open();
    await blocked;
    expect(order).toEqual(['2', '1']);
  });

  it('a throwing step rejects its own run and the next step still runs', async () => {
    const queue = createKeyedQueue<string>();
    const order: string[] = [];

    const failing = queue.run('k', async () => {
      throw new Error('boom');
    });
    const next = queue.run('k', async () => {
      order.push('next');
    });

    expect(await outcome(failing)).toThrow('boom');
    await next;
    expect(order).toEqual(['next']);
  });

  it('names a key while a step is queued or running, and forgets it once drained', async () => {
    const queue = createKeyedQueue<string>();
    const gate = held();

    const running = queue.run('a', () => gate.wait());
    expect(queue.keys()).toEqual(['a']);

    gate.open();
    await running;
    await settle();
    expect(queue.keys()).toEqual([]);
  });
});
