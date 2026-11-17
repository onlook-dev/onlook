import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { zzStrings } from '@studio/chat-ui/testing';
import { HarnessTile } from './HarnessTile.js';
import { STUB_STRINGS, claudeTile as claude, codexTile as codex } from './fixtures.js';
import { CHATGPT_TILE_STATES, CLAUDE_TILE_STATES, type HarnessTileState } from './state.js';
import { TEST_TILE_GLYPHS as GLYPHS } from './testing.js';

describe('HarnessTile', () => {
  test('every word on the tile comes from the bag', () => {
    const zz = zzStrings(STUB_STRINGS);
    const render = (tile: HarnessTileState): string => renderToStaticMarkup(<HarnessTile tile={tile} strings={zz} glyphs={GLYPHS} />);
    for (const state of CLAUDE_TILE_STATES) expect(render(claude(state))).not.toMatch(/Claude|Set up|Signed|Connected/);
    for (const state of CHATGPT_TILE_STATES) expect(render(codex(state))).not.toMatch(/ChatGPT|Set up|Download|Connected/);
    expect(render({ kind: 'coming-soon', id: 'opencode' })).not.toMatch(/Coming|OpenCode/);
  });
});
