import { describe, expect, it } from 'bun:test';
import {
  createWindowEventSeat,
  installDuplicateDragWindowSeat,
  installResizeWindowSeat,
} from './gestureWindowSeats.js';

const pointer = (pointerId: number): PointerEvent =>
  Object.assign(new Event('pointercancel'), { pointerId }) as PointerEvent;

describe('window event seat lifetime', () => {
  it('retires all listeners across 500 interrupted and completed gestures', () => {
    class MeasuredTarget extends EventTarget {
      activeListeners = 0;
      peakListeners = 0;

      override addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void {
        super.addEventListener(type, callback, options);
        if (typeof options !== 'object' || options.signal === undefined) return;
        this.activeListeners += 1;
        this.peakListeners = Math.max(this.peakListeners, this.activeListeners);
        options.signal.addEventListener('abort', () => { this.activeListeners -= 1; }, { once: true });
      }
    }

    const target = new MeasuredTarget();
    let cancelled = 0;
    const seat = createWindowEventSeat(() => { cancelled += 1; });
    for (let gesture = 0; gesture < 500; gesture += 1) {
      seat.replace(installResizeWindowSeat(target, gesture, () => { cancelled += 1; }));
      if (gesture % 2 === 0) seat.finish();
      else seat.dispose();
      expect(target.activeListeners).toBe(0);
    }
    target.dispatchEvent(new Event('blur'));
    expect(cancelled).toBe(250);
    expect(target.peakListeners).toBe(2);
  });

  it('cancels an interrupted gesture on replacement or unmount, once', () => {
    const calls: string[] = [];
    const seat = createWindowEventSeat(() => calls.push('cancel'));
    seat.replace(() => calls.push('detach-first'));
    seat.replace(() => calls.push('detach-second'));
    seat.dispose();
    seat.dispose();

    expect(calls).toEqual(['detach-first', 'cancel', 'detach-second', 'cancel']);
  });

  it('detaches a finished gesture without cancelling it', () => {
    const calls: string[] = [];
    const seat = createWindowEventSeat(() => calls.push('cancel'));
    seat.replace(() => calls.push('detach'));
    seat.finish();
    seat.dispose();

    expect(calls).toEqual(['detach']);
  });
});

describe('duplicate-drag window seat', () => {
  it('retires before handling Alt release or blur', () => {
    const target = new EventTarget();
    const calls: string[] = [];
    installDuplicateDragWindowSeat(target, {
      onAltRelease: () => calls.push('alt'),
      onBlur: () => calls.push('blur'),
    });

    target.dispatchEvent(Object.assign(new Event('keyup'), { key: 'Alt' }));
    target.dispatchEvent(new Event('blur'));

    expect(calls).toEqual(['alt']);
  });

  it('ignores unrelated key releases', () => {
    const target = new EventTarget();
    const calls: string[] = [];
    installDuplicateDragWindowSeat(target, {
      onAltRelease: () => calls.push('alt'),
      onBlur: () => calls.push('blur'),
    });

    target.dispatchEvent(Object.assign(new Event('keyup'), { key: 'Shift' }));
    target.dispatchEvent(new Event('blur'));

    expect(calls).toEqual(['blur']);
  });
});

describe('resize window seat', () => {
  it('cancels for the owned pointer and ignores another pointer', () => {
    const target = new EventTarget();
    const calls: string[] = [];
    installResizeWindowSeat(target, 7, () => calls.push('cancel'));

    target.dispatchEvent(pointer(8));
    expect(calls).toEqual([]);
    target.dispatchEvent(pointer(7));
    target.dispatchEvent(new Event('blur'));

    expect(calls).toEqual(['cancel']);
  });

  it('uses blur when pointer identity is unavailable', () => {
    const target = new EventTarget();
    const calls: string[] = [];
    const cleanup = installResizeWindowSeat(target, null, () => calls.push('cancel'));

    target.dispatchEvent(new Event('blur'));
    cleanup();
    cleanup();

    expect(calls).toEqual(['cancel']);
  });
});
