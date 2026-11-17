import { Notification } from 'electron';

export interface NotificationPresenter {
  once(event: 'click' | 'show' | 'failed' | 'close', listener: () => void): this;
  show(): void;
  close(): void;
}

export type NotifierFactory = (options: Electron.NotificationConstructorOptions) => NotificationPresenter;
const electronNotifier: NotifierFactory = (options) => new Notification(options);
let factory = electronNotifier;

export function setNotifierFactory(next: NotifierFactory = electronNotifier): void {
  factory = next;
}

export function notificationPresenter(options: Electron.NotificationConstructorOptions): NotificationPresenter {
  return factory(options);
}
