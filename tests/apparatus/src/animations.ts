import type { CdpSend, CdpTarget } from './cdp.js';

/** The part of a WebSocket a session uses; tests hand in a fake. */
export interface CdpSocket {
  send: (data: string) => void;
  close: () => void;
  addEventListener: (type: 'open' | 'error' | 'message' | 'close', listener: (event: { data?: unknown }) => void) => void;
}

export type ConnectCdp = (endpoint: string) => CdpSocket;

const ANSWER_LIMIT_MS = 15_000;

export interface CdpEventSession {
  send: CdpSend;
  on: (method: string, listener: (params: Record<string, unknown>) => void) => void;
  close: () => void;
}

/** A debugger session that stays open and hears events, unlike `withSession`'s one exchange. */
export async function openEventSession(target: CdpTarget, connect: ConnectCdp = (url) => new WebSocket(url) as unknown as CdpSocket): Promise<CdpEventSession> {
  const endpoint = target.webSocketDebuggerUrl;
  if (endpoint === undefined) throw new Error(`Target ${target.id} exposes no debugger endpoint.`);
  const socket = connect(endpoint);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve());
    socket.addEventListener('error', () => reject(new Error(`Could not open a debugger session on ${endpoint}.`)));
  });
  let nextId = 0;
  const waiting = new Map<number, (frame: Record<string, unknown>) => void>();
  const listeners = new Map<string, ((params: Record<string, unknown>) => void)[]>();
  socket.addEventListener('message', (event) => {
    const frame = JSON.parse(String(event.data)) as Record<string, unknown>;
    if (typeof frame['id'] === 'number') waiting.get(frame['id'])?.(frame);
    else for (const listener of listeners.get(String(frame['method'])) ?? []) listener((frame['params'] ?? {}) as Record<string, unknown>);
  });
  const send: CdpSend = async (method, params = {}) => {
    const id = ++nextId;
    const frame = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${method} did not answer within ${String(ANSWER_LIMIT_MS / 1000)}s.`)), ANSWER_LIMIT_MS);
      waiting.set(id, (answer) => {
        clearTimeout(timer);
        resolve(answer);
      });
      socket.send(JSON.stringify({ id, method, params }));
    }).finally(() => waiting.delete(id));
    const refused = frame['error'] as { message?: string } | undefined;
    if (refused) throw new Error(`${method} was refused: ${refused.message ?? JSON.stringify(refused)}`);
    return (frame['result'] ?? {}) as Record<string, unknown>;
  };
  return {
    send,
    on: (method, listener) => listeners.set(method, [...(listeners.get(method) ?? []), listener]),
    close: () => socket.close(),
  };
}

export interface FrozenAnimations {
  /** Every animation the page started since the freeze, by its WAAPI `id`. */
  names: () => string[];
  /** Resolves once an animation with this name has started; frozen, it sits at its first keyframe. */
  waitFor: (name: string, limitMs?: number) => Promise<void>;
  /** Pins every started animation whose name passes `match` at `ms` from its start; answers how many it moved. */
  seek: (ms: number, match?: (name: string) => boolean) => Promise<number>;
  /** The page's own session, for a capture at the seek. */
  send: CdpSend;
  /** Plays the timeline at full rate again and closes the session. */
  release: () => Promise<void>;
}

/**
 * Stops the page's animation timeline, so what a tap starts holds at its first frame until `seek` places it.
 * A hidden window throttles rAF, so a seek is the only way to read a film's frame at a known time.
 */
export async function freezeAnimations(target: CdpTarget, connect?: ConnectCdp): Promise<FrozenAnimations> {
  const session = await openEventSession(target, connect);
  const started = new Map<string, string>();
  const heard: (() => void)[] = [];
  session.on('Animation.animationStarted', (params) => {
    const animation = params['animation'] as { id: string; name?: string } | undefined;
    if (animation === undefined) return;
    started.set(animation.id, animation.name ?? '');
    for (const listener of heard) listener();
  });
  await session.send('Animation.enable');
  await session.send('Animation.setPlaybackRate', { playbackRate: 0 });
  const names = () => [...started.values()];
  return {
    names,
    send: session.send,
    waitFor: (name, limitMs = 8_000) =>
      new Promise<void>((resolve, reject) => {
        if (names().includes(name)) return resolve();
        const timer = setTimeout(() => reject(new Error(`No animation named ${name} started within ${String(limitMs)}ms; started: ${names().join(', ') || 'none'}.`)), limitMs);
        heard.push(() => {
          if (!names().includes(name)) return;
          clearTimeout(timer);
          resolve();
        });
      }),
    seek: async (ms, match = () => true) => {
      const ids = [...started].filter(([, name]) => match(name)).map(([id]) => id);
      if (ids.length > 0) await session.send('Animation.seekAnimations', { animations: ids, currentTime: ms });
      return ids.length;
    },
    release: async () => {
      try {
        await session.send('Animation.setPlaybackRate', { playbackRate: 1 });
      } finally {
        session.close();
      }
    },
  };
}
