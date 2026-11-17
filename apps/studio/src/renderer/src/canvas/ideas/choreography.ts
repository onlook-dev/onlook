// Pure functions of film time on the ready canvas's own 580×360 stage: no DOM, no store, no clock.
import { EASE_IN_OUT, EASE_OUT, EASE_SLIDE, mix, span, type Span } from '../motion/timeline.js';
import { BEATS as INSPIRE_BEATS, REDUCED_BEATS as INSPIRE_REDUCED_BEATS } from '../inspire/choreography.js';
import { IDEA_ORDER, type IdeaKind } from './ideas.js';

export const STAGE = { width: 580, height: 360 };
export const CARD = { width: 258, height: 298 };
export const CARD_AT = { x: 320, y: 0 };
const ZOOM = 0.8;
const GAP = 28;
const CAPTION_GAP = 12;
const CAPTION_H = 58;

const REVEAL = {
  wordsOut: [0, 200],
  ghostLift: [80, 480],
  camera: [120, 720],
  slide: [260, 860],
  sideLift: [460, 900],
  caption: [[760, 1040], [800, 1080], [840, 1120]],
  sheen: [[900, 2000], [1040, 2140], [1180, 2280]],
} as const;
export const REVEAL_END = 2280;

export const EXIT = {
  press: [0, 80],
  release: [80, 200],
  othersOut: [60, 300],
  pickedOut: [180, 440],
  welcomeOut: [0, 160],
  messageIn: [160, 400],
  tipAt: 360,
} as const;
const EXIT_END = 900;

/** Opacity only: nothing slides, zooms or presses. */
const REDUCED = {
  out: [0, 150],
  in: [150, 400],
  exit: [0, 200],
} as const satisfies Record<string, Span>;
export const REDUCED_REVEAL_END = 400;
const REDUCED_EXIT_END = 200;

const SLOT: Record<IdeaKind, number> = {
  component: CARD_AT.x - CARD.width - GAP,
  landing: CARD_AT.x,
  visualization: CARD_AT.x + CARD.width + GAP,
};
const FOCUS_AT_REST = { x: STAGE.width / 2, y: STAGE.height / 2 };
const FOCUS_REVEALED = { x: CARD_AT.x + CARD.width / 2, y: CARD.height / 2 + (CAPTION_GAP + CAPTION_H) / 2 / ZOOM };

interface CardState {
  /** Stage px, before the camera. */
  x: number;
  y: number;
  scale: number;
  opacity: number;
  /** 0 is the ghost the ready canvas rests on, 1 the lifted card. */
  solid: number;
  /** The arrival glint's progress across the card; unseen at 0 and at 1. */
  sheen: number;
}

interface CaptionState {
  /** Screen px from the stage's top-left; captions never scale. */
  x: number;
  y: number;
  opacity: number;
}

export interface StageState {
  /** The camera, as a translate then scale about the stage's top-left. */
  camera: { x: number; y: number; zoom: number };
  words: number;
  cards: Record<IdeaKind, CardState>;
  captions: Record<IdeaKind, CaptionState>;
}

function cameraAt(k: number): StageState['camera'] {
  const zoom = mix(1, ZOOM, k);
  const fx = mix(FOCUS_AT_REST.x, FOCUS_REVEALED.x, k);
  const fy = mix(FOCUS_AT_REST.y, FOCUS_REVEALED.y, k);
  return { x: STAGE.width / 2 - fx * zoom, y: STAGE.height / 2 - fy * zoom, zoom };
}

function captionSeat(kind: IdeaKind): { x: number; y: number } {
  const camera = cameraAt(1);
  return { x: camera.x + SLOT[kind] * camera.zoom, y: camera.y + CARD.height * camera.zoom + CAPTION_GAP };
}

export const captionWidth = Math.round(CARD.width * ZOOM);

const index = (kind: IdeaKind) => IDEA_ORDER.indexOf(kind);

