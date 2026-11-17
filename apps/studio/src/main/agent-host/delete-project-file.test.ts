import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { appServerToolNames, appServerToolRunner, appServerToolSpecs, APPSERVER_APPROVAL_TOOLS, inertToolSinks } from './appserver/tools.js';
import { deleteProjectFile, deleteProjectFileTool } from './delete-project-file.js';
import { studioToolDefinitions, type StudioToolSinks } from './studio-tools.js';
import { DELETE_PROJECT_FILE_TOOL, DELETE_PROJECT_FILE_TOOL_NAME, STUDIO_AUTO_APPROVED_TOOLS } from './tool-names.js';

let fixture: string;
let worktree: string;
let outside: string;

beforeEach(() => {
  const scratch = resolve('.scratch/tmp');
  mkdirSync(scratch, { recursive: true });
  fixture = mkdtempSync(join(scratch, 'delete-project-file-'));
  worktree = join(fixture, 'project');
  outside = join(fixture, 'outside');
  mkdirSync(join(worktree, 'src'), { recursive: true });
  mkdirSync(outside);
  writeFileSync(join(worktree, 'src/old.ts'), 'old project file');
  writeFileSync(join(worktree, '.git'), 'gitdir: /somewhere/else');
  writeFileSync(join(outside, 'secret.ts'), 'outside project');
});

afterEach(() => rmSync(fixture, { recursive: true, force: true }));

describe('confined project file deletion', () => {
  it('unlinks a regular file and reports its relative path', () => {
    expect(deleteProjectFile(worktree, 'src/old.ts')).toEqual({ ok: true, path: 'src/old.ts' });
    expect(existsSync(join(worktree, 'src/old.ts'))).toBe(false);
    expect(readFileSync(join(outside, 'secret.ts'), 'utf8')).toBe('outside project');
  });

  it('accepts an absolute in-project path through a canonical worktree alias', () => {
    const alias = join(fixture, 'project-alias');
    symlinkSync(worktree, alias);
    expect(deleteProjectFile(alias, join(worktree, 'src/old.ts'))).toEqual({ ok: true, path: 'src/old.ts' });
    expect(existsSync(join(worktree, 'src/old.ts'))).toBe(false);
  });

  it('resolves an in-project directory alias without deleting the directory', () => {
    symlinkSync(join(worktree, 'src'), join(worktree, 'inside'));
    expect(deleteProjectFile(worktree, 'inside/old.ts')).toEqual({ ok: true, path: 'src/old.ts' });
    expect(lstatSync(join(worktree, 'inside')).isSymbolicLink()).toBe(true);
    expect(existsSync(join(worktree, 'src/old.ts'))).toBe(false);
  });

  it('refuses traversal, absolute outside paths, and escaped symlinks', () => {
    symlinkSync(outside, join(worktree, 'escape'));
    symlinkSync(join(outside, 'secret.ts'), join(worktree, 'escaped-file.ts'));
    for (const path of [relative(worktree, join(outside, 'secret.ts')), join(outside, 'secret.ts'), 'escape/secret.ts', 'escaped-file.ts', 'src/\0old.ts']) {
      expect(deleteProjectFile(worktree, path).ok).toBe(false);
      expect(readFileSync(join(outside, 'secret.ts'), 'utf8')).toBe('outside project');
    }
  });

  it('refuses directories, the project root, and even an in-project leaf symlink', () => {
    symlinkSync(join(worktree, 'src/old.ts'), join(worktree, 'linked.ts'));
    for (const path of ['src', '.', 'linked.ts']) expect(deleteProjectFile(worktree, path).ok).toBe(false);
    expect(lstatSync(join(worktree, 'src')).isDirectory()).toBe(true);
    expect(lstatSync(join(worktree, 'linked.ts')).isSymbolicLink()).toBe(true);
    expect(readFileSync(join(worktree, 'src/old.ts'), 'utf8')).toBe('old project file');
  });

  it('refuses the worktree git pointer and aliases to it', () => {
    symlinkSync(join(worktree, '.git'), join(worktree, 'gitlink'));
    for (const path of ['.git', 'src/../.git', 'gitlink']) expect(deleteProjectFile(worktree, path).ok).toBe(false);
    expect(readFileSync(join(worktree, '.git'), 'utf8')).toBe('gitdir: /somewhere/else');
  });

  it('refuses Git directory contents, including symlink aliases', () => {
    const nested = join(worktree, 'nested');
    mkdirSync(join(nested, '.git'), { recursive: true });
    writeFileSync(join(nested, '.git/config'), 'keep');
    symlinkSync(join(nested, '.git'), join(worktree, 'gitdir'));
    for (const path of ['nested/.git/config', 'gitdir/config']) expect(deleteProjectFile(worktree, path).ok).toBe(false);
    expect(readFileSync(join(nested, '.git/config'), 'utf8')).toBe('keep');
  });

  it('honors Stop before mutation', () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => deleteProjectFile(worktree, 'src/old.ts', controller.signal)).toThrow();
    expect(readFileSync(join(worktree, 'src/old.ts'), 'utf8')).toBe('old project file');
  });
});

