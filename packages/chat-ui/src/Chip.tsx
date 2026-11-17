import type { ReactNode } from 'react';
import { Text } from '@astryxdesign/core/Text';

export type ChipKind = 'project' | 'workspace' | 'ref' | 'neutral';

const GROUND: Record<ChipKind, string> = {
  project: 'var(--color-background-blue)',
  workspace: 'var(--color-background-teal)',
  // The design's literal #1f1f1f is invisible on a #1f1f1f card.
  ref: 'var(--color-background-gray)',
  neutral: 'var(--color-background-gray)',
};

const INK: Record<ChipKind, string> = {
  project: 'var(--color-text-blue)',
  workspace: 'var(--color-text-teal)',
  ref: 'var(--color-text-gray)',
  neutral: 'var(--color-text-secondary)',
};

export interface ChipProps {
  kind: ChipKind;
  children: ReactNode;
}

export function Chip({ kind, children }: ChipProps): React.JSX.Element {
  return (
    <Text
      type="supporting"
      weight="medium"
      color="inherit"
      data-testid="chat-chip"
      data-chip={kind}
      style={{
        // 1px has no spacing rung; the ramp floor is 2px.
        padding: '1px var(--spacing-1)',
        borderRadius: 'var(--radius-element)',
        background: GROUND[kind],
        color: INK[kind],
        whiteSpace: 'nowrap',
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        // Not `normal`: the monospace kinds stand 2px taller.
        lineHeight: 1.2,
        // One size for every kind, no per-font ratio.
        fontSize: 'var(--text-body-size)',
        ...(kind === 'ref' ? { fontFamily: 'var(--font-family-code)', letterSpacing: 0 } : null),
      }}
    >
      {children}
    </Text>
  );
}
