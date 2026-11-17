import { describe, expect, it } from 'bun:test';
import { installZoomModifier } from './useZoomModifier.js';

describe('canvas zoom modifier', () => {
  for (const type of ['pointermove', 'pointerdown', 'wheel']) {
    it(`recovers on ${type} when screenshot capture swallows Meta release without blurring`, () => {
      const target = new EventTarget();
      let held = false;
      const cleanup = installZoomModifier(target, (next) => { held = next; });
      target.dispatchEvent(Object.assign(new Event('keydown'), { key: '4', metaKey: true, shiftKey: true }));
      expect(held).toBe(true);
      target.dispatchEvent(Object.assign(new Event(type), { metaKey: false }));
      expect(held).toBe(false);
      target.dispatchEvent(Object.assign(new Event(type), { metaKey: true }));
      expect(held).toBe(true);
      cleanup();
      target.dispatchEvent(Object.assign(new Event(type), { metaKey: false }));
      expect(held).toBe(true);
    });
  }

  it('keeps Command zoom and leaves Control pinch handling independent', () => {
    const target = new EventTarget();
    const changes: boolean[] = [];
    const cleanup = installZoomModifier(target, (held) => { changes.push(held); });
    target.dispatchEvent(Object.assign(new Event('keydown'), { key: 'Meta', metaKey: true }));
    target.dispatchEvent(Object.assign(new Event('wheel'), { metaKey: true }));
    target.dispatchEvent(Object.assign(new Event('wheel'), { metaKey: false, ctrlKey: true }));
    expect(changes.at(-1)).toBe(false);
    cleanup();
  });

  it('leaves a scroll that changes nothing alone', () => {
    const target = new EventTarget();
    const changes: boolean[] = [];
    const cleanup = installZoomModifier(target, (held) => { changes.push(held); });
    target.dispatchEvent(Object.assign(new Event('wheel'), { metaKey: false }));
    target.dispatchEvent(Object.assign(new Event('wheel'), { metaKey: false }));
    expect(changes).toEqual([]);
    cleanup();
  });

  it('reads a missing modifier as released rather than as neither', () => {
    const target = new EventTarget();
    const changes: boolean[] = [];
    const cleanup = installZoomModifier(target, (held) => { changes.push(held); });
    target.dispatchEvent(Object.assign(new Event('keydown'), { key: 'Meta', metaKey: true }));
    target.dispatchEvent(new Event('wheel'));
    expect(changes).toEqual([true, false]);
    cleanup();
  });

  it('clears on Meta release, blur and a later unmodified keystroke', () => {
    const target = new EventTarget();
    let held = false;
    const cleanup = installZoomModifier(target, (next) => { held = next; });
    const send = (type: string, key: string, metaKey: boolean): void => {
      target.dispatchEvent(Object.assign(new Event(type), { key, metaKey }));
    };
    send('keydown', 'Meta', true);
    expect(held).toBe(true);
    const fieldBlur = new Event('blur');
    Object.defineProperty(fieldBlur, 'target', { value: new EventTarget() });
    target.dispatchEvent(fieldBlur);
    expect(held).toBe(true);
    send('keyup', 'Meta', false);
    expect(held).toBe(false);
    send('keydown', 'Meta', true);
    target.dispatchEvent(new Event('blur'));
    expect(held).toBe(false);
    send('keydown', 'Meta', true);
    send('keydown', 'a', false);
    expect(held).toBe(false);
    cleanup();
    send('keydown', 'Meta', true);
    expect(held).toBe(false);
  });
});
