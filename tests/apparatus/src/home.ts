import type { DebugScreenKind } from '@studio/events';
import { until } from './async.js';
import { chromeTarget, debugState, evaluate, gateCall, gateTabId } from './cdp.js';

export interface HomeReading {
  isHome: boolean;
  activeTabId: string | null;
  /** `null` while the tab in front has not installed its gate yet. */
  screen: DebugScreenKind | null;
}

export type HomeVerdict =
  | { showing: true; tabId: string }
  | { showing: false; side: 'main' | 'tab'; reason: string };

export function homeVerdict(read: HomeReading): HomeVerdict {
  if (!read.isHome || read.activeTabId === null) {
    return { showing: false, side: 'main', reason: `main has a project tab in front (active tab ${read.activeTabId ?? 'none'})` };
  }
  if (read.screen !== 'projects') {
    return { showing: false, side: 'tab', reason: `main has tab ${read.activeTabId} in front as Projects, but its screen reads ${read.screen ?? 'nothing yet'}` };
  }
  return { showing: true, tabId: read.activeTabId };
}

async function readHome(port: string | number): Promise<HomeVerdict> {
  const state = await debugState(port);
  const activeTabId = state.activeTabId;
  const screen = activeTabId === null
    ? null
    : await gateCall(port, activeTabId, 'screen').then((read) => read.kind, () => null);
  return homeVerdict({ isHome: state.isHome, activeTabId, screen });
}

/** The band's folder press: main brings the Projects tab to the front, opening one when none is open, and a project tab stays open behind it. Resolves with the Projects tab's id. */
export async function goHome(port: string | number, limitMs = 15_000): Promise<string> {
  const before = await readHome(port);
  if (before.showing) return before.tabId;
  const pressedFrom = gateTabId(await debugState(port));
  if (pressedFrom === null) throw new Error('The app has no tab to press the folder from.');
  await evaluate(await chromeTarget(port), `(window.studioChrome.action(${JSON.stringify({ tabId: pressedFrom, slot: 'folder' })}), true)`);
  const after = await until(() => readHome(port), (verdict) => verdict.showing, {
    what: 'main and the tab in front to agree the Projects screen is showing',
    limitMs,
    everyMs: 50,
    describe: (verdict) => (verdict.showing ? `tab ${verdict.tabId}` : verdict.reason),
  });
  if (!after.showing) throw new Error(after.reason);
  return after.tabId;
}
