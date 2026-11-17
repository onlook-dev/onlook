import { describe, expect, it } from 'bun:test';
import { createContext, runInContext, type Context } from 'node:vm';
import type { CdpSend } from './cdp.js';
import { installPageProbe } from './page-instrumentation.js';

const browserSetup = String.raw`
  globalThis.window = globalThis;
  globalThis.top = globalThis;
  globalThis.location = { href: 'http://fixture.test/' };
  globalThis.performance = { timeOrigin: documentNumber, now: () => now };
  globalThis.now = 0;
  globalThis.animationRequests = new Map();
  globalThis.nextAnimationRequest = 0;
  globalThis.requestAnimationFrame = (callback) => {
    animationRequests.set(++nextAnimationRequest, callback);
    return nextAnimationRequest;
  };
  globalThis.cancelAnimationFrame = (id) => animationRequests.delete(id);
  globalThis.advanceFrame = (timestamp) => {
    now = timestamp;
    const pending = [...animationRequests.values()];
    animationRequests.clear();
    for (const callback of pending) callback(timestamp);
  };
  globalThis.listeners = new Map();
  globalThis.addEventListener = (type, callback, capture) => {
    if (capture !== true) throw new Error('Expected capture listener');
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(callback);
  };
  globalThis.removeEventListener = (type, callback, capture) => {
    if (capture !== true) throw new Error('Expected capture listener removal');
    listeners.get(type)?.delete(callback);
  };
  globalThis.visibleErrors = [];
  globalThis.emit = (type, fields) => {
    const event = {
      defaultPrevented: false, stopped: false,
      preventDefault() { this.defaultPrevented = true; },
      stopImmediatePropagation() { this.stopped = true; },
      ...fields,
    };
    for (const callback of listeners.get(type) ?? []) {
      callback(event);
      if (event.stopped) break;
    }
    if (!event.defaultPrevented) visibleErrors.push(event);
    return event;
  };
  globalThis.ResizeObserver = class ResizeObserver {
    constructor(callback) {
      if (typeof callback !== 'function') throw new TypeError('Callback must be callable');
      this.callback = callback;
      this.observations = new Map();
      this.calls = [];
    }
    observe(...args) { this.calls.push(['observe', ...args]); this.observations.set(...args); }
    unobserve(...args) { this.calls.push(['unobserve', ...args]); this.observations.delete(args[0]); }
    disconnect(...args) { this.calls.push(['disconnect', ...args]); this.observations.clear(); }
    deliver(entries, receiver = this) { return Reflect.apply(this.callback, receiver, [entries, this]); }
  };
  globalThis.NativeObserver = ResizeObserver;
  globalThis.nativeDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
  globalThis.makeTarget = (dataId = 'frame-1') => ({
    tagName: 'DIV', id: 'element',
    getAttribute(name) {
      return ({ class: 'react-flow__node selected', 'data-testid': 'frame', 'data-id': dataId })[name] ?? null;
    },
    closest(selector) {
      if (selector !== '.react-flow__node[data-id]') throw new Error('Wrong node selector');
      return this;
    },
  });
  globalThis.makeEntry = (target, width = 100, height = 50) => ({
    target, contentRect: { x: 0, y: 0, width, height },
    contentBoxSize: [{ inlineSize: width, blockSize: height }],
    borderBoxSize: [{ inlineSize: width + 2, blockSize: height + 2 }],
    devicePixelContentBoxSize: [{ inlineSize: width * 2, blockSize: height * 2 }],
  });
`;

