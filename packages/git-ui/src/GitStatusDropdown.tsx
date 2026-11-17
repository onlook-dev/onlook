import type { ReactNode } from 'react';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { GlyphSlot } from '@studio/chat-ui';
import { INERT_BUTTON } from './primitives.js';
import type { GitDropdownOption, GitPillDropdownId } from './state.js';
import type { GitStatusStrings } from './strings.js';

export type { GitDropdownOption } from './state.js';

export function dropdownOptions(id: GitPillDropdownId): readonly GitDropdownOption[] {
  if (id === 'fix-checks') return ['upload-changes'];
  return id === 'ready-to-merge' ? ['open-in-browser', 'merge'] : ['create-pr', 'push'];
}

export interface GitStatusDropdownProps {
  id: GitPillDropdownId;
  current?: GitDropdownOption;
  strings: GitStatusStrings;
  check: ReactNode;
  onPick: (option: GitDropdownOption) => void;
  menuLabel: string;
  listRef?: React.Ref<HTMLDivElement>;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

/** Hand-composed rows, not `DropdownMenuRadioItem`: the library's radio item draws a dot where the board shows a bare check. */
export function GitStatusDropdown({
  id,
  current,
  strings,
  check,
  onPick,
  menuLabel,
  listRef,
  onKeyDown,
}: GitStatusDropdownProps): React.JSX.Element {
  const options = dropdownOptions(id);
  const ordered = current === undefined ? options : [current, ...options.filter((option) => option !== current)];
  return (
    <VStack
      ref={listRef}
      role="menu"
      tabIndex={-1}
      aria-label={menuLabel}
      data-testid="git-status-dropdown"
      gap={0.5}
      onKeyDown={onKeyDown}
      style={{
        padding: 'var(--spacing-1)',
        background: 'var(--studio-git-menu-fill)',
        border: '0.5px solid var(--studio-git-menu-border)',
        borderRadius: 'var(--radius-element)',
        minWidth: 'var(--studio-git-menu-min-width)',
      }}
    >
      {current !== undefined && (
        <Text type="supporting" color="secondary" role="presentation" style={{ paddingInline: 'var(--spacing-1-5)', paddingBlock: 'var(--spacing-1)' }}>
          {strings.dropdownHeading}
        </Text>
      )}
      {ordered.map((option) => {
        const isCurrent = option === current;
        return (
          <HStack
            key={option}
            as="button"
            role={current === undefined ? 'menuitem' : 'menuitemradio'}
            aria-checked={current === undefined ? undefined : isCurrent}
            tabIndex={-1}
            data-option={option}
            data-checked={isCurrent ? 'true' : undefined}
            onClick={() => onPick(option)}
            gap={2}
            vAlign="center"
            style={{
              ...INERT_BUTTON,
              cursor: 'pointer',
              color: 'var(--color-text-primary)',
              background: isCurrent ? 'var(--color-background-gray)' : 'transparent',
              paddingBlock: 'var(--spacing-1)',
              paddingInline: 'var(--spacing-1-5)',
              borderRadius: 'var(--radius-element)',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <Text type="body" color="inherit">
              {strings.option[option]}
            </Text>
            <GlyphSlot size={14}>{isCurrent ? check : null}</GlyphSlot>
          </HStack>
        );
      })}
    </VStack>
  );
}
