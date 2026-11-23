import {
  isSignInFixable,
  isLimitShaped,
  rateLimitHit,
  type RetryPrompt,
  type SessionState,
  type StudioEvent,
  type ToolCallView,
  type TranscriptItem,
} from './events.js';
import { isRepairAskInPersonsWords } from './project-setup.js';
import { touchedFilesOf } from './touched-files.js';

/** An allowlist, so a new event type defaults to leaving a standing notice alone (ONL-2491). */
const AGENT_ACTIVITY: ReadonlySet<StudioEvent['type']> = new Set([
  'text.start',
  'text.delta',
  'text.end',
  'thinking.start',
  'thinking.delta',
  'thinking.end',
  'tool.start',
  'tool.update',
  'tool.end',
  'permission.requested',
  'turn.ended',
  'session.error',
] satisfies readonly StudioEvent['type'][]);

export const emptyState: SessionState = {
  isStreaming: false,
  midTurn: 'steer',
  items: [],
  touchedFiles: [],
  awaitingApproval: [],
  models: [],
  permissionModes: [],
  lastSeq: 0,
};

type UserRow = Extract<TranscriptItem, { kind: 'user' }>;

/** Undefined for Studio's own words, which a resend would put in the person's mouth; a repair ask is asked again instead (ONL-2901). */
function resendOf(row: UserRow): RetryPrompt | undefined {
  if (row.hidden === true || (row.origin === 'studio' && !isRepairAskInPersonsWords(row))) return undefined;
  return {
    text: row.text,
    ...(row.attachments?.length ? { attachments: row.attachments } : {}),
    ...(row.context !== undefined ? { context: row.context } : {}),
    ...(row.origin === 'studio' || row.origin === 'suggestion' ? { origin: row.origin } : {}),
  };
}

export function resendOfLastPrompt(items: readonly TranscriptItem[]): RetryPrompt | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]!;
    if (item.kind === 'user') return resendOf(item);
  }
  return undefined;
}

