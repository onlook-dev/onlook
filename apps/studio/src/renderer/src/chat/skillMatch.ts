import type { AgentSkill, HarnessId } from '@studio/events';
import type { MatchPart } from '../code/files/matchRanges.js';

export interface SkillMatch {
  skill: AgentSkill;
  parts: MatchPart[];
}

export interface TypedSkill {
  skill: AgentSkill;
  text: string;
}

function locate(name: string, query: string): number[] | undefined {
  const hay = name.toLowerCase();
  const run = hay.indexOf(query);
  if (run !== -1) return Array.from({ length: query.length }, (_, offset) => run + offset);
  const found: number[] = [];
  let from = 0;
  for (const character of query) {
    const at = hay.indexOf(character, from);
    if (at === -1) return undefined;
    found.push(at);
    from = at + 1;
  }
  return found;
}

function mark(name: string, found: readonly number[]): MatchPart[] {
  const parts: MatchPart[] = [];
  let from = 0;
  for (let i = 0; i < found.length; i++) {
    const at = found[i] ?? 0;
    if (at > from) parts.push({ text: name.slice(from, at), isMatch: false });
    let to = at + 1;
    while (found[i + 1] === to) {
      to += 1;
      i += 1;
    }
    parts.push({ text: name.slice(at, to), isMatch: true });
    from = to;
  }
  if (from < name.length) parts.push({ text: name.slice(from), isMatch: false });
  return parts;
}

function gaps(found: readonly number[]): number {
  let broken = 0;
  for (let i = 1; i < found.length; i++) if (found[i] !== (found[i - 1] ?? 0) + 1) broken += 1;
  return broken;
}

/** Contiguity outranks earliness, and the catalog's own order breaks the rest (ONL-2047). */
export function matchSkills(query: string, agent: HarnessId, skills: readonly AgentSkill[]): SkillMatch[] {
  const needle = query.toLowerCase();
  const owned = skills.filter((skill) => skill.agent === agent);
  if (needle === '') return owned.map((skill) => ({ skill, parts: [{ text: skill.name, isMatch: false }] }));
  return owned
    .flatMap((skill, order) => {
      const found = locate(skill.name, needle);
      return found === undefined ? [] : [{ skill, found, order }];
    })
    .sort((left, right) => gaps(left.found) - gaps(right.found) || (left.found[0] ?? 0) - (right.found[0] ?? 0) || left.order - right.order)
    .map(({ skill, found }) => ({ skill, parts: mark(skill.name, found) }));
}

/** A name typed in full would otherwise send as prose with no skill and no notice (ONL-2047). */
export function promoteTypedSkill(text: string, agent: HarnessId, skills: readonly AgentSkill[]): TypedSkill | undefined {
  const typed = /^\/([\w.:-]+)\s/.exec(text);
  if (typed === null) return undefined;
  const skill = skills.find((candidate) => candidate.agent === agent && candidate.name === typed[1]);
  return skill === undefined ? undefined : { skill, text: text.slice(typed[0].length) };
}

export interface SkillMenuKeyState {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
  keyCode: number;
  isOpen: boolean;
  highlighted: boolean;
}

export type SkillMenuVerdict = 'ignore' | 'close' | 'move-up' | 'move-down' | 'choose';

export interface SkillMenuKeyResult {
  verdict: SkillMenuVerdict;
  consume: boolean;
}

const ignore: SkillMenuKeyResult = { verdict: 'ignore', consume: false };

/** `consume` is the caller's `preventDefault()`. Backspace is the library's: the token is an atom in the editable (ONL-2744). */
export function resolveSkillMenuKey(state: SkillMenuKeyState): SkillMenuKeyResult {
  if (state.isComposing || state.keyCode === 229) return ignore;
  if (!state.isOpen) return ignore;
  if (state.key === 'Escape') return { verdict: 'close', consume: true };
  if (state.key === 'ArrowUp') return { verdict: 'move-up', consume: true };
  if (state.key === 'ArrowDown') return { verdict: 'move-down', consume: true };
  if ((state.key === 'Enter' && !state.shiftKey) || state.key === 'Tab') {
    return state.highlighted ? { verdict: 'choose', consume: true } : ignore;
  }
  return ignore;
}
