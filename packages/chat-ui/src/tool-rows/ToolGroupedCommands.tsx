import { useState } from 'react';
import type { IconType } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { ShimmerText } from '../ShimmerText.js';
import {
  RowChevron,
  ROW_CLASS,
  SHIMMER_BASE,
  SHIMMER_CREST,
  ToolRowStyles,
} from './ink.js';
import { RowSentence, suffixFor } from './RowSentence.js';
import { ToolRowDetailView } from './ToolRowDetail.js';
import { fill } from '../fill.js';
import type { ToolRowStatus, ToolRowsStrings } from './types.js';

export interface ToolGroupedCommandsItem {
  description?: string;
  command: string;
}

export interface ToolGroupedCommandsProps {
  /** Published only as the shimmer's key; the sentence is `strings.commandsVerb`. */
  verb: string;
  items: ToolGroupedCommandsItem[];
  status: ToolRowStatus;
  defaultOpen?: boolean;
  chevronIcon: IconType;
  strings: ToolRowsStrings;
}

export function ToolGroupedCommands({
  verb,
  items,
  status,
  defaultOpen = false,
  chevronIcon,
  strings,
}: ToolGroupedCommandsProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <VStack gap={1} width="100%" data-testid="tool-grouped-commands" data-status={status}>
      <ToolRowStyles />
      <HStack
        as="button"
        gap={1}
        vAlign="center"
        width="100%"
        className={ROW_CLASS}
        data-expandable="true"
        data-status={status}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        style={{ minWidth: 0 }}
      >
        <ShimmerText
          key={JSON.stringify([verb, items.length, status])}
          isActive={status === 'running'}
          weight="normal"
          base={SHIMMER_BASE}
          crest={SHIMMER_CREST}
        >
          <RowSentence
            verb={status === 'running' ? strings.commandsVerb.running : strings.commandsVerb.done}
            target={fill(strings.commandCount, { count: items.length })}
            suffix={suffixFor(status, strings)}
          />
        </ShimmerText>
        <RowChevron icon={chevronIcon} isOpen={isOpen} />
      </HStack>
      {/* `gap={3}` has to beat the gap inside an item; at 2 an untitled call read as a second command under the title above it. */}
      {isOpen && (
        <VStack gap={3} width="100%" style={{ paddingInlineStart: 'var(--spacing-4)' }}>
          {items.map((item, index) => (
            <VStack
              // A retry is the same command string twice, so index is the honest key here.
              // biome-ignore lint/suspicious/noArrayIndexKey: see above
              key={index}
              gap={0}
              width="100%"
            >
              {item.description != null && item.description !== '' && (
                <Text
                  type="supporting"
                  color="inherit"
                  style={{ color: 'var(--color-text-gray)' }}
                >
                  {item.description}
                </Text>
              )}
              <ToolRowDetailView
                detail={{ kind: 'shell', command: item.command }}
                strings={strings}
              />
            </VStack>
          ))}
        </VStack>
      )}
    </VStack>
  );
}
