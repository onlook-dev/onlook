import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, makeDirWithFiles } from '@studio/fixtures';
import { canonicalPath } from '../lib/canonical-path.js';
import { createSetupState, emptyRecord, INVALID_RECORD_REVISION, validatePaths, versionDefinition } from './state.js';

afterAll(cleanupTempFixtures);
const definition = () => ({ prepare: '', install: { script: '', inputs: ['package.json'], outputs: ['node_modules'] }, servers: [{ id: 'web', cwd: '.', start: 'npm run dev', port: 3000 }] });

describe('project setup state', () => {
  it('does not persist an absent project when forgetting it', () => {
    const root = makeDirWithFiles({});
    const project = makeDirWithFiles({});
    const state = createSetupState(() => root);
    state.forget(project);
    expect(existsSync(join(root, 'project-setup.json'))).toBe(false);
    expect(state.read(project)).toEqual(emptyRecord());
  });

  it('stores outside the project, reloads and retains verified separately', () => {
    const root = makeDirWithFiles({});
    const project = makeDirWithFiles({ files: { 'package.json': '{}' } });
    const state = createSetupState(() => root);
    const first = versionDefinition(definition());
    state.write(project, { ...emptyRecord(), saved: first, verified: first });
    const second = versionDefinition({ ...definition(), prepare: 'node --version' });
    state.write(project, { ...state.read(project), saved: second });
    state.reset();
    expect(state.read(project).saved).toEqual(second);
    expect(state.read(project).verified).toEqual(first);
    expect(JSON.parse(readFileSync(join(root, 'project-setup.json'), 'utf8')).version).toBe(1);
    expect(readFileSync(join(project, 'package.json'), 'utf8')).toBe('{}');
  });

  it('rejects traversal, absolute paths, duplicate folders/ports and symlink escapes', () => {
    const project = makeDirWithFiles({});
    const elsewhere = makeDirWithFiles({});
    symlinkSync(elsewhere, join(project, 'outside'));
    symlinkSync(join(elsewhere, 'missing'), join(project, 'dangling'));
    for (const cwd of ['../outside', '/tmp', 'outside', 'outside/not-created', 'dangling', 'dangling/nested']) {
      expect(() => validatePaths(project, versionDefinition({ ...definition(), servers: [{ ...definition().servers[0]!, cwd }] }).definition)).toThrow();
    }
    expect(() => versionDefinition({ ...definition(), servers: [...definition().servers, { id: 'api', cwd: './', start: 'node api', port: 3001 }] })).toThrow();
    expect(() => versionDefinition({ ...definition(), servers: [...definition().servers, { id: 'api', cwd: 'api', start: 'node api', port: 3000 }] })).toThrow();
  });

  it('refuses malformed decoded state and forgets only the canonical project', () => {
    const root = makeDirWithFiles({});
    const project = makeDirWithFiles({});
    const other = makeDirWithFiles({});
    const state = createSetupState(() => root);
    state.write(project, { ...emptyRecord(), saved: versionDefinition(definition()) });
    state.write(other, { ...emptyRecord(), saved: versionDefinition(definition()) });
    const canonical = canonicalPath(project);
    state.forget(project);
    rmSync(project, { recursive: true });
    state.reset();
    expect(state.read(canonical).saved).toBeNull();
    expect(state.read(other).saved).not.toBeNull();
    writeFileSync(join(root, 'project-setup.json'), JSON.stringify({ version: 1, data: { [canonicalPath(project)]: { saved: { revision: 'bad', definition: {} } } } }));
    state.reset();
    expect(state.read(project).saved).toBeNull();
  });

  it('forgets a deleted symlinked project through its original key after state recreation', () => {
    const root = makeDirWithFiles({});
    const container = makeDirWithFiles({});
    const project = join(container, 'project');
    mkdirSync(project);
    const links = makeDirWithFiles({});
    const alias = join(links, 'project');
    symlinkSync(project, alias);
    const other = makeDirWithFiles({});
    const state = createSetupState(() => root);
    const canonical = canonicalPath(alias);
    const saved = versionDefinition(definition());
    state.write(alias, { ...emptyRecord(), saved });
    state.write(other, { ...emptyRecord(), saved });
    rmSync(project, { recursive: true });
    rmSync(alias);
    const reopened = createSetupState(() => root);
    expect(reopened.read(alias).saved).toEqual(saved);
    reopened.forget(alias);
    const persisted = createSetupState(() => root);
    expect(persisted.read(canonical)).toEqual(emptyRecord());
    expect(persisted.read(other).saved).toEqual(saved);
    expect(JSON.parse(readFileSync(join(root, 'project-setup.json'), 'utf8')).data[canonical]).toBeUndefined();
  });

  it('reads every project as an invalid record while the state file is unreadable', () => {
    const root = makeDirWithFiles({});
    const project = makeDirWithFiles({});
    writeFileSync(join(root, 'project-setup.json'), '{"version":1,"data":{');
    const degraded = createSetupState(() => root);
    const record = degraded.read(project);
    expect(record.saved).toBeNull();
    expect(record.verified).toBeNull();
    expect(record.failure?.revision).toBe(INVALID_RECORD_REVISION);
    degraded.write(project, { ...emptyRecord(), saved: versionDefinition(definition()) });
    expect(degraded.read(project).failure).toBeNull();
  });

  it('locates legacy canonical records through an existing symlink ancestor after deletion', () => {
    const root = makeDirWithFiles({});
    const container = makeDirWithFiles({});
    const project = join(container, 'project');
    mkdirSync(project);
    const links = makeDirWithFiles({});
    const alias = join(links, 'container');
    symlinkSync(container, alias);
    const spelling = join(alias, 'project');
    const canonical = canonicalPath(spelling);
    writeFileSync(join(root, 'project-setup.json'), JSON.stringify({ version: 1, data: { [canonical]: { ...emptyRecord(), saved: versionDefinition(definition()) } } }));
    rmSync(project, { recursive: true });
    const reopened = createSetupState(() => root);
    reopened.forget(spelling);
    expect(createSetupState(() => root).read(canonical)).toEqual(emptyRecord());
    expect(JSON.parse(readFileSync(join(root, 'project-setup.json'), 'utf8')).data[canonical]).toBeUndefined();
  });
});
