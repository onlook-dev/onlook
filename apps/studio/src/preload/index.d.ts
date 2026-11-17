import type { StudioBridge } from '@studio/events';

declare global {
  interface Window {
    studio: StudioBridge;
  }
}

export {};
