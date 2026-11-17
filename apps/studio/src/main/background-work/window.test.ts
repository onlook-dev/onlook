import { EventEmitter } from 'node:events';
import { expect, it } from 'bun:test';
import type { BaseWindow, PowerMonitor } from 'electron';
import { createWorkActivity } from './activity.js';
import { trackWorkActivity } from './window.js';

it('tracks real window events and battery power and releases power listeners when closed', () => {
  let focused = true;
  let visible = true;
  let minimized = false;
  let onBattery = false;
  const window = Object.assign(new EventEmitter(), {
    isFocused: () => focused, isVisible: () => visible, isMinimized: () => minimized,
  });
  const power = Object.assign(new EventEmitter(), { isOnBatteryPower: () => onBattery });
  const activity = createWorkActivity();
  trackWorkActivity(window as unknown as BaseWindow, power as unknown as PowerMonitor, activity);
  expect(activity.multiplier()).toBe(1);
  focused = false; window.emit('blur');
  expect(activity.multiplier()).toBe(10);
  focused = true; window.emit('focus');
  expect(activity.multiplier()).toBe(1);
  visible = false; window.emit('hide');
  expect(activity.multiplier()).toBe(10);
  visible = true; window.emit('show');
  expect(activity.multiplier()).toBe(1);
  minimized = true; window.emit('minimize');
  expect(activity.multiplier()).toBe(10);
  minimized = false; window.emit('restore');
  expect(activity.multiplier()).toBe(1);
  onBattery = true; power.emit('on-battery');
  expect(activity.multiplier()).toBe(10);
  window.emit('blur'); window.emit('focus');
  expect(activity.multiplier()).toBe(10);
  onBattery = false; power.emit('on-ac');
  expect(activity.multiplier()).toBe(1);
  window.emit('closed');
  expect(power.listenerCount('on-ac')).toBe(0);
  expect(power.listenerCount('on-battery')).toBe(0);
  expect(window.listenerCount('focus')).toBe(0);
});
