import { useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { NextTask } from '@studio/events';
import { Card } from '@astryxdesign/core/Card';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { nextTaskRows, type NextTaskPick, type NextTasksCard as NextTasksCardData } from './nextTasks.js';
import { FADE, ONE_LINE } from './oneLineFade.js';
import { useOverflows } from './useOverflows.js';

const GROUP = {
  width: '100%',
  margin: 0,
  padding: 0,
  border: 0,
  minInlineSize: 0,
  marginBlockStart: 'var(--spacing-3)',
} as const;

const PINNED_GROUP = { ...GROUP, marginBlockStart: 0 } as const;
const DIMMED: CSSProperties = { opacity: 0.5 };
const FULL_TEXT: CSSProperties = { maxWidth: 260 };

export type DrawNextTaskPicture = (task: NextTask, index: number) => ReactNode;

export interface NextTasksCardProps {
  card: NextTasksCardData;
  label: string;
  picked: number | null;
  picture?: DrawNextTaskPicture;
  onPick?: (toolCallId: string, index: number) => void;
  onConfirm?: (pick: NextTaskPick) => void;
  /** Sent, the chosen task moves to the row that pins it (ONL-2901). */
  shows?: 'all' | 'chosen';
}

function FadingLine({ text, type, onOverflow }: { text: string; type: 'body' | 'supporting'; onOverflow: (line: 'title' | 'line', overflows: boolean) => void }): ReactNode {
  const [ref, overflows] = useOverflows<HTMLDivElement>(text);
  const line = type === 'body' ? 'title' : 'line';
  useLayoutEffect(() => onOverflow(line, overflows), [line, overflows, onOverflow]);
  return (
    <div ref={ref} style={overflows ? { ...ONE_LINE, ...FADE } : ONE_LINE} data-testid={type === 'body' ? 'next-task-title' : 'next-task-line'} data-overflows={overflows || undefined}>
      <Text type={type} color={type === 'body' ? 'primary' : 'secondary'}>
        {text}
      </Text>
    </div>
  );
}

function TaskBody({ task, picture, onOverflow }: { task: NextTask; picture: ReactNode; onOverflow: (line: 'title' | 'line', overflows: boolean) => void }): ReactNode {
  return (
    <HStack gap={3} vAlign="center">
      <VStack gap={0.5} style={{ flex: 1, minWidth: 0 }}>
        <FadingLine text={task.title} type="body" onOverflow={onOverflow} />
        {task.line === undefined ? null : <FadingLine text={task.line} type="supporting" onOverflow={onOverflow} />}
      </VStack>
      {picture}
    </HStack>
  );
}

function FullText({ task }: { task: NextTask }): ReactNode {
  return (
    <VStack gap={0.5} style={FULL_TEXT}>
      <Text type="supporting" color="primary">
        {task.title}
      </Text>
      {task.line === undefined ? null : (
        <Text type="supporting" color="secondary">
          {task.line}
        </Text>
      )}
    </VStack>
  );
}

function useOverflowTip(): [boolean, (line: 'title' | 'line', overflows: boolean) => void] {
  const [lines, setLines] = useState({ title: false, line: false });
  const [report] = useState(() => (line: 'title' | 'line', overflows: boolean) =>
    setLines((current) => (current[line] === overflows ? current : { ...current, [line]: overflows })),
  );
  return [lines.title || lines.line, report];
}

function OverflowTip({ task, children }: { task: NextTask; children: (onOverflow: (line: 'title' | 'line', overflows: boolean) => void) => ReactNode }): ReactNode {
  const [overflows, onOverflow] = useOverflowTip();
  return (
    <Tooltip content={<FullText task={task} />} placement="start" alignment="start" hasHoverIndication={false} isEnabled={overflows}>
      {children(onOverflow)}
    </Tooltip>
  );
}

export function NextTasksCard({ card, label, picked, picture, onPick, onConfirm, shows = 'all' }: NextTasksCardProps): ReactNode {
  const { state } = card;
  if (state.kind === 'waiting') return null;
  const rows = nextTaskRows(card, picked);

  if (state.kind === 'sent') {
    return (
      <VStack gap={2} style={shows === 'chosen' ? PINNED_GROUP : GROUP} data-testid={shows === 'chosen' ? 'next-tasks-chosen' : 'next-tasks'} data-state="sent">
        {rows.map((row) => (
          <OverflowTip key={row.index} task={row.task}>
            {(onOverflow) => (
              <Card padding={3} width="100%" data-testid="next-task" data-task-state={row.state}>
                <TaskBody task={row.task} picture={picture?.(row.task, row.index)} onOverflow={onOverflow} />
              </Card>
            )}
          </OverflowTip>
        ))}
      </VStack>
    );
  }

  return (
    <VStack as="fieldset" gap={2} style={GROUP} aria-label={label} data-testid="next-tasks" data-state="open">
      {rows.map((row) => (
        <OverflowTip key={`${String(row.index)}:${row.task.title}`} task={row.task}>
          {(onOverflow) => (
            <SelectableCard
              label={row.task.title}
              isSelected={row.state === 'picked'}
              onChange={() => {
                onPick?.(card.toolCallId, row.index);
                onConfirm?.({ toolCallId: card.toolCallId, index: row.index, task: row.task });
              }}
              padding={3}
              width="100%"
              style={row.state === 'dimmed' ? DIMMED : undefined}
              data-testid="next-task"
              data-task-state={row.state}
            >
              <TaskBody task={row.task} picture={picture?.(row.task, row.index)} onOverflow={onOverflow} />
            </SelectableCard>
          )}
        </OverflowTip>
      ))}
    </VStack>
  );
}
