/** No `title` on a clipped row: it fires the slow OS tooltip on every row, and expanding is how the full string is recovered. */
import { use } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { around, withoutSlot } from '../fill.js';
import { ShimmerCloneContext } from '../ShimmerText.js';
import type { ToolRowFrameLink } from './classify.js';
import { FRAME_LINK_CLASS, FRAME_LINK_ICON_PX, KEEPS_TAIL_ATTR, SENTENCE_ATTR, SENTENCE_CLIP_CLASS, TARGET_CLASS, VERB_CLASS } from './ink.js';
import type { ToolFrameLinks, ToolRowStatus, ToolRowsStrings } from './types.js';

export interface RowSuffix {
  kind: 'failed' | 'canceled';
  text: string;
}

export function suffixFor(status: ToolRowStatus, strings: ToolRowsStrings): RowSuffix | undefined {
  if (status === 'error') return { kind: 'failed', text: strings.failedSuffix };
  if (status === 'canceled') return { kind: 'canceled', text: strings.canceledSuffix };
  return undefined;
}

function Suffix({ suffix }: { suffix: RowSuffix }): React.JSX.Element {
  return (
    // `pre`, because a flex item drops its leading space and the string carries the separator.
    <span data-testid={`tool-row-${suffix.kind}`} style={{ flexShrink: 0, whiteSpace: 'pre' }}>
      {suffix.text}
    </span>
  );
}

/** Words after the target, not just closing punctuation: a cut there would take the sentence's meaning with it. */
export function keepsTail(after: string): boolean {
  return /\p{L}/u.test(after);
}

const KEEPS_TAIL = { [KEEPS_TAIL_ATTR]: '' };

export function RowSentence({
  verb,
  target,
  suffix,
  isTargetVerbInk = false,
}: {
  verb: string;
  target?: string;
  suffix?: RowSuffix;
  /** The target is a value the sentence quotes, read in the sentence's own ink. */
  isTargetVerbInk?: boolean;
}): React.JSX.Element {
  const hasTarget = target != null && target !== '';
  const { before, after } = around(verb, 'target');
  return (
    <span {...{ [SENTENCE_ATTR]: '' }}>
      <span className={SENTENCE_CLIP_CLASS} {...(hasTarget && keepsTail(after) ? KEEPS_TAIL : {})}>
        {hasTarget ? (
          <>
            {before !== '' && <span className={VERB_CLASS}>{before}</span>}
            <span className={isTargetVerbInk ? `${TARGET_CLASS} ${VERB_CLASS}` : TARGET_CLASS} data-testid="tool-row-target">
              {target}
            </span>
            {after !== '' && <span className={VERB_CLASS}>{after}</span>}
          </>
        ) : (
          <span className={VERB_CLASS}>{withoutSlot(verb, 'target')}</span>
        )}
      </span>
      {suffix != null && <Suffix suffix={suffix} />}
    </span>
  );
}

/** The shimmer's clone draws the name as plain text: a second button there would be a duplicate tab stop. */
function FrameName({ link, links }: { link: ToolRowFrameLink; links: ToolFrameLinks }): React.JSX.Element {
  const isClone = use(ShimmerCloneContext);
  const glyph = (
    <Icon icon={links.icon} color="inherit" aria-hidden style={{ width: FRAME_LINK_ICON_PX, height: FRAME_LINK_ICON_PX, flexShrink: 0 }} />
  );
  if (isClone) {
    return (
      <span className={FRAME_LINK_CLASS}>
        {glyph}
        <span>{link.name}</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      className={FRAME_LINK_CLASS}
      data-testid="tool-row-frame-link"
      data-frame-id={link.frameId}
      onClick={() => links.onActivate(link.frameId)}
      {...(links.onHover
        ? {
            onMouseEnter: () => links.onHover?.(link.frameId, true),
            onMouseLeave: () => links.onHover?.(link.frameId, false),
          }
        : {})}
    >
      {glyph}
      <span>{link.name}</span>
    </button>
  );
}

export function FrameLinkSentence({
  link,
  links,
  suffix,
}: {
  link: ToolRowFrameLink;
  links: ToolFrameLinks;
  suffix?: RowSuffix;
}): React.JSX.Element {
  return (
    <span {...{ [SENTENCE_ATTR]: '' }}>
      {keepsTail(link.after) ? (
        <span className={`${SENTENCE_CLIP_CLASS} ${VERB_CLASS}`} {...KEEPS_TAIL}>
          {link.before !== '' && <span>{link.before}</span>}
          <FrameName link={link} links={links} />
          <span>{link.after}</span>
        </span>
      ) : (
        <span className={SENTENCE_CLIP_CLASS}>
          <span className={VERB_CLASS}>
            {link.before}
            <FrameName link={link} links={links} />
            {link.after}
          </span>
        </span>
      )}
      {suffix != null && <Suffix suffix={suffix} />}
    </span>
  );
}