function fakeBrowser() {
  let documentNumber = 0;
  let context: Context;
  let nextIdentifier = 0;
  const scripts = new Map<string, string>();
  const calls: { method: string; params: Record<string, unknown> }[] = [];
  let earlyScript = '';
  let reloadStarts = true;
  let failRemoval = false;
  let failEvaluation = '';
  const run = <Result = unknown>(source: string): Result => runInContext(source, context) as Result;
  const navigate = (): void => {
    context = createContext({ documentNumber: ++documentNumber });
    run(browserSetup);
    for (const source of scripts.values()) run(source);
    if (earlyScript) run(earlyScript);
  };
  navigate();
  const send: CdpSend = async (method, params = {}) => {
    calls.push({ method, params });
    switch (method) {
      case 'Page.enable': return {};
      case 'Page.addScriptToEvaluateOnNewDocument': {
        const identifier = String(++nextIdentifier);
        scripts.set(identifier, params['source'] as string);
        return { identifier };
      }
      case 'Page.removeScriptToEvaluateOnNewDocument': {
        if (failRemoval) throw new Error('Removal refused');
        scripts.delete(params['identifier'] as string);
        return {};
      }
      case 'Page.reload': {
        if (reloadStarts) navigate();
        return {};
      }
      case 'Runtime.evaluate': {
        if (failEvaluation) {
          const message = failEvaluation;
          failEvaluation = '';
          throw new Error(message);
        }
        try {
          const value = run(params['expression'] as string);
          return { result: { value: value === undefined ? undefined : JSON.parse(JSON.stringify(value)) } };
        } catch (error) {
          return { exceptionDetails: { exception: { description: String(error) } } };
        }
      }
      default: throw new Error(`Unexpected CDP method: ${method}`);
    }
  };
  return {
    send, run, navigate, scripts, calls,
    setEarlyScript(source: string) { earlyScript = source; },
    stallReload() { reloadStarts = false; },
    failRemoval(value: boolean) { failRemoval = value; },
    failEvaluation(message: string) { failEvaluation = message; },
  };
}

