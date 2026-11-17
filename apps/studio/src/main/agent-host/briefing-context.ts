import type { HarnessId } from '@studio/events';
import type { BriefingContext } from '../../instructions/context.js';
import { flagOn } from '../flags/index.js';
import { agentLanguage } from '../locale/agent-language.js';
import { APPSERVER_WITHHELD_TOOLS } from './appserver/tools.js';

export function sessionBriefingContext(harness: HarnessId): BriefingContext {
  const language = agentLanguage();
  return {
    harness,
    blankFirstMoment: flagOn('blank-first-moment'),
    ...(harness === 'codex'
      ? {
          canRemove: !APPSERVER_WITHHELD_TOOLS.includes('remove_frame'),
          canCapture: !APPSERVER_WITHHELD_TOOLS.includes('capture_frame'),
        }
      : {}),
    artifactQuote: flagOn('frame-covers'),
    buildIntoFrame: true,
    ...(flagOn('frame-covers') ? { quoteOnPlacedFrame: { liftsAtTurnEnd: true } } : {}),
    ...(language === undefined ? {} : { interfaceLanguage: language }),
  };
}
