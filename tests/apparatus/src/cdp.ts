import type { DebugState, StudioDebugBridge } from '@studio/events';

export const CHROME_TARGET = 'chrome.html';

export const VIEW_TYPES = ['page', 'webview'] as const;

export interface CdpTarget {
  id: string;
  type: string;
  title: string;
  url: string;
  webSocketDebuggerUrl?: string;
}

export async function listTargets(port: string | number): Promise<CdpTarget[]> {
  let response: Response;
  try {
    response = await fetch(`http://127.0.0.1:${String(port)}/json/list`, {
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new Error(
      `No app is listening on 127.0.0.1:${String(port)}. Launch one with AGENT_CDP_PORT=${String(port)} first; a packaged build opens no port whatever the env says (ONL-2377).`,
    );
  }
  return (await response.json()) as CdpTarget[];
}

/** By URL: both views are titled "Onlook", and target order is not stable. */
export function pickTarget(
  targets: readonly CdpTarget[],
  urlPart: string,
  types: readonly string[] = VIEW_TYPES,
): CdpTarget {
  const match = targets.find((target) => types.includes(target.type) && target.url.includes(urlPart));
  if (!match) {
    const seen = targets.map((target) => `${target.type} ${target.url}`).join('\n  ');
    throw new Error(
      `No ${types.join('/')} target whose URL contains "${urlPart}". A dev-instrument run has no chrome band. Targets seen:\n  ${seen || '(none)'}`,
    );
  }
  return match;
}

export async function chromeTarget(port: string | number): Promise<CdpTarget> {
  return pickTarget(await listTargets(port), CHROME_TARGET, ['page']);
}

/** ⚠️ The whole `tab` value, not a prefix: `?tab=tab-1` is a substring of `?tab=tab-10`, and the spare mints an id per open (ONL-2318). */
export async function tabTarget(port: string | number, tabId: string): Promise<CdpTarget> {
  const targets = await listTargets(port);
  // A target whose URL will not parse is not ours; refusing the whole list over one would be a worse answer.
  const tabOf = (url: string): string | null => {
    try {
      return new URL(url).searchParams.get('tab');
    } catch {
      return null;
    }
  };
  const match = targets.find((target) => target.type === 'page' && tabOf(target.url) === tabId);
  if (match) return match;
  const seen = targets.map((target) => `${target.type} ${target.url}`).join('\n  ');
  throw new Error(`No page target whose tab is exactly "${tabId}". Targets seen:\n  ${seen || '(none)'}`);
}

export async function guestTarget(port: string | number, urlPart: string): Promise<CdpTarget> {
  return pickTarget(await listTargets(port), urlPart, ['webview']);
}

export type CdpSend = (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;

const ANSWER_LIMIT_MS = 15_000;

export async function withSession<T>(target: CdpTarget, use: (send: CdpSend) => Promise<T>): Promise<T> {
  const endpoint = target.webSocketDebuggerUrl;
  if (endpoint === undefined) throw new Error(`Target ${target.id} exposes no debugger endpoint.`);

  const socket = new WebSocket(endpoint);
  const waiting = new Map<number, { resolve: (frame: Record<string, unknown>) => void; reject: (error: Error) => void }>();
  let nextId = 0;
  try {
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener('open', () => {
        resolve();
      });
      socket.addEventListener('error', () => {
        reject(new Error(`Could not open a debugger session on ${endpoint}.`));
      });
    });
    socket.addEventListener('message', (event: MessageEvent) => {
      const frame = JSON.parse(String(event.data)) as Record<string, unknown>;
      waiting.get(frame['id'] as number)?.resolve(frame);
    });
    socket.addEventListener('close', () => {
      for (const { reject } of waiting.values()) reject(new Error('The debugger session closed before the answer arrived.'));
    });

    const send: CdpSend = async (method, params = {}) => {
      const id = ++nextId;
      const frame = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`${method} did not answer within ${String(ANSWER_LIMIT_MS / 1000)}s.`));
        }, ANSWER_LIMIT_MS);
        waiting.set(id, {
          resolve: (answer) => {
            clearTimeout(timer);
            resolve(answer);
          },
          reject: (error) => {
            clearTimeout(timer);
            reject(error);
          },
        });
        socket.send(JSON.stringify({ id, method, params }));
      }).finally(() => waiting.delete(id));
      const refused = frame['error'] as { message?: string } | undefined;
      if (refused) throw new Error(`${method} was refused: ${refused.message ?? JSON.stringify(refused)}`);
      return (frame['result'] ?? {}) as Record<string, unknown>;
    };
    return await use(send);
  } finally {
    socket.close();
  }
}

