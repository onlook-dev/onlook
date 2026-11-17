import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/Layout';
import { t } from '@studio/i18n';
import { CloseSmallIcon, GlyphTips } from '../icons/glyphs.js';
import { log } from '../log.js';
import { useSettingsStore } from '../settings/store.js';
import { openTips } from '../tips/store.js';

/* The dismiss is its own button over the pill's glyph slot, never nested in the pill's button (ONL-2744). */
const DISMISS = {
  all: 'unset',
  position: 'absolute',
  insetBlock: 0,
  insetInlineStart: 0,
  width: 28,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  borderRadius: 'var(--radius-full)',
} as const;

/** One-time pointer to the Tips guide above an empty composer; the bulb turns into its dismiss on hover, as a chat pill's glyph does. */
export function TipsPill(): React.JSX.Element {
  const dismiss = useSettingsStore((state) => state.dismissTipsPill);
  const [isGlyphHovered, setIsGlyphHovered] = useState(false);
  const hide = (): void => {
    void dismiss('close').catch((cause: unknown) => {
      log('chat').warn('the tips pill dismissal could not be saved', { error: cause });
    });
  };
  return (
    <HStack vAlign="center" data-testid="chat-tips-pill" style={{ position: 'relative' }}>
      <Button
        variant="secondary"
        size="sm"
        label={t('chat.tipsPill.label')}
        icon={isGlyphHovered ? <CloseSmallIcon width={16} height={16} /> : <GlyphTips mode="raw" size={16} />}
        onClick={() => openTips('pill')}
        // Both glyphs sit narrow inside one 16px slot, so the start runs tighter than the end and the gaps read even either way.
        style={{ borderRadius: 'var(--radius-full)', gap: 4, paddingInlineStart: 8, paddingInlineEnd: 12 }}
      />
      <button
        type="button"
        aria-label={t('chat.tipsPill.dismiss')}
        title={t('chat.tipsPill.dismiss')}
        style={DISMISS}
        onPointerEnter={() => setIsGlyphHovered(true)}
        onPointerLeave={() => setIsGlyphHovered(false)}
        onFocus={() => setIsGlyphHovered(true)}
        onBlur={() => setIsGlyphHovered(false)}
        onClick={hide}
        data-testid="chat-tips-pill-dismiss"
      />
    </HStack>
  );
}
