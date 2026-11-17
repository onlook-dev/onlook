import type { AgentSkill, SkillAttachment, PromptAttachment } from '@studio/events';

export function claudeSkills(commands: readonly { name: string; description: string; builtin?: boolean }[]): AgentSkill[] {
  const builtins = new Set(commands.filter((command) => command.builtin).map((command) => command.name));
  return [...new Map(commands.filter((command) => !builtins.has(command.name) && /^[\w][\w.:-]*$/.test(command.name)).map((command) => [command.name, { name: command.name, description: command.description, agent: 'claude' as const }])).values()];
}

export function selectedSkillsAvailable(attachments: readonly PromptAttachment[], available: readonly AgentSkill[]): boolean {
  const selected = attachments.filter((attachment): attachment is SkillAttachment => 'kind' in attachment && attachment.kind === 'skill');
  return selected.length <= 1 && selected.every((skill) => available.some((item) => item.agent === skill.agent && item.name === skill.name && item.path === skill.path));
}
