import type { TranscriptItem } from '@studio/events';

type Thinking = Extract<TranscriptItem, { kind: 'assistant-thinking' }>;

/** A run still last in a live turn stays streaming, so its line does not flip to "Thought" or drop out between blocks. */
export function mergeThoughts(
  items: readonly TranscriptItem[],
  drawsNothing: (item: TranscriptItem) => boolean,
  turnIsLive: boolean,
): readonly TranscriptItem[] {
  const rows: (TranscriptItem | null)[] = [];
  let changed = false;
  let run: { at: number; blocks: Thinking[] } | null = null;
  const close = (reachesEnd: boolean): void => {
    if (run === null) return;
    const staysOpen = turnIsLive && reachesEnd;
    const row = run.blocks.length > 1 || (staysOpen && !run.blocks[0]!.isStreaming) ? joined(run.blocks, staysOpen) : run.blocks[0]!;
    if (!row.isStreaming) {
      rows[run.at] = null;
      changed = true;
    } else if (row !== run.blocks[0]) {
      rows[run.at] = row;
      changed = true;
    }
    run = null;
  };
  for (const item of items) {
    if (item.kind === 'assistant-thinking') {
      if (run === null) {
        run = { at: rows.length, blocks: [item] };
        rows.push(item);
      } else {
        run.blocks.push(item);
        changed = true;
      }
      continue;
    }
    if (!drawsNothing(item)) close(false);
    rows.push(item);
  }
  close(true);
  return changed ? rows.filter((row): row is TranscriptItem => row !== null) : items;
}

function joined(blocks: readonly Thinking[], staysOpen: boolean): Thinking {
  return {
    kind: 'assistant-thinking',
    id: blocks[0]!.id,
    text: blocks
      .map((block) => block.text.trim())
      .filter((text) => text.length > 0)
      .join('\n\n'),
    isStreaming: blocks[blocks.length - 1]!.isStreaming || staysOpen,
  };
}
