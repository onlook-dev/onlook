import type { AgentSkill, HarnessId } from '@studio/events';

/** A `/word` at the end of the draft, at its start or after a space, opens the menu wherever it is typed (ONL-2744). */
const TRAILING_COMMAND = /(?:^|\s)\/([\w.:-]*)$/;

export function skillMenuQuery(text: string): string | undefined {
  return TRAILING_COMMAND.exec(text)?.[1]?.toLowerCase();
}

/** Where the `/word` being completed starts, so a chosen skill's token takes its place and the words around it stay. */
export function skillQueryStart(text: string): number | undefined {
  return TRAILING_COMMAND.test(text) ? text.lastIndexOf('/') : undefined;
}

/** An unheard catalog cannot prove a skill missing, so a restored draft is not accused (ONL-2047). */
export function unknownSkillCommand(text: string, agent: HarnessId, skills: readonly AgentSkill[], heard: boolean): boolean {
  if (!heard) return false;
  const command = /^\/([\w.:-]+)(?:\s|$)/.exec(text)?.[1];
  return command !== undefined && !skills.some((skill) => skill.agent === agent && skill.name === command);
}
