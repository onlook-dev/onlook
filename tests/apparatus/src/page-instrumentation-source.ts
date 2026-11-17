export const PAGE_INSTRUMENTATION_KEY = '__studioFixturePageInstrumentation';

interface SourceOptions {
  owner: string;
  maxObservers: number;
  maxCallbacks: number;
  maxErrors: number;
  maxEntriesPerCallback: number;
  maxTextLength: number;
}

export function pageInstrumentationSource(options: SourceOptions): string {
  return String.raw`(() => {
    if (globalThis !== globalThis.top) return false;
    const key = ${JSON.stringify(PAGE_INSTRUMENTATION_KEY)};
    const config = ${JSON.stringify(options)};
    if (globalThis[key]) {
      if (globalThis[key].owner === config.owner) return true;
      throw new Error('Page instrumentation is already installed in this document.');
    }
    const NativeObserver = globalThis.ResizeObserver;
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
    const dropped = { observers: 0, callbacks: 0, errors: 0, entries: 0 };
    const buffer = (limit, kind) => {
      const values = [];
      let next = 0;
      return {
        append(value) {
          if (values.length < limit) values.push(value);
          else {
            values[next] = value;
            next = (next + 1) % limit;
            dropped[kind]++;
          }
        },
        read: () => values.slice(next).concat(values.slice(0, next)),
        clear() { values.length = 0; next = 0; },
      };
    };
    const observers = buffer(config.maxObservers, 'observers');
    const callbacks = buffer(config.maxCallbacks, 'callbacks');
    const errors = buffer(config.maxErrors, 'errors');
    const targetIds = new WeakMap();
    const installedAt = performance.now();
    const documentId = String(performance.timeOrigin) + ':' + Math.random();
    let nextObserverId = 0;
    let nextTargetId = 0;
    let frame = 0;
    let frameTimestamp = null;
    let captureFailures = 0;
    let active = true;
    let animationRequest = null;
    const text = (value) => String(value ?? '').slice(0, config.maxTextLength);
    const capture = (work) => {
      try { work(); } catch { captureFailures++; }
    };
    const tick = (timestamp) => {
      if (!active) return;
      frame++;
      frameTimestamp = timestamp;
      animationRequest = requestAnimationFrame(tick);
    };
    const sizes = (value) => Array.prototype.slice.call(value ?? [], 0, config.maxEntriesPerCallback).map((size) => ({
      inlineSize: size.inlineSize, blockSize: size.blockSize,
    }));
    const sample = (entry, previousSizes) => {
      const target = entry.target;
      if (!targetIds.has(target)) targetIds.set(target, ++nextTargetId);
      const previous = previousSizes.get(target);
      const contentRect = {
        x: entry.contentRect.x, y: entry.contentRect.y,
        width: entry.contentRect.width, height: entry.contentRect.height,
      };
      previousSizes.set(target, { contentRect, frame });
      const dataId = text(target.getAttribute('data-id'));
      const reactFlowNodeId = text(target.closest('.react-flow__node[data-id]')?.getAttribute('data-id'));
      return {
        target: {
          targetId: targetIds.get(target), tagName: text(target.tagName), id: text(target.id),
          className: text(target.getAttribute('class')), testId: text(target.getAttribute('data-testid')),
          dataId, reactFlowNodeId, nodeId: dataId || reactFlowNodeId,
        },
        contentRect, previousContentRect: previous?.contentRect ?? null, previousFrame: previous?.frame ?? null,
        sizeChanged: previous ? previous.contentRect.width !== contentRect.width || previous.contentRect.height !== contentRect.height : null,
        contentBoxSize: sizes(entry.contentBoxSize), borderBoxSize: sizes(entry.borderBoxSize),
        devicePixelContentBoxSize: sizes(entry.devicePixelContentBoxSize),
      };
    };
    const WrappedObserver = typeof NativeObserver !== 'function' ? null : new Proxy(NativeObserver, {
      construct(target, args, newTarget) {
        if (!active || typeof args[0] !== 'function') return Reflect.construct(target, args, newTarget);
        const callback = args[0];
        const observerId = ++nextObserverId;
        const stack = text(new Error('ResizeObserver construction').stack);
        const previousSizes = new WeakMap();
        const wrapped = function(...callbackArgs) {
          if (active) capture(() => {
            const entries = callbackArgs[0];
            const omittedEntries = Math.max(0, entries.length - config.maxEntriesPerCallback);
            dropped.entries += omittedEntries;
            callbacks.append({
              observerId, constructionStack: stack, frame, frameTimestamp, time: performance.now(),
              entryCount: entries.length, omittedEntries,
              entries: entries.slice(0, config.maxEntriesPerCallback).map((entry) => sample(entry, previousSizes)),
            });
          });
          return Reflect.apply(callback, this, callbackArgs);
        };
        const observer = Reflect.construct(target, [wrapped, ...args.slice(1)], newTarget);
        capture(() => observers.append({ observerId, time: performance.now(), stack }));
        return observer;
      },
    });
    const onError = (event) => {
      if (!active) return;
      capture(() => errors.append({
        kind: 'error', time: performance.now(), frame, message: text(event.message ?? 'Resource error'),
        stack: text(event.error?.stack), filename: text(event.filename ?? event.target?.src ?? event.target?.href),
        line: event.lineno ?? 0, column: event.colno ?? 0,
      }));
    };
    const onRejection = (event) => {
      if (!active) return;
      capture(() => errors.append({
        kind: 'unhandledrejection', time: performance.now(), frame,
        message: text(event.reason?.message ?? event.reason), stack: text(event.reason?.stack),
        filename: '', line: 0, column: 0,
      }));
    };
    const remove = () => {
      active = false;
      if (animationRequest !== null) cancelAnimationFrame(animationRequest);
      globalThis.removeEventListener('error', onError, true);
      globalThis.removeEventListener('unhandledrejection', onRejection, true);
      if (WrappedObserver && globalThis.ResizeObserver === WrappedObserver) {
        if (originalDescriptor) Object.defineProperty(globalThis, 'ResizeObserver', originalDescriptor);
        else delete globalThis.ResizeObserver;
      }
      observers.clear();
      callbacks.clear();
      errors.clear();
      delete globalThis[key];
      return true;
    };
    Object.defineProperty(globalThis, key, { configurable: true, value: {
      owner: config.owner, documentId,
      read: () => ({
        documentId, url: text(globalThis.location.href), timeOrigin: performance.timeOrigin, installedAt,
        resizeObserverAvailable: WrappedObserver !== null, frame,
        observers: observers.read(), callbacks: callbacks.read(), errors: errors.read(),
        dropped: { ...dropped }, captureFailures,
      }),
      remove,
    } });
    try {
      globalThis.addEventListener('error', onError, true);
      globalThis.addEventListener('unhandledrejection', onRejection, true);
      if (WrappedObserver) Object.defineProperty(globalThis, 'ResizeObserver', {
        ...originalDescriptor, configurable: true, writable: true, value: WrappedObserver,
      });
      animationRequest = requestAnimationFrame(tick);
    } catch (error) {
      remove();
      throw error;
    }
    return true;
  })()`;
}
