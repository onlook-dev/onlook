import { takeComplaints } from '../../testing/dom.js';
import { afterEach, expect, it, spyOn } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { WebviewTag } from 'electron';
import { FRAME_SCROLL_CHANNEL, type FrameScrollCommand, type FrameScrollMetrics } from '@studio/events';
import { useFrameScroll } from './useFrameScroll.js';

let root: Root | undefined;
let container: HTMLElement | undefined;
const restores: (() => void)[] = [];

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  container?.remove();
  for (const restore of restores.splice(0)) restore();
  expect(takeComplaints()).toEqual([]);
});

it('subscribes only while enabled, rejects stale and bubbled replies and rebinds on a real guest reload', async () => {
  const guest = document.createElement('div') as unknown as WebviewTag;
  const commands: FrameScrollCommand[] = [];
  guest.getWebContentsId = () => 10;
  guest.send = async (channel, command: FrameScrollCommand) => { expect(channel).toBe(FRAME_SCROLL_CHANNEL); commands.push(command); };
  const ref = { current: guest };
  let api: ReturnType<typeof useFrameScroll> | undefined;
  function Harness({ enabled, instance = 'one' }: { enabled: boolean; instance?: string }): React.JSX.Element {
    api = useFrameScroll(ref, instance, enabled);
    return <div>{api.metrics?.top ?? 'hidden'}</div>;
  }
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<Harness enabled={false} />));
  expect(commands).toEqual([]);
  await act(async () => root?.render(<Harness enabled />));
  const session = commands.at(-1)!.session;
  const report = async (metrics: FrameScrollMetrics | null, reportSession = session) => {
    await act(async () => {
      const event = new Event('ipc-message');
      Object.assign(event, { channel: FRAME_SCROLL_CHANNEL, args: [{ session: reportSession, metrics }] });
      guest.dispatchEvent(event);
    });
  };
  await report({ session, surface: 1, top: 120, viewport: 400, height: 2000 });
  expect(container.textContent).toBe('120');
  await act(async () => guest.dispatchEvent(new Event('did-start-loading')));
  expect(container.textContent).toBe('hidden');
  await act(async () => guest.dispatchEvent(new Event('dom-ready')));
  const next = commands.at(-1)!.session;
  expect(next).not.toBe(session);
  await report({ session, surface: 1, top: 400, viewport: 400, height: 2000 });
  expect(container.textContent).toBe('hidden');
  await report({ session: next, surface: 1, top: 240, viewport: 400, height: 2000 }, next);
  expect(container.textContent).toBe('240');
  const nested = document.createElement('div');
  (guest as unknown as HTMLElement).append(nested);
  await act(async () => {
    const event = new Event('ipc-message', { bubbles: true });
    Object.assign(event, { channel: FRAME_SCROLL_CHANNEL, args: [{ session: next, metrics: { session: next, surface: 1, top: 999, viewport: 400, height: 2000 } }] });
    nested.dispatchEvent(event);
  });
  expect(container.textContent).toBe('240');
  await act(async () => root?.render(<Harness enabled={false} />));
  expect(commands.at(-1)).toEqual({ type: 'observe', session: next, enabled: false });
  expect(container.textContent).toBe('hidden');
  expect(api?.metrics).toBeNull();
});

it('coalesces drag commands and cancels pending work on deselection', async () => {
  const pending = new Map<number, FrameRequestCallback>();
  let sequence = 0;
  const raf = spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { pending.set(++sequence, callback); return sequence; });
  const cancel = spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => { pending.delete(id); });
  restores.push(() => { raf.mockRestore(); cancel.mockRestore(); });
  const guest = document.createElement('div') as unknown as WebviewTag;
  const commands: FrameScrollCommand[] = [];
  guest.getWebContentsId = () => 11;
  guest.send = async (_channel, command: FrameScrollCommand) => { commands.push(command); };
  const ref = { current: guest };
  let api: ReturnType<typeof useFrameScroll> | undefined;
  function Harness({ enabled }: { enabled: boolean }): null {
    api = useFrameScroll(ref, 'one', enabled);
    return null;
  }
  container = document.createElement('div');
  root = createRoot(container);
  await act(async () => root?.render(<Harness enabled />));
  const session = commands[0]!.session;
  const event = new Event('ipc-message');
  Object.assign(event, { channel: FRAME_SCROLL_CHANNEL, args: [{ session, metrics: { session, surface: 1, top: 0, viewport: 400, height: 2000 } }] });
  await act(async () => guest.dispatchEvent(event));
  for (let top = 0; top <= 200; top += 10) api?.scrollTo(top);
  expect(pending.size).toBe(1);
  for (const callback of pending.values()) callback(0);
  pending.clear();
  expect(commands.at(-1)).toEqual({ type: 'scroll', session, surface: 1, top: 200 });
  api?.scrollTo(400);
  await act(async () => root?.render(<Harness enabled={false} />));
  expect(pending.size).toBe(0);
  expect(commands.filter((command) => command.type === 'scroll')).toHaveLength(1);
});

it('sends wheel deltas as relative scroll summed per frame, so a report from before the last command never moves the page back', async () => {
  const pending = new Map<number, FrameRequestCallback>();
  let sequence = 0;
  const raf = spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { pending.set(++sequence, callback); return sequence; });
  const cancel = spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => { pending.delete(id); });
  restores.push(() => { raf.mockRestore(); cancel.mockRestore(); });
  const flush = () => { for (const callback of pending.values()) callback(0); pending.clear(); };
  const guest = document.createElement('div') as unknown as WebviewTag;
  const commands: FrameScrollCommand[] = [];
  guest.getWebContentsId = () => 12;
  guest.send = async (_channel, command: FrameScrollCommand) => { commands.push(command); };
  const ref = { current: guest };
  let api: ReturnType<typeof useFrameScroll> | undefined;
  function Harness(): null {
    api = useFrameScroll(ref, 'one', true);
    return null;
  }
  container = document.createElement('div');
  root = createRoot(container);
  await act(async () => root?.render(<Harness />));
  const session = commands[0]!.session;
  const report = async (top: number) => {
    const event = new Event('ipc-message');
    Object.assign(event, { channel: FRAME_SCROLL_CHANNEL, args: [{ session, metrics: { session, surface: 1, top, viewport: 400, height: 2000 } }] });
    await act(async () => guest.dispatchEvent(event));
  };
  // The guest's own scroll position, applying commands in order the way the page does.
  let page = 100;
  const pages: number[] = [];
  const apply = () => {
    for (const command of commands.splice(1)) {
      if (command.type === 'scroll') page = command.top;
      else if (command.type === 'scrollBy') page = Math.max(0, Math.min(1600, page + command.delta));
      pages.push(page);
    }
  };
  await report(100);
  api?.scrollBy(10);
  api?.scrollBy(20);
  flush();
  expect(commands).toHaveLength(2);
  for (let step = 0; step < 2; step += 1) {
    api?.scrollBy(30);
    flush();
  }
  apply();
  await report(130);
  api?.scrollBy(30);
  flush();
  apply();
  expect(pages).toEqual([130, 160, 190, 220]);
  api?.scrollBy(5000);
  flush();
  apply();
  expect(pages.at(-1)).toBe(1600);
});
