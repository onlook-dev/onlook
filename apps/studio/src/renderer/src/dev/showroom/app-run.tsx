import { ChatPanelFrame } from '../../chat/ChatPanelFrame.js';
import { RunNoticeCard } from '../../server/RunNotice.js';
import type { RunNotice } from '../../server/runFeedback.js';
import { t } from '@studio/i18n';
import { FrameCover } from '../../canvas/frame/FrameCover.js';
import { Focused, noop, type Gallery } from './Showroom.js';

const notices: RunNotice[] = ['start-waiting', 'start-failed', 'stop-waiting', 'stop-failed'];

function Still({ notice, focus, hover, repair, disabled, error }: { notice: RunNotice; focus?: boolean; hover?: boolean; repair?: boolean; disabled?: boolean; error?: boolean }): React.JSX.Element {
  return <Focused selector={focus || hover ? `[data-testid="app-run-notice-${repair ? 'repair' : 'dismiss'}"]` : undefined} hover={hover}>
    <div style={{ width: 360, height: 360 }}><ChatPanelFrame harness="codex"><div style={{ flex: 1 }} /><div style={{ padding: 'var(--spacing-3)' }}><RunNoticeCard notice={notice} onDismiss={noop} {...(repair ? { repair: { reason: t('projectSetup.failure.occupiedPort', { port: 4710 }), onAsk: noop, isDisabled: disabled, ...(error ? { error: t('appRun.repair-unavailable') } : {}) } } : {})} /></div></ChatPanelFrame></div>
  </Focused>;
}

export const APP_RUN_GALLERY: Gallery = {
  id: 'app-run', title: 'App controls',
  categories: [{ id: 'notices', title: 'Project Chat feedback', stories: [
    ...notices.map((notice) => ({ id: notice, title: notice, render: () => <Still notice={notice} /> })),
    { id: 'hover', title: 'Dismiss hovered', render: () => <Still notice="start-waiting" hover /> },
    { id: 'focus', title: 'Dismiss focused', render: () => <Still notice="start-waiting" focus /> },
    { id: 'repair', title: 'Start recovery', render: () => <Still notice="start-failed" repair /> },
    { id: 'repair-hover', title: 'Recovery hovered', render: () => <Still notice="start-failed" repair hover /> },
    { id: 'repair-focus', title: 'Recovery focused', render: () => <Still notice="start-failed" repair focus /> },
    { id: 'repair-disabled', title: 'Recovery disabled', render: () => <Still notice="start-failed" repair disabled /> },
    { id: 'repair-error', title: 'Recovery unavailable', render: () => <Still notice="start-failed" repair error /> },
    ...(['nothing', 'page-failed'] as const).map((cover) => ({
      id: `recovery-cover-${cover}`, title: `Page recovery — ${cover}`, wide: true,
      render: () => <div style={{ position: 'relative', width: 640, height: 400, overflow: 'hidden', background: 'var(--studio-ground)' }}><FrameCover cover={cover} actions={['try-again', 'ask-agent']} width={640} height={400} url="http://localhost:4710/menu" homeUrl="http://localhost:4710/" failure={{ url: 'http://localhost:4710/menu', code: -6, description: 'ERR_FILE_NOT_FOUND' }} onAction={noop} /></div>,
    })),
  ] }],
};
