import { describe, expect, it } from 'bun:test';
import { sample } from '../motion/timeline.js';
import {
  CARD_AT,
  EXIT,
  REDUCED_REVEAL_END,
  REST,
  REVEAL_END,
  REVEALED,
  exitAt,
  filmOf,
  leaveFilm,
  reducedRevealAt,
  revealAt,
  settledAt,
  type ReadyPhase,
  type StageState,
} from './choreography.js';
import { IDEA_ORDER } from './ideas.js';
import { BEATS as INSPIRE_BEATS, REDUCED_BEATS as INSPIRE_REDUCED_BEATS } from '../inspire/choreography.js';
import { partStyles } from './parts.js';

const PHASES: ReadyPhase[] = [
  { kind: 'reveal' },
  { kind: 'exit', picked: 'landing' },
  { kind: 'exit', picked: 'component' },
];

describe('the ready canvas film', () => {
  it('starts from the rest exactly, so the tap shows no jump', () => {
    expect(partStyles(revealAt(0))).toStrictEqual(partStyles(settledAt({ kind: 'rest' }, false)));
    expect(REST.camera).toStrictEqual({ x: 0, y: 0, zoom: 1 });
    expect(REST.cards.landing).toMatchObject({ x: CARD_AT.x, y: CARD_AT.y, solid: 0 });
    for (const kind of IDEA_ORDER) expect(REST.captions[kind].opacity).toBe(0);
  });

  for (const reduced of [false, true]) {
    for (const phase of PHASES) {
      it(`${reduced ? 'with reduced motion, ' : ''}the ${phase.kind} film ends on what its phase commits${'picked' in phase ? ` (${phase.picked})` : ''}`, () => {
        const film = filmOf(phase, reduced)!;
        expect(partStyles(film.at(film.end))).toStrictEqual(partStyles(settledAt(phase, reduced)));
      });
    }
  }

  it('leaves nothing visible once a card is picked, the picked one last', () => {
    const othersGone = exitAt(EXIT.othersOut[1], 'component');
    expect(othersGone.cards.landing.opacity).toBe(0);
    expect(othersGone.cards.visualization.opacity).toBe(0);
    expect(othersGone.cards.component.opacity).toBeGreaterThan(0);
    const gone = settledAt({ kind: 'gone', picked: 'component' }, false);
    for (const kind of IDEA_ORDER) {
      expect(gone.cards[kind].opacity).toBe(0);
      expect(gone.captions[kind].opacity).toBe(0);
    }
  });

  it('glints each card once, only after every card has landed, left to right', () => {
    const glints = (t: number) => IDEA_ORDER.map((kind) => partStyles(revealAt(t))[`sheen:${kind}`].opacity ?? 0);
    const firstLit = IDEA_ORDER.map(() => Infinity);
    for (const { value: t } of sample(REVEAL_END, (t) => t, 240)) {
      glints(t).forEach((opacity, i) => {
        if (opacity > 0 && firstLit[i] === Infinity) firstLit[i] = t;
      });
      if (glints(t).some((opacity) => opacity > 0)) {
        const at = revealAt(t);
        for (const kind of IDEA_ORDER) expect(at.cards[kind]).toMatchObject({ x: REVEALED.cards[kind].x, solid: 1 });
      }
    }
    expect(firstLit.every(Number.isFinite)).toBe(true);
    expect([...firstLit].sort((a, b) => a - b)).toStrictEqual(firstLit);
    expect(glints(REVEAL_END)).toStrictEqual([0, 0, 0]);
  });

  it('with reduced motion, never glints', () => {
    for (const { value: t } of sample(REDUCED_REVEAL_END, (t) => t, 240)) {
      for (const kind of IDEA_ORDER) expect(partStyles(reducedRevealAt(t))[`sheen:${kind}`].opacity).toBe(0);
    }
  });

  it('with reduced motion, moves nothing: every frame stands on the rest or the revealed layout', () => {
    const layout = (s: StageState) => JSON.stringify({ camera: s.camera, cards: IDEA_ORDER.map((k) => [s.cards[k].x, s.cards[k].y, s.cards[k].scale]) });
    const seats = new Set([layout(REST), layout(REVEALED)]);
    for (const { value: t } of sample(REDUCED_REVEAL_END, (t) => t, 240)) expect(seats.has(layout(reducedRevealAt(t)))).toBe(true);
    const exit = filmOf({ kind: 'exit', picked: 'landing' }, true)!;
    for (const { value: t } of sample(exit.end, (t) => t, 240)) expect(layout(exit.at(t))).toBe(layout(REVEALED));
  });

  for (const reduced of [false, true]) {
    for (const [name, from] of [['rest', REST], ['revealed', REVEALED]] as const) {
      it(`${reduced ? 'with reduced motion, ' : ''}holds the ${name} canvas still until the inspiration Frame sets off, then leaves nothing visible`, () => {
        const film = leaveFilm(from, reduced);
        const setsOff = reduced ? INSPIRE_REDUCED_BEATS.frameIn[0] : INSPIRE_BEATS.flight[0];
        for (const t of [0, setsOff / 2, setsOff]) expect(partStyles(film.at(t))).toStrictEqual(partStyles(from));
        expect(partStyles(film.at(setsOff + 100))).not.toStrictEqual(partStyles(from));
        const end = film.at(film.end);
        expect(end.words).toBe(0);
        for (const kind of IDEA_ORDER) {
          expect(end.cards[kind].opacity).toBe(0);
          expect(end.captions[kind].opacity).toBe(0);
        }
      });
    }
  }

  it('with reduced motion, the leave moves nothing', () => {
    const film = leaveFilm(REVEALED, true);
    for (const { value: t } of sample(film.end, (t) => t, 240)) {
      for (const kind of IDEA_ORDER) expect(film.at(t).cards[kind]).toMatchObject({ x: REVEALED.cards[kind].x, y: REVEALED.cards[kind].y, scale: 1 });
    }
  });
});
