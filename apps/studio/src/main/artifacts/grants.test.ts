import { afterAll, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { artifactGrantSessionId, artifactSessionGrants, rememberArtifactSessionGrant, resetArtifactSessionGrantsCache } from './grants.js';

const saved = process.env['STUDIO_STATE_ROOT'];
afterAll(() => { if (saved === undefined) delete process.env['STUDIO_STATE_ROOT']; else process.env['STUDIO_STATE_ROOT'] = saved; cleanupTempFixtures(); });
it('restores created ids only to the same project and session, without retaining a filesystem path', () => {
  const root = makeStateRoot({ name: 'artifact-grants' });
  process.env['STUDIO_STATE_ROOT'] = root;
  resetArtifactSessionGrantsCache();
  const id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
  rememberArtifactSessionGrant('/Users/designer/project', 'session-a', id);
  rememberArtifactSessionGrant('/Users/designer/project', 'session-a', id);
  resetArtifactSessionGrantsCache();
  expect(artifactSessionGrants('/Users/designer/project', 'session-a')).toEqual([id]);
  expect(artifactSessionGrants('/Users/designer/project', 'session-b')).toEqual([]);
  expect(artifactSessionGrants('/Users/designer/other', 'session-a')).toEqual([]);
  expect(readFileSync(join(root, 'artifact-session-grants.json'), 'utf8')).not.toContain('/Users');
});

it('keeps an unplaced creation grant across a confirmed Codex resume, never across a new conversation or workspace', () => {
  process.env['STUDIO_STATE_ROOT'] = makeStateRoot({name: 'artifact-conversation-grants'});
  resetArtifactSessionGrantsCache();
  const id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
  const first = artifactGrantSessionId({id: 'runtime-one', harness: 'appserver'}, 'provider-one');
  rememberArtifactSessionGrant('project-one', first, id);
  resetArtifactSessionGrantsCache();
  const resumed = artifactGrantSessionId({id: 'runtime-two', harness: 'appserver'}, 'provider-one');
  expect(artifactSessionGrants('project-one', resumed)).toEqual([id]);
  expect(artifactSessionGrants('project-two', resumed)).toEqual([]);
  expect(artifactSessionGrants('project-one', artifactGrantSessionId({id: 'runtime-three', harness: 'appserver'}, 'provider-two'))).toEqual([]);
  expect(artifactSessionGrants('project-one', artifactGrantSessionId({id: 'runtime-two', harness: 'appserver'}))).toEqual([]);
  expect(artifactGrantSessionId({id: 'claude-session', harness: 'claude'}, 'provider-one')).toBe('claude-session');
});
