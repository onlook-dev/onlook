import type { CodeRefusalCode } from '@studio/events';

export function panelRefusal(refusal: CodeRefusalCode | null, isBrowsing: boolean): CodeRefusalCode | null {
  return isBrowsing ? null : refusal;
}
