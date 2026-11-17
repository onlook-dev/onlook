import { opendirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, sep } from 'node:path';
import { parse } from 'yaml';
import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import type { AgentSkill } from '@studio/events';

export interface ProjectSkill { skill: AgentSkill; body: string; }

export function projectSkillBody(body: string, argument: string): string {
  const token = '$ARGUMENTS';
  const count = body.split(token).length - 1;
  const bytes = Buffer.byteLength(body) + count * (Buffer.byteLength(argument) - token.length);
  return bytes <= 256 * 1024 ? body.replaceAll(token, () => argument) : body;
}

export function readProjectContext(cwd: string): { instructions: string; skills: ProjectSkill[]; agents: Record<string, AgentDefinition> } {
  let root: string;
  try { root = realpathSync(cwd); }
  catch { return { instructions: '', skills: [], agents: {} }; }
  const contained = (path: string): string | undefined => {
    const target = realpathSync(path);
    const part = relative(root, target);
    return isAbsolute(part) || part === '..' || part.startsWith(`..${sep}`) ? undefined : target;
  };
  let remaining = 1024 * 1024;
  const read = (path: string): string | undefined => {
    try {
      const target = contained(path);
      if (!target) return undefined;
      const info = statSync(target);
      if (!info.isFile() || info.size > Math.min(256 * 1024, remaining)) return undefined;
      const text = readFileSync(target, 'utf8');
      remaining -= Buffer.byteLength(text);
      return remaining >= 0 ? text : undefined;
    } catch { return undefined; }
  };
  const files = (directory: string): string[] => {
    const found: string[] = [];
    let visited = 0;
    const walk = (path: string, depth: number): void => {
      if (depth > 4 || visited++ >= 128 || found.length >= 128) return;
      try {
        const target = contained(path);
        if (!target) return;
        const handle = opendirSync(target);
        try {
          for (let count = 0; count < 128 && found.length < 128; count++) {
            const entry = handle.readSync();
            if (!entry) break;
            const child = join(path, entry.name);
            if (entry.isDirectory()) walk(child, depth + 1);
            else if (entry.name.endsWith('.md')) found.push(child);
          }
        } finally { handle.closeSync(); }
      } catch {}
    };
    walk(directory, 0);
    return found.sort();
  };
  const document = (path: string): { metadata: Record<string, unknown>; body: string } | undefined => {
    const text = read(path);
    if (text === undefined) return undefined;
    const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
    try {
      const metadata: unknown = header ? parse(header[1]!, { schema: 'failsafe', maxAliasCount: 20 }) : {};
      if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined;
      return { metadata: metadata as Record<string, unknown>, body: header ? text.slice(header[0].length) : text };
    } catch { return undefined; }
  };
  const instructions = [join(cwd, 'CLAUDE.md'), join(cwd, '.claude/CLAUDE.md'), ...files(join(cwd, '.claude/rules'))]
    .flatMap((path) => { const text = read(path); return text === undefined ? [] : [`${relative(cwd, path)}\n${text}`]; });
  const skills: ProjectSkill[] = [];
  const agents: Record<string, AgentDefinition> = {};
  for (const kind of ['skills', 'commands', 'agents']) {
    const root = join(cwd, '.claude', kind);
    for (const path of files(root)) {
      if (kind === 'skills' && basename(path) !== 'SKILL.md') continue;
      const parsed = document(path);
      if (!parsed) continue;
      const fallback = kind === 'skills' ? basename(dirname(path)) : relative(root, path).slice(0, -3).split(sep).join(':');
      const name = typeof parsed.metadata['name'] === 'string' ? parsed.metadata['name'] : fallback;
      if (name.length > 128 || !/^[\w][\w.:-]*$/.test(name) || Object.hasOwn(Object.prototype, name)) continue;
      const description = typeof parsed.metadata['description'] === 'string' ? parsed.metadata['description'].trim().slice(0, 512) : name;
      if (kind === 'agents') agents[name] = { description, prompt: parsed.body };
      else skills.push({ skill: { name, description, agent: 'claude', path }, body: parsed.body });
    }
  }
  const listing = skills.map(({ skill }) => `${skill.name}: ${skill.description}\n${skill.path}`).join('\n');
  return { instructions: [...instructions, ...(listing ? [`Project skills and commands are readable instructions, not executable configuration:\n${listing}`] : [])].join('\n\n'), skills, agents };
}
