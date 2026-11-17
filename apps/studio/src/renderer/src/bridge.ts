import type { LogProcess, RendererExceptionReport, RendererLogLine, StudioBridge } from '@studio/events';

/** The tab's bridge to main. Renderer code reaches it here, never through the global. */
export function studio(): StudioBridge {
  return window.studio;
}

export interface RendererDoor {
  process: LogProcess;
  log(line: RendererLogLine): void;
  telemetryException(report: RendererExceptionReport): void;
}

let resolved: RendererDoor | undefined | null = null;

export function rendererDoor(): RendererDoor | undefined {
  if (resolved !== null) return resolved;
  if (typeof window === 'undefined') return undefined;
  const w = window as Window & { studio?: Omit<RendererDoor, 'process'>; studioChrome?: Omit<RendererDoor, 'process'>; studioTaskManager?: Omit<RendererDoor, 'process'> };
  const tab = w.studio;
  const chrome = w.studioChrome;
  const taskManager = w.studioTaskManager;
  if (tab !== undefined && typeof tab.log === 'function') {
    resolved = { process: 'tab', log: tab.log.bind(tab), telemetryException: tab.telemetryException.bind(tab) };
  } else if (chrome !== undefined && typeof chrome.log === 'function') {
    resolved = { process: 'chrome', log: chrome.log.bind(chrome), telemetryException: chrome.telemetryException.bind(chrome) };
  } else if (taskManager !== undefined && typeof taskManager.log === 'function') {
    resolved = { process: 'task-manager', log: taskManager.log.bind(taskManager), telemetryException: taskManager.telemetryException.bind(taskManager) };
  } else {
    return undefined;
  }
  return resolved;
}
