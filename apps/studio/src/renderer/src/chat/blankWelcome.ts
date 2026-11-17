import type { StringKey } from '@studio/i18n';

type BlankWelcomeRowId = 'screens' | 'user_flow' | 'inspiration';

export interface BlankWelcomeRow {
  id: BlankWelcomeRowId;
  label: StringKey;
  prompt: StringKey;
  brief: string;
}

const INTERVIEW = 'They tapped this on the welcome of a new, blank project.';

export const BLANK_WELCOME_ROWS: readonly BlankWelcomeRow[] = [
  { id: 'screens', label: 'chat.welcome.blank.screens', prompt: 'chat.welcome.blank.screens.prompt', brief: 'They have an idea they want to see as screens. Find out what the idea is, who it is for, and which screens matter most.' },
  { id: 'user_flow', label: 'chat.welcome.blank.flow', prompt: 'chat.welcome.blank.flow.prompt', brief: 'They want to map out a user flow. Find out whose flow it is, where it starts and ends, and the steps between.' },
  { id: 'inspiration', label: 'chat.welcome.blank.inspiration', prompt: 'chat.welcome.blank.inspiration.prompt', brief: 'They are looking for inspiration. Find out what they are making and the feel they are after, then suggest references and directions.' },
];

export function blankWelcomeRow(id: string): BlankWelcomeRow | undefined {
  return BLANK_WELCOME_ROWS.find((row) => row.id === id);
}

export function blankWelcomePrompt(row: BlankWelcomeRow, label: string): { text: string; context: string } {
  return { text: label, context: `${row.brief} ${INTERVIEW}` };
}
