import { create } from 'zustand';
import type { TipsOpenSource } from '@studio/events';
import { telemetryProjectFields } from '../workspace/store.js';
import type { PromptId, PromptTab } from './content.js';
import { studio } from '../bridge.js';

export type TipsView = 'prompts' | 'hotkeys';

export interface TipsState {
  isOpen: boolean;
  view: TipsView;
  tab: PromptTab;
  query: string;
  /** The prompt open in the detail view; it survives a close so ⌘/ reopens where the user was. */
  detail: PromptId | null;
  /** The last confirmation; `nonce` replays the same words. */
  toast: { prompt: string; nonce: number } | null;
  /** Once opened, the Tips pill stops inviting a look, for the rest of the launch. */
  hasOpened: boolean;
}

const INITIAL: TipsState = { isOpen: false, view: 'prompts', tab: 'featured', query: '', detail: null, toast: null, hasOpened: false };

export const useTipsStore = create<TipsState>()(() => INITIAL);

export function openTips(source: TipsOpenSource): void {
  if (useTipsStore.getState().isOpen) return;
  useTipsStore.setState({ isOpen: true, hasOpened: true });
  studio().telemetryEvent({ event: 'tips_opened', properties: { ...telemetryProjectFields(), source } });
}

export function closeTips(): void {
  useTipsStore.setState({ isOpen: false });
}

export function toggleTips(source: TipsOpenSource): void {
  if (useTipsStore.getState().isOpen) closeTips();
  else openTips(source);
}

/** Help's own door into the guide: the view is set first, so an already-open guide turns to the keys rather than staying where it was. */
export function openTipsOnKeys(source: TipsOpenSource): void {
  setTipsView('hotkeys');
  openTips(source);
}

export function setTipsView(view: TipsView): void {
  useTipsStore.setState({ view, detail: null });
}

export function setTipsTab(tab: PromptTab): void {
  useTipsStore.setState({ tab, detail: null });
}

export function setTipsQuery(query: string): void {
  useTipsStore.setState({ query, detail: null });
}

export function setTipsDetail(detail: PromptId | null): void {
  useTipsStore.setState({ detail });
}

let nonce = 0;

export function showTipsToast(prompt: string): void {
  nonce += 1;
  useTipsStore.setState({ toast: { prompt, nonce } });
}

export function clearTipsToast(): void {
  useTipsStore.setState({ toast: null });
}

export function resetTipsForTesting(): void {
  useTipsStore.setState(INITIAL);
}
