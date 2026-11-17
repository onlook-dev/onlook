import { HStack } from '@astryxdesign/core/Layout';
import { ShimmerText } from '../ShimmerText.js';
import {
  INK_FAILED,
  INK_VERB,
  ROW_CLASS,
  SHIMMER_BASE,
  SHIMMER_CREST,
  ToolRowStyles,
} from './ink.js';
import { RowSentence, suffixFor } from './RowSentence.js';
import type { ToolRowStatus, ToolRowsStrings } from './types.js';

export interface ToolFileRowProps {
  verb: string;
  fileName: string;
  status: ToolRowStatus;
  strings: ToolRowsStrings;
}

export function ToolFileRow({
  verb,
  fileName,
  status,
  strings,
}: ToolFileRowProps): React.JSX.Element {
  return (
    <HStack
      gap={1}
      vAlign="center"
      width="100%"
      className={ROW_CLASS}
      data-testid="tool-file-row"
      data-status={status}
      style={{ minWidth: 0, color: status === 'error' ? INK_FAILED : INK_VERB }}
    >
      <ToolRowStyles />
      <ShimmerText
          key={JSON.stringify([verb, fileName, status])}
          isActive={status === 'running'}
          weight="normal"
          base={SHIMMER_BASE}
          crest={SHIMMER_CREST}
        >
        <RowSentence
          verb={verb}
          target={fileName}
          suffix={suffixFor(status, strings)}
        />
      </ShimmerText>
    </HStack>
  );
}
