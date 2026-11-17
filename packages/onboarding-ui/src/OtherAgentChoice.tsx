import { Button } from '@astryxdesign/core/Button';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { GlyphSlot } from '@studio/chat-ui';
import type { CardGlyphs } from './SignInCard.js';
import type { OtherAgentOffer } from './state.js';
import type { OnboardingUiStrings } from './strings.js';

export interface OtherAgentChoiceProps {
  offer: OtherAgentOffer;
  strings: OnboardingUiStrings;
  glyphs: CardGlyphs;
  onChoose: () => void;
  isDisabled?: boolean;
}

/** The other agent as an explained choice: what it takes, then one button (ONL-2903). */
export function OtherAgentChoice({ offer, strings, glyphs, onChoose, isDisabled = false }: OtherAgentChoiceProps): React.JSX.Element {
  const copy = strings.otherAgent;
  return (
    <HStack
      width="100%"
      gap={3}
      vAlign="center"
      padding={3}
      style={{ border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-container)' }}
      data-testid="setup-other-agent"
      data-provider={offer.harness}
      data-ready={offer.ready ? 'true' : 'false'}
    >
      <GlyphSlot size={18}>{glyphs[offer.harness]}</GlyphSlot>
      <VStack gap={0.5} style={{ flex: 1, minWidth: 0 }}>
        <Text type="body" weight="medium" color="primary">
          {copy.label[offer.harness]}
        </Text>
        <Text type="supporting" color="secondary">
          {offer.ready ? copy.ready[offer.harness] : copy.needs[offer.harness]}
        </Text>
      </VStack>
      <Button
        label={offer.ready ? copy.use : copy.setUp}
        variant="secondary"
        size="sm"
        isDisabled={isDisabled}
        onClick={onChoose}
        data-testid="setup-action-use-other-agent"
      />
    </HStack>
  );
}