describe('the shared Studio tool lifecycle', () => {
  const configured = (): StudioToolSinks => ({
    ...inertToolSinks(),
    onDeleteProjectFile: (path, signal) => deleteProjectFile(worktree, path, signal),
  });

  it('is absent from both SDK inventories without a project sink', () => {
    expect(studioToolDefinitions(inertToolSinks()).map((definition) => definition.name)).not.toContain(DELETE_PROJECT_FILE_TOOL_NAME);
    expect(appServerToolNames(inertToolSinks())).not.toContain(DELETE_PROJECT_FILE_TOOL_NAME);
  });

  it('offers both SDKs the same typed path, prompt, and destructive approval', () => {
    const claude = studioToolDefinitions(configured()).find((definition) => definition.name === DELETE_PROJECT_FILE_TOOL_NAME);
    const codex = appServerToolSpecs(configured()).find((definition) => definition.name === DELETE_PROJECT_FILE_TOOL_NAME);
    expect(claude).toMatchObject({
      name: DELETE_PROJECT_FILE_TOOL_NAME,
      annotations: { readOnlyHint: false, destructiveHint: true },
      _meta: { 'anthropic/alwaysLoad': true },
    });
    expect(codex?.description).toBe(claude?.description);
    expect(codex?.description).toContain('not Bash');
    expect(codex?.description).toContain('changed-files list');
    expect(codex?.inputSchema).toMatchObject({
      type: 'object', required: ['path'], additionalProperties: false,
      properties: { path: { type: 'string' } },
    });
    expect(DELETE_PROJECT_FILE_TOOL).toBe('mcp__studio__delete_project_file');
    expect(STUDIO_AUTO_APPROVED_TOOLS).not.toContain(DELETE_PROJECT_FILE_TOOL);
    expect(APPSERVER_APPROVAL_TOOLS).toContain(DELETE_PROJECT_FILE_TOOL_NAME);
  });

  it('really deletes through each SDK runner', async () => {
    const sinks = configured();
    const claude = deleteProjectFileTool(sinks.onDeleteProjectFile!);
    const result = await claude.handler({ path: 'src/old.ts' }, {});
    expect(result.isError).not.toBe(true);
    expect(existsSync(join(worktree, 'src/old.ts'))).toBe(false);
    writeFileSync(join(worktree, 'src/codex.ts'), 'codex');
    expect(await appServerToolRunner(sinks)(DELETE_PROJECT_FILE_TOOL_NAME, { path: 'src/codex.ts' })).toMatchObject({ success: true });
    expect(existsSync(join(worktree, 'src/codex.ts'))).toBe(false);
  });

  it('returns isError for refusals, missing files, and malformed paths on both SDKs', async () => {
    const sinks = configured();
    const claude = deleteProjectFileTool(sinks.onDeleteProjectFile!);
    for (const path of ['src', '.git', 'missing.ts', '../outside/secret.ts', '', 42, undefined]) {
      const args = { path };
      expect(await claude.handler(args as never, {})).toMatchObject({ isError: true });
      expect(await appServerToolRunner(sinks)(DELETE_PROJECT_FILE_TOOL_NAME, args)).toMatchObject({ success: false });
    }
    expect(existsSync(join(worktree, 'src/old.ts'))).toBe(true);
    expect(existsSync(join(outside, 'secret.ts'))).toBe(true);
  });

  it('returns isError when the sink throws or rejects', async () => {
    for (const onDeleteProjectFile of [() => { throw new Error('permission denied'); }, async () => { throw new Error('permission denied'); }]) {
      expect(await deleteProjectFileTool(onDeleteProjectFile).handler({ path: 'src/old.ts' }, {})).toMatchObject({ isError: true });
      expect(await appServerToolRunner({ ...configured(), onDeleteProjectFile })(DELETE_PROJECT_FILE_TOOL_NAME, { path: 'src/old.ts' })).toMatchObject({ success: false });
    }
    expect(existsSync(join(worktree, 'src/old.ts'))).toBe(true);
  });

  it('forwards the SDK AbortSignal and refuses a stopped call before reaching the sink', async () => {
    const controller = new AbortController();
    const signals: (AbortSignal | undefined)[] = [];
    const definition = deleteProjectFileTool((path, signal) => {
      signals.push(signal);
      return deleteProjectFile(worktree, path, signal);
    });
    expect((await definition.handler({ path: 'src' }, { signal: controller.signal })).isError).toBe(true);
    expect(signals).toEqual([controller.signal]);
    controller.abort();
    expect(await definition.handler({ path: 'src/old.ts' }, { signal: controller.signal })).toMatchObject({ isError: true });
    expect(signals).toHaveLength(1);
    expect(existsSync(join(worktree, 'src/old.ts'))).toBe(true);
  });
});
