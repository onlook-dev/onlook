import { describe, expect, it } from 'bun:test';
import { REGION } from '../layout.js';
import { panelCover, type CoverState } from './panelCover.js';

const SHOWN: CoverState = {
  view: 'designs',
  sidebar: 259,
  code: 420,
  chat: 307,
  hidden: { left: false, right: false },
};

describe('what the panels cover of the canvas (ONL-2563)', () => {
  it('counts the rail with the panel beside it, and the chat panel on its own', () => {
    expect(panelCover(SHOWN)).toEqual({ start: REGION.rail + SHOWN.sidebar, end: SHOWN.chat });
  });

  it('follows the view the rail switched to, not the width of the one it left', () => {
    expect(panelCover({ ...SHOWN, view: 'code' }).start).toBe(REGION.rail + SHOWN.code);
  });

  it('frees only the side the hide-panels chord hid', () => {
    expect(panelCover({ ...SHOWN, hidden: { left: true, right: false } })).toEqual({
      start: 0,
      end: SHOWN.chat,
    });
    expect(panelCover({ ...SHOWN, hidden: { left: false, right: true } })).toEqual({
      start: REGION.rail + SHOWN.sidebar,
      end: 0,
    });
  });

  /* A hidden panel covering its own width is what would centre the mode switch
     off-centre the moment the designer pressed the chord. */
  it('never counts a panel that is not drawn', () => {
    const hidden = panelCover({ ...SHOWN, hidden: { left: true, right: true } });
    expect(hidden.start + hidden.end).toBe(0);
  });
});
