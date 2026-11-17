import { useLayoutEffect, useRef, useState } from 'react';
import { HStack } from '@astryxdesign/core/Layout';
import { AttachmentChips } from '../chat/AttachmentChips.js';
import { ElementChips } from '../chat/ElementChips.js';
import type { AttachmentDraft } from '../attachments.js';
import type { ElementSelection } from './selection.js';
import './canvas.css';

function overflowOf(row: HTMLElement): { start: boolean; end: boolean } {
  const max = row.scrollWidth - row.clientWidth;
  return { start: row.scrollLeft > 1, end: row.scrollLeft < max - 1 };
}

/** What the scroll-to-end watches: a pill appended to a row that already overflows is off its end, unseen (ONL-2549). */
export function chipRowCount(
  chips: readonly ElementSelection[],
  attachments: readonly AttachmentDraft[],
): number {
  return chips.length + attachments.length;
}

/** One sideways-scrolling row, not a wrapped stack: wrapping grew the card and pushed the input off its element (ONL-2455). */
export function InlineChipRow({
  chips,
  attachments,
  onRemove,
  onRemoveAttachment,
}: {
  chips: ElementSelection[];
  attachments: AttachmentDraft[];
  onRemove: (id: string) => void;
  onRemoveAttachment: (id: string) => void;
}): React.JSX.Element {
  const rowRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ start: false, end: false });
  const count = chipRowCount(chips, attachments);
  const seen = useRef(count);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (row === null) return;
    if (count > seen.current) row.scrollLeft = row.scrollWidth;
    seen.current = count;
    setOverflow(overflowOf(row));
  }, [count]);

  return (
    <HStack
      ref={rowRef}
      gap={1}
      vAlign="center"
      className="inline-element-bubble-chips"
      data-fade-start={overflow.start ? 'true' : undefined}
      data-fade-end={overflow.end ? 'true' : undefined}
      data-testid="inline-element-bubble-chips"
      onScroll={(event) => {
        const next = overflowOf(event.currentTarget);
        if (next.start !== overflow.start || next.end !== overflow.end) setOverflow(next);
      }}
      onWheel={(event) => {
        // A mouse wheel has no sideways axis; a trackpad's own sideways swipe passes through.
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        event.currentTarget.scrollLeft += event.deltaY;
      }}
    >
      <ElementChips selections={chips} onRemove={onRemove} />
      <AttachmentChips drafts={attachments} onRemove={onRemoveAttachment} />
    </HStack>
  );
}
