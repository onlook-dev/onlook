// No import direction lets `DEFAULT_FRAME_SIZE` and the preset table derive
// from each other across packages; this pin is what holds them together
// (ONL-2046).

import { describe, expect, it } from 'bun:test';
import { DEFAULT_FRAME_SIZE } from '@studio/events';
import { FRAME_PRESETS } from './presets.js';

describe('frame presets', () => {
  it('the default frame size IS the Desktop preset', () => {
    const desktop = FRAME_PRESETS.find((preset) => preset.labelKey === 'frame.size.desktop');
    if (!desktop) throw new Error('expected a Desktop preset');
    expect({ width: desktop.width, height: desktop.height }).toEqual({
      width: DEFAULT_FRAME_SIZE.width,
      height: DEFAULT_FRAME_SIZE.height,
    });
  });
});