export function revealAt(t: number): StageState {
  const slide = span(t, REVEAL.slide, EASE_SLIDE);
  const side = span(t, REVEAL.sideLift, EASE_OUT);
  const card = (kind: IdeaKind): CardState => ({
    x: mix(CARD_AT.x, SLOT[kind], slide),
    y: CARD_AT.y,
    scale: 1,
    opacity: 1,
    solid: kind === 'landing' ? span(t, REVEAL.ghostLift, EASE_OUT) : side,
    sheen: span(t, REVEAL.sheen[index(kind)]!, EASE_IN_OUT),
  });
  const caption = (kind: IdeaKind): CaptionState => {
    const on = span(t, REVEAL.caption[index(kind)]!, EASE_OUT);
    const seat = captionSeat(kind);
    return { x: seat.x, y: seat.y + (1 - on) * 6, opacity: on };
  };
  return {
    camera: cameraAt(span(t, REVEAL.camera, EASE_IN_OUT)),
    words: 1 - span(t, REVEAL.wordsOut, EASE_OUT),
    cards: { component: card('component'), landing: card('landing'), visualization: card('visualization') },
    captions: { component: caption('component'), landing: caption('landing'), visualization: caption('visualization') },
  };
}

export const REST = revealAt(0);
export const REVEALED = revealAt(REVEAL_END);

/** `e` ms after `picked` was tapped: it presses and lets go, the others drop away, then it goes too. */
export function exitAt(e: number, picked: IdeaKind): StageState {
  const press = span(e, EXIT.press, EASE_OUT) - span(e, EXIT.release, EASE_OUT);
  const others = 1 - span(e, EXIT.othersOut, EASE_OUT);
  const pickedOn = 1 - span(e, EXIT.pickedOut, EASE_IN_OUT);
  const shown = (kind: IdeaKind) => (kind === picked ? pickedOn : others);
  const drop = (kind: IdeaKind) => (kind === picked ? 0 : (1 - others) * 8);
  const card = (kind: IdeaKind): CardState => ({
    ...REVEALED.cards[kind],
    y: REVEALED.cards[kind].y + drop(kind),
    scale: kind === picked ? 1 - press * 0.015 : 1,
    opacity: shown(kind),
  });
  const caption = (kind: IdeaKind): CaptionState => ({
    ...REVEALED.captions[kind],
    y: REVEALED.captions[kind].y + drop(kind),
    opacity: shown(kind),
  });
  return {
    ...REVEALED,
    cards: { component: card('component'), landing: card('landing'), visualization: card('visualization') },
    captions: { component: caption('component'), landing: caption('landing'), visualization: caption('visualization') },
  };
}

const faded = (state: StageState, k: number): StageState => ({
  camera: state.camera,
  words: state.words * k,
  cards: Object.fromEntries(IDEA_ORDER.map((kind) => [kind, { ...state.cards[kind], opacity: state.cards[kind].opacity * k }])) as StageState['cards'],
  captions: Object.fromEntries(IDEA_ORDER.map((kind) => [kind, { ...state.captions[kind], opacity: state.captions[kind].opacity * k }])) as StageState['captions'],
});

/** The rest fades out where it is, and the revealed cards fade in where they land. */
export function reducedRevealAt(t: number): StageState {
  if (t < REDUCED.in[0]) {
    const rest = faded(REST, 1 - span(t, REDUCED.out, EASE_OUT));
    return { ...rest, cards: { ...rest.cards, component: { ...rest.cards.component, opacity: 0 }, visualization: { ...rest.cards.visualization, opacity: 0 } } };
  }
  return faded(REVEALED, span(t, REDUCED.in, EASE_OUT));
}

function reducedExitAt(e: number): StageState {
  return faded(REVEALED, 1 - span(e, REDUCED.exit, EASE_OUT));
}

/** Where the inspiration Frame arrives: the words go first, then the cards drop away as the picked-card exit's others do. */
const LEAVE = {
  words: [0, 200],
  pieces: [60, 300],
} as const satisfies Record<string, Span>;
const LEAVE_END = 300;

