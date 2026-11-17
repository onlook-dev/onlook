/// <reference types="vite/client" />

import type { StudioBridge } from '@studio/events';

declare global {
  interface Window {
    studio: StudioBridge;
  }
}

declare module '*.css';

export {};
