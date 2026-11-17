import { describe, expect, it } from 'bun:test';
import type { RendererExceptionReport } from '@studio/events';
import { installRendererErrorHooks, reportBoundaryCrash, type ErrorHookTarget } from './errors.js';

function fakeWindow(): ErrorHookTarget & { fire(type: string, event: unknown): void } {
  const listeners = new Map<string, Array<(event: unknown) => void>>();
  return {
    addEventListener(type: string, listener: (event: never) => void) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener as (event: unknown) => void]);
    },
    fire(type, event) {
      for (const listener of listeners.get(type) ?? []) listener(event);
    },
  };
}

const userStack = (message: string): Error => {
  const error = new Error(message);
  error.stack = [
    `Error: ${message}`,
    '    at render (file:///Users/wren/repo/apps/studio/out/renderer/assets/index-abc.js:10:5)',
    '    at /Users/wren/repo/node_modules/react-dom/cjs/react-dom.development.js:3:4',
  ].join('\n');
  return error;
};

describe('installRendererErrorHooks', () => {
  it('a window error and an unhandled rejection each send one scrubbed report with the surface and mechanism', () => {
    const sent: RendererExceptionReport[] = [];
    const target = fakeWindow();
    installRendererErrorHooks('tab', target, (report) => sent.push(report));
    target.fire('error', { error: userStack('open /Users/wren/repo/.env failed') });
    target.fire('unhandledrejection', { reason: 'nobody caught /Users/wren/x' });
    expect(sent).toHaveLength(2);
    expect(sent[0]).toMatchObject({ type: 'Error', value: 'open <path> failed', surface: 'tab', mechanism: 'window-error' });
    expect(sent[0]!.frames.map((frame) => frame.filename)).toEqual(['app://studio/renderer/assets/index-abc.js', '<path>']);
    expect(sent[1]).toMatchObject({ type: 'Error', value: 'nobody caught <path>', mechanism: 'unhandled-rejection' });
    expect(JSON.stringify(sent)).not.toContain('/Users/');
  });

  it('an error event with no Error object still reports its message', () => {
    const sent: RendererExceptionReport[] = [];
    const target = fakeWindow();
    installRendererErrorHooks('chrome', target, (report) => sent.push(report));
    target.fire('error', { message: 'Script error.' });
    expect(sent[0]).toMatchObject({ type: 'Error', value: 'Script error.', surface: 'chrome' });
  });

  it("drops Chromium's two ResizeObserver notices but reports actual throws and other warnings", () => {
    const sent: RendererExceptionReport[] = [];
    const target = fakeWindow();
    installRendererErrorHooks('tab', target, (report) => sent.push(report));
    const notice = 'ResizeObserver loop completed with undelivered notifications.';
    target.fire('error', { message: notice });
    target.fire('error', { message: 'ResizeObserver loop limit exceeded' });
    target.fire('error', { error: new Error(notice), message: notice });
    target.fire('error', { message: 'ResizeObserver loop failed unexpectedly' });
    expect(sent.map((report) => [report.value, report.mechanism])).toEqual([
      [notice, 'window-error'],
      ['ResizeObserver loop failed unexpectedly', 'window-error'],
    ]);
  });

  it('a throwing sender never escapes', () => {
    const target = fakeWindow();
    installRendererErrorHooks('tab', target, () => {
      throw new Error('bridge torn');
    });
    expect(() => target.fire('error', { error: new Error('x') })).not.toThrow();
  });
});

describe('reportBoundaryCrash', () => {
  it('sends the class and frames, never the message, with the region', () => {
    const sent: RendererExceptionReport[] = [];
    reportBoundaryCrash(userStack('the model said: const token = "sk-live-…"'), 'chat', (report) => sent.push(report));
    expect(sent[0]).toMatchObject({ type: 'Error', value: '', surface: 'tab', mechanism: 'react-boundary', region: 'chat' });
    expect(sent[0]!.frames.length).toBeGreaterThan(0);
    expect(JSON.stringify(sent)).not.toContain('sk-live');
  });

  it('keeps a message the engine wrote around an identifier, so a band crash names what failed', () => {
    const sent: RendererExceptionReport[] = [];
    reportBoundaryCrash(new TypeError("Cannot read properties of null (reading 'useState')"), 'chrome', (report) => sent.push(report));
    reportBoundaryCrash(new ReferenceError('useAgentStore is not defined'), 'chat', (report) => sent.push(report));
    expect(sent.map((report) => [report.type, report.value, report.region])).toEqual([
      ['TypeError', "Cannot read properties of null (reading 'useState')", 'chrome'],
      ['ReferenceError', 'useAgentStore is not defined', 'chat'],
    ]);
  });

  it('drops an engine-shaped message whose slot is not an identifier', () => {
    const sent: RendererExceptionReport[] = [];
    reportBoundaryCrash(new TypeError("Cannot read properties of undefined (reading '/Users/wren/secret-app')"), 'canvas', (report) => sent.push(report));
    reportBoundaryCrash(new TypeError('the model said x is not defined'), 'chat', (report) => sent.push(report));
    expect(sent.map((report) => report.value)).toEqual(['', '']);
  });

  it('the chrome region reports on the chrome surface', () => {
    const sent: RendererExceptionReport[] = [];
    reportBoundaryCrash(new Error('band'), 'chrome', (report) => sent.push(report));
    expect(sent[0]!.surface).toBe('chrome');
  });
});
