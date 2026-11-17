import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, makeDirWithFiles } from '@studio/fixtures';
import type { VersionedProjectSetup } from '@studio/events';
import { withheldSetupTool } from './approval.js';
import { initializeProjectSetup, projectSetupService, resetProjectSetupForTesting } from './service.js';
import { createSetupState, emptyRecord, versionDefinition } from './state.js';

afterAll(cleanupTempFixtures);

const definition = () => ({
  prepare: '',
  install: { script: 'bun install', inputs: ['package.json'], outputs: ['node_modules'] },
  servers: [{ id: 'web', cwd: '.', start: 'bun run dev', port: 3000 }],
});

const SAVE = 'mcp__studio__save_project_setup';
const RUN = 'run_project_setup';

let fresh: string;
let verified: string;
let savedOnly: string;
let undecodable: string;
let unregistered: string;

beforeAll(() => {
  resetProjectSetupForTesting();
  const root = makeDirWithFiles({ name: 'approval-state' });
  fresh = makeDirWithFiles({ name: 'approval-fresh' });
  verified = makeDirWithFiles({ name: 'approval-verified' });
  savedOnly = makeDirWithFiles({ name: 'approval-saved' });
  undecodable = makeDirWithFiles({ name: 'approval-undecodable' });
  unregistered = makeDirWithFiles({ name: 'approval-unregistered' });
  const state = createSetupState(() => root);
  const version = versionDefinition(definition());
  state.write(verified, { ...emptyRecord(), saved: version, verified: version });
  state.write(savedOnly, {
    ...emptyRecord(),
    saved: version,
    failure: { revision: version.revision, stage: 'start', command: 'bun run dev', reason: 'exited', outputTail: '', elapsedMs: 12 },
  });
  state.write(undecodable, {
    ...emptyRecord(),
    saved: { revision: 'not-the-hash-of-this-definition', definition: definition() } as VersionedProjectSetup,
  });
  const registered = new Set([fresh, verified, savedOnly, undecodable]);
  initializeProjectSetup({ state, allowed: (cwd) => registered.has(cwd), report: async () => undefined });
});

describe('the setup approval the agent does not have to ask for (ONL-2499)', () => {
  it('grants both setup tools, prefixed or bare, while the project has no verified setup', () => {
    expect(withheldSetupTool(fresh, SAVE)).toBe('save_project_setup');
    expect(withheldSetupTool(fresh, 'save_project_setup')).toBe('save_project_setup');
    expect(withheldSetupTool(fresh, RUN)).toBe('run_project_setup');
    expect(withheldSetupTool(fresh, 'mcp__studio__run_project_setup')).toBe('run_project_setup');
  });

  it('grants neither once the project has a verified setup', () => {
    expect(withheldSetupTool(verified, SAVE)).toBeUndefined();
    expect(withheldSetupTool(verified, RUN)).toBeUndefined();
  });

  it('still grants a corrected revision after a failed first run', () => {
    expect(withheldSetupTool(savedOnly, SAVE)).toBe('save_project_setup');
    expect(withheldSetupTool(savedOnly, RUN)).toBe('run_project_setup');
  });

  it('grants nothing for a cwd the service refuses to read', () => {
    expect(() => projectSetupService().read(unregistered)).toThrow();
    expect(withheldSetupTool(unregistered, SAVE)).toBeUndefined();
    expect(withheldSetupTool(unregistered, RUN)).toBeUndefined();
  });

  it('grants nothing for a record that failed to decode, where an absent one still grants', () => {
    expect(projectSetupService().read(undecodable).failure?.revision).toBe('invalid');
    expect(withheldSetupTool(undecodable, SAVE)).toBeUndefined();
    expect(withheldSetupTool(undecodable, RUN)).toBeUndefined();
    expect(projectSetupService().read(fresh).failure).toBeNull();
    expect(withheldSetupTool(fresh, SAVE)).toBe('save_project_setup');
  });

  it('grants no other tool, whatever the snapshot says', () => {
    for (const tool of ['get_project_setup', 'mcp__studio__get_project_setup', 'Bash', 'mcp__studio__create_frame', '']) {
      expect(`${tool}: ${String(withheldSetupTool(fresh, tool))}`).toBe(`${tool}: undefined`);
    }
  });
});
