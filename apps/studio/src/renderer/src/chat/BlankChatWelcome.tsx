import { useEffect, useMemo } from 'react';
import { ChatWelcome } from '@studio/chat-ui';
import { sendTelemetry } from '../canvas/telemetry.js';
import { t } from '@studio/i18n';
import { ForwardIcon } from '../icons/glyphs.js';
import { telemetryProjectFields } from '../workspace/store.js';
import { BLANK_WELCOME_ROWS, blankWelcomeRow, type BlankWelcomeRow } from './blankWelcome.js';

const shownThisLaunch = new Set<string>();

export function BlankChatWelcome({ path, onPick }: { path: string; onPick: (row: BlankWelcomeRow, label: string) => boolean }): React.JSX.Element {
  useEffect(() => {
    if (shownThisLaunch.has(path)) return;
    shownThisLaunch.add(path);
    sendTelemetry({ event: 'first_run_shown', properties: { ...telemetryProjectFields(), surface: 'chat_welcome' } });
  }, [path]);
  const rows = useMemo(() => BLANK_WELCOME_ROWS.map((row) => ({ id: row.id, label: t(row.label) })), []);
  return (
    <ChatWelcome
      title={t('chat.welcome.blank.title')}
      rows={rows}
      rowIcon={ForwardIcon}
      onPick={(id) => {
        const row = blankWelcomeRow(id);
        if (row === undefined || !onPick(row, t(row.prompt))) return;
        sendTelemetry({ event: 'first_run_acted', properties: { ...telemetryProjectFields(), surface: 'chat_welcome', action: row.id } });
      }}
    />
  );
}
