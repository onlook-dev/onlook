import type { IconType } from '@astryxdesign/core/Icon';
import { DesktopIcon, PhoneIcon, TabletIcon } from '../../icons/glyphs.js';

/**
 * ⚠️ VIEWPORT sizes — what `resizeFrame` writes and what the node box has meant
 * since ONL-1862; the chrome hangs above the box without contributing to it.
 */
export interface FramePreset {
  labelKey: 'frame.size.mobile' | 'frame.size.tablet' | 'frame.size.desktop';
  width: number;
  height: number;
  icon: IconType;
}

export const FRAME_PRESETS: readonly FramePreset[] = [
  { labelKey: 'frame.size.mobile', width: 402, height: 874, icon: PhoneIcon },
  { labelKey: 'frame.size.tablet', width: 744, height: 1133, icon: TabletIcon },
  { labelKey: 'frame.size.desktop', width: 1512, height: 982, icon: DesktopIcon },
];

/**
 * Data, not a translatable sentence, so it skips `t()`. U+00D7 MULTIPLICATION
 * SIGN, not the letter x.
 */
export function presetDimensions(preset: FramePreset): string {
  return `${String(preset.width)}×${String(preset.height)}`;
}
