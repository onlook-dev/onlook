import { describe, expect, it } from 'bun:test';
import { wslProject } from '../env/wsl.js';
import { wslProtocolPaths, wslProtocolStream } from './wsl.js';

const project = wslProject('\\\\wsl$\\Ubuntu\\projects\\example\\project', 'win32', true)!;

describe('paths at the agent protocol boundary', () => {
  it('sends filesystem fields as Linux paths without rewriting prompts, URLs or source code', () => {
    const value = { method: 'thread/start', params: { cwd: project.hostPath, input: [{ type: 'skill', path: `${project.hostPath}\\.agents\\skills\\example\\SKILL.md` }], developerInstructions: `Read ${project.hostPath}`, url: 'http://localhost:3000/page' } };
    expect(wslProtocolPaths(value, project, 'linux')).toEqual({ method: 'thread/start', params: { cwd: project.linuxPath, input: [{ type: 'skill', path: '/projects/example/project/.agents/skills/example/SKILL.md' }], developerInstructions: value.params.developerInstructions, url: value.params.url } });
    expect(value.params.cwd).toBe(project.hostPath);
  });

  it('returns tool file paths and hooks in the host namespace', () => {
    const hook = { tool_input: { file_path: '/projects/example/project/src/App.tsx', content: 'const path = "/projects/example/project";' }, cwd: project.linuxPath };
    expect(wslProtocolPaths(hook, project, 'host')).toEqual({ tool_input: { file_path: `${project.hostPath}\\src\\App.tsx`, content: hook.tool_input.content }, cwd: project.hostPath });
  });

  it('rejects another distro instead of forwarding a failed path conversion unchanged', async () => {
    const stream = wslProtocolStream(project, 'linux');
    let output = '';
    stream.on('data', (chunk) => { output += chunk; });
    const failed = new Promise<Error>((resolve) => stream.once('error', resolve));
    stream.end(`${JSON.stringify({ cwd: '\\\\wsl$\\Debian\\project' })}\n`);
    expect((await failed).message).toContain('another distribution');
    expect(output).toBe('');
  });

  it('preserves split UTF-8 and JSON lines, including diagnostics that are not JSON', async () => {
    const stream = wslProtocolStream(project, 'host');
    let output = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk: string) => { output += chunk; });
    const ended = new Promise<void>((resolve) => stream.on('end', resolve));
    const message = Buffer.from(`${JSON.stringify({ path: `${project.linuxPath}/日本語.ts`, text: '日本語' })}\nplain diagnostic\n`);
    for (const byte of message) stream.write(Buffer.from([byte]));
    stream.end();
    await ended;
    const [line, diagnostic] = output.trim().split('\n');
    expect(JSON.parse(line!)).toEqual({ path: `${project.hostPath}\\日本語.ts`, text: '日本語' });
    expect(diagnostic).toBe('plain diagnostic');
  });
});
