import type { HarnessId, ProcessClass } from '@studio/events';
import type { SessionHarness } from './backend.js';

interface HarnessFacts {
  /** What the user picked, and the name on the wire. */
  id: HarnessId;
  /** Keys sessions, transcripts, preferences and archived chats on disk (ONL-2431). */
  stored: SessionHarness;
  telemetry: HarnessId;
  /** The process name `ps` reports for the agent's own program. */
  executable: string;
  processClass: ProcessClass;
  pdfAttachments: boolean;
  /** `prompt_chars` on a finished turn; `null` is sent when the Harness does not report it. */
  reportsPromptChars: boolean;
  /** `retry_attempts` on a finished turn; `null` is sent when the Harness does not count them. */
  countsRetryAttempts: boolean;
  /** Artifact grants follow the provider's thread, not the session, when one is stored. */
  grantsFollowProviderThread: boolean;
  /** A drafted skill attachment is kept only with the path it was read from. */
  skillsCarryPath: boolean;
}

export const HARNESSES = {
  claude: {
    id: 'claude',
    stored: 'claude',
    telemetry: 'claude',
    executable: 'claude',
    processClass: 'claude_cli',
    pdfAttachments: true,
    reportsPromptChars: true,
    countsRetryAttempts: true,
    grantsFollowProviderThread: false,
    skillsCarryPath: false,
  },
  codex: {
    id: 'codex',
    stored: 'appserver',
    telemetry: 'codex',
    executable: 'codex',
    processClass: 'codex',
    pdfAttachments: false,
    reportsPromptChars: false,
    countsRetryAttempts: false,
    grantsFollowProviderThread: true,
    skillsCarryPath: true,
  },
} as const satisfies Record<HarnessId, HarnessFacts>;

export type Harness = (typeof HARNESSES)[HarnessId];

const ALL = [HARNESSES.claude, HARNESSES.codex] as const;

export const STORED_HARNESSES = [HARNESSES.claude.stored, HARNESSES.codex.stored] as const;

/** A name no Harness answers to reads as Claude, as an absent choice does (ONL-2120). */
export function harnessFor(id: HarnessId): Harness {
  return ALL.find((harness) => harness.id === id) ?? HARNESSES.claude;
}

export function harnessStoredAs(stored: SessionHarness): Harness {
  return ALL.find((harness) => harness.stored === stored) ?? HARNESSES.claude;
}

export function harnessRunning(executable: string): Harness | undefined {
  return ALL.find((harness) => harness.executable === executable);
}

export function isStoredHarness(value: unknown): value is SessionHarness {
  return ALL.some((harness) => harness.stored === value);
}
