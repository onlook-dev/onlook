import type { ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';

export interface ComposerNoticeButton {
  label: string;
  onClick: () => void;
  isDisabled?: boolean;
  testId: string;
}

/** Spacing steps between the composer's edge and a notice's text: the frame's padding, then the card's. */
export const NOTICE_INSET = { frame: 3, card: 3 } as const;

/** Laid over the composer when its input can't be used until the person acts; the scrim covers the composer and nothing else (ONL-2973). */
export function ComposerNoticeFrame({ children }: { children: ReactNode }): ReactNode {
  return (
    <>
      <div data-testid="chat-composer-scrim" style={{ position: 'absolute', inset: 0, background: 'var(--color-overlay)' }} />
      <div style={{ position: 'absolute', top: 0, insetInline: 0, padding: `var(--spacing-${NOTICE_INSET.frame})` }}>{children}</div>
    </>
  );
}

/** The notice's card: a title, one sentence, and its buttons, Not now left of the one primary. */
export function NoticeCard({
  label,
  title,
  body,
  children,
  testId,
  cause,
}: {
  label: string;
  title?: ReactNode;
  body?: string;
  children?: ReactNode;
  testId: string;
  cause: string;
}): ReactNode {
  return (
    <Card padding={NOTICE_INSET.card} variant="muted" width="100%" data-testid={testId} data-cause={cause} role="alertdialog" aria-label={label}>
      <VStack gap={3}>
        {title === undefined && body === undefined ? null : (
          <VStack gap={1}>
            {title === undefined ? null : typeof title === 'string' ? <Text type="supporting" color="primary">{title}</Text> : title}
            {body === undefined ? null : <Text type="supporting" color="secondary">{body}</Text>}
          </VStack>
        )}
        {children}
      </VStack>
    </Card>
  );
}

export function NoticeButtons({ dismiss, primary }: { dismiss?: ComposerNoticeButton; primary?: ReactNode }): ReactNode {
  if (dismiss === undefined && primary === undefined) return null;
  return (
    <HStack gap={2} justify="end">
      {dismiss === undefined ? null : <Button label={dismiss.label} variant="ghost" size="sm" isDisabled={dismiss.isDisabled ?? false} onClick={dismiss.onClick} data-testid={dismiss.testId} />}
      {primary}
    </HStack>
  );
}

export function ComposerNotice({
  title,
  body,
  dismiss,
  primary,
  testId,
  cause,
}: {
  title: string;
  body?: string;
  dismiss: ComposerNoticeButton;
  primary?: ComposerNoticeButton;
  testId: string;
  cause: string;
}): ReactNode {
  return (
    <ComposerNoticeFrame>
      <NoticeCard label={title} title={title} {...(body === undefined ? {} : { body })} testId={testId} cause={cause}>
        <NoticeButtons
          dismiss={dismiss}
          primary={primary === undefined ? undefined : (
            <Button label={primary.label} variant="primary" size="sm" isDisabled={primary.isDisabled ?? false} onClick={primary.onClick} data-testid={primary.testId} />
          )}
        />
      </NoticeCard>
    </ComposerNoticeFrame>
  );
}
