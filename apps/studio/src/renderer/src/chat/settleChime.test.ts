import { describe, expect, it } from 'bun:test';
import type { PenView } from '@studio/events';
import { requestSteer, requestStop, sendWithChime, settleStreaming, watchFrom, type ChimeWatch } from './settleChime.js';

function run(
  start: ChimeWatch,
  steps: ReadonlyArray<boolean | 'stop' | { isStreaming: boolean; pen: PenView }>,
): boolean[] {
  let watch = start;
  const chimes: boolean[] = [];
  for (const step of steps) {
    if (step === 'stop') {
      watch = requestStop(watch);
      continue;
    }
    const [isStreaming, pen] = typeof step === 'boolean' ? [step, undefined] : [step.isStreaming, step.pen];
    const next = settleStreaming(watch, isStreaming, pen);
    watch = next.watch;
    chimes.push(next.chimes);
  }
  return chimes;
}

describe('settleStreaming', () => {
  it('only an accepted non-question send silences its running turn', async () => {
    for (const accepted of [true, false]) {
      for (const answersQuestion of [true, false]) {
        const watch = { current: watchFrom(true) };
        await sendWithChime(watch, async () => ({ accepted }), answersQuestion);
        expect(run(watch.current, [false])).toEqual([!accepted || answersQuestion]);
      }
    }
  });

  it('a failed send leaves the waited-on completion audible', async () => {
    const watch = { current: watchFrom(true) };
    await expect(sendWithChime(watch, async () => { throw new Error('send failed'); }, false)).rejects.toThrow('send failed');
    expect(run(watch.current, [false])).toEqual([true]);
  });

  it('a late send acceptance cannot silence a later turn', async () => {
    const watch = { current: watchFrom(true) };
    let accept: ((result: { accepted: boolean }) => void) | undefined;
    const result = sendWithChime(watch, () => new Promise((resolve) => { accept = resolve; }), false);
    watch.current = settleStreaming(watch.current, false, undefined).watch;
    watch.current = settleStreaming(watch.current, true, undefined).watch;
    accept?.({ accepted: true });
    await result;
    expect(run(watch.current, [false])).toEqual([true]);
  });

  it('a steered turn stays silent, without muting the next waited-on turn', () => {
    expect(requestSteer(watchFrom(false))).toEqual(watchFrom(false));
    const running = settleStreaming(watchFrom(false), true, undefined).watch;
    const steered = requestSteer(running);
    expect(run(steered, [false, true, false])).toEqual([false, false, true]);
  });
  it('chimes when a turn the user waited on ends on its own, finished or failed', () => {
    expect(run(watchFrom(false), [true, false])).toEqual([false, true]);
  });

  it('a turn the user stopped ends without a chime (ONL-2535)', () => {
    expect(run(watchFrom(false), [true, 'stop', false])).toEqual([false, false]);
  });

  it('a stop belongs to its turn: the next turn that ends on its own chimes', () => {
    expect(run(watchFrom(false), [true, 'stop', false, true, false])).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });

  it('a stop asked for after the turn already ended does not silence the next one', () => {
    expect(run(watchFrom(false), [true, false, 'stop', true, false])).toEqual([
      false,
      true,
      false,
      true,
    ]);
  });

  it('a falling edge whose waiting prompt will send plays no chime', () => {
    const pen: PenView = { penId: 1, text: 'Make the hero two columns.', verdict: 'send' };
    expect(run(watchFrom(false), [true, { isStreaming: false, pen }])).toEqual([false, false]);
  });

  it('a view that mounts mid-turn chimes only on the edge it saw', () => {
    expect(run(watchFrom(true), [true, false])).toEqual([false, true]);
  });
});