/** `e` ms into the leave, from wherever the canvas stood when the Frame set off. */
function leaveAt(e: number, from: StageState): StageState {
  const on = 1 - span(e, LEAVE.pieces, EASE_OUT);
  const drop = (1 - on) * 8;
  const away = <T extends { y: number; opacity: number }>(piece: T): T => ({ ...piece, y: piece.y + drop, opacity: piece.opacity * on });
  return {
    camera: from.camera,
    words: from.words * (1 - span(e, LEAVE.words, EASE_OUT)),
    cards: Object.fromEntries(IDEA_ORDER.map((kind) => [kind, away(from.cards[kind])])) as StageState['cards'],
    captions: Object.fromEntries(IDEA_ORDER.map((kind) => [kind, away(from.captions[kind])])) as StageState['captions'],
  };
}

/** Timed from the inspiration's start: still through the tool's blinks, leaving as the Frame lifts off (with reduced motion, fading as it fades in). */
export function leaveFilm(from: StageState, reduced: boolean): { at: (t: number) => StageState; end: number } {
  if (reduced) {
    const start = INSPIRE_REDUCED_BEATS.frameIn[0];
    return { at: (t) => faded(from, 1 - span(t - start, REDUCED.exit, EASE_OUT)), end: start + REDUCED_EXIT_END };
  }
  const start = INSPIRE_BEATS.flight[0];
  return { at: (t) => leaveAt(t - start, from), end: start + LEAVE_END };
}

export type ReadyPhase =
  | { kind: 'rest' }
  | { kind: 'reveal' }
  | { kind: 'revealed' }
  | { kind: 'exit'; picked: IdeaKind }
  | { kind: 'gone'; picked: IdeaKind };

/** Where each phase comes to rest; a film ends exactly here, so its commit changes nothing on screen. */
export function settledAt(phase: ReadyPhase, reduced: boolean): StageState {
  switch (phase.kind) {
    case 'rest':
      return REST;
    case 'reveal':
    case 'revealed':
      return REVEALED;
    case 'exit':
    case 'gone':
      return reduced ? reducedExitAt(REDUCED_EXIT_END) : exitAt(EXIT_END, phase.picked);
  }
}

export function filmOf(phase: ReadyPhase, reduced: boolean): { at: (t: number) => StageState; end: number } | null {
  if (phase.kind === 'reveal') return reduced ? { at: reducedRevealAt, end: REDUCED_REVEAL_END } : { at: revealAt, end: REVEAL_END };
  if (phase.kind === 'exit') {
    const { picked } = phase;
    return reduced ? { at: reducedExitAt, end: REDUCED_EXIT_END } : { at: (e) => exitAt(e, picked), end: EXIT_END };
  }
  return null;
}

const OPEN_CAMERA = cameraAt(1);

/** Stage px the shown pieces span, before and after the cards come out. */
const EXTENT = {
  rest: { left: 0, right: STAGE.width },
  open: {
    left: OPEN_CAMERA.x + SLOT.component * OPEN_CAMERA.zoom,
    right: OPEN_CAMERA.x + (SLOT.visualization + CARD.width) * OPEN_CAMERA.zoom,
  },
};

const SEAT_MARGIN = 24;

/** The stage's left edge in the visible canvas: centred while the pieces fit beside a margin each side, else held a margin from the Left Rail so the right side is what goes under the Right Rail. */
export function seatLeft(phase: ReadyPhase): string {
  const { left, right } = phase.kind === 'rest' ? EXTENT.rest : EXTENT.open;
  return `max(${String(SEAT_MARGIN - left)}px, calc(50% - ${String((left + right) / 2)}px))`;
}

/** The seat moves with the camera on the reveal, and between the fades when motion is reduced. */
export function seatTransition(phase: ReadyPhase, reduced: boolean): string | undefined {
  if (phase.kind !== 'reveal') return undefined;
  return reduced ? `left 0ms linear ${String(REDUCED.in[0])}ms` : `left ${String(REVEAL.camera[1] - REVEAL.camera[0])}ms cubic-bezier(0.4, 0, 0.2, 1) ${String(REVEAL.camera[0])}ms`;
}
