import type { Input } from 'electron';
import type { CanvasZoomCommand } from '@studio/events';
import { isMac } from '../env/platform.js';

export function zoomActionForInput(
  input: Pick<Input, 'type' | 'key' | 'meta' | 'control' | 'alt'>,
  mac = isMac(),
): CanvasZoomCommand['action'] | null {
  if (input.type !== 'keyDown') return null;
  if (input.alt) return null;
  if (mac ? !input.meta || input.control : !input.control || input.meta) return null;
  switch (input.key) {
    case '=':
    case '+':
      return 'in';
    case '-':
    case '_':
      return 'out';
    case '0':
      return 'reset';
    default:
      return null;
  }
}
