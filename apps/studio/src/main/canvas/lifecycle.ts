import type { WebContents } from 'electron';

interface Attachment {
  owned: boolean;
  /** Transitions holding this attachment, each of which rechecks isolation itself. */
  holders: number;
  thawing?: Promise<void>;
  detached(): void;
}

interface Suspension {
  contents: WebContents;
  attachment: Attachment;
  isolated: () => boolean;
  thaw: () => Promise<void>;
}

const pausedPages = new WeakMap<WebContents, Attachment>();
const suspensions = new Set<Suspension>();

function forget(attachment: Attachment): void {
  for (const entry of suspensions) if (entry.attachment === attachment) suspensions.delete(entry);
}

/** A renderer this cannot judge is one it must not leave paused. */
function stillAlone(entry: Suspension): boolean {
  if (entry.contents.isDestroyed()) return false;
  try {
    return entry.isolated();
  } catch {
    return false;
  }
}

/** A shell frozen while alone in its renderer can be joined later, and a paused process stalls whatever joins it (ONL-2894). */
export function checkPageProcessSharing(): void {
  for (const entry of [...suspensions]) {
    if (entry.attachment.holders > 0 || stillAlone(entry)) continue;
    suspensions.delete(entry);
    void entry.thaw().catch(() => {});
  }
}

async function bounded<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => { reject(new Error('Tab lifecycle timed out')); }, 1500);
    })]);
  } finally {
    clearTimeout(timer);
  }
}

export async function transitionPageLifecycle(contents: WebContents, state: 'frozen' | 'active', isolated: () => boolean): Promise<void> {
  const protocol = contents.debugger;
  let retained = pausedPages.get(contents);
  while (retained?.thawing !== undefined) {
    await retained.thawing;
    retained = pausedPages.get(contents);
  }
  if (protocol.isAttached() && !retained) throw new Error('Tab debugger is already attached');
  if (!protocol.isAttached()) protocol.attach('1.3');
  const attachment: Attachment = retained ?? {
    owned: true,
    holders: 0,
    detached: () => {
      attachment.owned = false;
      if (pausedPages.get(contents) === attachment) pausedPages.delete(contents);
      forget(attachment);
    },
  };
  if (!retained) protocol.once('detach', attachment.detached);
  const owns = (): boolean => attachment.owned && !contents.isDestroyed() && protocol.isAttached();
  const send = async (method: string, params?: object): Promise<unknown> => {
    if (!owns()) throw new Error('Tab debugger ownership was lost');
    const result = await bounded(protocol.sendCommand(method, params));
    if (!owns()) throw new Error('Tab debugger ownership was lost');
    return result;
  };
  const release = (): void => {
    protocol.removeListener('detach', attachment.detached);
    if (pausedPages.get(contents) === attachment) pausedPages.delete(contents);
    forget(attachment);
    if (owns()) protocol.detach();
    attachment.owned = false;
  };
  const thaw = (): Promise<void> => {
    attachment.thawing ??= (async (): Promise<void> => {
      try {
        if (!owns()) return;
        await send('Page.setWebLifecycleState', { state: 'active' }).catch(() => {});
        await send('Debugger.disable').catch(() => {});
        await send('Animation.setPlaybackRate', { playbackRate: 1 }).catch(() => {});
      } finally {
        release();
      }
    })().catch(() => {});
    return attachment.thawing;
  };
  // Nothing above may yield after the read that found no thaw, or a sweep thaws under this call (ONL-2894).
  attachment.holders += 1;
  try {
    if (state === 'active') {
      await send('Page.setWebLifecycleState', { state });
      if (retained) {
        await send('Debugger.disable');
        await send('Animation.setPlaybackRate', { playbackRate: 1 });
      }
      release();
      return;
    }
    if (!isolated()) throw new Error('Tab renderer is shared or unavailable');
    if (retained) return;
    await send('Page.setWebLifecycleState', { state });
    await send('Debugger.enable');
    await send('Animation.setPlaybackRate', { playbackRate: 0 });
    if (!isolated()) throw new Error('Tab renderer is shared or unavailable');
    let confirm: () => void = () => {};
    let reject: (error: Error) => void = () => {};
    const paused = new Promise<void>((resolve, fail) => { confirm = resolve; reject = fail; });
    const message = (_event: Electron.Event, method: string): void => { if (method === 'Debugger.paused') confirm(); };
    const detached = (): void => { reject(new Error('Tab debugger detached')); };
    protocol.on('message', message);
    protocol.on('detach', detached);
    try {
      await bounded(Promise.all([
        send('Debugger.pause').then(() => {
          if (owns()) void protocol.sendCommand('Runtime.evaluate', { expression: 'void 0' }).catch(() => {});
        }),
        paused,
      ]));
    } finally {
      protocol.removeListener('message', message);
      protocol.removeListener('detach', detached);
    }
    if (!owns() || !isolated()) throw new Error('Tab renderer is shared or unavailable');
    pausedPages.set(contents, attachment);
    suspensions.add({ contents, attachment, isolated, thaw });
  } catch (error) {
    await thaw();
    throw error;
  } finally {
    attachment.holders -= 1;
    // Sharing that began while this call held the attachment: nothing else comes back for it.
    if (attachment.holders === 0) checkPageProcessSharing();
  }
}
