import type { ReactNode } from 'react';
import { HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { CARD_FAMILY, familyPalette } from './palette.js';
import { GlyphSlot } from '@studio/chat-ui';
import { GIT_CARD_ATTENTION, type GitCardStateId } from './state.js';
import type { GitStatusStrings } from './strings.js';

export interface GitCardStatusProps {
  age: string;
  state: GitCardStateId;
  strings: GitStatusStrings;
  glyph?: ReactNode;
  isDim?: boolean;
  testId?: string;
}

export function GitCardStatus({ age, state, strings, glyph, isDim, testId }: GitCardStatusProps): React.JSX.Element {
  const hue = state === 'none' ? undefined : familyPalette(CARD_FAMILY[state]).hue;
  const showsGlyph = glyph != null && GIT_CARD_ATTENTION.includes(state);
  return (
    <HStack gap={1} vAlign="center" data-testid={testId ?? 'git-card-status'} data-git-card-state={state}>
      <Text type="supporting" color={isDim ? 'disabled' : 'secondary'}>
        {age}
      </Text>
      {state !== 'none' && (
        <>
          <Text type="supporting" color="secondary" aria-hidden="true">
            {strings.separator}
          </Text>
          {showsGlyph && <GlyphSlot size={14} color={hue}>{glyph}</GlyphSlot>}
          <Text
            type="supporting"
            weight="medium"
            color="inherit"
            style={{ color: hue, fontSize: 'var(--studio-git-card-label-size)', whiteSpace: 'nowrap' }}
          >
            {strings.cardLabel[state]}
          </Text>
        </>
      )}
    </HStack>
  );
}
