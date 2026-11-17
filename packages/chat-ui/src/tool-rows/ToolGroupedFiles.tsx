/** This row wraps rather than clipping — a truncated list loses the "+N more" count with it. */
import { HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { ShimmerText } from '../ShimmerText.js';
import {
  INK_FAILED,
  INK_VERB,
  ROW_CLASS,
  SHIMMER_BASE,
  SHIMMER_CREST,
  TARGET_CLASS,
  ToolRowStyles,
  VERB_CLASS,
} from './ink.js';
import { around, fill } from '../fill.js';
import { suffixFor } from './RowSentence.js';
import type { ToolRowStatus, ToolRowsStrings } from './types.js';

export interface ToolGroupedFilesProps {
  verb: string;
  fileNames: string[];
  overflow?: number;
  status: ToolRowStatus;
  strings: ToolRowsStrings;
}

export function ToolGroupedFiles({
  verb,
  fileNames,
  overflow = 0,
  status,
  strings,
}: ToolGroupedFilesProps): React.JSX.Element {
  const suffix = suffixFor(status, strings);
  const { before, after } = around(verb, 'target');
  return (
    <HStack
      gap={1}
      vAlign="start"
      width="100%"
      className={ROW_CLASS}
      data-testid="tool-grouped-files"
      data-status={status}
      style={{ minWidth: 0, color: status === 'error' ? INK_FAILED : INK_VERB }}
    >
      <ToolRowStyles />
      <ShimmerText
          key={JSON.stringify([verb, fileNames, overflow, status])}
          isActive={status === 'running'}
          weight="normal"
          base={SHIMMER_BASE}
          crest={SHIMMER_CREST}
        >
        <span style={{ overflowWrap: 'anywhere' }}>
          {before !== '' && <span className={VERB_CLASS}>{before}</span>}
          <span className={TARGET_CLASS}>{fileNames.join(', ')}</span>
          {overflow > 0 && (
            <Text
              as="span"
              type="body"
              color="inherit"
              style={{ color: 'var(--color-text-disabled)' }}
            >
              {' '}
              {fill(strings.overflow, { count: overflow })}
            </Text>
          )}
          {after !== '' && <span className={VERB_CLASS}>{after}</span>}
          {suffix != null && <span data-testid={`tool-row-${suffix.kind}`}>{suffix.text}</span>}
        </span>
      </ShimmerText>
    </HStack>
  );
}