export function foldSessionState(events: readonly StudioEvent[]): SessionState {
  const items: TranscriptItem[] = [];
  const tools = new Map<string, ToolCallView>();
  const textIndex = new Map<string, number>();
  let openToolGroup: number | null = null;
  /** Keyed per stream: sub-agent blocks interleave with the root's, and one shared index left two parallel `Task` thoughts settling each other. */
  const openThinking = new Map<string, number>();
  const streamKey = (parentToolUseId?: string): string => parentToolUseId ?? 'root';
  let turnTextIndices: number[] = [];
  let turnPrompt: RetryPrompt | undefined;
  let turnHasPrompt = false;
  let turnPromptId: string | undefined;
  let turnHasErrorRow = false;
  /** Kept past `turn.ended`: a failed result's `session.error` follows the end (ONL-2187). */
  let currentTurnId: string | undefined;
  let lastUserTurnId: string | undefined;
  /** A dismissal interrupts its turn to end it, which is not a stop to resume (ONL-2901). */
  let dismissedSinceUser = false;
  const userRows = new Map<string, number>();
  const pendingSteers = new Map<string, UserRow>();

  const state: SessionState = {
    ...emptyState,
    items,
    awaitingApproval: [],
    models: [],
    permissionModes: [],
  };

  const closeToolGroup = (): void => {
    openToolGroup = null;
  };

  const settleOne = (key: string): void => {
    const idx = openThinking.get(key);
    if (idx === undefined) return;
    const it = items[idx];
    if (it && it.kind === 'assistant-thinking' && it.isStreaming) {
      items[idx] = { ...it, isStreaming: false };
    }
    openThinking.delete(key);
  };

  const settleThinking = (parentToolUseId?: string, allStreams = false): void => {
    if (allStreams) {
      for (const key of [...openThinking.keys()]) settleOne(key);
      return;
    }
    settleOne(streamKey(parentToolUseId));
  };

  const unknown = new Set<string>();
  for (const e of events) {
    state.lastSeq = e.seq;
    if (AGENT_ACTIVITY.has(e.type)) {
      state.retrying = undefined;
      state.retryingSince = undefined;
      state.silentSince = undefined;
    }
    switch (e.type) {
      case 'session.started':
        state.sessionId = e.sessionId;
        state.cwd = e.cwd;
        state.model = e.model;
        // Guarded: a re-announced session that omits these must not blank a value a prior event set.
        if (e.harnessId !== undefined) state.harnessId = e.harnessId;
        if (e.permissionMode !== undefined) state.permissionMode = e.permissionMode;
        break;

      case 'session.welcome':
        closeToolGroup();
        settleThinking(undefined, true);
        items.push({ kind: 'welcome', id: e.eventId, workspace: e.workspace });
        break;

      case 'session.settings':
        if (e.connectors !== undefined) state.connectors = e.connectors ?? undefined;
        if (e.skills !== undefined) state.skills = e.skills;
        if (e.skillsUnavailable !== undefined) state.skillsUnavailable = e.skillsUnavailable;
        if (e.models !== undefined) state.models = e.models;
        if (e.model !== undefined) state.model = e.model;
        // `effort: null` clears the level; `undefined` leaves it.
        if (e.effort !== undefined) state.effort = e.effort ?? undefined;
        if (e.permissionMode !== undefined) state.permissionMode = e.permissionMode;
        if (e.permissionModes !== undefined) state.permissionModes = e.permissionModes;
        break;

      case 'session.ended':
        if (e.reason === 'interrupted') state.interrupted = !dismissedSinceUser;
        else if (e.reason === 'error') state.interrupted = false;
        else state.interrupted ??= false;
        state.isStreaming = false;
        state.turnStartedAt = undefined;
        settleThinking(undefined, true);
        break;

      case 'session.boundary':
        closeToolGroup();
        settleThinking(undefined, true);
        items.push({ kind: 'boundary', id: e.eventId, message: e.message });
        // The failure above is behind the boundary; `turnPrompt` is not, since a prompt
        // still in flight is answered by the conversation that starts here (ONL-2925).
        turnHasErrorRow = false;
        currentTurnId = undefined;
        lastUserTurnId = undefined;
        state.error = undefined;
        state.failedTurn = undefined;
        break;

      case 'session.error':
        closeToolGroup();
        settleThinking(undefined, true);
        // The sign-in card, or codex's banner, renders a failure a sign-in can fix (ONL-2187, ONL-2114, ONL-2491); one Claude death raises two errors, one card.
        if (!isSignInFixable(e.code) && !(turnHasPrompt && turnHasErrorRow)) {
          items.push({
            kind: 'error',
            id: e.eventId,
            message: e.message,
            code: e.code,
            ...(e.code === 'billing_error' ? { limit: { window: 'credits' as const } } :
              isLimitShaped(e.code, e.apiErrorStatus) ? { limit: rateLimitHit(state.limits ?? [], e.ts / 1000) } : {}),
            ...(e.apiErrorStatus === undefined ? {} : { apiErrorStatus: e.apiErrorStatus }),
            ...(turnPrompt && e.code !== 'billing_error' ? { retry: turnPrompt } : {}),
          });
          turnHasErrorRow = true;
        }
        state.error = { message: e.message, code: e.code };
        if (currentTurnId !== undefined) state.failedTurn = { turnId: currentTurnId, code: e.code };
        break;

      case 'turn.started':
        state.interrupted = false;
        dismissedSinceUser = false;
        state.error = undefined;
        state.failedTurn = undefined;
        state.retrying = undefined;
        state.retryingSince = undefined;
        state.silentSince = e.ts;
        currentTurnId = e.turnId;
        state.latestTurnId = e.turnId;
        state.isStreaming = true;
        state.turnStartedAt = e.ts;
        turnTextIndices = [];
        if (turnPromptId !== e.turnId) {
          turnPrompt = undefined;
          turnPromptId = undefined;
          turnHasPrompt = false;
        }
        turnHasErrorRow = false;
        break;

      case 'message.user':
        state.interrupted = false;
        dismissedSinceUser = false;
        const joinsTurn = e.turnId === lastUserTurnId;
        lastUserTurnId = e.turnId;
        const row: UserRow = {
          kind: 'user',
          id: e.eventId,
          text: e.text,
          ...(e.origin === undefined ? {} : { origin: e.origin }),
          ...(e.hidden === true ? { hidden: true as const } : {}),
          ...(e.attachments?.length ? { attachments: e.attachments } : {}),
          ...(e.context !== undefined ? { context: e.context } : {}),
          ...(e.delivery === undefined ? {} : { delivery: e.delivery }),
          ...(joinsTurn ? { joinsTurn: true as const } : {}),
        };
        if (e.delivery === 'steering' && e.messageId !== undefined) {
          pendingSteers.set(e.messageId, row);
        } else {
          closeToolGroup();
          settleThinking(undefined, true);
          if (e.messageId !== undefined) userRows.set(e.messageId, items.length);
          items.push(row);
        }
        turnPrompt = resendOf(row);
        turnHasPrompt = true;
        turnPromptId = e.turnId;
        break;

      case 'message.delivery': {
        const pending = pendingSteers.get(e.messageId);
        if (pending !== undefined) {
          closeToolGroup();
          settleThinking(undefined, true);
          userRows.set(e.messageId, items.length);
          items.push(pending);
          pendingSteers.delete(e.messageId);
        }
        const idx = userRows.get(e.messageId);
        const it = idx === undefined ? undefined : items[idx];
        if (idx === undefined || it === undefined || it.kind !== 'user') break;
        if (e.outcome === 'delivered') {
          const { delivery: _cleared, ...rest } = it;
          items[idx] = rest;
        } else {
          items[idx] = { ...it, delivery: e.outcome };
        }
        break;
      }

      case 'text.start': {
        closeToolGroup();
        settleThinking(e.parentToolUseId);
        turnTextIndices.push(items.length);
        textIndex.set(e.blockId, items.length);
        items.push({
          kind: 'assistant-text',
          id: e.blockId,
          text: '',
          isStreaming: true,
          startedAt: e.ts,
        });
        break;
      }
      case 'thinking.start': {
        closeToolGroup();
        settleThinking(e.parentToolUseId);
        textIndex.set(e.blockId, items.length);
        openThinking.set(streamKey(e.parentToolUseId), items.length);
        items.push({ kind: 'assistant-thinking', id: e.blockId, text: '', isStreaming: true });
        break;
      }

      case 'text.delta':
      case 'thinking.delta': {
        const idx = textIndex.get(e.blockId);
        if (idx == null) {
          // A replay from `sinceSeq` can begin mid-block.
          closeToolGroup();
          settleThinking();
          if (e.type === 'text.delta') {
            turnTextIndices.push(items.length);
            textIndex.set(e.blockId, items.length);
            items.push({
              kind: 'assistant-text',
              id: e.blockId,
              text: e.delta,
              isStreaming: true,
              startedAt: e.ts,
            });
          } else {
            textIndex.set(e.blockId, items.length);
            openThinking.set(streamKey(undefined), items.length);
            items.push({
              kind: 'assistant-thinking',
              id: e.blockId,
              text: e.delta,
              isStreaming: true,
            });
          }
        } else {
          const it = items[idx];
          if (it && (it.kind === 'assistant-text' || it.kind === 'assistant-thinking')) {
            items[idx] = { ...it, text: it.text + e.delta };
          }
        }
        break;
      }

      case 'text.end':
      case 'thinking.end': {
        const idx = textIndex.get(e.blockId);
        const it = idx == null ? undefined : items[idx];
        if (idx != null && it && (it.kind === 'assistant-text' || it.kind === 'assistant-thinking')) {
          items[idx] = { ...it, text: e.text || it.text, isStreaming: false };
        }
        break;
      }

      case 'tool.start': {
        const view: ToolCallView = {
          toolCallId: e.toolCallId,
          name: e.name,
          kind: e.kind,
          title: e.title,
          target: e.target,
          status: e.status,
          displayStatus: e.status,
          input: e.input,
          parentToolUseId: e.parentToolUseId,
          startedAt: e.ts,
        };
        if (tools.has(e.toolCallId)) {
          Object.assign(tools.get(e.toolCallId) as ToolCallView, {
            name: e.name,
            kind: e.kind,
            title: e.title,
            target: e.target,
          });
          break;
        }
        tools.set(e.toolCallId, view);
        if (openToolGroup == null) {
          settleThinking(e.parentToolUseId);
          openToolGroup = items.length;
          items.push({ kind: 'tools', id: e.eventId, calls: [view] });
        } else {
          const g = items[openToolGroup];
          if (g && g.kind === 'tools') {
            items[openToolGroup] = { ...g, calls: [...g.calls, view] };
          }
        }
        break;
      }

      case 'tool.update': {
        const v = tools.get(e.toolCallId);
        if (!v) break;
        Object.assign(v, {
          ...(e.status ? { status: e.status } : {}),
          ...(e.input !== undefined ? { input: e.input } : {}),
          ...(e.title ? { title: e.title } : {}),
          ...(e.target ? { target: e.target } : {}),
        });
        break;
      }

      case 'tool.end': {
        const v = tools.get(e.toolCallId);
        if (!v) break;
        Object.assign(v, {
          status: e.status,
          result: e.result,
          resultLanguage: e.resultLanguage,
          errorMessage: e.errorMessage,
          durationMs: e.durationMs,
          waitedMs: e.waitedMs,
          ranMs: e.ranMs,
          additions: e.additions,
          deletions: e.deletions,
          ...(e.images?.length ? { images: e.images } : {}),
        });
        if (v.permission) v.permission = { ...v.permission, stale: true };
        break;
      }

      case 'permission.requested': {
        const v = tools.get(e.toolCallId);
        if (!v) break;
        v.permission = {
          requestId: e.requestId,
          title: e.title,
          description: e.description,
          decisionReason: e.decisionReason,
          options: e.options,
          questions: e.questions,
          destructiveClass: e.destructiveClass,
        };
        break;
      }

      case 'permission.resolved': {
        const v = tools.get(e.toolCallId);
        if (!v) break;
        if (e.answers !== undefined && v.permission?.questions !== undefined) v.answeredQuestions = { questions: v.permission.questions, answers: e.answers };
        if (e.dismissed === true && v.permission?.questions !== undefined) {
          v.dismissedQuestions = v.permission.questions;
          dismissedSinceUser = true;
        }
        v.permission = undefined;
        break;
      }

      case 'turn.ended': {
        state.interrupted = e.stopReason === 'interrupted' && !dismissedSinceUser;
        // No cumulative cost is projected: the SDK's `total_cost_usd` restarts on a resumed session.
        state.isStreaming = false;
        state.turnStartedAt = undefined;
        for (const idx of textIndex.values()) {
          const it = items[idx];
          if (
            it &&
            (it.kind === 'assistant-text' || it.kind === 'assistant-thinking') &&
            it.isStreaming
          ) {
            items[idx] = { ...it, isStreaming: false };
          }
        }
        if (typeof e.durationMs === 'number') {
          // Net of the wait: the settled row must not jump past the number the live row froze at (ONL-2295).
          const durationMs = Math.max(0, e.durationMs - (e.waitedMs ?? 0));
          for (const idx of turnTextIndices) {
            const it = items[idx];
            if (it && it.kind === 'assistant-text') {
              items[idx] = { ...it, durationMs };
            }
          }
        }
        if (e.tokens !== undefined) {
          const tokens = e.tokens;
          for (const idx of turnTextIndices) {
            const it = items[idx];
            if (it && it.kind === 'assistant-text') {
              items[idx] = { ...it, tokens };
            }
          }
        }
        turnTextIndices = [];
        break;
      }
      case 'usage.limits':
        state.limits = [...new Map([...(state.limits ?? []), ...e.windows].map((window) => [window.kind, window])).values()];
        {
          const last = items[items.length - 1];
          if (last?.kind === 'error' && isLimitShaped(last.code, last.apiErrorStatus) && last.limit?.window === 'unknown') {
            items[items.length - 1] = { ...last, limit: rateLimitHit(state.limits, e.ts / 1000) };
          }
        }
        break;

      // The only writer of `state.retrying`; the loop head above only clears it.
      case 'session.retrying':
        state.retryingSince ??= e.ts;
        state.retrying = {
          ...(e.attempt === undefined ? {} : { attempt: e.attempt }),
          status: e.status,
          ...(e.kind === undefined ? {} : { kind: e.kind }),
        };
        break;

      default: {
        const unreached: never = e;
        unknown.add((unreached as { type: string }).type);
      }
    }
  }
  if (unknown.size > 0) state.unknownEventTypes = [...unknown];

  const withDisplay = (t: ToolCallView): ToolCallView => ({
    ...t,
    displayStatus:
      t.permission && !t.permission.stale ? 'awaiting_approval' : t.status,
  });

  for (const pending of pendingSteers.values()) items.push(pending);
  state.items = items.map((it) =>
    it.kind === 'tools'
      ? {
          ...it,
          calls: it.calls.map((c) => withDisplay(tools.get(c.toolCallId) ?? c)),
        }
      : it,
  );
  state.awaitingApproval = [...tools.values()]
    .filter((t) => t.permission && !t.permission.stale)
    .map(withDisplay);

  state.touchedFiles = touchedFilesOf(events);
  return state;
}
