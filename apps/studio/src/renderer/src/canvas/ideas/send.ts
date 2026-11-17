import { t } from '@studio/i18n';
import { ignoreRefusal } from '../../refusal.js';
import { IDEA_PROMPT, ideaPrompt, type IdeaKind } from './ideas.js';
import { studio } from '../../bridge.js';

const logRefusal = ignoreRefusal('canvas', 'idea card send');

/** Sends the card's sentence as the person's own message; `false` when nothing was sent. */
export function sendIdea(kind: IdeaKind): Promise<boolean> {
  return studio().agentCommand({ type: 'prompt', ...ideaPrompt(kind, t(IDEA_PROMPT[kind])) }).then(
    (answer) => answer.accepted,
    (error: unknown) => {
      logRefusal(error);
      return false;
    },
  );
}
