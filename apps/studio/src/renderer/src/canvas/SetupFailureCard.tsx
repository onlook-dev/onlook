import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { FAILED_STEP_NAME } from '../setupStepNames.js';
import { t, type StringKey } from '@studio/i18n';
import { SendArrowIcon } from '../icons/glyphs.js';
import { selectProjectSetupSnapshot, useProjectSetupStore } from '../project-setup/store.js';
import { useWorkspaceStore } from '../workspace/store.js';
import { usePresence } from './EmptyCanvasIllustration.js';
import { askFromSetupFailureCard, type SetupFailureCard as Card } from './failureCentre.js';
import { useSetupFailureCard } from './useSetupFailureCard.js';

const CARD = { width: 520, height: 296 };
const FADE_MS = 320;

const BODY: Record<Card['cause'], StringKey> = {
  install: 'canvas.setupFailure.install.body',
  start: 'canvas.setupFailure.start.body',
  ready: 'canvas.setupFailure.ready.body',
};

export function SetupFailureCardView({ card, onAsk }: { card: Card; onAsk: () => void }) {
  return (
    <div
      data-testid="setup-failure-card"
      data-step={card.step}
      style={{
        width: CARD.width,
        height: CARD.height,
        background: 'var(--color-background-card)',
        borderRadius: 'var(--radius-container)',
        border: 'var(--border-width) solid var(--color-border)',
        boxSizing: 'border-box',
      }}
    >
      <VStack align="center" justify="center" gap={6} padding={8} style={{ height: '100%', boxSizing: 'border-box', textAlign: 'center' }}>
        <VStack align="center" gap={3} style={{ maxWidth: 380 }}>
          <Heading level={1} style={{ textWrap: 'balance' }}>{t(FAILED_STEP_NAME[card.step])}</Heading>
          <Text color="secondary" style={{ lineHeight: 1.6, textWrap: 'pretty' }}>{t(BODY[card.cause])}</Text>
        </VStack>
        <Button variant="outline" size="md" label={t('canvas.setupFailure.ask')} endContent={<SendArrowIcon />} onClick={onAsk} data-testid="setup-failure-ask" />
      </VStack>
    </div>
  );
}

export function SetupFailureCardSlot({ card }: { card: Card | null }) {
  const workspacePath = useWorkspaceStore((state) => state.workspace?.workspacePath);
  const { isShown } = useSetupFailureCard();
  const shown = card !== null && isShown;
  const presence = usePresence(shown, FADE_MS);
  const [held, setHeld] = useState(card);
  if (card !== null && (held === null || held.step !== card.step || held.cause !== card.cause)) setHeld(card);
  if (!presence.present || held === null) return null;
  const onAsk = (): void => {
    if (workspacePath !== undefined) void askFromSetupFailureCard(workspacePath, selectProjectSetupSnapshot(useProjectSetupStore.getState())?.failure ?? null);
  };
  return (
    <div className="frame-scale-in" style={{ pointerEvents: presence.visible ? 'auto' : 'none', opacity: presence.visible ? 1 : 0, transition: `opacity ${String(FADE_MS)}ms ease-out` }}>
      <SetupFailureCardView card={held} onAsk={onAsk} />
    </div>
  );
}
