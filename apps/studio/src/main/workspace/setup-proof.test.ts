import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, makeWorkspaceRoot, outcome, restoreWorkspaceRoot } from '@studio/fixtures';
import {
  installSetupProofHook,
  reportForProof,
  takeStartIntentForProof,
  type SetupProofHook,
  type SetupProofReportDeps,
} from './setup-proof.js';
import { rememberProject, resetWorkspaceCache } from './store.js';
import { workspaceTelemetryProperties } from '../telemetry/index.js';

type ProofGlobal = typeof globalThis & { __studioSetupProof?: SetupProofHook };

const savedFlag = process.env['STUDIO_SETUP_PROOF'];
beforeEach(() => {
  delete (globalThis as ProofGlobal).__studioSetupProof;
  process.env['STUDIO_WORKSPACE_ROOT'] = makeWorkspaceRoot({ name: 'setup-proof' });
  resetWorkspaceCache();
});

afterAll(() => {
  delete (globalThis as ProofGlobal).__studioSetupProof;
  if (savedFlag === undefined) delete process.env['STUDIO_SETUP_PROOF'];
  else process.env['STUDIO_SETUP_PROOF'] = savedFlag;
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

describe('the setup proof hook', () => {
  it('is absent without the flag, and the intent goes to the agent', () => {
    delete process.env['STUDIO_SETUP_PROOF'];
    installSetupProofHook();
    expect((globalThis as ProofGlobal).__studioSetupProof).toBeUndefined();
    expect(takeStartIntentForProof('/w', 'context')).toBe(false);
  });

  it('takes every intent in order, with the context the agent would have read', () => {
    process.env['STUDIO_SETUP_PROOF'] = '1';
    installSetupProofHook();
    const hook = (globalThis as ProofGlobal).__studioSetupProof;
    expect(hook).toBeDefined();
    const before = hook!.intents().length;
    expect(takeStartIntentForProof('/w/one', 'Studio looked at this repository')).toBe(true);
    expect(takeStartIntentForProof('/w/two', undefined)).toBe(true);
    expect(hook!.intents().slice(before)).toEqual([{ cwd: '/w/one', context: 'Studio looked at this repository' }, { cwd: '/w/two' }]);
  });

  it('refuses a report for an unregistered folder or an impossible port', async () => {
    process.env['STUDIO_SETUP_PROOF'] = '1';
    installSetupProofHook();
    const hook = (globalThis as ProofGlobal).__studioSetupProof!;
    expect(await outcome(hook.report({ workspacePath: '/nowhere', port: 41784 }))).toThrow('not a registered workspace');
    expect(await outcome(hook.report({ workspacePath: '/nowhere', port: 0 }))).toThrow('invalid port');
  });
});

describe('the proof report (ONL-2280)', () => {
  function recorder(): { calls: string[]; deps: SetupProofReportDeps } {
    const calls: string[] = [];
    return {
      calls,
      deps: {
        host: {
          openProject: async (worktree) => {
            calls.push(`open ${worktree}`);
          },
          report: async (worktree, _folder, port) => {
            calls.push(`report ${worktree} ${String(port)}`);
          },
        },
        isRegistered: () => true,
        noteSetupReport: (cwd, port) => {
          calls.push(`settle ${cwd} ${String(port)}`);
        },
      },
    };
  }

  it('opens the project, reports, then settles its setup row', async () => {
    const { calls, deps } = recorder();
    await reportForProof({ workspacePath: '/w', port: 41784 }, deps);
    expect(calls).toEqual(['open /w', 'report /w 41784', 'settle /w 41784']);
  });

  it('a background report neither opens the project nor settles its setup row', async () => {
    const { calls, deps } = recorder();
    await reportForProof({ workspacePath: '/w', port: 41787, background: true }, deps);
    expect(calls).toEqual(['report /w 41787']);
  });

  it('reports the registered Project telemetry just as the real agent report does', async () => {
    const { deps } = recorder();
    const repoIdentity = 'github.com/team/site';
    rememberProject({ workspacePath: '/w', workspaceName: 'project', branchName: 'designer/project', baseBranch: 'main',
      sourceRepoName: 'site', sourcePath: '/source', sourceRepoRoot: '/source', repoIdentity, copiedEnvFiles: [] });
    let observed: unknown;
    deps.host!.report = async (_worktree, _folder, _port, telemetry) => { observed = telemetry; };
    await reportForProof({ workspacePath: '/w', port: 41784 }, deps);
    expect(observed).toEqual(workspaceTelemetryProperties(repoIdentity));
  });
});
