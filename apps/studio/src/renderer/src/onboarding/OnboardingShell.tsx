import { createContext, use, type ReactNode } from 'react';
import { HStack, VStack } from '@astryxdesign/core/Layout';

import { t } from '@studio/i18n';
import { OnlookWordmark } from '../icons/OnlookWordmark.js';

const COLUMN_WIDTH = 680;
// Matches the survey's compact breakpoint in FoundUsStep.
const COMPACT_RULES = '@media (max-height:720px),(max-width:900px){.onboarding-column{padding-top:32px !important;padding-bottom:32px !important}}';
// The gap below the window's top band, not the design's absolute y: this shell begins under the band (ONL-1935).
const COLUMN_INSET_TOP = 27;
const COLUMN_INSET_BOTTOM = 65;

// Steps inside a split render only their column, so the picture stays mounted across steps.
const InSplit = createContext(false);

const COLUMN_GROUND = 'color(display-p3 0.082 0.082 0.09)';

export function OnboardingSplit({ aside, children }: { aside: ReactNode; children: ReactNode }): React.JSX.Element {
  return (
    <HStack width="100%" height="100%" style={{ background: 'var(--studio-ground)', overflow: 'hidden' }}>
      <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex' }}>
        <InSplit value>{children}</InSplit>
      </div>
      <div style={{ flex: 1, minWidth: 0, height: '100%' }}>{aside}</div>
    </HStack>
  );
}

function WordmarkSlot({ end }: { end?: ReactNode }): React.JSX.Element {
  return (
    <HStack width="100%" align="center" justify="between" data-testid="onboarding-wordmark">
      <OnlookWordmark role="img" aria-label={t('app.name')} />
      {end}
    </HStack>
  );
}

export interface OnboardingShellProps {
  children: ReactNode;
  aside?: ReactNode;
  headerEnd?: ReactNode;
  'data-testid'?: string;
}

export function OnboardingShell({
  children,
  aside,
  headerEnd,
  'data-testid': testId,
}: OnboardingShellProps): React.JSX.Element {
  const isInSplit = use(InSplit);
  const column = (
    <HStack
      width="100%"
      justify="center"
      paddingInline={1}
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        ...(aside !== undefined ? { paddingInline: 'clamp(24px, 4vw, 64px)' } : null),
      }}
    >
      <VStack
        width="100%"
        height="100%"
        justify="between"
        align="start"
        className="onboarding-column"
        style={{
          maxWidth: COLUMN_WIDTH,
          paddingTop: aside !== undefined ? 64 : COLUMN_INSET_TOP,
          paddingBottom: COLUMN_INSET_BOTTOM,
        }}
      >
        <WordmarkSlot end={headerEnd} />
        {children}
      </VStack>
      <style href="onboarding-column" precedence="medium">{COMPACT_RULES}</style>
    </HStack>
  );

  if (aside !== undefined && isInSplit) {
    return (
      <VStack width="100%" height="100%" style={{ background: COLUMN_GROUND }} data-testid={testId}>
        {column}
      </VStack>
    );
  }

  if (aside !== undefined) {
    return (
      <HStack
        width="100%"
        height="100%"
        style={{ background: 'var(--studio-ground)', overflow: 'hidden' }}
        data-testid={testId}
      >
        {/* A shade darker than the ground, so the column meets the picture's near-black without a seam. */}
        <VStack height="100%" style={{ flex: 1, minWidth: 0, background: COLUMN_GROUND }}>
          {column}
        </VStack>
        <div style={{ flex: 1, minWidth: 0, height: '100%' }}>{aside}</div>
      </HStack>
    );
  }

  return (
    <VStack
      width="100%"
      height="100%"
      // `--studio-ground` lives in `styles.css`; `TokenName` is a closed union.
      style={{ background: 'var(--studio-ground)', overflow: 'hidden' }}
      data-testid={testId}
    >
      <HStack
        width="100%"
        justify="center"
        paddingInline={1}
        style={{ flex: 1, minHeight: 0 }}
      >
        <VStack
          width="100%"
          height="100%"
          justify="between"
          align="start"
          style={{
            maxWidth: COLUMN_WIDTH,
            paddingTop: COLUMN_INSET_TOP,
            paddingBottom: COLUMN_INSET_BOTTOM,
          }}
        >
          <WordmarkSlot />
          {children}
        </VStack>
      </HStack>
    </VStack>
  );
}