describe('page instrumentation', () => {
  it('registers in the main world and installs in the current document', async () => {
    const browser = fakeBrowser();
    browser.run('globalThis.oldObserver = new ResizeObserver(() => {})');
    const probe = await installPageProbe(browser.send);
    expect(browser.calls.slice(0, 3).map(({ method }) => method)).toEqual([
      'Page.enable', 'Page.addScriptToEvaluateOnNewDocument', 'Runtime.evaluate',
    ]);
    expect(Object.keys(browser.calls[1]!.params)).toEqual(['source']);
    expect(await probe.read()).toMatchObject({ observers: [], errors: [], resizeObserverAvailable: true });
    browser.run('oldObserver.deliver([makeEntry(makeTarget())])');
    expect((await probe.read())!.callbacks).toEqual([]);
    await probe.dispose();
  });

  it('attributes callbacks, node ids, dimensions and same-frame size changes to construction stacks', async () => {
    const browser = fakeBrowser();
    const probe = await installPageProbe(browser.send);
    browser.run(`
      function buildFirst() { return new ResizeObserver(() => {}); }
      function buildSecond() { return new ResizeObserver(() => {}); }
      globalThis.first = buildFirst();
      globalThis.second = buildSecond();
      globalThis.target = makeTarget();
      advanceFrame(16);
      first.deliver([makeEntry(target)]);
      second.deliver([makeEntry(target, 200)]);
      first.deliver([makeEntry(target, 120, 60)]);
      advanceFrame(32);
      first.deliver([makeEntry(target, 120, 60)]);
    `);
    const snapshot = (await probe.read())!;
    expect(snapshot.observers[0]!.stack).toContain('buildFirst');
    expect(snapshot.observers[1]!.stack).toContain('buildSecond');
    expect(snapshot.callbacks.map(({ observerId, frame, frameTimestamp }) => [observerId, frame, frameTimestamp]))
      .toEqual([[1, 1, 16], [2, 1, 16], [1, 1, 16], [1, 2, 32]]);
    const initial = snapshot.callbacks[0]!.entries[0]!;
    expect(initial).toMatchObject({
      target: { targetId: 1, dataId: 'frame-1', reactFlowNodeId: 'frame-1', nodeId: 'frame-1', className: 'react-flow__node selected' },
      contentRect: { width: 100, height: 50 }, previousContentRect: null, previousFrame: null, sizeChanged: null,
      borderBoxSize: [{ inlineSize: 102, blockSize: 52 }],
      devicePixelContentBoxSize: [{ inlineSize: 200, blockSize: 100 }],
    });
    expect(snapshot.callbacks[1]!.entries[0]!.previousContentRect).toBeNull();
    expect(snapshot.callbacks[2]!.entries[0]).toMatchObject({
      previousContentRect: { width: 100, height: 50 }, contentRect: { width: 120, height: 60 },
      previousFrame: 1, sizeChanged: true,
    });
    expect(snapshot.callbacks[3]!.entries[0]).toMatchObject({ previousFrame: 1, sizeChanged: false });
    expect(snapshot.callbacks[2]!.constructionStack).toContain('buildFirst');
    expect(snapshot.captureFailures).toBe(0);
    await probe.dispose();
  });

  it('resolves nodeId from an enclosing React Flow node when the observed element has no data-id', async () => {
    const browser = fakeBrowser();
    const probe = await installPageProbe(browser.send);
    browser.run(`
      const parent = makeTarget('parent-node');
      const child = makeTarget('');
      child.closest = () => parent;
      new ResizeObserver(() => {}).deliver([makeEntry(child)]);
    `);
    expect((await probe.read())!.callbacks[0]!.entries[0]!.target).toMatchObject({
      dataId: '', reactFlowNodeId: 'parent-node', nodeId: 'parent-node',
    });
    await probe.dispose();
  });

  it('preserves native callback this, argument identities, return values, exceptions and observer methods', async () => {
    const browser = fakeBrowser();
    const probe = await installPageProbe(browser.send);
    expect(browser.run<boolean>(`(() => {
      const receiver = {};
      const target = makeTarget();
      const entries = [makeEntry(target)];
      const options = { box: 'border-box' };
      const observer = new ResizeObserver(function(...args) {
        if (this !== receiver || args.length !== 2 || args[0] !== entries || args[1] !== observer) throw new Error('Changed callback');
        return 42;
      });
      if (!(observer instanceof NativeObserver) || observer.observe !== NativeObserver.prototype.observe) return false;
      observer.observe(target, options);
      observer.unobserve(target);
      observer.disconnect();
      return observer.deliver(entries, receiver) === 42 && observer.calls[0][2] === options
        && observer.calls.map((call) => call[0]).join(',') === 'observe,unobserve,disconnect';
    })()`)).toBe(true);
    expect(browser.run<boolean>(`(() => {
      const failure = new Error('callback failure');
      const observer = new ResizeObserver(() => { throw failure; });
      try { observer.deliver([makeEntry(makeTarget())]); } catch (error) { return error === failure; }
      return false;
    })()`)).toBe(true);
    expect(browser.run<boolean>(`(() => {
      class Subclass extends ResizeObserver {}
      return new Subclass(() => {}) instanceof Subclass;
    })()`)).toBe(true);
    expect(() => browser.run('new ResizeObserver(null)')).toThrow('Callback must be callable');
    expect(() => browser.run('ResizeObserver(() => {})')).toThrow();
    expect((await probe.read())!.callbacks).toHaveLength(2);
    await probe.dispose();
  });

  it('captures early errors and rejections before app code without hiding browser errors', async () => {
    const browser = fakeBrowser();
    const probe = await installPageProbe(browser.send, { currentDocument: 'skip' });
    expect(await probe.read()).toBeNull();
    browser.setEarlyScript(`
      globalThis.earlyObserver = new ResizeObserver(() => {});
      emit('error', { message: 'ResizeObserver loop completed with undelivered notifications.', filename: 'app.js', lineno: 3, colno: 7, error: new Error('early') });
      emit('unhandledrejection', { reason: new Error('early rejection') });
    `);
    const snapshot = await probe.reload();
    expect(snapshot.observers).toHaveLength(1);
    expect(snapshot.errors).toMatchObject([
      { kind: 'error', frame: 0, message: 'ResizeObserver loop completed with undelivered notifications.', filename: 'app.js', line: 3, column: 7 },
      { kind: 'unhandledrejection', frame: 0, message: 'early rejection' },
    ]);
    expect(browser.run<number>('visibleErrors.length')).toBe(2);
    expect(browser.run<boolean>('visibleErrors.every((event) => !event.defaultPrevented && !event.stopped)')).toBe(true);
    await probe.dispose();
  });

  it('bounds records, entries and text while retaining callback attribution after construction eviction', async () => {
    const browser = fakeBrowser();
    const probe = await installPageProbe(browser.send, {
      maxObservers: 1, maxCallbacks: 2, maxErrors: 1, maxEntriesPerCallback: 1, maxTextLength: 80,
    });
    browser.run(`
      globalThis.first = new ResizeObserver(() => {});
      new ResizeObserver(() => {});
      const entries = [makeEntry(makeTarget('x'.repeat(200))), makeEntry(makeTarget())];
      for (let index = 0; index < 5; index++) {
        entries[0].contentRect.width = 100 + index;
        first.deliver(entries);
        emit('error', { message: String(index) + 'e'.repeat(200) });
      }
    `);
    const snapshot = (await probe.read())!;
    expect(snapshot.observers).toHaveLength(1);
    expect(snapshot.callbacks).toHaveLength(2);
    expect(snapshot.errors).toHaveLength(1);
    expect(snapshot.dropped).toEqual({ observers: 1, callbacks: 3, errors: 4, entries: 5 });
    expect(snapshot.callbacks.map((callback) => callback.entries[0]!.contentRect.width)).toEqual([103, 104]);
    expect(snapshot.callbacks[0]).toMatchObject({ observerId: 1, entryCount: 2, omittedEntries: 1 });
    expect(snapshot.callbacks[0]!.constructionStack.length).toBeLessThanOrEqual(80);
    expect(snapshot.callbacks[0]!.entries[0]!.target.dataId).toHaveLength(80);
    expect(snapshot.errors[0]!.message).toHaveLength(80);
    expect(snapshot.errors[0]!.message.startsWith('4')).toBe(true);
    expect(browser.run<number>('visibleErrors.length')).toBe(5);
    await probe.dispose();
  });

  it('isolates capture failures from native callbacks and exceptions', async () => {
    const browser = fakeBrowser();
    const probe = await installPageProbe(browser.send);
    browser.run(`
      globalThis.called = 0;
      const observer = new ResizeObserver(() => { called++; });
      const broken = makeEntry(makeTarget());
      Object.defineProperty(broken, 'contentRect', { get() { throw new Error('sample failed'); } });
      observer.deliver([broken]);
    `);
    expect(browser.run<number>('called')).toBe(1);
    expect((await probe.read())!.captureFailures).toBe(1);
    await probe.dispose();
  });

  it('resets records on navigation and cleans up without disconnecting application observers', async () => {
    const browser = fakeBrowser();
    const probe = await installPageProbe(browser.send);
    const originalDocumentId = (await probe.read())!.documentId;
    browser.run(`new ResizeObserver(() => {}); emit('error', { message: 'old' })`);
    const next = await probe.reload({ ignoreCache: true });
    expect(next.documentId).not.toBe(originalDocumentId);
    expect(next).toMatchObject({ observers: [], callbacks: [], errors: [] });
    expect(browser.calls.find(({ method }) => method === 'Page.reload')!.params).toEqual({ ignoreCache: true });
    browser.run(`
      globalThis.deliveries = 0;
      globalThis.retainedObserver = new ResizeObserver(() => { deliveries++; });
      globalThis.cachedWrapper = ResizeObserver;
      retainedObserver.observe(makeTarget());
    `);
    await probe.dispose();
    await probe.dispose();
    expect(browser.scripts.size).toBe(0);
    expect(browser.run<boolean>('ResizeObserver === NativeObserver')).toBe(true);
    expect(browser.run<boolean>('JSON.stringify(Object.getOwnPropertyDescriptor(globalThis, "ResizeObserver")) === JSON.stringify(nativeDescriptor)')).toBe(true);
    expect(browser.run<number>('animationRequests.size')).toBe(0);
    expect(browser.run<boolean>('[...listeners.values()].every((callbacks) => callbacks.size === 0)')).toBe(true);
    browser.run('retainedObserver.deliver([makeEntry(makeTarget())]); new cachedWrapper(() => {})');
    expect(browser.run<number>('deliveries')).toBe(1);
    expect(browser.run<number>('retainedObserver.observations.size')).toBe(1);
    expect(browser.run<boolean>('retainedObserver.calls.some((call) => call[0] === "disconnect")')).toBe(false);
    await expect(probe.read()).rejects.toThrow('removed');
    await expect(probe.reload()).rejects.toThrow('removed');
    browser.navigate();
    expect(browser.run<boolean>('ResizeObserver === NativeObserver')).toBe(true);
    expect(browser.run<number>('animationRequests.size')).toBe(0);
  });

  it('does not overwrite a later application wrapper on disposal', async () => {
    const browser = fakeBrowser();
    const probe = await installPageProbe(browser.send);
    browser.run('globalThis.laterWrapper = class extends ResizeObserver {}; globalThis.ResizeObserver = laterWrapper');
    await probe.dispose();
    expect(browser.run<boolean>('ResizeObserver === laterWrapper')).toBe(true);
  });

  it('removes failed registrations, refuses duplicate installs and allows a fresh install after disposal', async () => {
    const browser = fakeBrowser();
    const first = await installPageProbe(browser.send);
    await expect(installPageProbe(browser.send)).rejects.toThrow('already installed');
    expect(browser.scripts.size).toBe(1);
    expect(await first.read()).not.toBeNull();
    await first.dispose();
    const second = await installPageProbe(browser.send);
    await second.dispose();
    browser.failEvaluation('Evaluation refused');
    await expect(installPageProbe(browser.send)).rejects.toThrow('Evaluation refused');
    expect(browser.scripts.size).toBe(0);
  });

  it('allows retrying disposal after a CDP failure', async () => {
    const browser = fakeBrowser();
    const probe = await installPageProbe(browser.send);
    browser.failRemoval(true);
    await expect(probe.dispose()).rejects.toThrow('Removal refused');
    expect(browser.scripts.size).toBe(1);
    browser.failRemoval(false);
    browser.failEvaluation('Execution context was destroyed');
    await expect(probe.dispose()).rejects.toThrow('Execution context was destroyed');
    expect(browser.scripts.size).toBe(0);
    await probe.dispose();
    expect(browser.run<boolean>('ResizeObserver === NativeObserver')).toBe(true);
  });

  it('times out rather than reading stale records when reload never navigates', async () => {
    const browser = fakeBrowser();
    const probe = await installPageProbe(browser.send);
    browser.stallReload();
    await expect(probe.reload({ timeoutMs: 1 })).rejects.toThrow('Timed out');
    await probe.dispose();
  });

  it('reports missing ResizeObserver while still capturing errors', async () => {
    const browser = fakeBrowser();
    browser.run('delete globalThis.ResizeObserver');
    const probe = await installPageProbe(browser.send);
    browser.run('emit("error", { message: "still captured" })');
    expect(await probe.read()).toMatchObject({ resizeObserverAvailable: false, errors: [{ message: 'still captured' }] });
    await probe.dispose();
  });

  it('ignores subframe execution and validates buffer limits before sending CDP commands', async () => {
    const browser = fakeBrowser();
    await expect(installPageProbe(browser.send, { maxCallbacks: 0 })).rejects.toThrow('maxCallbacks');
    await expect(installPageProbe(browser.send, { maxErrors: Infinity })).rejects.toThrow('maxErrors');
    expect(browser.calls).toHaveLength(0);
    const probe = await installPageProbe(browser.send, { currentDocument: 'skip' });
    browser.run('globalThis.top = {}');
    browser.run([...browser.scripts.values()][0]!);
    expect(browser.run<boolean>('ResizeObserver === NativeObserver')).toBe(true);
    expect(await probe.read()).toBeNull();
    await probe.dispose();
  });
});
