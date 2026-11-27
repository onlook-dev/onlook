import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { getSessionInfo } from '@anthropic-ai/claude-agent-sdk';
import type { HarnessId } from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import { wslProject } from '../env/wsl.js';
import { wslClaudeSessionExists } from './wsl.js';
import { defineDomain } from '../state/store.js';
import type { SessionHarness } from './backend.js';
import { harnessFor, harnessStoredAs } from './harness.js';

export type { SessionHarness };

export function storedHarness(id: HarnessId): SessionHarness {
  return harnessFor(id).stored;
}

export function harnessIdOf(harness: SessionHarness): HarnessId {
  return harnessStoredAs(harness).id;
}

interface StoredSession {
  sdkSessionId: string;
  harness?: SessionHarness;
  threadId?: string;
  /** For diagnosis; never passed back on a resume, the SDK restores it. */
  model?: string;
  updatedAt: string;
}

interface SessionsState {
  byWorkspace: Record<string, StoredSession>;
}

const domain = defineDomain<SessionsState>({
  name: 'sessions',
  version: 3,
  fallback: () => ({ byWorkspace: {} }),
  // Throws on a wrong shape, quarantining the file: resuming into the wrong runtime is not recoverable (ONL-2124).
  migrate: (data, from) => {
    if (from !== 1 && from !== 2) throw new Error(`no migration from version ${String(from)}`);
    const state = data as Partial<SessionsState> | null;
    const byWorkspace = state?.byWorkspace;
    if (byWorkspace === undefined || typeof byWorkspace !== 'object') {
      throw new Error(`v${String(from)} sessions file has no byWorkspace map`);
    }
    const v2 =
      from === 1
        ? Object.fromEntries(
            Object.entries(byWorkspace).map(([path, record]) => [
              path,
              { ...(record as StoredSession), harness: 'claude' as const },
            ]),
          )
        : (byWorkspace as Record<string, StoredSession>);
    return {
      byWorkspace: Object.fromEntries(
        Object.entries(v2).map(([path, record]) => [
          path.includes('::') ? path : `${path}::${record.harness ?? 'claude'}`,
          record,
        ]),
      ),
    };
  },
});

export function harnessKey(path: string, harness: SessionHarness): string {
  return `${canonicalPath(path)}::${harness}`;
}

const removedProjects = new Set<string>();

export function reopenProjectSessions(cwd: string): void {
  removedProjects.delete(cwd);
  removedProjects.delete(canonicalPath(cwd));
}

export function rememberSession(cwd: string, sdkSessionId: string, model?: string): void {
  if (removedProjects.has(canonicalPath(cwd))) return;
  domain.update((state) => ({
    byWorkspace: {
      ...state.byWorkspace,
      [harnessKey(cwd, 'claude')]: {
        sdkSessionId,
        harness: 'claude',
        ...(model === undefined ? {} : { model }),
        updatedAt: new Date().toISOString(),
      },
    },
  }));
}

export function rememberAppServerThread(cwd: string, threadId: string, model?: string): void {
  if (removedProjects.has(canonicalPath(cwd))) return;
  domain.update((state) => ({
    byWorkspace: {
      ...state.byWorkspace,
      [harnessKey(cwd, 'appserver')]: {
        sdkSessionId: threadId,
        harness: 'appserver',
        threadId,
        ...(model === undefined ? {} : { model }),
        updatedAt: new Date().toISOString(),
      },
    },
  }));
}

/** Undebounced, so a failed write throws rather than resuming the chat the user was told was forgotten (ONL-2198). */
export function forgetSession(cwd: string, harness: SessionHarness): void {
  const key = harnessKey(cwd, harness);
  if (domain.read().byWorkspace[key] === undefined) return;
  domain.update((state) => {
    const byWorkspace = { ...state.byWorkspace };
    delete byWorkspace[key];
    return { byWorkspace };
  });
}

/** Unvalidated; the caller falls back to a fresh thread when `thread/resume` refuses it. */
export function storedAppServerThread(cwd: string): string | undefined {
  const stored = domain.read().byWorkspace[harnessKey(cwd, 'appserver')];
  if (!stored || stored.harness !== 'appserver') return undefined;
  return stored.threadId;
}

/** Written at every start of that runtime, so the later one is the runtime the Project last opened on. */
export function sessionUpdatedAt(cwd: string, harness: SessionHarness): string | undefined {
  return domain.read().byWorkspace[harnessKey(cwd, harness)]?.updatedAt;
}

export function forgetProjectSessions(cwd: string): void {
  removedProjects.add(canonicalPath(cwd));
  forgetSession(cwd, 'claude');
  forgetSession(cwd, 'appserver');
}

export function storedClaudeSession(cwd: string): string | undefined {
  const stored = domain.read().byWorkspace[harnessKey(cwd, 'claude')];
  if (!stored || stored.harness !== 'claude') return undefined;
  return stored.sdkSessionId;
}

/** `resume` cannot be the probe: the SDK throws the same error for an unknown id and a wrong cwd, and a `ReferenceError` for a missing cwd. */
export async function planSession(
  cwd: string,
): Promise<{ kind: 'resume'; sessionId: string } | { kind: 'fresh'; sessionId: string }> {
  const fresh = { kind: 'fresh', sessionId: randomUUID() } as const;

  const sdkSessionId = storedClaudeSession(cwd);
  if (sdkSessionId === undefined) return fresh;
  if (!existsSync(cwd)) return fresh;

  if (wslProject(cwd) !== undefined) return await wslClaudeSessionExists(cwd, sdkSessionId) ? { kind: 'resume', sessionId: sdkSessionId } : fresh;

  try {
    const info = await getSessionInfo(sdkSessionId, { dir: cwd });
    if (!info) return fresh;
  } catch {
    // The SDK could not read the stored session; a fresh one always starts.
    return fresh;
  }

  return { kind: 'resume', sessionId: sdkSessionId };
}

export function resetSessionsCache(): void {
  domain.reset();
  removedProjects.clear();
}
