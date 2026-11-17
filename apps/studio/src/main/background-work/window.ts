import type { BaseWindow, PowerMonitor } from 'electron';
import { workActivity, type WorkActivity } from './activity.js';

export function trackWorkActivity(window: BaseWindow, power: PowerMonitor, activity: WorkActivity = workActivity): void {
  const update = (): void => {
    activity.update({
      focused: window.isFocused(),
      visible: window.isVisible() && !window.isMinimized(),
      onBattery: power.isOnBatteryPower(),
    });
  };
  window.on('focus', update);
  window.on('blur', update);
  window.on('show', update);
  window.on('hide', update);
  window.on('minimize', update);
  window.on('restore', update);
  power.on('on-ac', update);
  power.on('on-battery', update);
  window.once('closed', () => {
    window.removeListener('focus', update);
    window.removeListener('blur', update);
    window.removeListener('show', update);
    window.removeListener('hide', update);
    window.removeListener('minimize', update);
    window.removeListener('restore', update);
    power.removeListener('on-ac', update);
    power.removeListener('on-battery', update);
  });
  update();
}
