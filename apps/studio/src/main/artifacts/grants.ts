import { createHash } from 'node:crypto';
import { isArtifactId } from '@studio/events';
import type { SessionHarness } from '../agent-host/backend.js';
import { harnessStoredAs } from '../agent-host/harness.js';
import { defineDomain } from '../state/store.js';

interface ArtifactGrants { sessions: Record<string, string[]> }
const domain = defineDomain<ArtifactGrants>({ name: 'artifact-session-grants', version: 1, fallback: () => ({ sessions: {} }), migrate: () => ({ sessions: {} }) });
const keyFor = (cwd: string, sessionId: string): string => createHash('sha256').update(cwd).update('\0').update(sessionId).digest('hex');

export function artifactGrantSessionId(session: {id: string; harness: SessionHarness}, providerThreadId?: string): string {
  const harness = harnessStoredAs(session.harness);
  return harness.grantsFollowProviderThread && providerThreadId !== undefined ? `${harness.stored}:${providerThreadId}` : session.id;
}

export function artifactSessionGrants(cwd: string, sessionId: string): string[] {
  const saved = domain.read().sessions?.[keyFor(cwd, sessionId)];
  return Array.isArray(saved) ? saved.filter(isArtifactId) : [];
}

export function rememberArtifactSessionGrant(cwd: string, sessionId: string, artifactId: string): void {
  if (!isArtifactId(artifactId)) return;
  const state = domain.read();
  const key = keyFor(cwd, sessionId);
  domain.write({ ...state, sessions: { ...state.sessions, [key]: [...new Set([...artifactSessionGrants(cwd, sessionId), artifactId])] } });
}

export function resetArtifactSessionGrantsCache(): void {
  domain.reset();
}
