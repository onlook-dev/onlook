import type { ReactNode } from 'react';
import { HoverCard } from '@astryxdesign/core/HoverCard';
import { Text } from '@astryxdesign/core/Text';

export interface ImagePreviewProps {
  /** `undefined` while the bytes resolve: no card opens. `null`: the bytes are gone. */
  url: string | null | undefined;
  alt: string;
  unavailableLabel: string;
  /** `center` sits the card over the trigger's middle and slides it to stay on screen. */
  alignment?: 'start' | 'center';
  children: ReactNode;
}

const CARD: React.CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  borderRadius: 'var(--radius-container)',
  background: 'var(--color-background-card)',
};

export function ImagePreview({
  url,
  alt,
  unavailableLabel,
  alignment = 'start',
  children,
}: ImagePreviewProps): React.JSX.Element {
  return (
    <HoverCard
      isEnabled={url !== undefined}
      placement="above"
      alignment={alignment}
      focusTrigger="always"
      hasHoverIndication={false}
      content={
        <span
          data-testid="chat-attachment-preview"
          // Even inline margin when centred: the layer slides to the window edge, the card stops short of it.
          style={alignment === 'center' ? { ...CARD, marginInline: 'var(--spacing-2)' } : CARD}
        >
          {url ? (
            <img
              src={url}
              alt={alt}
              style={{ display: 'block', maxWidth: 240, maxHeight: 180, objectFit: 'contain' }}
            />
          ) : (
            <Text
              size="sm"
              color="secondary"
              style={{ display: 'block', padding: 'var(--spacing-3)' }}
            >
              {unavailableLabel}
            </Text>
          )}
        </span>
      }
    >
      {children}
    </HoverCard>
  );
}
