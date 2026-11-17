import { expect, test } from 'bun:test';
import '../testing/dom.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_NOTIFICATIONS } from '@studio/events';
import { t } from '@studio/i18n';
import { noticeBody, NotificationInvitation } from './NotificationSurfaces.js';

test('a saved dismissal does not add a reminder to another chat or a relaunch', () => {
  expect(renderToStaticMarkup(<NotificationInvitation preference={{ ...DEFAULT_NOTIFICATIONS, invitation: 'dismissed' }} onAction={() => undefined} />)).toBe('');
});

test('a pending invitation still offers dismissal and notification setup', () => {
  const markup = renderToStaticMarkup(<NotificationInvitation preference={{ ...DEFAULT_NOTIFICATIONS, invitation: 'pending' }} onAction={() => undefined} />);
  expect(markup).toContain('data-testid="notification-dismiss"');
  expect(markup).toContain('data-testid="notification-enable"');
});

test('a Project imported from GitHub is named by its repository, with the repository picture', () => {
  const markup = renderToStaticMarkup(<>{noticeBody({ kind: 'finished', name: 'slate-swift', repository: 'onlook-dev/test' })}</>);
  expect(markup).toContain(t('notifications.event.finished', { name: 'onlook-dev/test' }));
  expect(markup).not.toContain('slate-swift');
  expect(markup).toContain('https://avatars.githubusercontent.com/onlook-dev?s=40');
});

test('a Project with no repository keeps its own name and shows no picture', () => {
  const markup = renderToStaticMarkup(<>{noticeBody({ kind: 'finished', name: 'slate-swift' })}</>);
  expect(markup).toBe(t('notifications.event.finished', { name: 'slate-swift' }));
});

test('the kill switch keeps a pending invitation out of the chat (ONL-2995)', () => {
  expect(renderToStaticMarkup(<NotificationInvitation preference={{ ...DEFAULT_NOTIFICATIONS, invitation: 'pending' }} onAction={() => undefined} isHidden />)).toBe('');
});
