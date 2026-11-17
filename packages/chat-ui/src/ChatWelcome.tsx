import { Fragment } from 'react';
import { Divider } from '@astryxdesign/core/Divider';
import { Icon, type IconType } from '@astryxdesign/core/Icon';
import { Item } from '@astryxdesign/core/Item';
import { Text } from '@astryxdesign/core/Text';
import type { SessionState } from '@studio/events';

export interface ChatWelcomeRow {
  id: string;
  label: string;
}

export interface ChatWelcomeProps {
  title: string;
  rows: readonly ChatWelcomeRow[];
  rowIcon: IconType;
  onPick: (id: string) => void;
}

/** Nothing said yet: a new project's landing row is the only item the transcript can hold. */
export function isChatUntouched(state: Pick<SessionState, 'items' | 'isStreaming'>): boolean {
  return !state.isStreaming && state.items.every((item) => item.kind === 'welcome');
}

export function ChatWelcome({ title, rows, rowIcon, onPick }: ChatWelcomeProps): React.JSX.Element {
  return (
    <div data-testid="chat-blank-welcome" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', width: '100%' }}>
      <Text type="large" weight="medium" color="primary">{title}</Text>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((row) => (
          <Fragment key={row.id}>
            <Divider />
            <Item
              label={row.label}
              onClick={() => onPick(row.id)}
              endContent={<Icon icon={rowIcon} size="sm" color="secondary" />}
              data-testid={`chat-blank-welcome-${row.id}`}
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
