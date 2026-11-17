import { Card } from '@astryxdesign/core/Card';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Stack } from '@astryxdesign/core/Stack';
import { Folder2Icon } from '../../icons/glyphs.js';
import { SidebarRow } from '../../projects/SidebarRow.js';
import type { Category, Gallery } from './Showroom.js';

const CHIP = {
  borderRadius: 'var(--radius-element)',
  background: 'var(--color-background-gray)',
} as const;

const ROW_FRAME = { position: 'relative' } as const;

const ROW_OVERLAY = {
  position: 'absolute',
  inset: '4px 32px 4px 32px',
  pointerEvents: 'none',
} as const;

const CATEGORIES: Category[] = [
  {
    id: 'skeleton',
    title: 'Skeleton — every shared ground',
    stories: [
      {
        id: 'theme-gallery-skeleton-card',
        title: 'On a Card',
        render: () => (
          <Card width={160} data-testid="theme-skeleton-card">
            <Skeleton height={16} />
          </Card>
        ),
      },
      {
        id: 'theme-gallery-skeleton-chip',
        title: 'On a gray chip',
        note: '--color-background-gray',
        render: () => (
          <Stack width={96} height={32} padding={2} style={CHIP} data-testid="theme-skeleton-chip">
            <Skeleton height={16} />
          </Stack>
        ),
      },
      {
        id: 'theme-gallery-skeleton-row',
        title: 'Inside a pressed row',
        note: 'the sidebar row, selected',
        render: () => (
          <Stack width={240} style={ROW_FRAME} data-testid="theme-skeleton-row">
            <SidebarRow icon={Folder2Icon} label="pricing-v2" isSelected />
            <Stack as="span" aria-hidden="true" style={ROW_OVERLAY}>
              <Skeleton height={16} />
            </Stack>
          </Stack>
        ),
      },
    ],
  },
];

export const THEME_GALLERY: Gallery = {
  id: 'theme',
  title: 'Theme',
  subtitle: 'ONL-2173 · Skeleton on every shared ground',
  categories: CATEGORIES,
};
