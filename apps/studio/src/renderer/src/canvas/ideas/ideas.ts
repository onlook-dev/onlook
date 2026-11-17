import type { StringKey } from '@studio/i18n';

export type IdeaKind = 'component' | 'landing' | 'visualization';

export const IDEA_ORDER: readonly IdeaKind[] = ['component', 'landing', 'visualization'];

export const IDEA_PROMPT: Record<IdeaKind, StringKey> = {
  component: 'firstRun.idea.component.prompt',
  landing: 'firstRun.idea.landing.prompt',
  visualization: 'firstRun.idea.visualization.prompt',
};

export const IDEA_CAPTION: Record<IdeaKind, { title: StringKey; body: StringKey }> = {
  component: { title: 'firstRun.idea.component.title', body: 'firstRun.idea.component.body' },
  landing: { title: 'firstRun.idea.landing.title', body: 'firstRun.idea.landing.body' },
  visualization: { title: 'firstRun.idea.visualization.title', body: 'firstRun.idea.visualization.body' },
};

const INTERVIEW = 'They tapped this idea card on the canvas of a new, blank project and have said nothing more.';

const BRIEF: Record<IdeaKind, string> = {
  component:
    'They want a reusable component they can use in any project. Find out what it is and where it will live. Make it as an artifact: create it with a title alone, place it on the canvas with place_artifact and your quote of the brief, then build it with set_artifact.',
  landing:
    'They want a landing page. Find out what it shows off, whether a product, a shop or an event, and who it is for. Build it as a page in this project, and when you start, place it on the canvas with create_frame on its URL, with your quote of the brief.',
  visualization:
    'They want to make sense of some data. Find out what the data is, where it comes from, and the question it should answer. Make it as an artifact they can export as HTML or a PDF: create it with a title alone, place it on the canvas with place_artifact and your quote of the brief, then build it with set_artifact.',
};

/** The person's own sentence, and the framing only the agent sees. */
export function ideaPrompt(kind: IdeaKind, sentence: string): { text: string; context: string } {
  return { text: sentence, context: `${BRIEF[kind]} ${INTERVIEW}` };
}
