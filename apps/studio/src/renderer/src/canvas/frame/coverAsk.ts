import { frameRecoveryContext } from '../../../../instructions/recovery.js';
import { t, type StringKey } from '@studio/i18n';
import type { RecoveryAskRequest } from './FrameRecovery.js';
import type { AskableCover } from './coverState.js';

const PERSONS_WORDS: Record<AskableCover, StringKey> = {
  'not-started': 'frame.covers.askPrompt.notStarted',
  stopped: 'frame.covers.askPrompt.stopped',
  nothing: 'frame.covers.askPrompt.nothing',
};

export function coverAsk(cover: AskableCover, url: string): RecoveryAskRequest {
  return { text: t(PERSONS_WORDS[cover]), context: frameRecoveryContext({ cover, url }) };
}
