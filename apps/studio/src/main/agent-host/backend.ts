import type {
  EffortLevel,
  MidTurnPolicy,
  ModelRefusal,
  PermissionMode,
  PromptAttachment,
  PromptOrigin,
  QuestionAnswers,
  StudioEvent,
  WelcomeProject,
} from '@studio/events';

/** Which SDK ran the session, not which product the user picked — `HarnessId` is that. */
export type SessionHarness = 'claude' | 'appserver' | 'acp' | 'pty';

export type ModelPick = { accepted: true } | { accepted: false; refusal?: ModelRefusal };

export interface BackendState {
  isStreaming: boolean;
  midTurn: MidTurnPolicy;
  /** Absent from a backend that does not count its parked requests (ONL-2455). */
  needsAttention?: boolean;
  /** When the agent began holding a question for the user (ONL-2295). */
  questionParkedSince?: number;
  turnWaitedMs?: number;
  /** This state accompanies a teardown, so a cleared question is not work resuming (ONL-2295). Main-only; never on the wire. */
  turnEnding?: boolean;
  /** A turn the agent has not finished. A Stop drops `isStreaming` and leaves this up (ONL-2294). */
  isTurnLive: boolean;
}

export interface AgentBackend {
  readonly id: string;
  readonly cwd: string;
  /** Keys the transcript and session stores (ONL-2124). */
  readonly harness: SessionHarness;
  readonly events: readonly StudioEvent[];
  readonly isRestoringTranscript?: boolean;
  readonly isStreaming: boolean;
  readonly needsAttention?: boolean;
  readonly questionParkedSince?: number;
  readonly turnWaitedMs?: number;
  /** Read at the moment a prompt arrives; the last published `BackendState` can lag it (ONL-2294). */
  readonly isTurnLive: boolean;
  /** A fact of the running session; it moves (ONL-2180). */
  readonly midTurn: MidTurnPolicy;
  readonly lastSeq: number;
  /** Where the agent itself saves this chat, once it has said; the next agent is pointed at it after a switch (ONL-2903). */
  readonly transcriptPath?: string;

  eventsSince(sinceSeq?: number): StudioEvent[];
  refreshSkills?(): Promise<void>;
  addConnector?(provider: import('@studio/events').FeaturedConnector): boolean;
  actOnConnector?(id: string): boolean;

  /** Skipped on a restore. */
  welcome(workspace: WelcomeProject): void;

  /** After construction: the host announces and welcomes first. */
  open(): void;

  /** `context` joins what the model reads, never the transcript row; `origin` stamps the row (ONL-2179); mid-turn a `user` prompt joins the running turn (ONL-2180). */
  prompt(text: string, attachments?: PromptAttachment[], context?: string, origin?: PromptOrigin, display?: { origin: PromptOrigin; hidden?: true }): boolean;

  /** Refused when the backend does not enforce that mode; the composer only offers enforced ones (ONL-2190). */
  setPermissionMode(mode: PermissionMode): Promise<boolean>;
  /** `false` when no held request matched, so an answer is never reported as accepted (ONL-2190). */
  respond(requestId: string, optionId: string, answers?: QuestionAnswers): boolean;
  /** Every open question takes the designer's own words as its answer; `false` when none is open (ONL-2583). */
  answerQuestion(text: string, attachments?: PromptAttachment[], context?: string): boolean;
  /** Ends the turn with every open question marked dismissed; `false` when none is open (ONL-2901). */
  dismissQuestion(): Promise<boolean>;

  setModel(model: string): Promise<ModelPick>;
  setEffort(effort: EffortLevel | null): Promise<void>;

  /** Leaves the session usable. */
  interrupt(): Promise<void>;

  /** Settles anything a caller is parked on. */
  close(): Promise<void>;
}
