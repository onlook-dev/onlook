import { describe, expect, it } from 'bun:test';
import { installFrameDrawWindowSeat } from './frameDrawWindowSeat.js';

describe('frame-draw window seat', () => {
  const pointer = (type: string, pointerId: number, clientX = 0, clientY = 0): PointerEvent =>
    Object.assign(new Event(type), { pointerId, clientX, clientY }) as PointerEvent;

  it('catches a release in the same synchronous turn that installs the seat', () => {
    const target = new EventTarget();
    const calls: string[] = [];

    installFrameDrawWindowSeat(target, 7, {
      onMove: () => calls.push('move'),
      onFinish: (event) => calls.push(`finish:${event.clientX},${event.clientY}`),
      onCancel: () => calls.push('cancel'),
    });
    target.dispatchEvent(pointer('pointerup', 7, 20, 30));

    expect(calls).toEqual(['finish:20,30']);
  });

  it('cleans every listener idempotently after the first terminal event', () => {
    const target = new EventTarget();
    const calls: string[] = [];
    const cleanup = installFrameDrawWindowSeat(target, 7, {
      onMove: () => calls.push('move'),
      onFinish: () => calls.push('finish'),
      onCancel: () => calls.push('cancel'),
    });

    target.dispatchEvent(pointer('pointermove', 7));
    target.dispatchEvent(pointer('pointercancel', 7));
    target.dispatchEvent(new Event('blur'));
    target.dispatchEvent(pointer('pointerup', 7));
    target.dispatchEvent(pointer('pointermove', 7));
    cleanup();
    cleanup();

    expect(calls).toEqual(['move', 'cancel']);
  });

  it('lets a replacement gesture remove the previous seat before installing its own', () => {
    const target = new EventTarget();
    const calls: string[] = [];
    const cleanupPrevious = installFrameDrawWindowSeat(target, 7, {
      onMove: () => calls.push('previous-move'),
      onFinish: () => calls.push('previous-finish'),
      onCancel: () => calls.push('previous-cancel'),
    });

    cleanupPrevious();
    installFrameDrawWindowSeat(target, 8, {
      onMove: () => calls.push('next-move'),
      onFinish: () => calls.push('next-finish'),
      onCancel: () => calls.push('next-cancel'),
    });
    target.dispatchEvent(new Event('blur'));

    expect(calls).toEqual(['next-cancel']);
  });

  it('ignores unrelated pointers without retiring the owned seat', () => {
    const target = new EventTarget();
    const calls: string[] = [];
    installFrameDrawWindowSeat(target, 7, {
      onMove: () => calls.push('move'),
      onFinish: () => calls.push('finish'),
      onCancel: () => calls.push('cancel'),
    });

    target.dispatchEvent(pointer('pointermove', 8));
    target.dispatchEvent(pointer('pointerup', 8));
    target.dispatchEvent(pointer('pointercancel', 8));
    target.dispatchEvent(pointer('pointermove', 7));
    target.dispatchEvent(pointer('pointerup', 7));

    expect(calls).toEqual(['move', 'finish']);
  });
});
