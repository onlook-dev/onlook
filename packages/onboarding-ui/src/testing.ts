import type { CardGlyphs } from './SignInCard.js';
import type { TileGlyphs } from './HarnessTile.js';
import type { SetupState } from './state.js';

/** Single letters, so a static render can be searched for them. */
export const TEST_TILE_GLYPHS: TileGlyphs = { claude: 'C', codex: 'G', opencode: 'O', freebuff: 'F', other: 'A' };
export const TEST_CARD_GLYPHS: CardGlyphs = { claude: 'C', codex: 'G', opencode: 'O', freebuff: 'F', spinner: 'S', browser: 'B', check: 'K', warning: 'W', console: 'T', download: 'D' };
export const noop = (): void => undefined;

/** `detail` arrives already resolved from the host, so the bag never supplies it (ONL-2186). */
export function detailFromTheBag(state: SetupState): SetupState {
  return 'detail' in state ? ({ ...state, detail: 'ZZ' } as SetupState) : state;
}
