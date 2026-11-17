import { describe, expect, it } from 'bun:test';
import { longFrame, scriptCategory, totals } from './loaf.js';

describe('long animation frames', () => {
  it('folds what ran into a fixed category, never the script or its URL', () => {
    expect(scriptCategory({ invokerType: 'event-listener', invoker: 'MessagePort.onmessage' })).toBe('message');
    expect(scriptCategory({ invokerType: 'event-listener', invoker: 'DIV#root.onkeydown' })).toBe('event_listener');
    expect(scriptCategory({ invokerType: 'user-callback', invoker: 'FrameRequestCallback' })).toBe('other');
    expect(scriptCategory({ invokerType: 'user-callback', invoker: 'Window.requestAnimationFrame' })).toBe('animation_frame');
    expect(scriptCategory({ invokerType: 'user-callback', invoker: 'TimerHandler:setTimeout' })).toBe('timer');
    expect(scriptCategory({ invokerType: 'user-callback', invoker: 'ResizeObserver.callback' })).toBe('observer');
    expect(scriptCategory({ invokerType: 'resolve-promise', invoker: 'Response.json.then' })).toBe('promise');
    expect(scriptCategory({ invokerType: 'module-script', invoker: 'file:///Users/someone/app.js' })).toBe('script_load');
  });

  it('names the category that spent the most script time, with its style and layout cost', () => {
    const frames = [
      longFrame({
        startTime: 0,
        duration: 120,
        blockingDuration: 70,
        styleAndLayoutStart: 90,
        scripts: [
          { invokerType: 'event-listener', invoker: 'MessagePort.onmessage', duration: 60, forcedStyleAndLayoutDuration: 12 },
          { invokerType: 'user-callback', invoker: 'TimerHandler:setTimeout', duration: 20 },
        ],
      }),
      longFrame({ startTime: 200, duration: 60, scripts: [{ invokerType: 'user-callback', invoker: 'TimerHandler:setTimeout', duration: 30 }] }),
    ];
    expect(totals(frames)).toEqual({
      count: 2,
      blockingMs: 80,
      styleLayoutMs: 30,
      forcedStyleLayoutMs: 12,
      topScript: 'message',
      topScriptMs: 60,
    });
  });
});
