import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { withSession, type CdpSend, type CdpTarget } from './cdp.js';
import { pageInstrumentationSource, PAGE_INSTRUMENTATION_KEY } from './page-instrumentation-source.js';

export interface PageProbeOptions {
  currentDocument?: 'install' | 'skip';
  maxObservers?: number;
  maxCallbacks?: number;
  maxErrors?: number;
  maxEntriesPerCallback?: number;
  maxTextLength?: number;
}

export interface ObserverConstruction {
  observerId: number;
  time: number;
  stack: string;
}

export interface ResizeTargetSample {
  target: {
    targetId: number;
    tagName: string;
    id: string;
    className: string;
    testId: string;
    dataId: string;
    reactFlowNodeId: string;
    nodeId: string;
  };
  contentRect: { x: number; y: number; width: number; height: number };
  previousContentRect: ResizeTargetSample['contentRect'] | null;
  previousFrame: number | null;
  sizeChanged: boolean | null;
  contentBoxSize: { inlineSize: number; blockSize: number }[];
  borderBoxSize: { inlineSize: number; blockSize: number }[];
  devicePixelContentBoxSize: { inlineSize: number; blockSize: number }[];
}

export interface ResizeCallbackSample {
  observerId: number;
  constructionStack: string;
  frame: number;
  frameTimestamp: number | null;
  time: number;
  entryCount: number;
  omittedEntries: number;
  entries: ResizeTargetSample[];
}

export interface PageErrorSample {
  kind: 'error' | 'unhandledrejection';
  time: number;
  frame: number;
  message: string;
  stack: string;
  filename: string;
  line: number;
  column: number;
}

export interface PageProbeSnapshot {
  documentId: string;
  url: string;
  timeOrigin: number;
  installedAt: number;
  resizeObserverAvailable: boolean;
  frame: number;
  observers: ObserverConstruction[];
  callbacks: ResizeCallbackSample[];
  errors: PageErrorSample[];
  dropped: { observers: number; callbacks: number; errors: number; entries: number };
  captureFailures: number;
}

export interface PageProbe {
  read(): Promise<PageProbeSnapshot | null>;
  reload(options?: { timeoutMs?: number; ignoreCache?: boolean }): Promise<PageProbeSnapshot>;
  dispose(): Promise<void>;
}

const DEFAULT_LIMITS = {
  maxObservers: 256,
  maxCallbacks: 2_000,
  maxErrors: 256,
  maxEntriesPerCallback: 100,
  maxTextLength: 4_000,
};

async function runtimeValue<Value>(send: CdpSend, expression: string): Promise<Value> {
  const answer = await send('Runtime.evaluate', { expression, returnByValue: true });
  const exception = answer['exceptionDetails'] as { text?: string; exception?: { description?: string } } | undefined;
  if (exception) throw new Error(exception.exception?.description ?? exception.text ?? 'Page instrumentation threw.');
  const result = answer['result'] as { value?: Value } | undefined;
  if (!result || !('value' in result)) throw new Error('Page instrumentation returned no value.');
  return result.value as Value;
}

export async function installPageProbe(
  send: CdpSend,
  options: PageProbeOptions = {},
): Promise<PageProbe> {
  const limits = { ...DEFAULT_LIMITS };
  for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
    const value = options[key] ?? limits[key];
    if (!Number.isSafeInteger(value) || value < 1 || value > 100_000) {
      throw new Error(`${key} must be an integer between 1 and 100000.`);
    }
    limits[key] = value;
  }
  const owner = randomUUID();
  const state = `globalThis[${JSON.stringify(PAGE_INSTRUMENTATION_KEY)}]`;
  const owned = `${state}?.owner === ${JSON.stringify(owner)}`;
  const source = pageInstrumentationSource({ owner, ...limits });
  await send('Page.enable');
  const registration = await send('Page.addScriptToEvaluateOnNewDocument', { source });
  const identifier = registration['identifier'];
  if (typeof identifier !== 'string') throw new Error('Page instrumentation received no script identifier.');
  let registrationRemoved = false;
  let removed = false;
  const assertActive = (): void => {
    if (removed) throw new Error('Page instrumentation has been removed.');
  };
  const read = async (): Promise<PageProbeSnapshot | null> => {
    assertActive();
    return runtimeValue(send, `${owned} ? ${state}.read() : null`);
  };
  const dispose = async (): Promise<void> => {
    if (removed) return;
    if (!registrationRemoved) {
      await send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
      registrationRemoved = true;
    }
    await runtimeValue(send, `${owned} ? ${state}.remove() : null`);
    removed = true;
  };
  try {
    if (options.currentDocument !== 'skip') await runtimeValue(send, source);
  } catch (error) {
    try {
      await dispose();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Page instrumentation installation and cleanup failed.');
    }
    throw error;
  }
  return {
    read,
    dispose,
    async reload({ timeoutMs = 15_000, ignoreCache = false } = {}) {
      assertActive();
      if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('timeoutMs must be positive and finite.');
      const previousId = await runtimeValue<string | null>(send, `${owned} ? ${state}.documentId : null`);
      await send('Page.reload', { ignoreCache });
      const deadline = performance.now() + timeoutMs;
      do {
        try {
          const snapshot = await runtimeValue<PageProbeSnapshot | null>(send,
            `${owned} && ${state}.documentId !== ${JSON.stringify(previousId)} ? ${state}.read() : null`);
          if (snapshot) return snapshot;
        } catch (error) {
          if (!(error instanceof Error) || !/Execution context was destroyed|Cannot find context/.test(error.message)) {
            throw error;
          }
        }
        await delay(Math.min(25, Math.max(0, deadline - performance.now())));
      } while (performance.now() < deadline);
      throw new Error('Timed out waiting for page instrumentation in a new document.');
    },
  };
}

export async function withPageProbe<Result>(
  target: CdpTarget,
  use: (probe: PageProbe) => Promise<Result>,
  options: PageProbeOptions = {},
): Promise<Result> {
  return withSession(target, async (send) => {
    const probe = await installPageProbe(send, options);
    try {
      return await use(probe);
    } finally {
      await probe.dispose();
    }
  });
}
