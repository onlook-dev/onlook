import type { ReactNode } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import type { AgentConnection } from '@studio/events';
import type { ChatStrings } from './strings.js';

export type ConnectionRemedy = 'setUpCodex' | 'signInCodex';

export interface NoConnectionProps {
  connection: AgentConnection;
  strings: ChatStrings;
  onRemedy?: (remedy: ConnectionRemedy) => void;
  remedyBusy?: ConnectionRemedy;
  /* Banner's own dismissal is internal state that never resets, so the close
     control is drawn only with this handler. */
  onDismiss?: () => void;
}

export function NoConnection({
  connection,
  strings,
  onRemedy,
  remedyBusy,
  onDismiss,
}: NoConnectionProps): ReactNode {
  // `unknown` is pre-probe, not broken.
  if (remedyBusy === undefined && (connection.status === 'ok' || connection.status === 'unknown')) return null;

  const { title, body, remedy, remedyLabel } = copyFor(
    remedyBusy === undefined ? connection : { status: remedyBusy === 'signInCodex' ? 'unauthenticated' : 'cli_missing', harness: 'codex' },
    strings,
  );
  const canRemedy = remedy !== undefined && remedyLabel !== undefined && onRemedy !== undefined;

  return (
    <Banner
      // `error` selects `role="alert"`; the theme paints every banner alike.
      status="error"
      title={title}
      /* The button lives in the description, not `endContent`: core's `endArea`
         never shrinks and starves the text column to a word per line. */
      description={
        <VStack gap={2} align="start">
          {body ? <Text type="supporting">{body}</Text> : null}
          {canRemedy ? (
            <Button
              label={remedyLabel}
              variant="secondary"
              size="sm"
              isLoading={remedyBusy !== undefined}
              onClick={() => {
                onRemedy(remedy);
              }}
              data-testid="chat-connection-remedy"
            />
          ) : null}
        </VStack>
      }
      container="card"
      elevation="high"
      {...(onDismiss && remedyBusy === undefined ? { isDismissable: true, onDismiss } : {})}
      data-testid="chat-no-connection"
    />
  );
}

interface ConnectionCopy {
  title: string;
  body: string;
  remedy?: ConnectionRemedy;
  remedyLabel?: string;
}

function copyFor(connection: AgentConnection, strings: ChatStrings): ConnectionCopy {
  if (connection.harness === 'codex') {
    switch (connection.status) {
      case 'cli_missing':
        return {
          title: strings.connectionCodexMissingTitle,
          body: strings.connectionCodexMissingBody,
          remedy: 'setUpCodex',
          remedyLabel: strings.connectionCodexMissingAction,
        };
      case 'unauthenticated':
        return {
          title: strings.connectionCodexUnauthedTitle,
          body: strings.connectionCodexUnauthedBody,
          remedy: 'signInCodex',
          remedyLabel: strings.connectionCodexUnauthedAction,
        };
      default:
        return { title: strings.connectionCodexErrorTitle, body: '' };
    }
  }

  // Claude signed out never reaches here; the card takes it (ONL-2187).
  switch (connection.status) {
    case 'cli_missing':
      return { title: strings.connectionMissingTitle, body: strings.connectionMissingBody };
    default:
      return { title: strings.connectionErrorTitle, body: '' };
  }
}
