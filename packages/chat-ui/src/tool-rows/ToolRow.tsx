/** No icon, card, border or success mark: the only filled boxes left in the column are the things a human said. */
import { useState } from 'react';
import type { IconType } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { ShimmerText } from '../ShimmerText.js';
import {
  RowChevron,
  ROW_CLASS,
  SHIMMER_BASE,
  SHIMMER_CREST,
  ToolRowStyles,
} from './ink.js';
import { ToolRowDetailView } from './ToolRowDetail.js';
import { FrameLinkSentence, keepsTail, RowSentence, suffixFor } from './RowSentence.js';
import type { SentenceSplit, ToolRowFrameLink } from './classify.js';
import type { ToolFrameLinks, ToolRowDetail, ToolRowStatus, ToolRowsStrings } from './types.js';

export interface ToolRowProps {
  /** `{target}` is where the target sits; without it the target follows. */
  verb: string;
  /** Published as `data-verb` so a drive finds a row by fact rather than by its rendered sentence. */
  verbId?: string;
  target?: string;
  status: ToolRowStatus;
  detail?: ToolRowDetail;
  defaultOpen?: boolean;
  chevronIcon: IconType;
  strings: ToolRowsStrings;
  /** With `frameLinks`, the frame's name is the row's one control and the row no longer expands. */
  frameLink?: ToolRowFrameLink;
  frameLinks?: ToolFrameLinks;
  /** `verb` split around the value it quotes; used when words follow the value, so a cut shortens the value instead. */
  held?: SentenceSplit;
}

export function ToolRow({
  verb,
  verbId,
  target,
  status,
  detail,
  defaultOpen = false,
  chevronIcon,
  strings,
  frameLink,
  frameLinks,
  held,
}: ToolRowProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const linked = frameLink !== undefined && frameLinks !== undefined ? { link: frameLink, links: frameLinks } : undefined;
  const isExpandable = detail != null && linked === undefined;

  return (
    <VStack gap={1} width="100%" data-testid="tool-row" data-status={status} data-verb={verbId}>
      <ToolRowStyles />
      <HStack
        as={linked === undefined ? 'button' : 'div'}
        gap={1}
        vAlign="center"
        width="100%"
        className={ROW_CLASS}
        data-expandable={isExpandable}
        data-status={status}
        {...(isExpandable ? { 'aria-expanded': isOpen } : linked === undefined ? { disabled: true } : {})}
        onClick={() => isExpandable && setIsOpen((open) => !open)}
        style={{ minWidth: 0 }}
      >
        <ShimmerText
          key={JSON.stringify([verb, target, status])}
          isActive={status === 'running'}
          weight="normal"
          base={SHIMMER_BASE}
          crest={SHIMMER_CREST}
        >
          {linked === undefined ? (
            (target == null || target === '') && held !== undefined && keepsTail(held.after) ? (
              <RowSentence
                verb={`${held.before}{target}${held.after}`}
                target={held.value}
                isTargetVerbInk
                suffix={suffixFor(status, strings)}
              />
            ) : (
              <RowSentence
                verb={verb}
                target={target}
                suffix={suffixFor(status, strings)}
              />
            )
          ) : (
            <FrameLinkSentence link={linked.link} links={linked.links} suffix={suffixFor(status, strings)} />
          )}
        </ShimmerText>
        {isExpandable && <RowChevron icon={chevronIcon} isOpen={isOpen} />}
      </HStack>
      {isOpen && detail != null && (
        /* Full width, not indented under its row: the indent cost mono output a quarter of the panel. */
        <VStack width="100%">
          <ToolRowDetailView detail={detail} strings={strings} />
        </VStack>
      )}
    </VStack>
  );
}
