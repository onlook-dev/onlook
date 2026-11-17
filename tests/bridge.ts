// Not a `.d.ts`: `skipLibCheck` would leave both globals `any` on a broken import (ONL-2629).

import type { StudioBridge, StudioChromeBridge } from '@studio/events';

declare global {
  var studio: StudioBridge;
  var studioChrome: StudioChromeBridge;
}
