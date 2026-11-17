import type { StudioChromeBridge } from '@studio/events';

declare global {
  interface Window {
    studioChrome: StudioChromeBridge;
  }
}

export {};
