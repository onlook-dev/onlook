import type { FirstRunSurface, StudioFlags } from '@studio/events';
import { sendTelemetry } from '../canvas/telemetry.js';
import { flagEnabled } from '../flags/store.js';
import { telemetryProjectFields } from '../workspace/store.js';
import { resolveInviteForLaunch, spendTip, type FootTip, type TipResolution } from './footSeat.js';
import { endPromptTip } from './promptTipStore.js';
import { spendScrollTip } from './scrollTipStore.js';

const SURFACE: Record<Exclude<FootTip, 'invite'>, FirstRunSurface> = { inspire: 'inspire_tip', scroll: 'scroll_tip', prompt: 'prompt_tip' };

const TIP_FLAG: Record<Exclude<FootTip, 'invite'>, keyof StudioFlags> = { inspire: 'blank-first-moment', scroll: 'blank-first-moment', prompt: 'prompt-tip' };

const SPEND: Record<FootTip, (projectPath: string) => void> = {
  inspire: spendTip,
  scroll: spendScrollTip,
  prompt: endPromptTip,
  invite: resolveInviteForLaunch,
};

/** Spends the tip as Dismiss would, without ending the sitting (ONL-2960); a tip whose flag is off was never shown, so it sends nothing (ONL-3261). */
export function resolveTip(projectPath: string, { tip, reason }: TipResolution): void {
  SPEND[tip](projectPath);
  if (tip === 'invite') {
    sendTelemetry({ event: 'notification_invite_acted', properties: { ...telemetryProjectFields(), surface: 'rail_tip', action: 'resolved', reason } });
    return;
  }
  if (!flagEnabled(TIP_FLAG[tip])) return;
  sendTelemetry({ event: 'first_run_acted', properties: { ...telemetryProjectFields(), surface: SURFACE[tip], action: 'resolved', reason } });
}