export async function evaluate<T>(target: CdpTarget, expression: string): Promise<T> {
  const result = (await withSession(target, (send) =>
    send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }),
  )) as { result?: { value?: T }; exceptionDetails?: { text?: string; exception?: { description?: string } } };
  const thrown = result.exceptionDetails;
  if (thrown) {
    throw new Error(thrown.exception?.description ?? thrown.text ?? 'The page threw.');
  }
  if (result.result === undefined || result.result.value === undefined) {
    throw new Error(`\`${expression}\` answered undefined.`);
  }
  return result.result.value;
}

/** `undefined` arrives as `null`. */
export async function readJson<T>(target: CdpTarget, expression: string): Promise<T> {
  const answer = await evaluate<string>(
    target,
    `Promise.resolve(${expression}).then((value) => JSON.stringify(value ?? null))`,
  );
  return JSON.parse(answer) as T;
}

export async function readTab<T>(port: string | number, tabId: string, expression: string): Promise<T> {
  return readJson<T>(await tabTarget(port, tabId), expression);
}

type GateAnswer<K extends keyof StudioDebugBridge> = Awaited<ReturnType<StudioDebugBridge[K]>>;

export async function gateCall<K extends keyof StudioDebugBridge>(
  port: string | number,
  tabId: string,
  method: K,
  ...args: Parameters<StudioDebugBridge[K]>
): Promise<GateAnswer<K>> {
  const list = args.map((arg: unknown) => (arg === undefined ? 'undefined' : JSON.stringify(arg))).join(', ');
  return readTab<GateAnswer<K>>(port, tabId, `window.__ONLOOK_DEBUG__.${method}(${list})`);
}

const NO_BRIDGE =
  'The running app exposes no `debugState`. A packaged build never registers it (ONL-2377), and a dev build registers it only when launched with AGENT_CDP_PORT.';

export async function debugState(port: string | number): Promise<DebugState> {
  const state = await readJson<DebugState | null>(
    await chromeTarget(port),
    'window.studioChrome?.debugState ? window.studioChrome.debugState() : null',
  );
  if (state === null) throw new Error(NO_BRIDGE);
  return state;
}

const GATE_LIMIT_MS = 30_000;
const POLL_MS = 250;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function gateTabId(state: DebugState): string | null {
  const active = state.tabs.find((tab) => tab.id === state.activeTabId);
  return (active ?? state.tabs[0])?.id ?? null;
}

export function gateComplaint(reached: { state: DebugState | null; bridgeInstalled: boolean }): string | null {
  if (reached.state === null) return 'the app has not answered `debugState` yet';
  if (gateTabId(reached.state) === null) return 'the app has no tab yet';
  if (!reached.bridgeInstalled) return 'the tab has no `window.__ONLOOK_DEBUG__` yet';
  return null;
}

/** A tab answers before its `__ONLOOK_DEBUG__` is installed; a wait on the tab alone read a bridge that was not there (ONL-2372, ONL-2425). */
export async function waitForGate(port: string | number, limitMs = GATE_LIMIT_MS): Promise<DebugState> {
  const deadline = Date.now() + limitMs;
  let last = 'nothing was tried';
  for (;;) {
    let state: DebugState | null = null;
    let bridgeInstalled = false;
    try {
      state = await debugState(port);
      const tabId = gateTabId(state);
      if (tabId !== null) {
        bridgeInstalled =
          (await readJson<string>(await tabTarget(port, tabId), 'typeof window.__ONLOOK_DEBUG__')) === 'object';
      }
    } catch (error) {
      last = String(error);
    }
    const complaint = gateComplaint({ state, bridgeInstalled });
    if (complaint === null) return state as DebugState;
    if (state !== null) last = complaint;
    if (Date.now() >= deadline) {
      throw new Error(
        `No app answered on 127.0.0.1:${String(port)} within ${String(limitMs / 1000)}s: ${last}`,
      );
    }
    await sleep(POLL_MS);
  }
}
