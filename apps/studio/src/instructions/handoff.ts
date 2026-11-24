import type { HarnessId } from '@studio/events';

const AGENT: Record<HarnessId, string> = { claude: 'Claude', codex: 'ChatGPT', opencode: 'OpenCode', freebuff: 'Freebuff' };

export function previousChatInstruction(previous: HarnessId, savedAt: string): string {
  return (
    `This project's previous chat, with ${AGENT[previous]}, ended when its last reply failed, and the user switched to you. ` +
    `That chat is saved at ${savedAt}. Read it only if you need its context.`
  );
}
