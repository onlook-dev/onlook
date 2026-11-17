import { EventEmitter } from 'node:events';
import type { NotifierFactory } from './presenter.js';

export interface RecordedNotification {
  id: string;
  title: string;
  body: string;
  silent: boolean;
}

export function recordingNotifier(): { factory: NotifierFactory; snapshot(): RecordedNotification[]; click(id: string): void; fail(id: string): void } {
  const shown: RecordedNotification[] = [];
  const presenters = new Map<string, EventEmitter>();
  class RecordingPresenter extends EventEmitter {
    constructor(private readonly options: Electron.NotificationConstructorOptions) { super(); }
    show(): void {
      const record = { id: this.options.id ?? '', title: this.options.title ?? '', body: this.options.body ?? '', silent: this.options.silent === true };
      shown.push(record);
      presenters.set(record.id, this);
      this.emit('show');
    }
    close(): void { this.emit('close'); }
  }
  return {
    factory: (options) => new RecordingPresenter(options),
    snapshot: () => shown.map((record) => ({ ...record })),
    click: (id) => { presenters.get(id)?.emit('click'); },
    fail: (id) => { presenters.get(id)?.emit('failed'); },
  };
}
