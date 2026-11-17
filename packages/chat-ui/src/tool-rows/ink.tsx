/** Hover-a-descendant is not expressible inline, hence React 19's hoisted `<style href precedence>` below. */
import type { IconType } from '@astryxdesign/core/Icon';
import { Icon } from '@astryxdesign/core/Icon';

export const INK_VERB = 'var(--color-text-secondary)';
export const INK_TARGET = 'var(--color-text-gray)';
/** The failure ink is the dimmest step, not red — the word `failed` at the call site carries the meaning. */
export const INK_FAILED = 'var(--color-text-disabled)';

/** `ShimmerText`'s own default crest is the human's ink; a running row wearing it makes a filename the brightest thing in the panel. */
export const SHIMMER_BASE = INK_FAILED;
export const SHIMMER_CREST = INK_VERB;

export const ROW_CLASS = 'studio-tool-row';
export const VERB_CLASS = 'studio-tool-row-verb';
export const TARGET_CLASS = 'studio-tool-row-target';
export const SENTENCE_ATTR = 'data-row-sentence';
export const SENTENCE_CLIP_CLASS = 'studio-tool-row-clip';
export const KEEPS_TAIL_ATTR = 'data-keeps-tail';
export const FRAME_LINK_CLASS = 'studio-tool-row-frame';
/** The Designs list's row glyph size, so the frame reads as the same thing in both places. */
export const FRAME_LINK_ICON_PX = 14;
const CHEVRON_CLASS = 'studio-tool-row-chevron';

const ROW_STYLE_HREF = 'studio-tool-row-affordance';

const ROW_RULES = `
/* THE ROW'S OWN COLOUR IS THE TARGET'S, and the verb steps UP from it — not the
   other way round. Which one the container carries is not arbitrary: the
   ellipsis \`text-overflow\` paints belongs to the clipping BLOCK, so it wears
   whatever the container wears. With the verb's ink there, every truncated row
   ended in a mark brighter than the text it was truncating — the loudest thing
   on the line was the one saying content is missing. */
.${ROW_CLASS} {
  background: none;
  border: none;
  font: inherit;
  text-align: start;
  padding: 0;
  color: ${INK_TARGET};
}
.${ROW_CLASS} .${VERB_CLASS} { color: ${INK_VERB}; }

/* One line, ellipsis past the edge. The wrapper rule is the load-bearing half:
   \`ShimmerText\` puts a \`Text\` between the flex row and the sentence, and a
   flex child defaults to min-width:auto — so without this the sentence refuses
   to shrink below its content and pushes the chevron out of the panel instead
   of clipping. \`:has\` reaches that wrapper without this file knowing which
   element Astryx rendered. */
.${ROW_CLASS} [${SENTENCE_ATTR}] {
  display: flex;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}
.${ROW_CLASS} .${SENTENCE_CLIP_CLASS} {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.${ROW_CLASS} *:has(> [${SENTENCE_ATTR}]) { min-width: 0; overflow: hidden; }

/* A sentence whose words follow its target (Japanese puts the verb last) shortens the target, so the verb stays on screen. */
.${ROW_CLASS} .${SENTENCE_CLIP_CLASS}[${KEEPS_TAIL_ATTR}] { display: flex; }
.${ROW_CLASS} [${KEEPS_TAIL_ATTR}] > * { flex-shrink: 0; white-space: pre; }
.${ROW_CLASS} [${KEEPS_TAIL_ATTR}] > .${TARGET_CLASS},
.${ROW_CLASS} [${KEEPS_TAIL_ATTR}] > .${FRAME_LINK_CLASS} { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.${ROW_CLASS} [${KEEPS_TAIL_ATTR}] > .${FRAME_LINK_CLASS} > span { min-width: 0; }

/* Hover CLOSES the two steps rather than raising both: the target comes up to
   meet the verb and the row reads as one brightened sentence. The reference's
   \`hover:text-foreground\` resolves to white, and white is the human's ink
   here — a hovered tool row must not borrow it. */
.${ROW_CLASS}[data-expandable='true'] { cursor: pointer; }
.${ROW_CLASS}[data-expandable='true']:hover { color: ${INK_VERB}; }

.${ROW_CLASS}[data-status='error'],
.${ROW_CLASS}[data-status='error'] .${VERB_CLASS} { color: ${INK_FAILED}; }

/* While the sentence shimmers it is one clipped gradient, so its spans must
   not reassert a colour — an opaque child would punch a solid word through
   the sweep. */
.${ROW_CLASS} [data-tool-shimmer] .${VERB_CLASS},
.${ROW_CLASS} [data-tool-shimmer] .${TARGET_CLASS} { color: inherit; }

/* The name is the row's one control: underlined at rest so it reads as a way to the frame. */
.${ROW_CLASS} .${FRAME_LINK_CLASS} {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  vertical-align: bottom;
  max-width: 100%;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
}
.${ROW_CLASS} .${FRAME_LINK_CLASS} > span {
  overflow: hidden;
  text-overflow: ellipsis;
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, currentColor 45%, transparent);
  text-underline-offset: 2px;
}
.${ROW_CLASS} button.${FRAME_LINK_CLASS}:hover > span { text-decoration-color: currentColor; }
.${ROW_CLASS} button.${FRAME_LINK_CLASS}:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 2px;
}

.${ROW_CLASS} .${CHEVRON_CLASS} {
  opacity: 0;
  transition: transform 150ms ease;
}
.${ROW_CLASS}:hover .${CHEVRON_CLASS},
.${ROW_CLASS}:focus-visible .${CHEVRON_CLASS} { opacity: 0.4; }
.${ROW_CLASS} .${CHEVRON_CLASS}[data-open='true'] { transform: rotate(90deg); opacity: 0.4; }
`;

export function ToolRowStyles(): React.JSX.Element {
  return (
    <style href={ROW_STYLE_HREF} precedence="medium">
      {ROW_RULES}
    </style>
  );
}

export function RowChevron({
  icon,
  isOpen,
}: {
  icon: IconType;
  isOpen: boolean;
}): React.JSX.Element {
  return (
    <span
      className={CHEVRON_CLASS}
      data-open={isOpen}
      style={{ display: 'inline-flex', flexShrink: 0 }}
    >
      <Icon icon={icon} size="sm" color="inherit" />
    </span>
  );
}
