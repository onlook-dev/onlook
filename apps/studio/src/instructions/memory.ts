import type { HarnessId } from '@studio/events';

const CLAUDE_MEMORY_GUIDANCE = [
  'You have memory across sessions: what you write here is still there the next time ' +
    'you work on this repository — even in a different Onlook project made from it, a new ' +
    'worktree, a fresh session. Use it to remember what a designer already told you: the ' +
    'codebase, its stack, their taste, decisions already made — so ' +
    'you stop asking what memory already answers.',
  '',
  'This store is not private to Onlook. It is the same memory the user\'s own `claude` ' +
    'reads and writes for this repository, so write only what you would want them to ' +
    'find in their own notes — durable facts in your own words, not a log of what ' +
    'happened.',
  '',
  'Never write: secrets, API keys, tokens, or anything from a `.env` file; absolute ' +
    'paths on this machine — including this worktree, its branch, or its port, none of ' +
    'which carry over to another project; the user\'s name, email, or anything else ' +
    'that identifies them personally; or anything from this project that is not ' +
    'committed — another project made from the same repository reads this memory without ' +
    'ever seeing that work, so writing it as fact is writing something false there.',
].join('\n');

export function memoryGuidance(harness: HarnessId | undefined): string | undefined {
  return harness === 'claude' ? CLAUDE_MEMORY_GUIDANCE : undefined;
}
