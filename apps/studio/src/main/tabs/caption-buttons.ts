import { WINDOW_BAR_HEIGHT, type ChromeSlots } from '@studio/events';
import { isWindows } from '../env/platform.js';

export const DRAWS_CAPTION_BUTTONS = isWindows();

/** Mirror `--studio-band`, `--studio-ground` and the band's resting icon colour. */
const BAND_FILL = '#060606';
const SCREEN_FILL = '#262626';
const BAND_ICON = '#929292';

/** Over a window whose header sits on the screen's ground, as tall as that header. */
export function captionButtonsOverGround(height: number): Electron.TitleBarOverlay {
  return { color: SCREEN_FILL, symbolColor: BAND_ICON, height };
}

/** One short of the band, so its bottom divider runs under the buttons. */
export function captionButtonsFor(slots: ChromeSlots): Electron.TitleBarOverlay {
  return {
    color: slots.blendsIntoScreen === true ? SCREEN_FILL : BAND_FILL,
    symbolColor: BAND_ICON,
    height: WINDOW_BAR_HEIGHT - 1,
  };
}
