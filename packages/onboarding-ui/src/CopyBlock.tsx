import { useState, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';

export interface CopyBlockAction {
  id: string;
  label: string;
  /** Takes the line with it, and does not go when the line could not be copied. */
  copiesFirst?: boolean;
  onPress: () => void;
}

export interface CopyBlockProps {
  text: string;
  copyLabel: string;
  copiedLabel: string;
  copyGlyph: ReactNode;
  copiedGlyph: ReactNode;
  /** True only when the line reached the clipboard; anything else leaves the control as it was. */
  onCopy: () => void | boolean | Promise<boolean>;
  actions?: readonly CopyBlockAction[];
  testId?: string;
}

const BOX = {
  border: 'var(--border-width) solid var(--color-border)',
  borderRadius: 'var(--radius-page)',
  padding: 'var(--spacing-4)',
} as const;

const CODE = {
  // Takes the room so the control keeps the box's right edge, whether the line wraps or barely fills it.
  flex: 1,
  minWidth: 0,
  fontFamily: 'var(--font-family-code)',
  fontSize: 13,
  lineHeight: 1.6,
  overflowWrap: 'anywhere',
  userSelect: 'text',
} as const;

/** Copy this, do it elsewhere, then Check again (ONL-3111). */
export function CopyBlock({ text, copyLabel, copiedLabel, copyGlyph, copiedGlyph, onCopy, actions, testId }: CopyBlockProps): React.JSX.Element {
  // Held against the line itself, so another line never inherits this one's answer.
  const [copiedText, setCopiedText] = useState<string | undefined>(undefined);
  const copied = copiedText === text;
  const copy = async (): Promise<boolean> => {
    const done = await Promise.resolve(onCopy());
    setCopiedText(done === true ? text : undefined);
    return done === true;
  };
  return (
    <VStack width="100%" gap={3} align="start" data-testid={testId ?? 'copy-block'}>
      <HStack width="100%" gap={3} align="start" style={BOX}>
        <Text style={CODE}>{text}</Text>
        {copied ? (
          <HStack gap={1} align="center" style={{ flexShrink: 0 }} data-testid="copy-block-copied">
            {copiedGlyph}
            <Text color="secondary">{copiedLabel}</Text>
          </HStack>
        ) : (
          <Button label={copyLabel} icon={copyGlyph} isIconOnly variant="ghost" size="sm" onClick={() => { void copy(); }} data-testid="copy-block-copy" />
        )}
      </HStack>
      {actions === undefined || actions.length === 0 ? null : (
        <HStack gap={2} align="center">
          {actions.map((action) => (
            <Button
              key={action.id}
              label={action.label}
              variant="secondary"
              size="sm"
              onClick={() => {
                if (action.copiesFirst !== true) { action.onPress(); return; }
                void copy().then((done) => { if (done) action.onPress(); });
              }}
              data-testid={`copy-block-action-${action.id}`}
            />
          ))}
        </HStack>
      )}
    </VStack>
  );
}
