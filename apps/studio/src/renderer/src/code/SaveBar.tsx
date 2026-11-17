import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { Kbd } from '@astryxdesign/core/Kbd';
import { HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import type { CodeWriteRefusalCode } from '@studio/events';

import { t } from '@studio/i18n';
import { CheckIcon } from '../icons/glyphs.js';
import { HAIRLINE } from '../panels/rowGeometry.js';
import { codeWriteRefusalKey } from './refusalCopy.js';
import './code.css';

/** The mock's own numbers. The hold is information rather than movement, so reduced motion keeps it. */
export const SAVED_HOLD_MS = 900;
export const SAVE_BAR_EXIT_MS = 200;

export type SaveBarPhase = 'dirty' | 'saved' | 'leaving';

export interface SaveBarProps {
  phase: SaveBarPhase;
  /** Set when the last save was refused; the bar names the cause and stays up, because the edit is still unsaved. */
  refusal: CodeWriteRefusalCode | null;
  onSave: () => void;
  onDiscard: () => void;
}

/** Its own row so it never covers code, and a STATUS region: nothing has failed while a file is merely unsaved (ONL-2563). */
export function SaveBar({ phase, refusal, onSave, onDiscard }: SaveBarProps): React.JSX.Element {
  return (
    <HStack
      role="status"
      align="center"
      justify="between"
      gap={2}
      data-testid="code-save-bar"
      data-phase={phase}
      className={phase === 'leaving' ? 'code-save-bar is-leaving' : 'code-save-bar'}
      style={{
        flexShrink: 0,
        minHeight: 45,
        paddingInline: 'var(--spacing-3)',
        paddingBlock: 'var(--spacing-2)',
        borderTop: HAIRLINE,
        background: 'var(--color-background-gray)',
      }}
    >
      {phase === 'dirty' ? (
        <>
          <Text
            size="sm"
            color="primary"
            maxLines={1}
            {...(refusal === null ? {} : { style: { color: 'var(--color-error)' } })}
          >
            {refusal === null ? t('code.save.unsaved') : t(codeWriteRefusalKey(refusal))}
          </Text>
          <HStack align="center" gap={1} style={{ flexShrink: 0 }}>
            <Button
              label={t('code.save.discard')}
              variant="ghost"
              size="sm"
              onClick={onDiscard}
              data-testid="code-discard"
            />
            <Button
              label={t('code.save.save')}
              variant="primary"
              size="sm"
              onClick={onSave}
              data-testid="code-save"
              endContent={<Kbd keys="mod+s" style={{
                '--color-text-secondary': 'var(--color-on-accent)',
                '--color-neutral': 'var(--color-overlay-pressed)',
                '--color-border-emphasized': 'var(--color-on-accent)',
              } as React.CSSProperties} />}
            />
          </HStack>
        </>
      ) : (
        <HStack align="center" gap={1} className="code-save-bar-done" data-testid="code-saved">
          <Icon icon={CheckIcon} size="sm" color="inherit" style={{ color: 'var(--color-text-accent)' }} />
          <Text size="sm" color="primary">
            {t('code.save.saved')}
          </Text>
        </HStack>
      )}
    </HStack>
  );
}
