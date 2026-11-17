import type { StudioTaskManagerBridge } from '@studio/events';

declare global {
  interface Window {
    studioTaskManager: StudioTaskManagerBridge;
  }
}

export {};
