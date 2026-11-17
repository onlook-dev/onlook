import { IDEA_ORDER, type IdeaKind } from './ideas.js';
import { CARD, type StageState } from './choreography.js';

export type PartName =
  | 'stage'
  | 'words'
  | `card:${IdeaKind}`
  | `veil:${IdeaKind}`
  | `edge:${IdeaKind}`
  | `face:${IdeaKind}`
  | `sheen:${IdeaKind}`
  | `caption:${IdeaKind}`;

export type PartStyle = { transform?: string; opacity?: number };

const GHOST_FACE = 0.55;

const px = (n: number) => `${n.toFixed(2)}px`;
const unit = (n: number) => Number(n.toFixed(4));

const SHEEN_TRAVEL = 1.1;
const sheenOpacity = (k: number) => Math.min(1, k / 0.25, (1 - k) / 0.25);

/** One answer for both the committed style and every sampled keyframe, so a commit never jumps. */
export function partStyles(state: StageState): Record<PartName, PartStyle> {
  const out = {
    stage: { transform: `translate(${px(state.camera.x)}, ${px(state.camera.y)}) scale(${unit(state.camera.zoom)})` },
    words: { opacity: unit(state.words) },
  } as Record<PartName, PartStyle>;
  for (const kind of IDEA_ORDER) {
    const card = state.cards[kind];
    const caption = state.captions[kind];
    out[`card:${kind}`] = { transform: `translate(${px(card.x)}, ${px(card.y)}) scale(${unit(card.scale)})`, opacity: unit(card.opacity) };
    out[`veil:${kind}`] = { opacity: unit(card.solid) };
    out[`edge:${kind}`] = { opacity: unit(card.solid) };
    out[`face:${kind}`] = { opacity: unit(GHOST_FACE + (1 - GHOST_FACE) * card.solid) };
    out[`sheen:${kind}`] = { transform: `translateX(${px((card.sheen * 2 - 1) * SHEEN_TRAVEL * CARD.width)})`, opacity: unit(sheenOpacity(card.sheen)) };
    out[`caption:${kind}`] = { transform: `translate(${px(caption.x)}, ${px(caption.y)})`, opacity: unit(caption.opacity) };
  }
  return out;
}
