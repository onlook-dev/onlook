import type { WindowControlsEdge } from '@studio/events';

export function windowControlsFor(platform: NodeJS.Platform): WindowControlsEdge {
  return platform === 'darwin' ? 'leading' : platform === 'win32' ? 'trailing' : 'none';
}
