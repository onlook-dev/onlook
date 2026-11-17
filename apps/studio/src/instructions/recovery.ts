export type RecoveryCover = 'not-started' | 'stopped' | 'nothing';

const WHAT_STUDIO_SEES: Record<RecoveryCover, string> = {
  'not-started': "Onlook has not started this app's dev server yet, so the frame has nothing to show.",
  stopped: 'The dev server behind this frame was running and has stopped answering.',
  nothing: "Onlook loaded the frame's address and nothing answered.",
};

const ASK =
  'Find the actual cause before you change anything. Tell me in plain words what is wrong, then ' +
  'propose the fix and ask me whether to apply it: one recommendation, or a few options with your ' +
  'recommendation first when there are several real paths. Offer as an option only work you will then ' +
  'do yourself; anything only I can do goes in your explanation. If there is no path you can take, ' +
  'explain what is in the way and why, then stop.';

export function frameRecoveryContext(input: { cover: RecoveryCover; url: string }): string {
  return [
    `I pressed Onlook's "Ask the agent" button on the selected frame, which cannot show its page at ${input.url}.`,
    WHAT_STUDIO_SEES[input.cover],
    ASK,
  ].join(' ');
}
