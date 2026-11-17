import { useState, type ReactNode } from 'react';
import { Icon, type IconType } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import type { SetupStep, SetupStepId, SetupStepStatus, SetupStepsView } from '@studio/events';
import { ShimmerText } from './ShimmerText.js';

/** The app's licensed marks, injected like the chip glyphs; a skipped step wears the pending ring. */
export type SetupStepGlyphs = Record<Exclude<SetupStepStatus, 'skipped'>, ReactNode>;

export interface SetupStepsStrings {
  label: string;
  done: string;
  steps: Record<SetupStepId, string>;
}

const CARD = {
  width: '100%',
  margin: 0,
  minInlineSize: 0,
  marginBlockStart: 'var(--spacing-3)',
  marginBlockEnd: 'var(--spacing-1-5, 6px)',
  border: 'var(--border-width) solid var(--color-border)',
  borderRadius: 'var(--radius-container)',
} as const;

const INK: Record<SetupStepStatus, string> = {
  pending: 'var(--color-text-disabled)',
  running: 'var(--color-text-primary)',
  done: 'var(--color-text-secondary)',
  failed: 'var(--color-text-primary)',
  skipped: 'var(--color-text-disabled)',
};

const MARK_BOX = { display: 'inline-flex', flexShrink: 0, width: 16, height: 16 } as const;

const FOLD_BUTTON = {
  background: 'none',
  border: 'none',
  font: 'inherit',
  color: 'inherit',
  padding: 0,
  textAlign: 'start',
  cursor: 'pointer',
  width: '100%',
  margin: 0,
  minInlineSize: 0,
} as const;

function Mark({ status, glyphs }: { status: SetupStepStatus; glyphs: SetupStepGlyphs }): ReactNode {
  return <span style={MARK_BOX} aria-hidden>{glyphs[status === 'skipped' ? 'pending' : status]}</span>;
}

function Row({ step, label, glyphs }: { step: SetupStep; label: string; glyphs: SetupStepGlyphs }): ReactNode {
  return (
    <VStack gap={1} data-testid="setup-step" data-step={step.id} data-status={step.status}>
      <HStack gap={2} vAlign="center" style={{ color: INK[step.status] }}>
        <Mark status={step.status} glyphs={glyphs} />
        {step.status === 'running' ? (
          <ShimmerText isActive weight="normal" base="var(--color-text-secondary)" crest="var(--color-text-primary)">
            {label}
          </ShimmerText>
        ) : (
          <Text type="body" color="inherit">{label}</Text>
        )}
      </HStack>
      {step.detail === undefined ? null : (
        <Text type="supporting" color="secondary" style={{ paddingInlineStart: 24, overflowWrap: 'anywhere' }} data-testid="setup-step-detail">
          {step.detail}
        </Text>
      )}
    </VStack>
  );
}

export interface SetupStepsCardProps {
  view: SetupStepsView;
  strings: SetupStepsStrings;
  glyphs: SetupStepGlyphs;
  chevronIcon: IconType;
}

/** Every step done folds the card to one line; the chevron reopens the steps, and a relaunch starts folded (ONL-2913). */
export function SetupStepsCard({ view, strings, glyphs, chevronIcon }: SetupStepsCardProps): ReactNode {
  const [isOpen, setOpen] = useState(false);
  const isFoldable = view.outcome === 'done';
  const steps = (
    <VStack gap={2}>
      {view.steps.map((step) => (
        <Row key={step.id} step={step} label={strings.steps[step.id]} glyphs={glyphs} />
      ))}
    </VStack>
  );
  return (
    <VStack as="fieldset" gap={2} padding={3} style={CARD} aria-label={strings.label} data-testid="setup-steps" data-outcome={view.outcome} data-folded={isFoldable && !isOpen ? 'true' : 'false'}>
      {isFoldable ? (
        <HStack as="button" gap={2} vAlign="center" style={{ ...FOLD_BUTTON, color: INK.done }} aria-expanded={isOpen} onClick={() => setOpen((open) => !open)} data-testid="setup-steps-fold">
          <Mark status="done" glyphs={glyphs} />
          <Text type="body" color="inherit" style={{ flex: 1, minWidth: 0 }}>{strings.done}</Text>
          <span style={{ display: 'inline-flex', flexShrink: 0, transition: 'transform 150ms ease', transform: isOpen ? 'rotate(90deg)' : undefined }}>
            <Icon icon={chevronIcon} size="sm" color="inherit" />
          </span>
        </HStack>
      ) : null}
      {!isFoldable || isOpen ? steps : null}
    </VStack>
  );
}
